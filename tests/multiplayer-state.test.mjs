import assert from "node:assert/strict";
import test from "node:test";
import { getInitialState, triggerProduction, handleActionSpend } from "../app/game-logic.js";
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

  // Each player gains TR (14) + their own MC production on top of the starting 42.
  assert.deepEqual(
    after.players.map(p => p.mc),
    [57, 61, 65]
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

test("withLegacyPlayerAccessors is safe to apply twice", () => {
  const state = withLegacyPlayerAccessors(withLegacyPlayerAccessors(getInitialState()));
  state.mc = 5;
  assert.equal(state.players[0].mc, 5);
});
