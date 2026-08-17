import assert from "node:assert/strict";
import test from "node:test";
import { getInitialState } from "../app/game-logic.js";
import {
  viewForPlayer,
  normalizeRoomCode,
  isValidRoomCode,
  generateRoomCode,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  encode,
  decode
} from "../app/net-protocol.js";

function makeGame() {
  const state = getInitialState({ playerCount: 3 });
  state.players[0].hand = ["secret-a", "secret-b"];
  state.players[1].hand = ["rival-a", "rival-b", "rival-c"];
  state.players[2].hand = ["third-a"];
  return state;
}

test("A player's view contains their own hand", () => {
  const view = viewForPlayer(makeGame(), "player");
  const me = view.players.find(p => p.id === "player");

  assert.deepEqual(me.hand, ["secret-a", "secret-b"]);
  assert.equal(me.isSelf, true);
});

test("A view never carries another player's hand", () => {
  const view = viewForPlayer(makeGame(), "player");

  for (const other of view.players.filter(p => p.id !== "player")) {
    assert.equal(other.hand, undefined, `${other.id}'s hand must not be sent`);
    assert.equal(other.researchCards, undefined);
    assert.equal(other.corporationOptions, undefined);
    assert.equal(other.preludeOptions, undefined);
    assert.equal(other.isSelf, false);
  }

  // The whole serialized payload must not contain an opponent's card ids.
  const wire = encode(view);
  for (const secret of ["rival-a", "rival-b", "rival-c", "third-a"]) {
    assert.equal(wire.includes(secret), false, `${secret} leaked onto the wire`);
  }
});

test("Opponents are visible as counts, not contents", () => {
  const view = viewForPlayer(makeGame(), "player");
  const rival = view.players.find(p => p.id === "player2");

  assert.equal(rival.handCount, 3, "how many cards an opponent holds is public");
  assert.equal(rival.tr, 20, "public stats stay visible");
  assert.equal(rival.mc, 42);
});

test("The deck order is hidden but its size is not", () => {
  const state = makeGame();
  const view = viewForPlayer(state, "player");

  assert.equal(view.deck, undefined);
  assert.equal(view.deckCount, state.deck.length);
  assert.equal(view.discardPile, undefined);
});

test("Another player's pending choice does not leak its options", () => {
  const state = makeGame();
  state.pendingChoice = {
    id: "c1",
    kind: "any-card-resource",
    ownerPlayerId: "player2",
    prompt: "微生物を置くカードを選んでください。",
    optional: false,
    options: [{ id: "a", label: "Ants", targetCardId: "rival-secret-card" }],
    continuation: { stage: "any-card-resource", sourceId: "rival-secret-card" }
  };

  const view = viewForPlayer(state, "player");
  assert.equal(view.pendingChoice.hidden, true);
  assert.deepEqual(view.pendingChoice.options, [], "options can name cards in a hand");
  assert.equal(encode(view).includes("rival-secret-card"), false);

  // The owner sees it in full.
  const ownerView = viewForPlayer(state, "player2");
  assert.equal(ownerView.pendingChoice.options.length, 1);
  assert.equal(ownerView.pendingChoice.hidden, undefined);
});

test("Shared state stays shared", () => {
  const state = makeGame();
  const view = viewForPlayer(state, "player3");

  assert.equal(view.temperature, state.temperature);
  assert.equal(view.oxygen, state.oxygen);
  assert.equal(view.oceans, state.oceans);
  assert.equal(Object.keys(view.board).length, 61);
  assert.equal(view.generation, state.generation);
});

test("Room codes avoid characters people confuse", () => {
  assert.equal(ROOM_CODE_ALPHABET.includes("I"), false);
  assert.equal(ROOM_CODE_ALPHABET.includes("O"), false);
  assert.equal(ROOM_CODE_ALPHABET.includes("0"), false);
  assert.equal(ROOM_CODE_ALPHABET.includes("1"), false);

  for (let i = 0; i < 50; i++) {
    const code = generateRoomCode();
    assert.equal(code.length, ROOM_CODE_LENGTH);
    assert.ok(isValidRoomCode(code));
    assert.ok([...code].every(char => ROOM_CODE_ALPHABET.includes(char)));
  }
});

test("A generated code always survives normalization unchanged", () => {
  // This is the code people read aloud and type back. If normalizing it
  // produced anything else, they would land in a different room.
  for (let i = 0; i < 300; i++) {
    const code = generateRoomCode();
    assert.equal(normalizeRoomCode(code), code);
  }
});

test("Only the four omitted characters are folded", () => {
  // L and Q are valid letters; folding them would silently rewrite the code.
  assert.equal(normalizeRoomCode("HELLO"), "HELLQ", "only the O folds");
  assert.equal(normalizeRoomCode("ABCDE"), "ABCDE");
  assert.equal(normalizeRoomCode("QQQQQ"), "QQQQQ");
  assert.equal(normalizeRoomCode("LLLLL"), "LLLLL");
  // The excluded four fold onto the letter they resemble.
  assert.equal(normalizeRoomCode("IIIII"), "JJJJJ");
  assert.equal(normalizeRoomCode("11111"), "JJJJJ");
  assert.equal(normalizeRoomCode("00000"), "QQQQQ");
});

test("Typing a confusable character still finds the room", () => {
  // Someone reading a code aloud may say "eye" or "oh"; fold onto a real letter
  // rather than rejecting the input.
  assert.equal(normalizeRoomCode("abcde"), "ABCDE");
  assert.equal(normalizeRoomCode("ab-cd e"), "ABCDE");
  assert.equal(normalizeRoomCode("ABCDEFGH").length, ROOM_CODE_LENGTH);
  assert.ok([...normalizeRoomCode("IOIOI")].every(char => ROOM_CODE_ALPHABET.includes(char)));
  assert.equal(isValidRoomCode("ABC"), false);
  assert.equal(isValidRoomCode(""), false);
});

test("Malformed messages decode to null rather than throwing", () => {
  assert.equal(decode("not json"), null);
  assert.equal(decode(""), null);
  assert.equal(decode("[1,2,3]").length, 3);
  assert.deepEqual(decode(encode({ type: "join" })), { type: "join" });
});

// gameResult means "did the player reading this screen win". The engine writes
// it for the local seat, so sending that value to every client told the online
// winner it had lost whenever the winner was not seat "player".
test("each client is told its own result, but who won is public", () => {
  const state = makeGame();
  state.isGameOver = true;
  state.gameResult = "loss";
  state.winnerPlayerIds = ["player2"];
  state.standings = [
    { playerId: "player2", name: "プレイヤー2", score: 68, mc: 100 },
    { playerId: "player", name: "プレイヤー1", score: 20, mc: 100 },
    { playerId: "player3", name: "プレイヤー3", score: 5, mc: 100 }
  ];

  assert.equal(viewForPlayer(state, "player2").gameResult, "win", "the winner is told it won");
  assert.equal(viewForPlayer(state, "player").gameResult, "loss");
  assert.equal(viewForPlayer(state, "player3").gameResult, "loss");

  for (const id of ["player", "player2", "player3"]) {
    const view = viewForPlayer(state, id);
    assert.deepEqual(view.winnerPlayerIds, ["player2"], "the winner is public to everyone");
    assert.equal(view.standings.length, 3, "final scores are public once the game is over");
  }
});

test("a game with no winner list keeps the engine's result", () => {
  const state = makeGame();
  state.isGameOver = true;
  state.gameResult = "win";
  state.winnerPlayerIds = null;
  assert.equal(viewForPlayer(state, "player").gameResult, "win", "solo and old saves pass through");
});
