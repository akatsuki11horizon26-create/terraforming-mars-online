import { test, expect } from "@playwright/test";
import { getInitialState, applyCorporation, completeSetupPurchase } from "../../app/game-logic.js";
import { SAVE_KEY, serializeSavedState } from "../../app/save-migration.js";

for (const width of [1343, 390]) {
  test(`card payment needs one review and preserves resource choices at ${width}px`, async ({ page }, testInfo) => {
    let state = getInitialState({ playerCount: 1, seed: 31 });
    state.players[0].corporationOptions = ["corp-credicor"];
    state = applyCorporation(state, "corp-credicor", state.currentPlayerId);
    state = completeSetupPurchase(state);
    state.onboarded = true;
    Object.assign(state.players[0], { mc: 30, steel: 5, hand: ["p-mine"] });
    const steelProd = state.players[0].steelProd;
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    }, { key: SAVE_KEY, saved: serializeSavedState(state) });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 725 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await page.locator(".hand-cards .tm-card").first().click();
    await page.getByRole("combobox", { name: "建材の使用数", exact: true }).selectOption("2");
    await page.getByRole("combobox", { name: "建材の使用数", exact: true }).selectOption("1");
    await expect(page.locator(".selected-card-panel")).toContainText("支払うMC: 2");
    await page.screenshot({ path: testInfo.outputPath("payment.png"), fullPage: true });
    await page.getByTestId("play-selected-card").click();
    await expect(page.getByTestId("confirm-dialog-execute")).toBeHidden();
    await expect(page.getByTestId("turn-guide")).toContainText("あと1回");
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved.players[0].mc).toBe(28);
    expect(saved.players[0].steel).toBe(4);
    expect(saved.players[0].steelProd).toBe(steelProd + 1);
    expect(saved.players[0].playedProjects).toContain("p-mine");
    expect(saved.players[0].hand).not.toContain("p-mine");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await expect(page.getByTestId("turn-guide")).toContainText("あと1回");
  });
}
