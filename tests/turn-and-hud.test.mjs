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
