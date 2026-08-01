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
  computeScore,
  getCardActionStatus,
  getCardEffect,
  getCardPaymentCost,
  getCardPlayableStatus,
  getInitialState,
  resolvePendingChoice,
} from "../app/game-logic.js";
import {
  FULL_CATALOG_COUNTS,
  FULL_GLOBAL_EVENTS,
  FULL_STANDARD_ACTIONS,
  FULL_STANDARD_PROJECTS,
} from "../app/full-card-catalog.js";

test("official project, corporation, and Prelude catalogs are stable", () => {
  assert.equal(ALL_CARDS.length, FULL_CATALOG_COUNTS.projects);
  assert.equal(CORPORATIONS.length, FULL_CATALOG_COUNTS.corporations);
  assert.equal(PRELUDES.length, FULL_CATALOG_COUNTS.preludes);
  assert.equal(FULL_CATALOG_COUNTS.projects, 428);
  assert.equal(FULL_CATALOG_COUNTS.standardProjects, 10);
  assert.equal(FULL_CATALOG_COUNTS.standardActions, 2);
  assert.equal(FULL_CATALOG_COUNTS.corporations, 49);
  assert.equal(FULL_CATALOG_COUNTS.preludes, 70);
  assert.equal(FULL_GLOBAL_EVENTS.length, 36);
  assert.equal(new Set(ALL_CARDS.map(card => card.id)).size, ALL_CARDS.length);
  assert.equal(new Set(CORPORATIONS.map(card => card.id)).size, CORPORATIONS.length);
  assert.equal(new Set(PRELUDES.map(card => card.id)).size, PRELUDES.length);
  const catalog = [...ALL_CARDS, ...FULL_STANDARD_PROJECTS, ...FULL_STANDARD_ACTIONS, ...CORPORATIONS, ...PRELUDES, ...FULL_GLOBAL_EVENTS];
  assert.ok(catalog.every(card => card.effectText && card.expansion && card.source));
  assert.ok(catalog.every(card => !card.effectText.includes("アイコン表記")));
});

test("corporation setup applies official starting values", () => {
  const state = getInitialState();
  state.corporationOptions = ["corp-ecoline"];
  const nextState = applyCorporation(state, "corp-ecoline");
  // Setup hands the seat on once a corporation is chosen; with preludes dealt
  // the same player moves straight to picking them.
  assert.equal(nextState.setupStep, "prelude");
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
  // Ice Asteroid places two oceans, and the player now picks each space, so the
  // effect pauses until both choices are resolved.
  let iceResult = applyCardEffect(state, iceAsteroid, []);
  assert.equal(iceResult.status, "pending");
  assert.equal(iceResult.pendingChoice.kind, "tile-placement");

  for (let i = 0; i < 2; i++) {
    assert.equal(iceResult.state.pendingChoice.kind, "tile-placement");
    const target = iceResult.state.pendingChoice.options[0];
    iceResult = resolvePendingChoice(iceResult.state, target.id, iceResult.logs, "player");
  }
  assert.equal(iceResult.status, "resolved");
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

test("generated catalog effects cover production, discounts, and dynamic VP", () => {
  const state = getInitialState();
  const earthCatapult = ALL_CARDS.find(card => (card.englishName ?? card.name) === "Earth Catapult");
  const adaptation = ALL_CARDS.find(card => (card.englishName ?? card.name) === "Adaptation Technology");
  const ants = ALL_CARDS.find(card => (card.englishName ?? card.name) === "Ants");
  const catapultResult = applyCardEffect(state, earthCatapult, []);
  assert.equal(catapultResult.state.cardDiscounts.all, 2);
  assert.equal(getCardPaymentCost({ ...ants, cost: 10 }, catapultResult.state), 8);
  const adaptationResult = applyCardEffect(state, adaptation, []);
  assert.equal(adaptationResult.state.globalRequirementBuffer, 2);
  const acquiredCompany = ALL_CARDS.find(card => (card.englishName ?? card.name) === "Acquired Company");
  assert.equal(getCardPlayableStatus({ ...acquiredCompany, cost: 0 }, adaptationResult.state).playable, true);
  const antResult = applyCardEffect(state, ants, []);
  antResult.state.cardResources[ants.id] = 4;
  antResult.state.playedProjects.push(ants.id);
  assert.equal(computeScore(antResult.state) - computeScore(state), 2);
  assert.equal(getCardEffect(earthCatapult).cardDiscount.amount, 2);
});
