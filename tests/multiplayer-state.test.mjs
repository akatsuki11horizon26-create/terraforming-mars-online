import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  getPlaceholderState,
  triggerProduction,
  handleActionSpend,
  applyProduction,
  applyCardEffect,
  applyCorporation,
  applyPreludes,
  completeSetupPurchase,
  passPlayer,
  endTurn,
  getCardPlayableStatus,
  ALL_CARDS,
  CORPORATIONS
} from "../app/game-logic.js";
import { cloneGameState, withLegacyPlayerAccessors } from "../app/player-state.js";
import { loadSavedState, serializeSavedState, CURRENT_RULES_VERSION } from "../app/save-migration.js";

test("Solo state is the one-player case of the canonical shape", () => {
  const state = getInitialState();

  assert.equal(state.mode, "solo");
  assert.equal(state.players.length, 1);
  assert.equal(state.currentPlayerId, "player");
  assert.equal(state.turnOrder.length, 1);
  assert.equal(state.rulesVersion, CURRENT_RULES_VERSION);
  assert.equal(state.pendingChoice, null);

  const neutral = Object.values(state.board).filter(cell => cell.placedBy === "neutral");
  assert.equal(neutral.length, 4, "solo seeds two neutral cities and two greeneries");
});

test("Hotseat deals independent hands and skips neutral tiles", () => {
  const state = getInitialState({ playerCount: 3 });

  assert.equal(state.mode, "hotseat");
  assert.equal(state.players.length, 3);
  assert.equal(new Set(state.players.map(p => p.id)).size, 3);

  const neutral = Object.values(state.board).filter(cell => cell.placedBy === "neutral");
  assert.equal(neutral.length, 0, "multiplayer starts from an empty board");

  const hands = state.players.map(p => p.researchCards.join(","));
  assert.equal(new Set(hands).size, 3, "each player gets a distinct research hand");

  const corps = state.players.map(p => p.corporationOptions.join(","));
  assert.equal(new Set(corps).size, 3, "each player gets distinct corporation options");
});

test("Starting TR is 20, or 14 in the solo variant", () => {
  // The solo game opens lower because there is no opponent to race; the
  // 14-generation limit supplies the pressure instead.
  assert.deepEqual(getInitialState().players.map(p => p.tr), [14]);
  assert.deepEqual(getInitialState({ playerCount: 3 }).players.map(p => p.tr), [20, 20, 20]);

  // generationStartTr must match, or the first generation reports a false gain.
  const solo = getInitialState();
  assert.equal(solo.players[0].generationStartTr, 14);
  const hotseat = getInitialState({ playerCount: 2 });
  assert.ok(hotseat.players.every(p => p.generationStartTr === 20));
});

test("Player count is clamped to the supported range", () => {
  assert.equal(getInitialState({ playerCount: 9 }).players.length, 5);
  assert.equal(getInitialState({ playerCount: 0 }).players.length, 1);
});

test("Legacy accessors proxy the current player in both directions", () => {
  const state = getInitialState();

  assert.equal(state.mc, state.players[0].mc);
  state.mc = 77;
  assert.equal(state.players[0].mc, 77, "writes reach canonical state");

  state.players[0].steel = 5;
  assert.equal(state.steel, 5, "reads follow canonical state");
});

test("Legacy accessors never reach serialized saves", () => {
  const state = getInitialState();
  const parsed = JSON.parse(serializeSavedState(state));

  for (const field of ["mc", "tr", "hand", "steel", "playedProjects", "pendingOceans"]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(parsed, field),
      false,
      `${field} must not be serialized at the root`
    );
  }
  assert.equal(parsed.players[0].mc, 42);
});

test("Accessors survive cloning and engine calls", () => {
  const state = getInitialState();
  state.mc = 50;

  const cloned = cloneGameState(state);
  assert.equal(cloned.mc, 50, "clone keeps the accessor surface");

  const spent = handleActionSpend(state, state.logs);
  assert.equal(spent.mc, 50, "handleActionSpend keeps the accessor surface");
  assert.equal(spent.actionsRemaining, 1);
});

