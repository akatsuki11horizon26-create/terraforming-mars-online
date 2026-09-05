import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getInitialState, getCardPlayableStatus, ALL_CARDS, cloneGameState } from "../app/game-logic.js";
import { executeGameCommand, COMMAND, ERROR } from "../app/game-command.js";

// The room server is a Durable Object and cannot be imported under node:test,
// so these assert on its source. Each check below exists because a client can
// send any payload it likes over the socket.
const room = await readFile(new URL("../worker/room.ts", import.meta.url), "utf8");

// These used to grep worker/room.ts for `case "playCard":`. That switch was a
// second copy of the rules that COMMAND_MAP shadowed entirely -- it never ran,
// and the tests passed because the text existed, not because it worked. They
// now execute the command layer that actually serves the socket.
function actionState() {
  let state = cloneGameState(getInitialState({ playerCount: 2 }));
  state.phase = "action";
  state.players = state.players.map(p => ({ ...p, mc: 200, hand: [], playedProjects: [] }));
  return state;
}

const seatOf = state => state.players[0].id;

test("the engine alone does not prove a card is in hand", () => {
  // This is why the server has to check: with an empty hand most of the catalog
  // still reports as playable, because playability is about cost and
  // requirements, not possession.
  let state = getInitialState({ playerCount: 2 });
  state = cloneGameState(state);
  state.phase = "action";
  state.players = state.players.map(player => ({ ...player, mc: 200, hand: [] }));

  const playable = ALL_CARDS.filter(card => getCardPlayableStatus(card, state, 0, 0).playable);
  assert.ok(playable.length > 100, "most cards pass the engine check with no hand at all");
});

test("playCard refuses a card the sender does not hold", () => {
  const state = actionState();
  const seat = seatOf(state);
  // Most of the catalogue is "playable" with an empty hand, so possession is
  // the only thing standing between a client and any card it cares to name.
  const card = ALL_CARDS.find(c => getCardPlayableStatus(c, state, 0, 0).playable);
  assert.ok(card, "needed a playable card to attempt");

  const refused = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: seat, cardId: card.id });
  assert.equal(refused.ok, false, "a card not in hand must be refused");
  assert.equal(refused.error?.code, ERROR.CARD_NOT_IN_HAND);

  const held = { ...state, players: state.players.map(p => p.id === seat ? { ...p, hand: [card.id] } : p) };
  const accepted = executeGameCommand(held, { type: COMMAND.PLAY_CARD, playerId: seat, cardId: card.id });
  assert.equal(accepted.ok, true, "the same card in hand must be accepted");
});

test("cardAction refuses a card the sender has not played", () => {
  const state = actionState();
  const seat = seatOf(state);
  const active = ALL_CARDS.find(c => c.type === "active");
  assert.ok(active, "needed a blue card to attempt");

  const refused = executeGameCommand(state, { type: COMMAND.USE_CARD_ACTION, playerId: seat, cardId: active.id });
  assert.equal(refused.ok, false, "an unplayed card carries no action");
  assert.equal(refused.error?.code, ERROR.CARD_NOT_OWNED);

  // Owning a card that is not blue still must not yield an action.
  const passive = ALL_CARDS.find(c => c.type !== "active" && !c.effectSpec?.action);
  const owned = { ...state, players: state.players.map(p => p.id === seat ? { ...p, playedProjects: [passive.id] } : p) };
  const noAction = executeGameCommand(owned, { type: COMMAND.USE_CARD_ACTION, playerId: seat, cardId: passive.id });
  assert.equal(noAction.ok, false, "only cards with an action may be actioned");
  assert.equal(noAction.error?.code, ERROR.CARD_NOT_ACTIVE);
});

test("buyResearch refuses duplicate ids", () => {
  let state = cloneGameState(getInitialState({ playerCount: 2 }));
  const seat = seatOf(state);
  const offered = state.players[0].researchCards ?? [];
  assert.ok(offered.length > 0, "needed a research offer to attempt");

  // includes() alone accepts ["A","A","A"] against a single offered A, which
  // duplicated the card into the hand.
  const dupes = [offered[0], offered[0]];
  const refused = executeGameCommand(state, { type: COMMAND.BUY_RESEARCH, playerId: seat, cardIds: dupes });
  assert.equal(refused.ok, false, "the same card twice must be refused");

  const single = executeGameCommand(state, { type: COMMAND.BUY_RESEARCH, playerId: seat, cardIds: [offered[0]] });
  assert.equal(single.ok, true, "buying it once must still work");
});

