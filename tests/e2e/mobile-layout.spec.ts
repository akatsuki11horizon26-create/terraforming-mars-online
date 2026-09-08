import { test, expect, type Page } from "@playwright/test";

// U3 from the audit: on a 390x844 phone the page ran to 1577px, the header and
// board were cut off sideways, and the player's own resources scrolled away.
//
// Most of that was the same two faults board-fits and hand-readable cover -- the
// observers that never ran -- so this pins the mobile-specific half: nothing
// scrolls sideways, the whole board is reachable, and the resource bar stays put
// while the page scrolls, so "what do I have" is always answerable.

const PHONE = { width: 390, height: 844 };

async function startSoloGame(page: Page) {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");
  const solo = page.getByTestId("mode-solo");
  await expect(solo).toBeVisible();
  const start = page.getByTestId("setup-start-button");
  await expect(async () => {
    if (!(await start.isVisible().catch(() => false))) await solo.click({ timeout: 2000 });
    await expect(start).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await start.click();

  const manual = page.getByTestId("onboarding-dismiss");
  if (await manual.isVisible().catch(() => false)) await manual.click();

  const corps = page.getByTestId("corp-option");
  await expect(corps.first()).toBeVisible();
  await corps.first().click();
  await page.getByTestId("corp-confirm-button").click();
}

test("nothing on a phone screen scrolls sideways", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await startSoloGame(page);

  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    // Anything wider than the viewport is content the player has to pan to see.
    const wide = Array.from(document.querySelectorAll("*"))
      .filter(el => el.getBoundingClientRect().width > window.innerWidth + 1)
      .map(el => (el as HTMLElement).className?.toString?.().slice(0, 40) || el.tagName);
    return { page: doc.scrollWidth - doc.clientWidth, wide: wide.slice(0, 5) };
  });
  expect(overflow.page, `page scrolls sideways; widest: ${overflow.wide.join(", ")}`).toBeLessThanOrEqual(1);
  expect(overflow.wide, "no element may be wider than the screen").toEqual([]);
});

test("the whole board is reachable on a phone", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await startSoloGame(page);

  await expect
    .poll(() =>
      page.evaluate(() => {
        const panel = document.querySelector(".board-panel");
        const sphere = document.querySelector(".mars-sphere");
        if (!panel || !sphere) return null;
        const p = panel.getBoundingClientRect();
        const s = sphere.getBoundingClientRect();
        return Math.round(Math.max(p.top - s.top, s.bottom - p.bottom, p.left - s.left, s.right - p.right));
      })
    )
    .toBeLessThanOrEqual(1);
});

test("the resource bar stays put while the page scrolls", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await startSoloGame(page);

  const hud = page.locator(".hud-bar");
  await expect(hud).toBeVisible();

  // Scroll to the bottom; the bar must still be on screen, because "what do I
  // have" has to be answerable without scrolling back up.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(hud).toBeInViewport();

  const stuck = await page.evaluate(() => {
    const bar = document.querySelector(".hud-bar") as HTMLElement | null;
    if (!bar) return null;
    return { position: getComputedStyle(bar).position, top: Math.round(bar.getBoundingClientRect().top) };
  });
  expect(stuck?.position, "the bar must be sticky on a phone").toBe("sticky");
  expect(stuck?.top, "and stuck to the top of the screen").toBeLessThanOrEqual(1);
});

test("the buttons are big enough to hit with a thumb", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await startSoloGame(page);

  const small = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".hud-btn"))
      .map(el => ({
        label: (el.textContent ?? "").trim().slice(0, 16),
        height: Math.round(el.getBoundingClientRect().height)
      }))
      .filter(entry => entry.height > 0 && entry.height < 40);
  });
  expect(small, `these are under the 40px target: ${JSON.stringify(small)}`).toEqual([]);
});