test("Production resolves for every player and rotates the first player", () => {
  const state = getInitialState({ playerCount: 3 });
  state.players[0].mcProd = 1;
  state.players[1].mcProd = 5;
  state.players[2].mcProd = 9;

  const after = triggerProduction(state, state.logs);

  // Each player gains TR (20 in multiplayer) + their own MC production on top of
  // the starting 42.
  assert.deepEqual(
    after.players.map(p => p.mc),
    [63, 67, 71]
  );
  assert.equal(after.firstPlayerId, "player2", "first player marker passes clockwise");
  assert.ok(
    after.players.every(p => p.researchCards.length === 4),
    "every player draws their own research cards"
  );
});

test("The 14-generation limit applies to solo only", () => {
  const solo = getInitialState();
  solo.generation = 14;
  assert.equal(triggerProduction(solo, solo.logs).phase, "final_greenery");

  const hotseat = getInitialState({ playerCount: 2 });
  hotseat.generation = 14;
  assert.equal(
    triggerProduction(hotseat, hotseat.logs).phase,
    "research",
    "multiplayer continues until the global parameters are complete"
  );
});

test("A version 3 save is converted to a solo game rather than discarded", () => {
  const legacy = {
    rulesVersion: 3,
    generation: 5,
    generationStartTr: 20,
    phase: "action",
    setupStep: "done",
    turnStep: "start",
    pendingOceans: 2,
    researchCards: ["a"],
    corporationOptions: ["c1"],
    corporationId: "c1",
    preludeOptions: [],
    selectedPreludeIds: ["p1"],
    cardPlacements: { x: "0,0" },
    cardResources: { x: 3 },
    tr: 25,
    mc: 31,
    steel: 4,
    titanium: 1,
    plants: 7,
    energy: 2,
    heat: 6,
    hand: ["h1", "h2"],
    playedProjects: ["x"],
    board: { "0,0": { q: 0, r: 0, tileType: "city", placedBy: "player" } },
    deck: ["d1"],
    discardPile: [],
    temperature: -10,
    oxygen: 3,
    oceans: 4,
    logs: []
  };

  const restored = loadSavedState(JSON.stringify(legacy));

  assert.ok(restored, "a valid v3 save must survive the upgrade");
  assert.equal(restored.rulesVersion, CURRENT_RULES_VERSION);
  assert.equal(restored.mode, "solo");
  assert.equal(restored.players.length, 1);
  assert.equal(restored.players[0].mc, 31);
  assert.equal(restored.players[0].tr, 25);
  assert.deepEqual(restored.players[0].hand, ["h1", "h2"]);
  assert.equal(restored.mc, 31, "accessors are attached after restore");

  assert.ok(restored.pendingChoice, "pendingOceans becomes a pending choice");
  assert.equal(restored.pendingChoice.kind, "ocean-placement");
  assert.equal(restored.pendingChoice.continuation.remaining, 2);
  assert.equal(restored.pendingChoice.ownerPlayerId, "player");
});

test("A version 4 save round-trips unchanged", () => {
  const state = getInitialState({ playerCount: 2 });
  state.players[0].mc = 11;
  state.players[1].mc = 22;

  const restored = loadSavedState(serializeSavedState(state));

  assert.ok(restored);
  assert.equal(restored.mode, "hotseat");
  assert.deepEqual(
    restored.players.map(p => p.mc),
    [11, 22]
  );
  assert.equal(restored.mc, 11);
});

test("Corrupt and unknown saves are rejected", () => {
  assert.equal(loadSavedState("not json"), null);
  assert.equal(loadSavedState(JSON.stringify({ rulesVersion: 99 })), null);
  assert.equal(loadSavedState(JSON.stringify({ rulesVersion: 4, phase: "action" })), null);
  assert.equal(loadSavedState(null), null);

  const duplicateIds = {
    ...JSON.parse(serializeSavedState(getInitialState({ playerCount: 2 })))
  };
  duplicateIds.players[1].id = "player";
  assert.equal(loadSavedState(JSON.stringify(duplicateIds)), null, "duplicate player ids are invalid");
});