test("a Helion payment spends heat instead of driving MC negative", () => {
  const state = actionState();
  const seat = seatOf(state);
  const card = ALL_CARDS.find(c => getCardPlayableStatus(c, state, 0, 0).playable && c.cost > 5);
  assert.ok(card, "needed a card with a real cost");

  const short = 3;
  const withHelion = {
    ...state,
    players: state.players.map(p =>
      p.id === seat
        ? { ...p, corporationId: "corp-helion", hand: [card.id], mc: card.cost - short, heat: 10 }
        : p
    )
  };

  const result = executeGameCommand(withHelion, { type: COMMAND.PLAY_CARD, playerId: seat, cardId: card.id });
  assert.equal(result.ok, true, "Helion may cover a shortfall with heat");
  const after = result.state.players.find(p => p.id === seat);
  assert.ok(after.mc >= 0, "MC must never go negative");
  assert.equal(after.heat, 10 - short, "heat pays exactly the shortfall");

  // The same shortfall without the effect is refused rather than absorbed.
  const withoutHelion = {
    ...state,
    players: state.players.map(p =>
      p.id === seat ? { ...p, hand: [card.id], mc: card.cost - short, heat: 10 } : p
    )
  };
  const refused = executeGameCommand(withoutHelion, { type: COMMAND.PLAY_CARD, playerId: seat, cardId: card.id });
  assert.equal(refused.ok, false, "no heat-as-money means no shortfall");
  const stillThere = refused.state.players.find(p => p.id === seat);
  assert.equal(stillThere.mc, card.cost - short, "a refused play must not spend anything");
});

test("every action the server handles is reachable from the UI", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  // COMMAND_MAP is now the only place the server declares what it accepts.
  const handled = new Set();
  for (const match of room.matchAll(/^\s+([a-zA-Z]+): COMMAND\./gm)) handled.add(match[1]);
  const sent = new Set(
    [...page.matchAll(/sendAction\("([a-zA-Z]+)"/g)].map(match => match[1])
  );

  // The UI used to send seven of the fourteen actions the server accepts, so
  // playing a card online changed nothing on the server and rolled back on the
  // next update. These are the ones a player must be able to reach.
  for (const action of [
    "playCard",
    "cardAction",
    "chooseCorporation",
    "choosePreludes",
    "buyResearch",
    "claimMilestone",
    "fundAward",
    "sendDelegate",
    "buildColony",
    "trade",
    "resolveChoice",
    "pass",
    "convertFinalGreenery",
    "finishFinalGreenery"
  ]) {
    assert.ok(handled.has(action), `the server must handle ${action}`);
    assert.ok(sent.has(action), `the UI must send ${action} online`);
  }
});

test("the server routes shared actions through the command layer", () => {
  // Anything in COMMAND_MAP is dispatched before the switch, so the server no
  // longer carries its own copy of these rules. The map is the contract.
  const map = room.slice(room.indexOf("COMMAND_MAP"), room.indexOf("private applyAction"));
  for (const action of [
    "playCard",
    "cardAction",
    "claimMilestone",
    "fundAward",
    "sendDelegate",
    "buildColony",
    "trade",
    "pass",
    "resolveChoice",
    "chooseCorporation",
    "choosePreludes",
    "convertFinalGreenery",
    "finishFinalGreenery"
  ]) {
    assert.match(map, new RegExp(`${action}: COMMAND\.`), `${action} must go through the command layer`);
  }

  // And the seat must come from the connection, not from what the client sent.
  const dispatch = room.slice(room.indexOf("const commandType"), room.indexOf("Every action the server accepts"));
  assert.match(dispatch, /playerId: seat/, "the authenticated seat must win");
  assert.doesNotMatch(dispatch, /playerId: payload/, "a client-supplied playerId must never be trusted");
});

// The server has its own turn guard in front of the command layer. The command
// layer deliberately exempts the answers every seat gives at once — corporation,
// preludes, drafting and buying research (SETUP_COMMANDS in game-command.js).
// The server did not, so once one seat had bought its research the other could
// never answer: the research phase never ended and no generation past the first
// could start. Playing a full two-seat game over the socket deadlocked at
// generation 2 every time.
test("the server exempts the same simultaneous answers the engine does", async () => {
  const source = await readFile(new URL("../worker/room.ts", import.meta.url), "utf8");

  const simultaneous = source.match(/SIMULTANEOUS_ACTIONS = new Set\(\[([\s\S]*?)\]\)/);
  assert.ok(simultaneous, "the server must name the actions it exempts");
  const exempt = [...simultaneous[1].matchAll(/"([a-zA-Z]+)"/g)].map(m => m[1]);

  for (const action of ["chooseCorporation", "choosePreludes", "draftPick", "buyResearch"]) {
    assert.ok(exempt.includes(action), `${action} is answered by every seat at once`);
  }

  // And the guard has to actually consult it, or the set is decoration.
  assert.match(
    source,
    /!isOwnPendingChoice && !isSimultaneous && state\.currentPlayerId !== seat/,
    "the turn guard must let a simultaneous answer through"
  );
});
