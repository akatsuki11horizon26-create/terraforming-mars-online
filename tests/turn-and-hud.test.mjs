import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getInitialState,
  handleActionSpend,
  passPlayer
} from "../app/game-logic.js";

test("A turn allows two actions before the seat moves on", () => {
  let state = getInitialState({ playerCount: 2 });
  state.phase = "action";

  state = handleActionSpend(state, state.logs);
  assert.equal(state.players[0].actionsRemaining, 1);
  assert.equal(state.turnStep, "one_action_taken");
  assert.equal(state.currentPlayerId, "player", "the seat holds for a second action");

  state = handleActionSpend(state, state.logs);
  assert.equal(state.currentPlayerId, "player2", "the seat moves on after two actions");
  assert.equal(state.turnStep, "start");
});

test("Passing after one action ends the turn without leaving the generation", () => {
  // The rulebook separates "take no action this turn" (a real pass, which drops
  // you out of the generation) from ending a turn after acting once.
  let state = getInitialState({ playerCount: 2 });
  state.phase = "action";
  state = handleActionSpend(state, state.logs);

  const result = passPlayer(state, state.logs, "player");
  assert.equal(result.endedTurnOnly, true);
  assert.equal(result.generationEnded, false);
  assert.equal(result.state.players[0].passed, false, "acting first means this is not a hard pass");
  assert.equal(result.state.currentPlayerId, "player2");
});

test("Passing with a full turn is a hard pass", () => {
  const state = getInitialState({ playerCount: 2 });
  state.phase = "action";

  const result = passPlayer(state, state.logs, "player");
  assert.equal(result.state.players[0].passed, true);
});

// The app now opens on the title screen, so the in-game markup is not in the
// server-rendered HTML. These assertions read the source that produces it.
async function pageSource() {
  return readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
}

async function titleHtml() {
  return readFile(new URL("../static-dist/index.html", import.meta.url), "utf8");
}

test("The default view keeps the on-demand panels shut", async () => {
  const title = await titleHtml();
  // Nothing from the play screen leaks into the entry point.
  assert.equal(title.includes("drawer-scrim"), false, "no drawer is open on load");
  assert.equal(title.includes("log-container"), false, "the mission log is not rendered up front");

  const source = await pageSource();
  for (const label of ["惑星データ", "標準プロジェクト", "マイルストーン / 表彰", "タイル凡例", "ミッションログ"]) {
    assert.ok(
      source.includes(`>${label}</button>`),
      `${label} has an opener button`
    );
  }
  // Each drawer renders only while it is the open one.
  assert.ok(source.includes('openDrawer === "log"'));
  assert.ok(source.includes('openDrawer === "milestones"'));
});

