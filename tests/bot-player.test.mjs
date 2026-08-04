import assert from "node:assert/strict";
import test from "node:test";
import * as engine from "../app/game-logic.js";
import {
  BOT_DIFFICULTIES,
  getBotDifficulty,
  makeBotRng,
  enumerateBotMoves,
  chooseBotMove,
  applyBotMove,
  runBotTurn,
  runBotResearch,
  advanceRobotGame
} from "../app/bot-player.js";

function seatedGame(playerCount = 2) {
  let state = engine.cloneGameState(engine.getInitialState({ playerCount }));
  for (let i = 0; i < playerCount; i++) {
    const seat = state.players.find(p => p.id === state.currentPlayerId);
    state = engine.applyCorporation(state, seat.corporationOptions[0]);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 20) {
    const seat = state.players.find(p => p.id === state.currentPlayerId);
    const next = engine.cloneGameState(state);
    next.hand = seat.researchCards.slice(0, 4);
    next.mc -= 12;
    state = engine.completeSetupPurchase(next);
  }
  return state;
}

test("The difficulties are ordered and resolvable by id", () => {
  assert.deepEqual(BOT_DIFFICULTIES.map(d => d.id), ["easy", "normal", "hard"]);
  assert.equal(getBotDifficulty("hard").id, "hard");
  assert.equal(getBotDifficulty("nonsense").id, "normal", "an unknown id falls back");
});

test("The bot rng is deterministic for a seed", () => {
  const a = makeBotRng(99);
  const b = makeBotRng(99);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test("A bot only considers moves it can actually afford", () => {
  const state = seatedGame();
  state.phase = "action";
  state.players = state.players.map(p => ({ ...p, mc: 0 }));

  const moves = enumerateBotMoves(state, "player2");
  assert.equal(
    moves.some(move => (move.cost ?? 0) > 0),
    false,
    "with no money nothing that costs money is offered"
  );
});

test("A bot's card resolves for the bot, not the human", () => {
  // Card effects apply to currentPlayerId. Applying a bot's move while the human
  // held the seat credited the human with the bot's production.
  const state = seatedGame();
  state.phase = "action";
  state.currentPlayerId = "player";

  const mine = engine.ALL_CARDS.find(card => card.id === "p-mine");
  state.players = state.players.map(p =>
    p.id === "player2" ? { ...p, mc: 60, hand: [mine.id] } : p
  );

  const move = { kind: "play", card: mine, cost: 4 };
  const after = applyBotMove(engine, state, "player2", move, state.logs).state;

  assert.equal(engine.getPlayer(after, "player2").steelProd, 1, "the bot gains the production");
  assert.equal(engine.getPlayer(after, "player").steelProd, 0, "the human gains nothing");
});

test("A bot takes a move when one is worth taking", () => {
  const state = seatedGame();
  state.phase = "action";
  state.players = state.players.map(p => ({ ...p, mc: 80 }));

  const rng = makeBotRng(4);
  const simulate = move => applyBotMove(engine, state, "player2", move, state.logs).state;
  const chosen = chooseBotMove(state, "player2", simulate, "normal", rng);

  assert.ok(chosen, "a funded bot with legal moves does not simply pass");
});

test("A bot with nothing to do passes and yields the seat", () => {
  const state = seatedGame();
  state.phase = "action";
  state.players = state.players.map(p => ({ ...p, mc: 0, hand: [], playedProjects: [] }));

  const result = runBotTurn(engine, state, state.currentPlayerId, "normal", makeBotRng(1));
  assert.equal(result.move, null);
  assert.equal(result.state.players.find(p => p.id === state.currentPlayerId).passed, true);
});

test("Research buying leaves the bot money to play what it bought", () => {
  const state = seatedGame();
  const before = engine.getPlayer(state, "player2");
  const offered = state.deck.slice(0, 4);
  state.players = state.players.map(p =>
    p.id === "player2" ? { ...p, researchCards: offered, mc: 30 } : p
  );

  const after = runBotResearch(engine, state, "player2", "normal");
  const bot = engine.getPlayer(after, "player2");

  assert.equal(bot.researchCards.length, 0, "the offer is always cleared");
  assert.ok(bot.mc >= 0, "a bot never overspends");
  assert.ok(bot.hand.length >= before.hand.length);
});

test("A robot game runs itself until the human is up again", () => {
  let state = seatedGame(2);
  state.phase = "action";
  state.currentPlayerId = "player2";
  state.players = state.players.map(p => ({ ...p, mc: 60 }));

  const advanced = advanceRobotGame(engine, state, "player", "normal", makeBotRng(5));

  assert.ok(
    advanced.currentPlayerId === "player" ||
      advanced.phase !== "action" ||
      advanced.players.every(p => p.passed),
    "control comes back to the human, or the generation has moved on"
  );
});

test("A robot game reaches an ending with every parameter maxed", () => {
  // Two bots left alone used to build production forever: oceans stayed at zero
  // and the game never finished.
  let state = seatedGame(2);
  const rng = makeBotRng(7);

  let guard = 0;
  while (guard++ < 800 && state.phase !== "final_greenery" && state.phase !== "game_over") {
    if (state.phase === "research") {
      for (const player of state.players) {
        state = runBotResearch(engine, state, player.id, "normal");
      }
      state = engine.cloneGameState(state);
      state.phase = "action";
      continue;
    }
    if (state.phase !== "action") break;
    state = runBotTurn(engine, state, state.currentPlayerId, "normal", rng).state;
  }

  assert.equal(state.phase, "final_greenery", "the game ends");
  assert.equal(state.temperature, 8);
  assert.equal(state.oxygen, 14);
  assert.equal(state.oceans, 9);
});

test("A robot game records its difficulty so a reload keeps it", async () => {
  const { loadSavedState, serializeSavedState } = await import("../app/save-migration.js");
  const state = engine.getInitialState({
    playerCount: 2,
    mode: "robot",
    botDifficulty: "hard"
  });

  assert.equal(state.mode, "robot");
  assert.equal(state.botDifficulty, "hard");

  const restored = loadSavedState(serializeSavedState(state));
  assert.equal(restored.botDifficulty, "hard", "the opponent does not change strength on reload");
});
