import { test, expect } from "@playwright/test";

// The TR solo variant from the audit's §4.1 table: TR 63 wins instead of
// terraforming Mars, and Buffer Gas (16 M€ for TR +1) is offered in that mode
// only. The engine side is unit-tested; this is the half no unit test can see,
// that the setting reaches the running game and brings its project with it.

async function startSolo(page: import("@playwright/test").Page, trVariant: boolean) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");
  const solo = page.getByTestId("mode-solo");
  await expect(solo).toBeVisible();
  const start = page.getByTestId("setup-start-button");
  await expect(async () => {
    if (!(await start.isVisible().catch(() => false))) await solo.click({ timeout: 2000 });
    await expect(start).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });

  const toggle = page.getByTestId("setup-solo-tr");
  await expect(toggle, "the TR variant must be offered in a solo setup").toBeVisible();
  if (trVariant) await toggle.check();
  await start.click();

  const manual = page.getByTestId("onboarding-dismiss");
  if (await manual.isVisible().catch(() => false)) await manual.click();

  const corps = page.getByTestId("corp-option");
  await expect(corps.first()).toBeVisible();
  await corps.first().click();
  await page.getByTestId("corp-confirm-button").click();
}

test("choosing the TR variant brings Buffer Gas with it", async ({ page }) => {
  await startSolo(page, true);

  await page.getByTestId("open-standard-projects").click();
  const bufferGas = page.getByTestId("sp-buffer-gas-btn");
  await expect(bufferGas, "Buffer Gas is the variant's own project").toBeVisible();

  // And the manual describes the goal the player is actually playing for.
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "マニュアル表示" }).click();
  await expect(page.getByTestId("win-condition")).toContainText("TR63");
});

test("an ordinary solo game offers no Buffer Gas and keeps its own goal", async ({ page }) => {
  await startSolo(page, false);

  await page.getByTestId("open-standard-projects").click();
  await expect(page.getByTestId("sp-buffer-gas-btn")).toBeHidden();
  // The aquifer is still there, so this is not just an empty drawer.
  await expect(page.getByTestId("sp-aquifer-btn")).toBeVisible();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "マニュアル表示" }).click();
  const goal = page.getByTestId("win-condition");
  await expect(goal).not.toContainText("TR63");
  await expect(goal).toContainText("緑の惑星");
});
