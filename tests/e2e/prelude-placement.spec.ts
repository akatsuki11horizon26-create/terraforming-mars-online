import { test, expect } from "@playwright/test";
import { getInitialState } from "../../app/game-logic.js";
import { SAVE_KEY, serializeSavedState } from "../../app/save-migration.js";

for (const width of [1343, 390]) {
  test(`Experimental Forest placement completes setup at ${width}px`, async ({ page }, testInfo) => {
    const state = getInitialState({ playerCount: 1, prelude: true, seed: 31 });
    state.onboarded = true;
    state.players[0].preludeOptions = ["prelude-experimental-forest", "prelude-allied-banks"];
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    }, {
      key: SAVE_KEY, saved: serializeSavedState(state)
    });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 725 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await page.getByTestId("corp-option").filter({ hasText: "Beginner Corporation" }).click();
    await page.getByTestId("setup-prelude-option").nth(0).click();
    await page.getByTestId("setup-prelude-option").nth(1).click();
    await page.getByTestId("corp-confirm-button").click();
    await expect(page.getByTestId("turn-guide")).toContainText("緑地タイルを配置");
    const forestsBefore = Object.values(state.board as Record<string, { tileType: string }>).filter(cell => cell.tileType === "forest").length;
    await expect(page.locator(".hex-forest")).toHaveCount(forestsBefore);
    await expect(page.locator('span.param-chip[title^="酸素 "] .param-chip-value')).toHaveText("0%");
    await page.screenshot({ path: testInfo.outputPath("pending.png"), fullPage: true });
    if (width === 1343) {
      await page.reload({ waitUntil: "networkidle" });
      await page.getByTestId("mode-continue").click();
      await expect(page.getByTestId("turn-guide")).toContainText("緑地タイルを配置");
    }
    const tile = page.locator('[data-testid="board-cell"][data-placeable="true"]').first();
    const key = await tile.getAttribute("data-cell-key");
    await tile.click();
    if (width === 390) await page.getByTestId("confirm-board-placement").click();
    await expect(page.locator(`[data-cell-key="${key}"]`)).toHaveClass(/hex-forest/);
    await expect(page.locator(".hex-forest")).toHaveCount(forestsBefore + 1);
    await expect(page.locator('span.param-chip[title^="酸素 "] .param-chip-value')).toHaveText("1%");
    await expect(page.getByTestId("turn-guide")).toContainText("あと2回");
    await expect(page.locator(".choice-banner")).toBeHidden();
  });
}
