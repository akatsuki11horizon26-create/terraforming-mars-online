import { test, expect, type Page } from "@playwright/test";

// The audit opened the game on an ordinary 1343x725 desktop window and found
// the board's top and bottom rows cut off. The cause was not the scaling maths
// but that it never ran: the observer read boardRef once at mount, when the
// title screen stood where the board would be, found null and returned. The
// scale stayed at 1 for the whole game and .board-panel's overflow cropped a
// 460px sphere into a 429px panel.
//
// No unit test can see this -- it needs a real layout at a real size. Proven to
// fail when broken: putting the observer back behind a mount-time useEffect
// turns this red with 16px cropped from each edge.

// The window the audit used, and the two standard desktop sizes.
const VIEWPORTS = [
  { name: "audit window", width: 1343, height: 725 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1920x1080", width: 1920, height: 1080 }
];

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

for (const viewport of VIEWPORTS) {
  test(`the whole board is visible at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await startSoloGame(page);

    // The scale is applied by a ResizeObserver a frame or two after the board
    // mounts. Reading before it fires catches the board at its unscaled 460px
    // and fails a fix that is actually working, so wait for the layout to
    // settle rather than for a fixed time.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const panel = document.querySelector(".board-panel");
            const sphere = document.querySelector(".mars-sphere");
            if (!panel || !sphere) return null;
            const p = panel.getBoundingClientRect();
            const s = sphere.getBoundingClientRect();
            return Math.round(Math.max(p.top - s.top, s.bottom - p.bottom));
          }),
        { message: "the board never scaled to fit its panel" }
      )
      .toBeLessThanOrEqual(1);

    const board = await page.evaluate(() => {
      const panel = document.querySelector(".board-panel") as HTMLElement | null;
      const sphere = document.querySelector(".mars-sphere") as HTMLElement | null;
      if (!panel || !sphere) return null;
      const p = panel.getBoundingClientRect();
      // getBoundingClientRect reports the SCALED box, which is what the player
      // actually sees -- the sphere is a fixed 460px design shrunk by transform.
      const s = sphere.getBoundingClientRect();
      return {
        croppedTop: Math.round(p.top - s.top),
        croppedBottom: Math.round(s.bottom - p.bottom),
        croppedLeft: Math.round(p.left - s.left),
        croppedRight: Math.round(s.right - p.right),
        scale: Number(getComputedStyle(sphere).getPropertyValue("--board-scale"))
      };
    });

    expect(board, "the board panel and sphere must both be on the page").not.toBeNull();
    // Zero would be flush with the edge; anything positive is board the player
    // cannot see. One pixel of slack absorbs sub-pixel rounding.
    expect(board!.croppedTop, "board cropped at the top").toBeLessThanOrEqual(1);
    expect(board!.croppedBottom, "board cropped at the bottom").toBeLessThanOrEqual(1);
    expect(board!.croppedLeft, "board cropped on the left").toBeLessThanOrEqual(1);
    expect(board!.croppedRight, "board cropped on the right").toBeLessThanOrEqual(1);

    // The scale must have actually been computed. Sitting at exactly 1 on a
    // panel too small for 460px is the original bug's signature.
    expect(board!.scale).toBeGreaterThan(0);
    expect(board!.scale).toBeLessThanOrEqual(1);
  });
}

test("the page itself never scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 1343, height: 725 });
  await startSoloGame(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow, "wide content must scroll inside its own panel").toBeLessThanOrEqual(1);
});
