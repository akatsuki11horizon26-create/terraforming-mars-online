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
import { loadSavedState, serializeSavedState } from "../app/save-migration.js";
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

test("Robotic Workforce requires a playable building production box", () => {
  const state = getInitialState();
  const card = ALL_CARDS.find(item => item.id === "card-base-robotic-workforce");

  assert.equal(getCardPlayableStatus(card, state).playable, false);
  state.playedProjects = ["p-mars-university"];
  assert.equal(getCardPlayableStatus(card, state).playable, false);
  state.playedProjects = ["p-mine"];
  assert.equal(getCardPlayableStatus(card, state).playable, true);
});

test("Robotic Workforce copies the selected building production persistently", () => {
  const state = getInitialState();
  const card = ALL_CARDS.find(item => item.id === "card-base-robotic-workforce");
  state.playedProjects = [card.id, "p-power-plant", "p-mine"];
  const started = applyCardEffect(state, card, state.logs);

  assert.equal(started.status, "pending");
  assert.deepEqual(started.pendingChoice.options.map(option => option.cardId), ["p-power-plant", "p-mine"]);

  const pendingReload = loadSavedState(serializeSavedState(started.state));
  assert.equal(pendingReload.pendingChoice.kind, "building-production");
  assert.equal(Object.values(pendingReload.pendingChoice).some(value => typeof value === "function"), false);

  const resolved = resolvePendingChoice(pendingReload, "p-mine", started.logs, "player");
  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.state.players[0].steelProd, 1);
  assert.deepEqual(resolved.state.players[0].copiedProductions, [
    { sourceCardId: "p-mine", production: { steel: 1 } }
  ]);

  const reloaded = loadSavedState(serializeSavedState(resolved.state));
  assert.deepEqual(reloaded.players[0].copiedProductions, resolved.state.players[0].copiedProductions);
  assert.equal(reloaded.players[0].steelProd, 1);
});

test("corporation setup applies official starting values", () => {
  const state = getInitialState();
  state.corporationOptions = ["corp-ecoline"];
  const nextState = applyCorporation(state, "corp-ecoline");
  // Without the Prelude expansion the seat moves straight to buying the
  // starting hand, which the rulebook requires before the first action phase.
  assert.equal(nextState.setupStep, "projects");
  assert.equal(nextState.mc, 36);
  assert.equal(nextState.plants, 3);
  assert.equal(nextState.plantsProd, 2);
});

test("first-action corporation effects resolve after Prelude setup", () => {
  const state = getInitialState({ prelude: true });
  state.corporationOptions = ["corp-inventrix"];
  const corporationState = applyCorporation(state, "corp-inventrix");
  corporationState.setupStep = "prelude";
  corporationState.preludeOptions = ["prelude-donation", "prelude-allied-banks"];
  corporationState.hand = ["p-power-plant"];
  const withPreludes = applyPreludes(corporationState, ["prelude-donation", "prelude-allied-banks"]);
  assert.equal(withPreludes.hand.length, 4);
  // Preludes resolve, then the starting hand is still bought before play.
  assert.equal(withPreludes.setupStep, "projects");
});

test("Prelude setup resolves two selected cards in order", () => {
  const state = getInitialState({ prelude: true });
  state.corporationOptions = ["corp-beginner"];
  const corporationState = applyCorporation(state, "corp-beginner");
  corporationState.setupStep = "prelude";
  corporationState.preludeOptions = ["prelude-allied-banks", "prelude-donation"];
  const nextState = applyPreludes(corporationState, ["prelude-allied-banks", "prelude-donation"]);
  assert.equal(nextState.setupStep, "projects");
  assert.equal(nextState.phase, "setup");
  assert.equal(nextState.mc, 66);
  assert.equal(nextState.mcProd, 4);
  assert.deepEqual(nextState.selectedPreludeIds, ["prelude-allied-banks", "prelude-donation"]);
});