test("The collapsed planet readout shows symbols and numbers", async () => {
  const source = await readFile(new URL("../app/global-params.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("GlobalParametersCompact"), "the collapsed readout exists");
  assert.ok(source.includes("param-chip-value"), "chips carry a numeric value");
  assert.ok(source.includes('icon: "🌡"'), "temperature has a symbol");
  assert.ok(source.includes("${oceans}/9"), "oceans read as a count out of nine");
});

test("Board tiles carry an explanation for hover and long-press", async () => {
  const { describeCell } = await import("../app/tile-help.js");

  const steel = describeCell({ tileType: "empty", isOceanOnly: false, bonusType: "steel", bonusAmount: 2 });
  assert.match(steel, /配置ボーナス: 鋼鉄 \+2/, "bonus squares explain their icon");

  const oceanOnly = describeCell({ tileType: "empty", isOceanOnly: true, bonusType: "none", bonusAmount: 0 });
  assert.match(oceanOnly, /海洋専用マス。海洋タイルのみ配置できる。/);

  const source = await pageSource();
  assert.ok(source.includes("setHoveredCell"), "hover and long-press are wired to the board");
});

test("A spread that shadows a compat accessor keeps the written value", async () => {
  // `{ ...state, hand: [...] }` turns the non-enumerable accessor into an own
  // data property. Re-attaching the accessors used to delete it outright, which
  // silently threw away every card the player had just bought or drawn.
  const { withLegacyPlayerAccessors } = await import("../app/player-state.js");
  const state = getInitialState();

  const spread = { ...state, hand: ["card-a", "card-b", "card-c"] };
  const restored = withLegacyPlayerAccessors(spread);

  assert.deepEqual(restored.players[0].hand, ["card-a", "card-b", "card-c"]);
  assert.deepEqual(restored.hand, ["card-a", "card-b", "card-c"]);
  assert.equal(
    Object.getOwnPropertyDescriptor(restored, "hand").enumerable,
    false,
    "the accessor is restored, so saves never carry a stale mirror"
  );
  const saved = JSON.parse(JSON.stringify(restored));
  assert.equal(
    Object.prototype.hasOwnProperty.call(saved, "hand"),
    false,
    "the top level carries no duplicate of the player's hand"
  );
  assert.deepEqual(saved.players[0].hand, ["card-a", "card-b", "card-c"]);
});

test("Buying starting cards fills the hand and charges the right price", async () => {
  const { cloneGameState } = await import("../app/game-logic.js");
  const state = getInitialState();
  const startingMc = state.players[0].mc;
  const buying = state.researchCards.slice(0, 4);

  const next = cloneGameState(state);
  next.hand = [...state.hand, ...buying];
  next.mc -= buying.length * 3;

  assert.deepEqual(next.players[0].hand, buying, "the cards reach the player the UI reads");
  assert.equal(next.players[0].mc, startingMc - 12);
  assert.ok(Number.isFinite(next.players[0].mc), "a dropped accessor would make this NaN");
});

test("Drawing again grows the hand instead of replacing it", async () => {
  const { cloneGameState } = await import("../app/game-logic.js");
  let state = cloneGameState(getInitialState());
  state.hand = ["a", "b"];
  state = cloneGameState(state);
  state.hand = [...state.hand, "c"];

  assert.deepEqual(state.players[0].hand, ["a", "b", "c"]);
});

test("Setup requires buying the starting hand before the first action", async () => {
  // "配られた 10 枚のプロジェクト・カードのうち、手札として残したいものを、
  // １枚につき３Ｍ€で開始時の手札として購入します" — setup used to jump straight
  // to the action phase, stranding all ten cards and leaving an empty hand.
  const { applyCorporation, completeSetupPurchase, cloneGameState } = await import("../app/game-logic.js");
  let state = getInitialState();
  assert.equal(state.researchCards.length, 10);

  state = applyCorporation(state, state.corporationOptions[0]);
  assert.equal(state.phase, "setup");
  assert.equal(state.players[0].setupStep, "projects", "the purchase step is reachable");

  const buying = state.researchCards.slice(0, 4);
  let bought = cloneGameState(state);
  bought.hand = buying;
  bought.mc -= 12;
  bought = completeSetupPurchase(bought);

  assert.equal(bought.phase, "action");
  assert.deepEqual(bought.players[0].hand, buying);
});

test("Only the enabled expansions reach the card pools", async () => {
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const expansionsIn = state => {
    const found = new Set();
    for (const id of [...state.deck, ...state.researchCards]) {
      const card = OFFICIAL_PROJECTS.find(c => c.id === id);
      found.add(card?.expansion ?? "base");
    }
    return found;
  };

  const base = getInitialState();
  assert.deepEqual([...expansionsIn(base)], ["base"], "a base game holds base cards only");
  assert.equal(base.players[0].preludeOptions.length, 0, "no prelude, no prelude options");

  const venus = getInitialState({ venus: true });
  assert.ok(expansionsIn(venus).has("venus"));
  assert.equal(expansionsIn(venus).has("colonies"), false, "an unselected expansion stays out");

  const prelude = getInitialState({ prelude: true });
  assert.equal(prelude.players[0].preludeOptions.length, 4);
});

test("The Venus track is visible from 0% when the expansion is on", () => {
  assert.equal(getInitialState({ venus: true }).venusEnabled, true);
  assert.equal(getInitialState().venusEnabled, false);
});

test("Raising the Venus scale pays TR and its threshold bonuses", async () => {
  const { cloneGameState, applyCardEffect } = await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const card = OFFICIAL_PROJECTS.find(c => c.id === "card-prelude2-venus-allies");

  const plain = cloneGameState(getInitialState({ venus: true }));
  const trBefore = plain.players[0].tr;
  const raised = applyCardEffect(plain, card, plain.logs).state;
  assert.equal(raised.venus, 4);
  assert.equal(raised.players[0].tr - trBefore, 2, "one TR per 2% step");

  // 8% draws a card, 16% pays another TR.
  const atSix = cloneGameState(getInitialState({ venus: true }));
  atSix.venus = 6;
  const crossedEight = applyCardEffect(atSix, card, atSix.logs).state;
  assert.equal(crossedEight.players[0].hand.length, 1, "8% draws one card");

  const atFourteen = cloneGameState(getInitialState({ venus: true }));
  atFourteen.venus = 14;
  const trAt14 = atFourteen.players[0].tr;
  const crossedSixteen = applyCardEffect(atFourteen, card, atFourteen.logs).state;
  assert.equal(crossedSixteen.players[0].tr - trAt14, 3, "two steps plus the 16% bonus");
});

test("Venus does not gate the end of the game", async () => {
  const { isGameOverCheck } = await import("../app/game-logic.js");
  assert.equal(isGameOverCheck(8, 14, 9), true, "the three Mars tracks alone end it");
});

test("A card action can only be used once per generation", async () => {
  // "これら各アクションのあるカードは、各世代につき１回ずつしか使用できません"
  const { cloneGameState, applyCardAction, getCardActionStatus, triggerProduction } =
    await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const card = OFFICIAL_PROJECTS.find(c => c.id === "p-ai-central");

  let state = cloneGameState(getInitialState());
  state.phase = "action";
  state.mc = 100;
  state.playedProjects = [card.id];

  assert.equal(getCardActionStatus(state, card).playable, true);
  state = applyCardAction(state, card, state.logs).state;
  assert.deepEqual(state.players[0].usedCardActions, [card.id]);

  const second = getCardActionStatus(state, card);
  assert.equal(second.playable, false, "the same action cannot fire twice");
  assert.equal(applyCardAction(state, card, state.logs).playable, false);

  // "このプレイヤー・マーカーは、産出フェイズに除去します"
  const nextGeneration = triggerProduction(state, state.logs);
  assert.deepEqual(nextGeneration.players[0].usedCardActions, []);
  assert.equal(getCardActionStatus(nextGeneration, card).playable, true);
});

test("One player's spent action does not block another's", async () => {
  const { cloneGameState, applyCardAction, getCardActionStatus } =
    await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const card = OFFICIAL_PROJECTS.find(c => c.id === "p-ai-central");

  let state = cloneGameState(getInitialState({ playerCount: 2 }));
  state.phase = "action";
  state.players = state.players.map(p => ({ ...p, mc: 100, playedProjects: [card.id] }));

  state = applyCardAction(state, card, state.logs).state;
  assert.equal(getCardActionStatus(state, card).playable, false);

  state.currentPlayerId = "player2";
  assert.equal(getCardActionStatus(state, card).playable, true, "each player has their own marker");
});

test("A spent action stays spent across a save and reload", async () => {
  const { cloneGameState, applyCardAction, getCardActionStatus } =
    await import("../app/game-logic.js");
  const { loadSavedState, serializeSavedState } = await import("../app/save-migration.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const card = OFFICIAL_PROJECTS.find(c => c.id === "p-ai-central");

  let state = cloneGameState(getInitialState());
  state.phase = "action";
  state.mc = 100;
  state.playedProjects = [card.id];
  state = applyCardAction(state, card, state.logs).state;

  const restored = loadSavedState(serializeSavedState(state));
  assert.deepEqual(restored.players[0].usedCardActions, [card.id]);
  assert.equal(getCardActionStatus(restored, card).playable, false, "reloading is not a free reset");
});

test("Mars University lets the player pick the discard instead of taking hand[0]", async () => {
  // "手札1枚を捨てて1枚引いてよい" — optional, and the player chooses. The old
  // code shifted hand[0] automatically, throwing away cards they meant to keep.
  const { cloneGameState, applyCorporationTriggers, resolvePendingChoice } =
    await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const science = OFFICIAL_PROJECTS.find(
    c => c.tags.includes("Science") && c.id !== "p-mars-university"
  );

  let state = cloneGameState(getInitialState());
  state.phase = "action";
  state.playedProjects = ["p-mars-university"];
  state.hand = ["a1", "a2", "a3"];

  const triggered = applyCorporationTriggers(state, science, state.logs).state;
  assert.equal(triggered.pendingChoice?.kind, "discard-card");
  assert.equal(triggered.pendingChoice.optional, true, "the card says 'よい'");
  assert.deepEqual(
    triggered.pendingChoice.options.map(o => o.id),
    ["a1", "a2", "a3"],
    "every held card is offered"
  );
  assert.deepEqual(triggered.players[0].hand, ["a1", "a2", "a3"], "nothing goes until chosen");

  const resolved = resolvePendingChoice(triggered, "a2", triggered.logs, "player");
  assert.equal(resolved.state.players[0].hand.includes("a2"), false, "the chosen card leaves");
  assert.ok(resolved.state.discardPile.includes("a2"));
  assert.equal(resolved.state.players[0].hand.length, 3, "and a replacement is drawn");
  assert.equal(resolved.state.pendingChoice, null);
});

test("An optional choice can be declined", async () => {
  const { cloneGameState, applyCorporationTriggers, resolvePendingChoice, DECLINE_CHOICE } =
    await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const science = OFFICIAL_PROJECTS.find(
    c => c.tags.includes("Science") && c.id !== "p-mars-university"
  );

  let state = cloneGameState(getInitialState());
  state.phase = "action";
  state.playedProjects = ["p-mars-university"];
  state.hand = ["a1", "a2"];

  const triggered = applyCorporationTriggers(state, science, state.logs).state;
  const declined = resolvePendingChoice(triggered, DECLINE_CHOICE, triggered.logs, "player");

  assert.equal(declined.status, "resolved");
  assert.deepEqual(declined.state.players[0].hand, ["a1", "a2"], "declining costs nothing");
  assert.equal(declined.state.pendingChoice, null);
});

test("Mars University does not require owning a corporation", async () => {
  const { cloneGameState, applyCorporationTriggers } = await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const science = OFFICIAL_PROJECTS.find(
    c => c.tags.includes("Science") && c.id !== "p-mars-university"
  );

  let state = cloneGameState(getInitialState());
  state.phase = "action";
  state.corporationId = null;
  state.playedProjects = ["p-mars-university"];
  state.hand = ["a1"];

  const triggered = applyCorporationTriggers(state, science, state.logs).state;
  assert.equal(
    triggered.pendingChoice?.kind,
    "discard-card",
    "the effect belongs to the project, not the corporation"
  );
});

test("tiles at a capped global parameter award no TR", async () => {
  const { applyCorporation, completeSetupPurchase, placeTileAt, legalCellsFor } =
    await import("../app/game-logic.js");

  for (const [tile, param, cap] of [["ocean", "oceans", 9], ["forest", "oxygen", 14]]) {
    for (const start of [cap - 1, cap]) {
      let state = getInitialState({ playerCount: 1 });
      state = applyCorporation(state, state.players[0].corporationOptions[0]);
      state = completeSetupPurchase(state);
      state[param] = start;

      const before = state.players[0].tr;
      placeTileAt(state, legalCellsFor(state, tile, "player")[0], tile, "player");

      assert.equal(
        state.players[0].tr,
        start === cap ? before : before + 1,
        `${tile} at ${param}=${start}`
      );
      assert.equal(state[param], Math.min(cap, start + 1), `${param} stays clamped`);
    }
  }
});

test("card actions place their resource on the card that raised them", async () => {
  const { applyCorporation, completeSetupPurchase, applyCardAction, computeScore, cloneGameState, ALL_CARDS } =
    await import("../app/game-logic.js");
  const birds = ALL_CARDS.find(card => card.id === "card-base-birds");

  let state = getInitialState({ playerCount: 1 });
  state = applyCorporation(state, state.players[0].corporationOptions[0]);
  state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";
  state.oxygen = 14;
  state.players = state.players.map(player => ({
    ...player,
    playedProjects: [birds.id],
    mc: 50
  }));

  const before = computeScore(state, "player");
  for (let i = 0; i < 3; i++) {
    state = applyCardAction(state, birds, state.logs).state;
    state = cloneGameState(state);
    state.usedCardActions = [];
  }

  assert.equal(
    state.players[0].cardResources[birds.id],
    3,
    "three actions must leave three animals on the card"
  );
  // Birds score one VP per animal; without the card id the resource vanished
  // and the card scored nothing no matter how often it was used.
  assert.equal(computeScore(state, "player") - before, 3);
});

test("a card action offering a choice asks instead of always spending", async () => {
  const { applyCorporation, completeSetupPurchase, applyCardAction, getCardActionStatus, resolvePendingChoice, cloneGameState, ALL_CARDS } =
    await import("../app/game-logic.js");
  const bacteria = ALL_CARDS.find(card => card.id === "card-base-ghg-producing-bacteria");

  function seed(resources) {
    let state = getInitialState({ playerCount: 1 });
    state = applyCorporation(state, state.players[0].corporationOptions[0]);
    state = completeSetupPurchase(state);
    state = cloneGameState(state);
    state.phase = "action";
    state.oxygen = 8;
    state.players = state.players.map(player => ({
      ...player,
      playedProjects: [bacteria.id],
      cardResources: { [bacteria.id]: resources },
      mc: 50
    }));
    return state;
  }

  // With nothing on the card only "add one" is possible, so it must run without
  // asking — and the card must not be judged unusable by the spending branch.
  assert.equal(getCardActionStatus(seed(0), bacteria).playable, true);
  const empty = applyCardAction(seed(0), bacteria, []);
  assert.equal(empty.state.players[0].cardResources[bacteria.id], 1);

  // Once both branches are affordable the player decides.
  const stocked = applyCardAction(seed(3), bacteria, []);
  assert.equal(stocked.awaitingChoice, true);
  assert.equal(stocked.state.pendingChoice.kind, "effect-branch");

  const spent = resolvePendingChoice(stocked.state, "0", stocked.state.logs, "player").state;
  assert.equal(spent.players[0].cardResources[bacteria.id], 1, "two microbes are removed");
  assert.equal(spent.temperature, -28, "and the temperature rises one step");

  const added = resolvePendingChoice(stocked.state, "1", stocked.state.logs, "player").state;
  assert.equal(added.players[0].cardResources[bacteria.id], 4);
  assert.equal(added.temperature, -30);
});

test("attacking production lets the player pick the victim", async () => {
  const { applyCorporation, completeSetupPurchase, applyCardEffect, resolvePendingChoice, cloneGameState, getPlayer, ALL_CARDS } =
    await import("../app/game-logic.js");
  const birds = ALL_CARDS.find(card => card.id === "card-base-birds");

  function table(count) {
    let state = getInitialState({ playerCount: count });
    for (const player of state.players) {
      state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
    }
    let guard = 0;
    while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
    state = cloneGameState(state);
    state.phase = "action";
    state.oxygen = 14;
    state.players = state.players.map(player => ({ ...player, plantsProd: 5, mc: 80 }));
    return state;
  }

  const multi = applyCardEffect(table(3), birds, []);
  assert.equal(multi.state.pendingChoice?.kind, "production-attack");
  // The decrement must wait for the answer, or the acting player is hit too.
  assert.deepEqual(multi.state.players.map(p => p.plantsProd), [5, 5, 5]);

  const resolved = resolvePendingChoice(multi.state, "player2", [], "player").state;
  assert.deepEqual(
    resolved.players.map(p => p.plantsProd),
    [5, 3, 5],
    "only the chosen player loses production"
  );

  // Solo has nobody else to hit, so it applies without asking.
  const solo = applyCardEffect(table(1), birds, []);
  assert.equal(solo.state.pendingChoice, null);
  assert.equal(solo.state.players[0].plantsProd, 3);
});

test("card text states every effect the engine applies", async () => {
  const { ALL_CARDS } = await import("../app/game-logic.js");
  const { completeEffectText } = await import("../app/effect-summary.js");

  const birds = ALL_CARDS.find(card => card.id === "card-base-birds");
  // The catalog text mentions only the action, never the production it costs.
  assert.doesNotMatch(birds.effectText, /生産/);
  assert.match(completeEffectText(birds), /植物生産量を2下げる/);

  const catapult = ALL_CARDS.find(card => card.id === "card-base-electro-catapult");
  assert.match(completeEffectText(catapult), /電力生産量-1/);

  // A card whose text is already complete must not be padded.
  const capital = ALL_CARDS.find(card => card.id === "p-capital");
  assert.equal(completeEffectText(capital), capital.effectText);
});

test("placing a tile pays its placement bonus and raises TR once", async () => {
  const { applyCorporation, completeSetupPurchase, cloneGameState, placeTileAt, computeScore } =
    await import("../app/game-logic.js");

  let state = getInitialState({ playerCount: 1 });
  state = applyCorporation(state, state.players[0].corporationOptions[0]);
  state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";

  // A space printed with a steel bonus: the UI used to write to state.board
  // directly, which skipped the bonus entirely.
  const cell = Object.values(state.board).find(
    space => space.bonusType === "steel" && !space.isOceanOnly
  );
  const before = {
    tr: state.players[0].tr,
    steel: state.players[0].steel,
    oxygen: state.oxygen
  };

  placeTileAt(state, cell, "forest", "player");

  assert.equal(state.players[0].steel, before.steel + cell.bonusAmount, "the placement bonus is paid");
  assert.equal(state.oxygen, before.oxygen + 1, "a greenery raises oxygen");
  assert.equal(state.players[0].tr, before.tr + 1, "and TR exactly once");
  void computeScore;
});

test("a robot game hands the seat to the bots", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  // isMyTurn used to read `!isOnline || ...`, which made every offline turn the
  // human's — so the player could act on the bots' turns and drive both sides.
  assert.match(
    source,
    /const isMyTurn = isOnline[\s\S]{0,160}!isRobotGame \|\| activeState\.currentPlayerId === HUMAN_ID/,
    "isMyTurn must be false while a bot holds the seat"
  );

  // Every action that spends a turn has to refuse when it is not the human's.
  for (const handler of ["handlePlayCardInit", "handleCardAction", "handlePass", "handleStandardProjectPlay"]) {
    const start = source.indexOf(`const ${handler} =`);
    assert.ok(start > 0, `${handler} must exist`);
    const body = source.slice(start, start + 400);
    assert.match(body, /if \(!isMyTurn\) return;/, `${handler} must guard on isMyTurn`);
  }
});

test("the UI does not pay placement bonuses a second time", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  // placeTileAt pays the placement bonus and the ocean adjacency bonus. The UI
  // used to add both again, so a plant space gave 2 and an adjacent ocean 4 M€.
  const handler = source.slice(source.indexOf("const handleCellClick"), source.indexOf("const handlePass"));
  assert.doesNotMatch(handler, /nextState\.mc \+= bonusMc/, "ocean adjacency must not be re-added");
  assert.doesNotMatch(handler, /nextState\.(plants|steel|titanium) \+= cell\.bonusAmount/, "placement bonus must not be re-added");
  assert.doesNotMatch(handler, /nextState\.hand\.push\(drawn\)/, "the bonus card must not be drawn twice");
});