test("The placeholder state is deterministic so hydration matches", () => {
  const first = JSON.stringify({ ...getPlaceholderState() });
  const second = JSON.stringify({ ...getPlaceholderState() });
  assert.equal(first, second, "two calls must produce identical state");

  const state = getPlaceholderState();
  assert.equal(Object.keys(state.board).length, 61);
  assert.equal(
    Object.values(state.board).filter(cell => cell.placedBy !== null).length,
    0,
    "no neutral tiles, because placing them consumes the shuffled deck"
  );
  assert.equal(state.deck.length, 0);
  assert.equal(state.players[0].corporationOptions.length, 0);
  assert.equal(state.phase, "setup");
  assert.equal(state.mc, 42, "legacy accessors are attached");
});

test("Re-attaching accessors repairs a state that was spread", () => {
  // page.tsx builds next states with `{ ...gameState }`, which drops the
  // non-enumerable accessors and made gameState.playedProjects undefined.
  const state = getInitialState();
  const spread = { ...state };
  assert.equal(spread.playedProjects, undefined, "a bare spread loses the accessors");

  const repaired = withLegacyPlayerAccessors(spread);
  assert.ok(Array.isArray(repaired.playedProjects));
  assert.equal(repaired.mc, 42);

  repaired.mc = 7;
  assert.equal(repaired.players[0].mc, 7, "writes still reach canonical state");

  const json = JSON.parse(JSON.stringify({ ...repaired }));
  assert.equal(
    Object.prototype.hasOwnProperty.call(json, "mc"),
    false,
    "repairing must not make the accessors serializable"
  );
});

test("Only MC production may go negative", () => {
  const state = getInitialState();

  // Cards that reduce production cannot push a track below zero; MC is the one
  // exception and floors at -5.
  state.players[0].energyProd = 1;
  applyProduction(state, { energy: -3 });
  assert.equal(state.players[0].energyProd, 0, "energy production floors at zero");

  state.players[0].plantsProd = 0;
  applyProduction(state, { plants: -2 });
  assert.equal(state.players[0].plantsProd, 0);

  state.players[0].mcProd = 0;
  applyProduction(state, { mc: -9 });
  assert.equal(state.players[0].mcProd, -5, "MC production floors at -5");
});

test("Auto-placed tiles belong to the acting player", () => {
  const state = getInitialState({ playerCount: 3 });
  state.currentPlayerId = "player2";

  const card = ALL_CARDS.find(item => item.id === "p-ice-asteroid");
  const result = applyCardEffect(state, card, state.logs);

  // Ice Asteroid places oceans, which are unowned, so drive a city instead: the
  // point is that nothing is credited to the first seat by default.
  const resolved = result.status === "pending" ? result.state : result.state;
  const misattributed = Object.values(resolved.board).filter(
    cell => cell.placedBy === "player" && cell.tileType !== "empty"
  );
  assert.equal(
    misattributed.length,
    0,
    "a card played by player2 must not credit tiles to player"
  );
});

test("Hotseat setup hands the seat to each player in turn", () => {
  let state = getInitialState({ playerCount: 3 });
  assert.equal(state.currentPlayerId, "player");

  const seats = [];
  for (let i = 0; i < 3; i++) {
    const player = state.players.find(p => p.id === state.currentPlayerId);
    seats.push(player.id);
    state = applyCorporation(state, player.corporationOptions[0]);
  }

  assert.deepEqual(seats, ["player", "player2", "player3"], "every player picks in turn");
  assert.ok(
    state.players.every(p => p.corporationId),
    "nobody is skipped"
  );
  assert.equal(state.phase, "setup", "preludes still have to be chosen");
});

test("The game only starts once every player has finished setup", () => {
  let state = getInitialState({ playerCount: 3 });

  for (let i = 0; i < 3; i++) {
    const player = state.players.find(p => p.id === state.currentPlayerId);
    state = applyCorporation(state, player.corporationOptions[0]);
  }

  let guard = 0;
  while (state.phase === "setup" && guard++ < 20) {
    const player = state.players.find(p => p.id === state.currentPlayerId);
    if (player.preludeOptions.length >= 2) {
      state = applyPreludes(state, player.preludeOptions.slice(0, 2));
      continue;
    }
    // Each player buys their starting hand before the first action phase.
    state = completeSetupPurchase(state);
  }

  assert.equal(state.phase, "action");
  assert.equal(state.currentPlayerId, state.firstPlayerId);
  assert.ok(state.players.every(p => p.setupStep === "complete"));
  assert.ok(state.players.every(p => p.actionsRemaining === 2));
});