test("Prelude optional payments are charged once", () => {
  const state = getInitialState({ prelude: true });
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
  const state = getInitialState({ prelude: true });
  state.corporationOptions = ["corp-beginner"];
  const corporationState = applyCorporation(state, "corp-beginner");
  corporationState.setupStep = "prelude";
  corporationState.preludeOptions = ["prelude-eccentric-sponsor", "prelude-donation"];
  corporationState.hand = ["p-power-plant"];
  const pending = applyPreludes(corporationState, ["prelude-eccentric-sponsor", "prelude-donation"]);
  const nextState = resolvePendingChoice(
    pending,
    pending.pendingChoice.options[0].id,
    pending.logs
  ).state;
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

// Project cards were all localized but preludes never were, so the Prelude
//選択 panel listed "Society Support" and "Biosphere Support" in a UI that is
// Japanese everywhere else. Corporations stay English on purpose: CrediCor and
// Ecoline are brand names and the Japanese edition prints them that way too.
test("preludes are named in Japanese, corporations keep their brand names", () => {
  const hasJapanese = text => /[ぁ-んァ-ヶ一-龠]/.test(text ?? "");

  const untranslated = PRELUDES.filter(prelude => !hasJapanese(prelude.name));
  assert.deepEqual(
    untranslated.map(prelude => prelude.englishName ?? prelude.name),
    [],
    "a prelude would show an English name in the selection panel"
  );

  // The English name is kept alongside so lookups by it still work.
  const society = PRELUDES.find(prelude => prelude.englishName === "Society Support");
  assert.ok(society, "preludes are still findable by their English name");
  assert.equal(society.name, "社会支援");

  assert.ok(
    CORPORATIONS.some(corporation => corporation.name === "CrediCor"),
    "corporation brand names are left alone"
  );
});

// "建材の価値が1 MC上昇" / "チタンの価値が1 MC上昇". Steel was hardcoded at 2 and
// titanium read only the corporation, so all three cards were inert. Note the
// reference implementation spells it "titanumValue" and the catalogue carries
// that typo through, so both spellings have to be honoured.
test("cards that raise the value of steel or titanium actually raise it", () => {
  const state = getInitialState({ board: "tharsis", mode: "solo" });
  state.players = state.players.map(player => ({
    ...player, steel: 5, titanium: 5, mc: 60
  }));
  const building = ALL_CARDS.find(card => card.tags.includes("Building") && card.cost >= 12);
  const space = ALL_CARDS.find(card => card.tags.includes("Space") && card.cost >= 15);

  const steelBefore = getCardPaymentCost(building, state, 1, 0);
  const titaniumBefore = getCardPaymentCost(space, state, 0, 1);

  const played = { ...state };
  played.players = state.players.map(player => ({
    ...player,
    playedProjects: [...player.playedProjects, "card-base-advanced-alloys"]
  }));

  assert.equal(getCardPaymentCost(building, played, 1, 0), steelBefore - 1,
    "Advanced Alloys makes each steel worth one more");
  assert.equal(getCardPaymentCost(space, played, 0, 1), titaniumBefore - 1,
    "Advanced Alloys makes each titanium worth one more");

  // Rego Plastics moves steel only and Mercurian Alloys titanium only, so a
  // single shared bonus would pass the assertions above and still be wrong.
  const withCard = cardId => {
    const next = { ...state };
    next.players = state.players.map(player => ({
      ...player, playedProjects: [...player.playedProjects, cardId]
    }));
    return next;
  };

  const rego = withCard("card-promo-rego-plastics");
  assert.equal(getCardPaymentCost(building, rego, 1, 0), steelBefore - 1, "Rego Plastics raises steel");
  assert.equal(getCardPaymentCost(space, rego, 0, 1), titaniumBefore, "Rego Plastics leaves titanium alone");

  const mercurian = withCard("card-promo-mercurian-alloys");
  assert.equal(getCardPaymentCost(building, mercurian, 1, 0), steelBefore, "Mercurian Alloys leaves steel alone");
  assert.equal(getCardPaymentCost(space, mercurian, 0, 1), titaniumBefore - 1, "Mercurian Alloys raises titanium");
});

// Curated overrides are matched onto the generated catalog BY NAME, so a name
// that differs by a hyphen merges into nothing: the card keeps the catalog's
// empty spec and looks implemented while doing nothing. "Titan Air Scrapping"
// against the catalog's "Titan Air-scrapping" cost exactly that.
test("every curated override matches a catalog entry by name", async () => {
  const { FULL_PROJECTS, FULL_CORPORATIONS, FULL_PRELUDES } =
    await import("../app/full-card-catalog.js");
  const { ALL_CARDS, CORPORATIONS, PRELUDES } = await import("../app/game-logic.js");

  const catalogIds = new Set(
    [...FULL_PROJECTS, ...FULL_CORPORATIONS, ...FULL_PRELUDES].map(card => card.id)
  );

  // A card that exists in the catalog but reaches the game with an id the
  // catalog does not know means an override was added as a NEW card instead of
  // merging onto the existing one.
  const orphans = [...ALL_CARDS, ...CORPORATIONS, ...PRELUDES]
    .filter(card => !catalogIds.has(card.id))
    // Several id prefixes are deliberate hand-written cards rather than merges.
    .filter(card => !/^(p-|corp-|prelude-|c\d)/.test(card.id))
    .map(card => card.id);

  assert.deepEqual(orphans, [], "overrides that failed to merge onto their catalog entry");
});

// The Prelude and Prelude 2 boxes are sold and played separately. Enabling
// Prelude used to switch on both, so the "base + Prelude" shelf could not be
// dealt and 24 projects, 25 preludes and 5 corporations arrived uninvited.
test("Prelude and Prelude 2 are separate boxes", async () => {
  const { enabledExpansions, getInitialState } = await import("../app/game-logic.js");

  assert.deepEqual(
    [...enabledExpansions({ prelude: true, prelude2: false })].sort(),
    ["base", "prelude"],
    "Prelude alone must not drag Prelude 2 in"
  );
  assert.deepEqual(
    [...enabledExpansions({ prelude: false, prelude2: true })].sort(),
    ["base", "prelude2"],
    "and Prelude 2 stands on its own"
  );
  assert.deepEqual(
    [...enabledExpansions({ prelude: true, prelude2: true })].sort(),
    ["base", "prelude", "prelude2"]
  );

  // A caller from before the setting -- an old save, an older room -- said only
  // "prelude", and was playing with both. It keeps getting both.
  assert.deepEqual(
    [...enabledExpansions({ prelude: true })].sort(),
    ["base", "prelude", "prelude2"],
    "the old single flag still means both"
  );

  // Prelude 2 brings its own preludes, so a game with only that box still
  // deals four of them to choose from.
  const state = getInitialState({ playerCount: 2, prelude2: true, seed: 11 });
  assert.equal(state.preludeEnabled, true);
  assert.equal(state.players[0].preludeOptions.length, 4, "Prelude 2 deals its own preludes");
});

test("each prelude box only deals its own cards", async () => {
  const { getInitialState, PRELUDES } = await import("../app/game-logic.js");
  const boxOf = id => PRELUDES.find(prelude => prelude.id === id)?.expansion;

  const first = getInitialState({ playerCount: 2, prelude: true, prelude2: false, seed: 21 });
  const dealtFirst = first.players.flatMap(player => player.preludeOptions);
  assert.ok(dealtFirst.length > 0);
  assert.deepEqual([...new Set(dealtFirst.map(boxOf))], ["prelude"]);

  const second = getInitialState({ playerCount: 2, prelude: false, prelude2: true, seed: 21 });
  const dealtSecond = second.players.flatMap(player => player.preludeOptions);
  assert.ok(dealtSecond.length > 0);
  assert.deepEqual([...new Set(dealtSecond.map(boxOf))], ["prelude2"]);
});

// "428 projects" as a total identifies nothing, which is what the audit's §4.1
// said about the promo range. Every promo card upstream prints an official card
// number; data/promo-card-numbers.json carries them, and this pins the
// reconciliation so a promo card cannot go missing unnoticed.
test("every numbered promo card upstream exists here", async () => {
  const { readFileSync } = await import("node:fs");
  const manifest = JSON.parse(
    readFileSync(new URL("../data/promo-card-numbers.json", import.meta.url), "utf8")
  );
  const { ALL_CARDS, PRELUDES, CORPORATIONS } = await import("../app/game-logic.js");

  assert.ok(manifest.numbered > 80, `the manifest looks truncated: ${manifest.numbered}`);
  // The extraction must account for every file it read, not just the ones it
  // could parse.
  assert.equal(
    manifest.numbered + manifest.withoutNumber.length,
    manifest.filesRead,
    "every upstream promo file is either numbered or named as unnumbered"
  );

  const slug = text => String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  const ours = new Set();
  for (const card of [...ALL_CARDS, ...PRELUDES, ...CORPORATIONS]) {
    if (card.expansion !== "promo") continue;
    ours.add(slug(card.englishName ?? card.name));
    ours.add(slug(String(card.id).replace(/^(card|corp|prelude)-promo-/, "")));
  }

  const missing = manifest.cards
    .filter(entry => !ours.has(slug(entry.englishName)))
    .map(entry => `${entry.cardNumber} ${entry.englishName}`);
  assert.deepEqual(missing, [], `numbered promo cards not implemented here: ${missing.join(", ")}`);

  // And no card number is claimed twice, which would mean the extraction
  // misread a file rather than that two cards share one.
  const numbers = manifest.cards.map(entry => entry.cardNumber);
  assert.equal(new Set(numbers).size, numbers.length, "card numbers must be unique");
});

// The standard game and Corporate Era differ in one place upstream: without
// Corporate Era every player starts with 1 of each production instead of 0.
// The card set is NOT filtered by it (Game.ts:398 is the only place it is read
// outside the options object), so this is a starting-conditions setting, not a
// second catalogue.
test("the standard game starts everyone on 1 of each production", async () => {
  const { getInitialState, applyCorporation, getPlayer, CORPORATIONS } =
    await import("../app/game-logic.js");

  const PRODUCTION = ["mcProd", "steelProd", "titaniumProd", "plantsProd", "energyProd", "heatProd"];
  // CrediCor changes no production, so what is read below is the variant's own
  // starting floor rather than a corporation's gift.
  const neutral = CORPORATIONS.find(item => item.id === "corp-credicor");

  const seated = corporateEra => {
    const dealt = getInitialState({ playerCount: 2, corporateEra, seed: 12 });
    // The deal is random, so the neutral corporation has to be put in front of
    // each seat rather than hoped for -- applyCorporation refuses one that was
    // not offered, and the whole test would then assert on an untouched state.
    let state = {
      ...dealt,
      players: dealt.players.map(player => ({ ...player, corporationOptions: [neutral.id] }))
    };
    for (const player of state.players) {
      state = applyCorporation(state, neutral.id, player.id);
      assert.equal(getPlayer(state, player.id).corporationId, neutral.id, "the corporation was applied");
    }
    return getPlayer(state, "player");
  };

  const standard = seated(false);
  for (const key of PRODUCTION) {
    assert.equal(standard[key], 1, `${key} starts at 1 in the standard game`);
  }

  // Corporate Era is the default and starts at zero.
  const corporate = seated(true);
  for (const key of PRODUCTION) {
    assert.equal(corporate[key], 0, `${key} starts at 0 in Corporate Era`);
  }

  // Unstated means Corporate Era, which is what every existing save was played
  // with; changing that default would silently rewrite them.
  const unstated = getInitialState({ playerCount: 2, seed: 12 });
  assert.equal(unstated.corporateEra, true);
});
