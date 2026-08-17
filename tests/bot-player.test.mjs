import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  runBotSetup,
  resolveBotChoices,
  advanceRobotGame,
  BOT_STANDARD_PROJECTS
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
  state.players = state.players.map(p => ({
    ...p,
    mc: 0,
    steel: 0,
    titanium: 0,
    plants: 0,
    heat: 0
  }));

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
  // Six corporations start with steel production, and which one a seat drew is
  // random. Zero it so the assertion measures the card, not the shuffle.
  state.players = state.players.map(p =>
    p.id === "player2"
      ? { ...p, mc: 60, hand: [mine.id], steelProd: 0 }
      : { ...p, steelProd: 0 }
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
  state.phase = "research";
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

test("the same decision seed produces the same move", () => {
  const state = seatedGame();
  state.phase = "action";
  state.currentPlayerId = "player2";
  state.players = state.players.map(player => ({ ...player, mc: 80 }));
  const pick = () => chooseBotMove(
    state,
    "player2",
    move => applyBotMove(engine, state, "player2", move, state.logs).state,
    "easy",
    makeBotRng(2026)
  );
  const key = move => `${move?.kind}:${move?.card?.id ?? move?.project?.id ?? move?.id ?? ""}`;
  assert.equal(key(pick()), key(pick()));
});

test("the same seed reproduces a complete sequence of bot decisions", () => {
  const initial = seatedGame();
  initial.phase = "action";
  initial.players = initial.players.map(player => ({ ...player, mc: 80 }));
  const replay = () => {
    let state = engine.cloneGameState(initial);
    const rng = makeBotRng(20260813);
    const decisions = [];
    for (let step = 0; step < 24 && state.phase === "action"; step++) {
      const turn = runBotTurn(engine, state, state.currentPlayerId, "normal", rng);
      decisions.push(`${turn.move?.kind ?? "pass"}:${turn.move?.card?.id ?? turn.move?.project?.id ?? turn.move?.id ?? ""}`);
      state = turn.state;
    }
    return {
      decisions,
      state: JSON.parse(JSON.stringify({
        ...state,
        logs: state.logs.map(log => Object.fromEntries(
          Object.entries(log).filter(([key]) => !["id", "timestamp"].includes(key))
        ))
      }))
    };
  };
  assert.deepEqual(replay(), replay());
});

test("difficulty levels use distinct search policies", () => {
  assert.equal(getBotDifficulty("easy").candidateRatio, 0.6);
  assert.equal(getBotDifficulty("normal").lookahead, 0);
  assert.equal(getBotDifficulty("hard").lookahead, 2);
  assert.ok(getBotDifficulty("hard").weightScale.vp > getBotDifficulty("easy").weightScale.vp);
});

test("A robot resolves and finishes its final greenery opportunity", () => {
  const state = seatedGame(2);
  state.phase = "final_greenery";
  state.currentPlayerId = "player2";
  state.oxygen = 7;
  state.board = Object.fromEntries(Object.entries(state.board).map(([key, cell]) => [
    key,
    { ...cell, bonusType: "none", bonusAmount: 0, bonus: null }
  ]));
  state.players = state.players.map(player => ({
    ...player,
    plants: player.id === "player2" ? 8 : 0,
    passed: player.id === "player"
  }));
  const before = engine.getPlayer(state, "player2");

  const finished = advanceRobotGame(engine, state, "player", "normal", makeBotRng(3));

  assert.equal(finished.phase, "game_over");
  assert.equal(finished.isGameOver, true);
  assert.equal(engine.getPlayer(finished, "player2").plants, 0);
  assert.equal(engine.getPlayer(finished, "player2").tr, before.tr);
  assert.equal(finished.oxygen, state.oxygen);
  assert.equal(
    Object.values(finished.board).filter(cell => cell.tileType === "forest" && cell.placedBy === "player2").length,
    1
  );
});

test("a robot resolves a queued event choice outside the action phase", () => {
  const state = seatedGame();
  const bot = engine.getPlayer(state, "player2");
  const cardId = bot.hand[0];
  state.phase = "research";
  state.pendingChoice = {
    id: "event-discard-test",
    kind: "event-discard",
    ownerPlayerId: "player2",
    prompt: "discard",
    optional: false,
    options: [{ id: cardId, cardId, label: cardId }],
    continuation: {
      sourceKind: "global-event",
      sourceId: "test-event",
      stage: "event-discard-0",
      consumedAction: false,
      paid: true,
      remaining: 1
    }
  };

  const after = advanceRobotGame(engine, state, "player", "normal", makeBotRng(5));
  assert.equal(after.pendingChoice, null);
  assert.equal(engine.getPlayer(after, "player2").hand.includes(cardId), false);
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

test("a bot's standard projects move each parameter exactly once", () => {
  const state = seatedGame();
  state.phase = "action";
  state.players = state.players.map(p => ({ ...p, mc: 80 }));

  const before = { oceans: state.oceans, oxygen: state.oxygen };
  const beforeTr = engine.getPlayer(state, "player2").tr;

  // placeTileAt already raises the parameter and TR. The bot added them again,
  // so one ocean project moved the track two steps and paid two TR.
  const ocean = BOT_STANDARD_PROJECTS.find(project => project.id === "ocean");
  const afterOcean = resolveBotChoices(
    engine,
    applyBotMove(engine, state, "player2", { kind: "standard", project: ocean }, []).state,
    "player2",
    makeBotRng(1)
  );
  assert.equal(afterOcean.oceans, before.oceans + 1, "one ocean per project");
  assert.equal(engine.getPlayer(afterOcean, "player2").tr, beforeTr + 1, "and one TR");

  const greenery = BOT_STANDARD_PROJECTS.find(project => project.id === "greenery");
  const afterGreenery = resolveBotChoices(
    engine,
    applyBotMove(engine, state, "player2", { kind: "standard", project: greenery }, []).state,
    "player2",
    makeBotRng(1)
  );
  assert.equal(afterGreenery.oxygen, before.oxygen + 1, "one oxygen per greenery");
  assert.equal(engine.getPlayer(afterGreenery, "player2").tr, beforeTr + 1);
});

test("the bot exposes all eight standard projects without a second implementation", () => {
  assert.deepEqual(
    BOT_STANDARD_PROJECTS.map(project => project.commandId).sort(),
    ["aquifer", "asteroid", "city", "convert-heat", "convert-plants", "greenery", "power-plant", "sell-patents"].sort()
  );
  assert.equal(BOT_STANDARD_PROJECTS.some(project => "apply" in project), false);
});

test("simulating choices never mutates the source state", () => {
  const state = seatedGame();
  state.phase = "action";
  state.currentPlayerId = "player2";
  state.players = state.players.map(player => ({ ...player, mc: 80 }));
  const before = JSON.stringify(state);
  const simulate = move => applyBotMove(engine, state, "player2", move, state.logs).state;
  chooseBotMove(state, "player2", simulate, "hard", makeBotRng(44));
  assert.equal(JSON.stringify(state), before);
});

test("an opponent's private hand cannot change the bot's decision", () => {
  const first = seatedGame();
  first.phase = "action";
  first.currentPlayerId = "player2";
  first.players = first.players.map(player => ({ ...player, mc: 80 }));
  const second = engine.cloneGameState(first);
  second.players = second.players.map(player =>
    player.id === "player" ? { ...player, hand: ["totally-private-card"] } : player
  );
  const pick = state => chooseBotMove(
    state,
    "player2",
    move => applyBotMove(engine, state, "player2", move, state.logs).state,
    "normal",
    makeBotRng(101)
  );
  const normalize = move => move && { kind: move.kind, id: move.id, cardId: move.card?.id, projectId: move.project?.id };
  assert.deepEqual(normalize(pick(first)), normalize(pick(second)));
});

test("setup is completed through bot commands", () => {
  const state = engine.getInitialState({ playerCount: 2, mode: "robot", prelude: true });
  const after = runBotSetup(engine, state, "player2", "normal", makeBotRng(8));
  const bot = engine.getPlayer(after, "player2");
  assert.ok(bot.corporationId);
  assert.equal(bot.setupStep, "projects", "preludes wait until every corporation has been selected");
});

test("choice scoring avoids attacking the bot itself", () => {
  const state = seatedGame();
  state.phase = "action";
  state.currentPlayerId = "player2";
  state.players = state.players.map(player => ({
    ...player,
    plants: player.id === "player2" ? 4 : 1
  }));
  state.pendingChoice = {
    id: "attack",
    kind: "resource-attack",
    ownerPlayerId: "player2",
    optional: false,
    options: [
      { id: "self", targetPlayerId: "player2", label: "self" },
      { id: "other", targetPlayerId: "player", label: "other" }
    ],
    continuation: {
      sourceKind: "card",
      sourceId: "attack-test",
      stage: "resource-attack",
      consumedAction: false,
      payload: { resource: "plants", count: 4 }
    }
  };
  const after = resolveBotChoices(engine, state, "player2", makeBotRng(1));
  assert.notEqual(after, state);
  assert.equal(after.pendingChoice, null);
  assert.equal(engine.getPlayer(after, "player2").plants, 4);
  assert.equal(engine.getPlayer(after, "player").plants, 0);
});

test("a bot can pay for a building card with steel", () => {
  const state = seatedGame();
  const mine = engine.ALL_CARDS.find(card => card.id === "p-mine");
  state.phase = "action";
  state.currentPlayerId = "player2";
  state.players = state.players.map(player =>
    player.id === "player2"
      ? { ...player, mc: 0, steel: 2, hand: [mine.id], steelProd: 0 }
      : player
  );

  const move = enumerateBotMoves(state, "player2").find(candidate => candidate.card?.id === mine.id);
  assert.deepEqual(move.command.payment, { steel: 2, titanium: 0 });

  const after = applyBotMove(engine, state, "player2", move, state.logs).state;
  assert.equal(engine.getPlayer(after, "player2").steel, 0);
  assert.equal(engine.getPlayer(after, "player2").steelProd, 1);
});

test("Helion can pay for a bot card with heat", () => {
  const state = seatedGame();
  const mine = engine.ALL_CARDS.find(card => card.id === "p-mine");
  state.phase = "action";
  state.currentPlayerId = "player2";
  state.players = state.players.map(player =>
    player.id === "player2"
      ? {
          ...player,
          corporationId: "corp-helion",
          mc: 0,
          steel: 0,
          heat: mine.cost,
          hand: [mine.id],
          steelProd: 0
        }
      : player
  );

  const move = enumerateBotMoves(state, "player2").find(candidate => candidate.card?.id === mine.id);
  assert.ok(move);

  const after = applyBotMove(engine, state, "player2", move, state.logs).state;
  assert.equal(engine.getPlayer(after, "player2").heat, 0);
  assert.equal(engine.getPlayer(after, "player2").steelProd, 1);
});

test("a bot chases the milestones printed on the map it is playing", () => {
  const state = engine.getInitialState({ playerCount: 2, board: "hellas" });
  const seeded = engine.cloneGameState(state);
  seeded.phase = "action";
  seeded.players = seeded.players.map(p => ({ ...p, mc: 80, energyProd: 9 }));

  const moves = enumerateBotMoves(seeded, "player2");
  const milestones = moves.filter(move => move.kind === "milestone").map(move => move.id);

  // Energizer is a Hellas milestone; Tharsis has no such id.
  assert.ok(milestones.includes("energizer"), "the bot must see the Hellas milestones");
  assert.equal(milestones.includes("mayor"), false, "and not Tharsis's");
});

test("The human's research offer stays reachable when a robot holds the seat", async () => {
  // The first player marker passes each generation, so from generation 2 the
  // seat during research belongs to the robot. The driver effect waits for the
  // human's own researchCards, so whatever the panel renders has to be the
  // human's too — reading the current player's offer showed the robot's cards
  // (none, once it has bought) and the game could not be advanced by anyone.
  const state = engine.getInitialState({ playerCount: 2, mode: "robot" });
  state.phase = "research";
  state.currentPlayerId = "player2";
  state.players = state.players.map(player =>
    player.id === "player"
      ? { ...player, researchCards: ["card-a", "card-b"] }
      : { ...player, researchCards: [] }
  );

  const human = state.players.find(player => player.id === "player");
  assert.equal(human.researchCards.length, 2, "the human has an offer to answer");

  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.ok(
    !/\{activeState\.researchCards\.map\(/.test(page),
    "the research panel must not render the seat holder's offer via the accessor"
  );
});
