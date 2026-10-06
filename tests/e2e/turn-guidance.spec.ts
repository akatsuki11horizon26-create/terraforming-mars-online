import { test, expect } from "@playwright/test";

for (const viewport of [{ width: 1343, height: 725 }, { width: 390, height: 844 }]) {
  test(`next-step guidance follows setup, placement and turn completion at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByTestId("mode-solo").click();
    await page.getByTestId("setup-start-button").click();
    const manual = page.getByTestId("onboarding-dismiss");
    if (await manual.isVisible()) await manual.click();

    const guide = page.getByTestId("turn-guide");
    await expect(guide).toContainText("まずはゲームの準備");
    await expect(page.getByTestId("corp-confirm-button")).toBeDisabled();
    await expect(page.getByTestId("corp-confirm-button")).toHaveText("企業を選んでください");
    const beginner = page.getByTestId("corp-option").filter({ hasText: "Beginner Corporation" });
    await beginner.click();
    await expect(beginner).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("corp-confirm-button").click();
    await expect(guide).toContainText("あなたの手番 · あと2回");
    await expect(page.getByTestId("resource-prod-mc")).toHaveAttribute("aria-label", /生産量/);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath("action.png"), fullPage: true });

    await page.getByTestId("open-standard-projects").click();
    await expect(page.getByRole("heading", { name: "基本アクション", exact: true })).toBeVisible();
    await page.getByTestId("sp-aquifer-btn").click();
    await page.getByTestId("confirm-dialog-execute").click();
    await expect(guide).toContainText("盤面の光るマスを選択");
    await page.locator('[data-testid="board-cell"][data-placeable="true"]').first().click();
    if (viewport.width < 820) await page.getByTestId("confirm-board-placement").click();
    await expect(guide).toContainText("あと1回");
    await expect(guide).toContainText("後でまた行動できます");
    await page.getByRole("button", { name: "ターン終了", exact: true }).click();
    await expect(guide).toContainText("あと2回");
    await expect(page.getByRole("button", { name: "パス（この世代を終了）", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
