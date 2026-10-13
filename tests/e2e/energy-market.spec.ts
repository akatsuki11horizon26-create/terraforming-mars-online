import { test, expect } from "@playwright/test";
import { getInitialState, applyCorporation, completeSetupPurchase } from "../../app/game-logic.js";
import { SAVE_KEY, serializeSavedState } from "../../app/save-migration.js";

const bespokeActions = [
  ["card-base-power-infrastructure", "電力インフラ"],
  ["card-colonies-titan-floating-launch-pad", "タイタン浮遊発射台"],
  ["card-prelude2-ceres-tech-market", "ケレス技術市場"],
  ["card-prelude2-venus-orbital-survey", "金星軌道調査"],
  ["card-prelude2-venus-shuttles", "金星シャトル"],
  ["card-promo-energy-market", "エネルギー市場"],
  ["card-promo-floyd-continuum", "フロイド連続体"],
  ["card-promo-hi-tech-lab", "ハイテク研究所"],
  ["card-promo-mars-nomads", "火星遊牧民"],
  ["card-promo-self-replicating-robots", "自己複製ロボット"]
];

for (const width of [1343, 390]) {
  test(`Aquifer Pumping preserves material and heat choices at ${width}px`, async ({ page }) => {
    let state = getInitialState({ playerCount: 1, seed: 31 });
    state.players[0].corporationOptions = ["corp-helion"];
    state = applyCorporation(state, "corp-helion", state.currentPlayerId);
    state = completeSetupPurchase(state);
    state.onboarded = true;
    Object.assign(state.players[0], {
      mc: 8, heat: 8, steel: 4, hand: [], playedProjects: ["card-base-aquifer-pumping"]
    });
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    }, { key: SAVE_KEY, saved: serializeSavedState(state) });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await page.getByRole("button", { name: "帯水層汲み上げ — アクション", exact: true }).click();
    await page.getByTestId("confirm-dialog-execute").click();
    await page.getByRole("button", { name: "建材 1個・残額 6 MC", exact: true }).click();
    await expect(page.getByRole("button", { name: "MC 0・熱 6", exact: true })).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await page.getByRole("button", { name: "MC 0・熱 6", exact: true }).click();
    const cell = page.locator('[data-testid="board-cell"][data-placeable="true"]').first();
    await cell.click();
    if (width === 390) await page.getByTestId("confirm-board-placement").click();
    await expect(page.getByTestId("turn-guide")).toContainText("あと1回");
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved.players[0].mc).toBe(8);
    expect(saved.players[0].heat).toBe(2);
    expect(saved.players[0].steel).toBe(5); // Four held, one spent, two from the chosen space.
    expect(saved.oceans).toBe(1);
  });

  test(`Venus Shuttles heat payment survives reload at ${width}px`, async ({ page }) => {
    let state = getInitialState({ playerCount: 1, venus: true, seed: 31 });
    state.players[0].corporationOptions = ["corp-helion"];
    state = applyCorporation(state, "corp-helion", state.currentPlayerId);
    state = completeSetupPurchase(state);
    state.onboarded = true;
    Object.assign(state.players[0], {
      mc: 5, heat: 11, hand: [], playedProjects: ["card-prelude2-venus-shuttles"]
    });
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    }, { key: SAVE_KEY, saved: serializeSavedState(state) });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await page.getByRole("button", { name: "金星シャトル — アクション", exact: true }).click();
    await page.getByTestId("confirm-dialog-execute").click();
    await expect(page.getByRole("button", { name: "MC 0・熱 11", exact: true })).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await page.getByRole("button", { name: "MC 0・熱 11", exact: true }).click();
    await expect(page.getByTestId("turn-guide")).toContainText("あと1回");
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved.players[0].mc).toBe(5);
    expect(saved.players[0].heat).toBe(0);
    expect(saved.venus).toBe(2);
    await expect(page.getByRole("button", { name: "金星シャトル — アクション", exact: true })).toBeDisabled();
  });

  test(`Energy Market heat payment survives reload at ${width}px`, async ({ page }) => {
    let state = getInitialState({ playerCount: 1, seed: 31 });
    state.players[0].corporationOptions = ["corp-helion"];
    state = applyCorporation(state, "corp-helion", state.currentPlayerId);
    state = completeSetupPurchase(state);
    state.onboarded = true;
    Object.assign(state.players[0], {
      mc: 4, heat: 4, energy: 0, energyProd: 0, hand: [],
      playedProjects: bespokeActions.map(([id]) => id)
    });
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    }, { key: SAVE_KEY, saved: serializeSavedState(state) });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    for (const [, name] of bespokeActions) {
      await expect(page.getByRole("button", { name: `${name} — アクション`, exact: true })).toHaveCount(1);
    }
    await page.getByRole("button", { name: "エネルギー市場 — アクション", exact: true }).click();
    await page.getByTestId("confirm-dialog-execute").click();
    await page.getByRole("button", { name: "MC -4 / エネルギー +2", exact: true }).click();
    await expect(page.getByRole("button", { name: "MC 0・熱 4 → エネルギー 2", exact: true })).toBeVisible();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await page.getByRole("button", { name: "MC 0・熱 4 → エネルギー 2", exact: true }).click();
    await expect(page.getByTestId("turn-guide")).toContainText("あと1回");
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved.players[0].mc).toBe(4);
    expect(saved.players[0].heat).toBe(0);
    expect(saved.players[0].energy).toBe(2);
    await expect(page.getByRole("button", { name: "エネルギー市場 — アクション", exact: true })).toBeDisabled();
  });
}
