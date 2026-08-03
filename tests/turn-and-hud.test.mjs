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

async function html() {
  return readFile(new URL("../static-dist/index.html", import.meta.url), "utf8");
}

test("The default view keeps the on-demand panels shut", async () => {
  const page = await html();

  // These are what used to crowd the board. They must not render until asked
  // for, or the layout regresses to the version that did not fit a phone.
  assert.equal(page.includes("drawer-scrim"), false, "no drawer is open on load");
  assert.equal(page.includes("log-container"), false, "the mission log is not rendered up front");

  for (const label of ["惑星データ", "標準プロジェクト", "マイルストーン / 表彰", "タイル凡例", "ミッションログ"]) {
    assert.ok(page.includes(`<button class="hud-btn">${label}`), `${label} has an opener button`);
  }
});

test("The collapsed planet readout shows symbols and numbers", async () => {
  const page = await html();
  assert.ok(page.includes("param-compact"));
  assert.ok(/param-chip-value">-30°/.test(page), "temperature reads as a number");
  assert.ok(/param-chip-value">0\/9/.test(page), "oceans read as a count out of nine");
});

test("Board tiles carry an explanation for hover and long-press", async () => {
  const page = await html();
  assert.ok(page.includes("配置ボーナス: 鋼鉄 +2"), "bonus squares explain their icon");
  assert.ok(page.includes("海洋専用マス。海洋タイルのみ配置できる。"));
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
  const card = OFFICIAL_PROJECTS.find(c => c.name === "Venus Allies");

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
  const card = OFFICIAL_PROJECTS.find(c => c.name === "AI Central");

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
  const card = OFFICIAL_PROJECTS.find(c => c.name === "AI Central");

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
  const card = OFFICIAL_PROJECTS.find(c => c.name === "AI Central");

  let state = cloneGameState(getInitialState());
  state.phase = "action";
  state.mc = 100;
  state.playedProjects = [card.id];
  state = applyCardAction(state, card, state.logs).state;

  const restored = loadSavedState(serializeSavedState(state));
  assert.deepEqual(restored.players[0].usedCardActions, [card.id]);
  assert.equal(getCardActionStatus(restored, card).playable, false, "reloading is not a free reset");
});
