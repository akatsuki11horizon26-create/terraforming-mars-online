import { test, expect, type Page } from "@playwright/test";

// The production readout is the reason this file exists. The action panel once
// printed only the cost of a play, so a card that moved production showed
// nothing -- and it reached production because the manual check happened to use
// an asteroid, which moves no production at all. This drives the most ordinary
// production play there is and asserts the number reaches the DOM.

// Every standard project here is a flat literal in game-command.js EXCEPT the
// power plant, whose cost reads `11 - powerDiscount` so Thorgate makes it 10.
// A test asserting "MC -11" would fail on the games that dealt that
// corporation. The city is 25 for everyone, and it moves MC production.
const CITY_COST = 25;

async function startSoloGame(page: Page) {
  await page.goto("/");
  await page.getByTestId("mode-solo").click();
  await page.getByTestId("setup-start-button").click();

  // A first run opens the manual over everything, exactly as a new player sees
  // it, and it swallows clicks meant for the panel underneath.
  const manual = page.getByTestId("onboarding-dismiss");
  if (await manual.isVisible().catch(() => false)) await manual.click();

  // Setup runs corporation -> starting cards before the action phase opens.
  // The dealt corporations are random and two of them (TerraLabs 14 M€,
  // PhoboLog 23 M€) start below the city's price, so "the first one" would fail
  // on the deals that offered them. Pick by what the seat can actually afford.
  const options = page.getByTestId("corp-option");
  await expect(options.first()).toBeVisible();
  const count = await options.count();
  let picked = false;
  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    const money = Number((await option.getAttribute("data-starting-mc")) ?? "0");
    if (money >= CITY_COST) {
      await option.click();
      picked = true;
      break;
    }
  }
  expect(picked, "no dealt corporation could afford a city").toBe(true);
  await page.getByTestId("corp-confirm-button").click();
  // Buying nothing is legal and keeps the opening deterministic: the dealt hand
  // is random, so selecting cards would make the starting MC vary.
  await page.getByTestId("buy-cards-confirm-button").click();
}

test("a city shows both its cost and the production it moved", async ({ page }) => {
  const crashes: string[] = [];
  page.on("pageerror", error => crashes.push(String(error)));

  await startSoloGame(page);

  const mcProduction = page.getByTestId("resource-prod-mc");
  await expect(mcProduction).toBeVisible();
  const before = Number((await mcProduction.innerText()).replace(/[^0-9-]/g, ""));

  await page.getByTestId("open-standard-projects").click();
  const city = page.getByTestId("sp-city-btn");
  await expect(city).toBeEnabled();
  await city.click();

  await page.getByTestId("confirm-dialog-execute").click();

  // A city needs a space, so the board asks before anything is paid.
  const chooseable = page.locator('[data-testid="board-cell"][data-placeable="true"]').first();
  await expect(chooseable).toBeVisible();

  // The panel unmounts 1300ms after it opens (page.tsx:806). waitFor polls, so
  // on a loaded machine -- CI, or two workers on one box -- the whole window can
  // pass between two samples and the assertion fails on a move that worked.
  // Observe the mount instead: the recorder is armed before the click and keeps
  // what it saw, so the test no longer depends on when it looks.
  await page.evaluate(() => {
    const seen: { title: string; changes: string } = { title: "", changes: "" };
    (window as unknown as { __actionReport: typeof seen }).__actionReport = seen;
    // Keep the LONGEST text seen, not the first. React appends the delta spans
    // over several mutations, so taking the first non-empty sample catches a
    // half-built panel -- observed as a report holding only the placement
    // bonus, with the production line still to come.
    const read = () => {
      const title = document.querySelector('[data-testid="action-report-title"]');
      const changes = document.querySelector('[data-testid="action-report-changes"]');
      const titleText = title?.textContent ?? "";
      const changesText = changes?.textContent ?? "";
      if (titleText.length > seen.title.length) seen.title = titleText;
      if (changesText.length > seen.changes.length) seen.changes = changesText;
    };
    new MutationObserver(read).observe(document.body, { childList: true, subtree: true });
    read();
  });

  await chooseable.click();

  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __actionReport: { changes: string } }).__actionReport.changes),
      { message: "the action panel never mounted", timeout: 10_000 }
    )
    .not.toBe("");
  const captured = await page.evaluate(
    () => (window as unknown as { __actionReport: { title: string; changes: string } }).__actionReport
  );

  // Naming the project at all is the fix under test: a city that had to ask
  // where to build used to leave lastAction null, so the panel never opened.
  expect(captured.title, "the panel did not name the project").toContain("都市");
  // And it must say what moved -- the placement bonus this space paid out.
  // "not empty" is too weak to be the check here: a city that asks where to
  // build once reported only the placement bonus ("建材+2"), which is
  // non-empty, while the M€ it cost and the production it raised never
  // reached the panel at all. Name the two numbers the move actually moved --
  // but not their exact size: Tharsis Republic refunds 3 M€ for your own city
  // (official-content.js:228), so the net price reads −22 on those deals.
  expect(captured.changes, "the panel did not report the price").toMatch(/MC\u2212\d+/);
  expect(captured.changes, "the panel did not report the production").toMatch(/MC生産/);

  // And the panel is not the only place it has to land: the player's own mat
  // must agree, which is what a viewer actually reads.
  //
  // The size of the step is NOT a constant. The project itself is +1
  // (game-command.js:363), but Tharsis Republic adds another +1 for every city
  // placed (official-content.js:228), so a deal that offers it makes the same
  // move read +2. Pinning "before + 1" here fails on exactly those deals --
  // the power-plant mistake again, one layer down. Take the figure from the
  // panel and require the mat to match it, which is what this test is for.
  const step = Number(captured.changes.match(/MC生産[^0-9+−-]*([+−-]?\d+)/)?.[1] ?? NaN);
  expect(step, `the panel did not report an M€ production step: ${captured.changes}`).toBeGreaterThan(0);
  await expect(mcProduction).toHaveText(new RegExp(`^\\+?${before + step}$`));

  expect(crashes, `page errors: ${crashes.join(" | ")}`).toEqual([]);
});
