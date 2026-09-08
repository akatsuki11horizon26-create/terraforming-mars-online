import { test, expect, type Page } from "@playwright/test";

// R4 from the audit: at a table a player compares two corporations, ten
// starting cards and four preludes and commits to all of them at once. The
// engine asked for them in three separate steps, so the corporation was locked
// in before the hand was visible and the hand was bought before the player knew
// which preludes they would take.
//
// This drives the combined panel in a real browser and confirms the whole
// choice is on screen, revisable, and sent as one confirmation.

async function openSetup(page: Page, prelude: boolean) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");
  const solo = page.getByTestId("mode-solo");
  await expect(solo).toBeVisible();
  const start = page.getByTestId("setup-start-button");
  await expect(async () => {
    if (!(await start.isVisible().catch(() => false))) await solo.click({ timeout: 2000 });
    await expect(start).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });

  if (prelude) {
    // The expansion toggles live in the same panel as the start button.
    const toggle = page.getByText("プレリュード (Prelude)", { exact: false }).first();
    await expect(toggle).toBeVisible();
    await toggle.click();
  }
  await start.click();

  const manual = page.getByTestId("onboarding-dismiss");
  if (await manual.isVisible().catch(() => false)) await manual.click();
}

test("the corporations, the starting cards and the preludes are all on screen at once", async ({ page }) => {
  await openSetup(page, true);

  const corporations = page.getByTestId("corp-option");
  const cards = page.getByTestId("setup-card-option");
  const preludes = page.getByTestId("setup-prelude-option");

  await expect(corporations.first()).toBeVisible();
  // All three groups, visible together -- this is the whole finding.
  await expect(corporations).toHaveCount(2);
  await expect(cards).toHaveCount(10);
  await expect(preludes).toHaveCount(4);

  // And each corporation shows the numbers a player compares them by, which
  // the audit found were never displayed.
  const money = await corporations.first().getAttribute("data-starting-mc");
  expect(Number(money)).toBeGreaterThan(0);
  await expect(corporations.first()).toContainText("MC");
});

test("nothing is committed until the single confirmation, and choices can be changed", async ({ page }) => {
  await openSetup(page, true);

  const confirm = page.getByTestId("corp-confirm-button");
  const corporations = page.getByTestId("corp-option");
  const cards = page.getByTestId("setup-card-option");
  const preludes = page.getByTestId("setup-prelude-option");

  // Incomplete choices cannot be confirmed.
  await expect(confirm).toBeDisabled();
  await corporations.first().click();
  await expect(confirm).toBeDisabled(); // preludes still owed

  await preludes.nth(0).click();
  await preludes.nth(1).click();
  await expect(confirm).toBeEnabled();

  // Changing the corporation after picking cards is allowed, and the running
  // balance follows it -- the point of choosing them side by side.
  await cards.nth(0).click();
  await cards.nth(1).click();
  const balance = page.getByTestId("setup-balance");
  const first = await balance.textContent();

  await corporations.nth(1).click();
  await expect(balance).not.toHaveText(first ?? "", { timeout: 5000 });

  // Deselecting a prelude disables the button again: exactly two are owed.
  await preludes.nth(0).click();
  await expect(confirm).toBeDisabled();
  await preludes.nth(0).click();
  await expect(confirm).toBeEnabled();

  // One confirmation ends setup: no second "buy" step follows it.
  await confirm.click();
  await expect(page.getByTestId("corp-panel")).toBeHidden();
  await expect(page.getByTestId("buy-cards-confirm-button")).toBeHidden();
});

test("the cards chosen beside the corporation are the ones actually taken", async ({ page }) => {
  await openSetup(page, false);

  const corporations = page.getByTestId("corp-option");
  const cards = page.getByTestId("setup-card-option");
  await expect(corporations.first()).toBeVisible();
  await corporations.first().click();

  const wanted = 3;
  const names: string[] = [];
  for (let i = 0; i < wanted; i += 1) {
    const text = (await cards.nth(i).textContent()) ?? "";
    names.push(text.split("(")[0].trim());
    await cards.nth(i).click();
  }
  await expect(page.getByTestId("setup-card-cost")).toContainText(String(wanted * 3));

  await page.getByTestId("corp-confirm-button").click();
  await expect(page.getByTestId("corp-panel")).toBeHidden();

  // They are in hand, and nothing else was bought.
  const hand = page.locator(".tm-card");
  await expect(hand).toHaveCount(wanted);
  for (const name of names) {
    await expect(page.locator(".hand-cards")).toContainText(name);
  }
});
