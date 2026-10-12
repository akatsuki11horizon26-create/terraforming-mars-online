import { test, expect, type Page } from "@playwright/test";
import { getInitialState, applyCorporation, completeSetupPurchase } from "../../app/game-logic.js";
import { SAVE_KEY, serializeSavedState } from "../../app/save-migration.js";

const stormcraft = "card-colonies-stormcraft-incorporated";

async function start(page: Page, corporationId: string, width: number) {
  let state = getInitialState({ playerCount: 1, seed: 31 });
  state.players[0].corporationOptions = [corporationId];
  state = applyCorporation(state, corporationId, state.currentPlayerId);
  state = completeSetupPurchase(state);
  state.onboarded = true;
  Object.assign(state.players[0], {
    mc: 1, heat: corporationId === stormcraft ? 8 : 6, plants: 0,
    hand: ["card-base-local-heat-trapping"],
    cardResources: corporationId === stormcraft ? { [stormcraft]: 4 } : {}
  });
  await page.addInitScript(({ key, saved }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
  }, { key: SAVE_KEY, saved: serializeSavedState(state) });
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByTestId("mode-continue").click();
}

for (const width of [1343, 390]) {
  test(`Helion selects card heat without consuming the effect reserve at ${width}px`, async ({ page }) => {
    await start(page, "corp-helion", width);
    await page.locator(".hand-cards .tm-card").first().click();
    await page.getByLabel("支払いに使う熱:").selectOption("1");
    await page.getByTestId("play-selected-card").click();
    await expect(page.getByTestId("turn-guide")).toContainText("あと1回");
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved.players[0].mc).toBe(1);
    expect(saved.players[0].heat).toBe(0);
    expect(saved.players[0].plants).toBe(4);
  });

  test(`Stormcraft can retain heat and convert floaters at ${width}px`, async ({ page }, testInfo) => {
    await start(page, stormcraft, width);
    await page.getByTestId("open-standard-projects").click();
    await page.getByLabel("熱の変換に使う浮遊体").selectOption("4");
    await expect(page.getByTestId("sp-heat-convert-btn")).toContainText("熱0・浮遊体4で変換");
    await page.screenshot({ path: testInfo.outputPath("heat-conversion.png"), fullPage: true });
    await page.getByTestId("sp-heat-convert-btn").click();
    await expect(page.getByTestId("turn-guide")).toContainText("あと1回");
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), SAVE_KEY);
    expect(saved.players[0].heat).toBe(8);
    expect(saved.players[0].cardResources[stormcraft]).toBe(0);
    expect(saved.temperature).toBe(-28);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await expect(page.getByTestId("turn-guide")).toContainText("あと1回");
  });
}