test("Blank player names fall back to the default", () => {
  assert.deepEqual(
    getInitialState({ playerCount: 2, playerNames: ["", "  "] }).players.map(p => p.name),
    ["プレイヤー1", "プレイヤー2"]
  );
  assert.deepEqual(
    getInitialState({ playerCount: 2, playerNames: ["アリス"] }).players.map(p => p.name),
    ["アリス", "プレイヤー2"]
  );
});

test("Every corporation can be chosen without crashing", () => {
  // Only the curated corporations declare `effects`, but the engine reads
  // corporation.effects.* unguarded in many places.
  for (const corporation of CORPORATIONS) {
    const state = getInitialState();
    state.players[0].corporationOptions = [corporation.id];
    assert.doesNotThrow(
      () => applyCorporation(state, corporation.id),
      `${corporation.id} must not crash setup`
    );
  }
});

test("withLegacyPlayerAccessors is safe to apply twice", () => {
  const state = withLegacyPlayerAccessors(withLegacyPlayerAccessors(getInitialState()));
  state.mc = 5;
  assert.equal(state.players[0].mc, 5);
});

test("A turn is two actions, then the seat passes on", () => {
  let state = getInitialState({ playerCount: 3 });
  state.phase = "action";

  state = handleActionSpend(state, state.logs);
  assert.equal(state.currentPlayerId, "player", "one action does not end the turn");
  assert.equal(state.turnStep, "one_action_taken");

  state = handleActionSpend(state, state.logs);
  assert.equal(state.currentPlayerId, "player2", "the second action hands the seat on");
  assert.equal(state.actionsRemaining, 2, "the next player gets a full turn");
});

test("Solo keeps the seat rather than passing it to nobody", () => {
  let state = getInitialState();
  state.phase = "action";
  state = handleActionSpend(state, state.logs);
  state = handleActionSpend(state, state.logs);

  assert.equal(state.currentPlayerId, "player");
  assert.equal(state.actionsRemaining, 2);
});

test("One player passing does not end the generation", () => {
  let state = getInitialState({ playerCount: 3 });
  state.phase = "action";
  const generation = state.generation;

  let result = passPlayer(state, state.logs, "player");
  assert.equal(result.generationEnded, false);
  assert.equal(result.state.generation, generation, "production waits for everyone");
  assert.equal(result.state.currentPlayerId, "player2");

  result = passPlayer(result.state, result.logs, "player2");
  assert.equal(result.generationEnded, false);
  assert.equal(result.state.generation, generation);

  result = passPlayer(result.state, result.logs, "player3");
  assert.equal(result.generationEnded, true, "the last pass ends the generation");
  assert.equal(result.state.generation, generation + 1);
  assert.ok(
    result.state.players.every(player => !player.passed),
    "the new generation clears every pass"
  );
});

test("Passed players are skipped in the turn order", () => {
  let state = getInitialState({ playerCount: 3 });
  state.phase = "action";
  state = passPlayer(state, state.logs, "player2").state;

  state.currentPlayerId = "player";
  state = handleActionSpend(state, state.logs);
  state = handleActionSpend(state, state.logs);

  assert.equal(state.currentPlayerId, "player3", "player2 has passed and is skipped");
});

test("A pass is final for the generation", () => {
  const state = getInitialState({ playerCount: 2 });
  state.phase = "action";
  const passed = passPlayer(state, state.logs, "player").state;

  // Even if the turn is forced back to them, they cannot act.
  passed.currentPlayerId = "player";
  const card = ALL_CARDS.find(item => item.id === "p-power-plant");
  const status = getCardPlayableStatus(card, passed, 0, 0);

  assert.equal(status.playable, false);
  assert.match(status.reason, /パス済み/);
});

test("Passing means taking no action that turn", () => {
  // The rulebook defines a pass as "１つもアクションを実行しなければ（パス）",
  // so it is a decision made before acting, not a way out after acting.
  let state = getInitialState({ playerCount: 3 });
  state.phase = "action";

  const passed = passPlayer(state, state.logs, "player");
  assert.equal(passed.state.players[0].passed, true, "passing before acting leaves the generation");
});

