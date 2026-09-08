import { test, expect, type Page } from "@playwright/test";

// A modal that leaves focus behind it is unusable by keyboard: the audit opened
// the standard-projects drawer and found focus still on the button underneath,
// with Tab walking along the covered page instead of into the dialog. None of
// the other rigs can see this -- the unit tests never mount a DOM, and the
// other specs drive the page by clicking.
//
// Proven to fail when broken: removing the opening focus() call, and removing
// the Tab handler, each turn one half of this red.

// Clicking a title button the instant it paints can land before React has
// attached its handler: the click is swallowed and the setup panel never opens.
// Retrying the click until the panel appears is what makes this deterministic.
async function openSetupPanel(page: Page) {
  const solo = page.getByTestId("mode-solo");
  await expect(solo).toBeVisible();
  const start = page.getByTestId("setup-start-button");
  await expect(async () => {
    if (!(await start.isVisible().catch(() => false))) await solo.click({ timeout: 2000 });
    await expect(start).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await start.click();
}

async function startSoloGame(page: Page) {
  // A save left by another spec sends the title straight to "continue" and the
  // setup panel never opens. Each of these starts a genuinely new game.
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");
  await openSetupPanel(page);

  const manual = page.getByTestId("onboarding-dismiss");
  if (await manual.isVisible().catch(() => false)) await manual.click();

  const options = page.getByTestId("corp-option");
  await expect(options.first()).toBeVisible();
  await options.first().click();
  await page.getByTestId("corp-confirm-button").click();
  await page.getByTestId("buy-cards-confirm-button").click();
}

// Where focus sits, described well enough to name in a failure message.
function activeDescription(page: Page) {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return "none";
    return `${el.tagName.toLowerCase()}:${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 24)}`;
  });
}

function focusIsInsideDialog(page: Page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
  });
}

test("the standard-projects drawer takes focus, keeps it, and gives it back", async ({ page }) => {
  await startSoloGame(page);

  const opener = page.getByTestId("open-standard-projects");
  await expect(opener).toBeVisible();
  await opener.focus();
  await opener.click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // 1. Opening moves focus inside. It used to stay on the button behind.
  expect(
    await focusIsInsideDialog(page),
    `focus stayed outside the dialog, on ${await activeDescription(page)}`
  ).toBe(true);

  // 2. Tab cycles within the dialog rather than walking onto the page behind.
  // Ten stops is well past the end of any drawer's own controls, so a missing
  // trap escapes within this loop.
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press("Tab");
    expect(
      await focusIsInsideDialog(page),
      `Tab ${i + 1} escaped the dialog, onto ${await activeDescription(page)}`
    ).toBe(true);
  }

  // 3. Shift+Tab wraps the other way and stays in as well.
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press("Shift+Tab");
    expect(
      await focusIsInsideDialog(page),
      `Shift+Tab ${i + 1} escaped the dialog`
    ).toBe(true);
  }

  // 4. Escape closes it and focus returns to what opened it, so the keyboard
  // does not restart from the top of the page.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});
