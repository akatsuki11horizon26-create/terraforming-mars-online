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