test("Ending a turn after one action is not a pass", () => {
  let state = getInitialState({ playerCount: 3 });
  state.phase = "action";
  state = handleActionSpend(state, state.logs);

  const result = passPlayer(state, state.logs, "player");

  assert.equal(result.endedTurnOnly, true);
  assert.equal(
    result.state.players[0].passed,
    false,
    "a player who has already acted stays in the generation"
  );
  assert.equal(result.state.currentPlayerId, "player2", "the seat still moves on");
  assert.equal(result.generationEnded, false);
});

test("A turn may be one action or two", () => {
  // "１回だけのアクションにも利点はあります" — stopping after one is a real choice.
  let state = getInitialState({ playerCount: 2 });
  state.phase = "action";
  state = handleActionSpend(state, state.logs);
  assert.equal(state.actionsRemaining, 1);

  const ended = endTurn(state, state.logs, "player");
  assert.equal(ended.state.currentPlayerId, "player2");
  assert.equal(ended.state.actionsRemaining, 2);
  assert.equal(ended.state.players[0].passed, false);
});

test("A generation's MC income never goes negative", () => {
  // "産出量がマイナスになる資源はＭ€のみで、それも「－５」が下限となります。
  //  ただし実際の収入では TR が基準となるため、各世代でのＭ€収入がマイナスに
  //  なることがありません"
  const state = getInitialState({ playerCount: 2 });
  state.players[0].tr = 3;
  state.players[0].mcProd = -5;
  state.players[0].mc = 10;

  const produced = triggerProduction(state, state.logs);
  assert.equal(produced.players[0].mc, 10, "income floors at zero rather than charging the player");

  // Ordinary cases are unaffected.
  const healthy = getInitialState({ playerCount: 2 });
  healthy.players[0].tr = 20;
  healthy.players[0].mcProd = 5;
  healthy.players[0].mc = 0;
  assert.equal(triggerProduction(healthy, healthy.logs).players[0].mc, 25);
});

test("MC production itself still floors at -5", () => {
  const state = getInitialState();
  applyProduction(state, { mc: -20 });
  assert.equal(state.players[0].mcProd, -5, "only MC may go negative, and only to -5");
});

test("each seat sets up its own corporation, not the current player's", async () => {
  const { getInitialState, applyCorporation, getPlayer } = await import("../app/game-logic.js");

  const state = getInitialState({ playerCount: 3 });
  // Online, the client that sends the choice is not necessarily the seated one.
  // Without a playerId the engine applied it to whoever held currentPlayerId,
  // so one client could pick everyone else's corporation.
  const third = getPlayer(state, "player3");
  const after = applyCorporation(state, third.corporationOptions[0], "player3");

  assert.equal(getPlayer(after, "player3").corporationId, third.corporationOptions[0]);
  assert.equal(getPlayer(after, "player").corporationId, null, "another seat is untouched");
  assert.equal(getPlayer(after, "player2").corporationId, null);
});

test("a player's view reads their own hand, not the seated player's", async () => {
  const { getInitialState, applyCorporation, getPlayer } = await import("../app/game-logic.js");
  const { viewForPlayer } = await import("../app/net-protocol.js");

  let state = getInitialState({ playerCount: 2 });
  const first = getPlayer(state, "player");
  state = applyCorporation(state, first.corporationOptions[0], "player");

  for (const viewer of ["player", "player2"]) {
    const view = viewForPlayer(state, viewer);
    // The legacy accessors follow currentPlayerId, so a plain spread left every
    // client reading whoever happened to hold the seat.
    assert.ok(Array.isArray(view.researchCards), `${viewer} must see its own research cards`);
    assert.equal(view.viewerId, viewer);
    assert.equal(view.turnHolderId, state.currentPlayerId, "who acts is reported separately");

    const opponent = view.players.find(player => player.id !== viewer);
    assert.equal(opponent.researchCards, undefined, "an opponent's cards stay hidden");
    assert.equal(typeof opponent.researchCardsCount, "number", "but their count is public");
  }
});
