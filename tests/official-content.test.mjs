import assert from "node:assert/strict";
import test from "node:test";
import {
  ALL_CARDS,
  CORPORATIONS,
  PRELUDES,
  applyCardAction,
  applyCardEffect,
  applyCorporation,
  applyPreludes,
  getCardActionStatus,
  getInitialState,
} from "../app/game-logic.js";

test("official project, corporation, and Prelude catalogs are stable", () => {
  assert.equal(ALL_CARDS.length, 20);
  assert.equal(CORPORATIONS.length, 18);
  assert.equal(PRELUDES.length, 35);
  assert.equal(new Set(ALL_CARDS.map(card => card.id)).size, ALL_CARDS.length);
  assert.equal(new Set(CORPORATIONS.map(card => card.id)).size, CORPORATIONS.length);
  assert.equal(new Set(PRELUDES.map(card => card.id)).size, PRELUDES.length);
});

test("corporation setup applies official starting values", () => {
  const state = getInitialState();
  state.corporationOptions = ["corp-ecoline"];
  const nextState = applyCorporation(state, "corp-ecoline");
  assert.equal(nextState.setupStep, "projects");
  assert.equal(nextState.mc, 36);
  assert.equal(nextState.plants, 3);
  assert.equal(nextState.plantsProd, 2);
});

test("first-action corporation effects resolve after Prelude setup", () => {
  const state = getInitialState();
  state.corporationOptions = ["corp-inventrix"];
  const corporationState = applyCorporation(state, "corp-inventrix");
  corporationState.setupStep = "prelude";
  corporationState.preludeOptions = ["prelude-donation", "prelude-allied-banks"];
  corporationState.hand = ["p-power-plant"];
  const withPreludes = applyPreludes(corporationState, ["prelude-donation", "prelude-allied-banks"]);
  assert.equal(withPreludes.hand.length, 4);
  assert.equal(withPreludes.setupStep, "complete");
});

test("Prelude setup resolves two selected cards in order", () => {
  const state = getInitialState();
  state.corporationOptions = ["corp-beginner"];
  const corporationState = applyCorporation(state, "corp-beginner");
  corporationState.setupStep = "prelude";
  corporationState.preludeOptions = ["prelude-allied-banks", "prelude-donation"];
  const nextState = applyPreludes(corporationState, ["prelude-allied-banks", "prelude-donation"]);
  assert.equal(nextState.setupStep, "complete");
  assert.equal(nextState.phase, "action");
  assert.equal(nextState.mc, 66);
  assert.equal(nextState.mcProd, 4);
  assert.deepEqual(nextState.selectedPreludeIds, ["prelude-allied-banks", "prelude-donation"]);
});

test("Prelude optional payments are charged once", () => {
  const state = getInitialState();
  state.corporationOptions = ["corp-beginner"];
  const corporationState = applyCorporation(state, "corp-beginner");
  corporationState.setupStep = "prelude";
  corporationState.preludeOptions = ["prelude-business-empire", "prelude-galilean-mining"];
  const nextState = applyPreludes(corporationState, ["prelude-business-empire", "prelude-galilean-mining"]);
  assert.equal(nextState.mc, 31);
  assert.equal(nextState.mcProd, 6);
  assert.equal(nextState.titaniumProd, 2);
});

test("Prelude free-play effects resolve a card from the starting hand", () => {
  const state = getInitialState();
  state.corporationOptions = ["corp-beginner"];
  const corporationState = applyCorporation(state, "corp-beginner");
  corporationState.setupStep = "prelude";
  corporationState.preludeOptions = ["prelude-eccentric-sponsor", "prelude-donation"];
  corporationState.hand = ["p-power-plant"];
  const nextState = applyPreludes(corporationState, ["prelude-eccentric-sponsor", "prelude-donation"]);
  assert.deepEqual(nextState.hand, []);
  assert.deepEqual(nextState.playedProjects, ["p-power-plant"]);
  assert.equal(nextState.energyProd, 1);
});

test("official automated and active effects mutate the correct resources", () => {
  const state = getInitialState();
  const powerPlant = ALL_CARDS.find(card => card.id === "p-power-plant");
  const iceAsteroid = ALL_CARDS.find(card => card.id === "p-ice-asteroid");
  const powerResult = applyCardEffect(state, powerPlant, []);
  assert.equal(powerResult.state.energyProd, 1);
  const iceResult = applyCardEffect(state, iceAsteroid, []);
  assert.equal(iceResult.state.oceans, 2);
});

test("active card action enforces payment and applies its effect", () => {
  const state = getInitialState();
  state.phase = "action";
  state.energy = 4;
  const steelworks = ALL_CARDS.find(card => card.id === "p-steelworks");
  assert.equal(getCardActionStatus(state, steelworks).playable, true);
  const result = applyCardAction(state, steelworks, []);
  assert.equal(result.playable, true);
  assert.equal(result.state.energy, 0);
  assert.equal(result.state.steel, 2);
  assert.equal(result.state.oxygen, 1);
});
