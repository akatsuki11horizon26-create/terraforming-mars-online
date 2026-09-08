import { test, expect, type Page } from "@playwright/test";

// The audit found the hand showing art and card names only: 234px of card in a
// 115px strip, with the effect text, the requirement and the VP below the fold.
// Three separate faults stacked up, and each is asserted here.
//
//  1. The strip's ResizeObserver was attached in a mount-time effect, when the
//     title screen stood where the hand would be. handBox stayed 0x0 and the
//     fitting maths returned its 148px default for the whole game.
//  2. .tm-card redeclared `--card-w: 148px` on itself, shadowing the width the
//     strip inherits down -- so even once the maths ran, nothing resized.
//  3. The strip's height cap left less room than one card at its narrowest
//     readable width needs, so no width could ever fit.
//
// Proven to fail when broken: restoring any one of the three turns this red.

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

async function startWithHand(page: Page, cards: number) {
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
  // Buy a real hand. Buying nothing would leave an empty strip, which is the
  // one case where none of this can go wrong. The cards are chosen beside the
  // corporation now, and one confirmation takes both.
  const offers = page.getByTestId("setup-card-option");
  await expect(offers.first()).toBeVisible();
  const available = await offers.count();
  const take = Math.min(cards, available);
  for (let i = 0; i < take; i += 1) await offers.nth(i).click();
  await page.getByTestId("corp-confirm-button").click();
  return take;
}

function handMetrics(page: Page) {
  return page.evaluate(() => {
    const strip = document.querySelector(".hand-cards") as HTMLElement | null;
    const cards = Array.from(document.querySelectorAll(".tm-card")) as HTMLElement[];
    if (!strip || cards.length === 0) return null;
    const box = strip.getBoundingClientRect();
    // How far the tallest card reaches past the bottom of its scroll area.
    // The strip may scroll sideways; it must not hide a card's lower half.
    const hiddenBelow = Math.max(
      ...cards.map(card => Math.round(card.getBoundingClientRect().bottom - box.bottom))
    );
    return {
      count: cards.length,
      hiddenBelow,
      stripHeight: Math.round(box.height),
      cardWidth: Math.round(cards[0].getBoundingClientRect().width),
      cardHeight: Math.round(cards[0].getBoundingClientRect().height)
    };
  });
}

for (const viewport of VIEWPORTS) {
  test(`the hand shows whole cards at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const bought = await startWithHand(page, 4);
    test.skip(bought === 0, "the deal offered no cards to buy");

    // Card widths are set from a ResizeObserver, so the first painted frame can
    // still show the reference size. Wait for the fit rather than a fixed time.
    await expect
      .poll(async () => (await handMetrics(page))?.hiddenBelow ?? null, {
        message: "the hand never resized to fit its strip"
      })
      .toBeLessThanOrEqual(1);

    const hand = await handMetrics(page);
    expect(hand, "the hand strip must hold cards").not.toBeNull();

    // The whole point: no card is cut off at the bottom. This read 93 before.
    expect(hand!.hiddenBelow, "cards cut off below the strip").toBeLessThanOrEqual(1);

    // And they were actually resized to fit rather than left at the reference
    // width -- a 148px card in a short strip is the original bug's signature.
    expect(hand!.cardWidth).toBeGreaterThanOrEqual(110);
    expect(hand!.cardWidth).toBeLessThanOrEqual(148);
    expect(hand!.cardHeight).toBeLessThanOrEqual(hand!.stripHeight + 1);
  });
}

test("the fitted width reaches the card, not just its container", async ({ page }) => {
  // .tm-card used to declare --card-w itself, which quietly beat the value the
  // strip passes down. Container and card must agree.
  await page.setViewportSize({ width: 1343, height: 725 });
  const bought = await startWithHand(page, 4);
  test.skip(bought === 0, "the deal offered no cards to buy");

  const widths = await page.evaluate(() => {
    const strip = document.querySelector(".hand-cards") as HTMLElement | null;
    const card = document.querySelector(".tm-card") as HTMLElement | null;
    if (!strip || !card) return null;
    return {
      fromStrip: getComputedStyle(strip).getPropertyValue("--card-w").trim(),
      onCard: getComputedStyle(card).getPropertyValue("--card-w").trim()
    };
  });
  expect(widths).not.toBeNull();
  expect(widths!.onCard, "the card must inherit the strip's fitted width").toBe(widths!.fromStrip);
});
