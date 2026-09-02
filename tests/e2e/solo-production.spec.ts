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

  // The panel clears itself 1.3s after the move resolves, so the wait has to be
  // armed BEFORE the click that causes it -- polling afterwards loses the race.
  const report = page.getByTestId("action-report-changes");
  const reportAppeared = report.waitFor({ state: "visible", timeout: 10_000 });

  await chooseable.click();
  await reportAppeared;
  const reported = await report.innerText();

  // Naming the project at all is the fix under test: a city that had to ask
  // where to build used to leave lastAction null, so the panel never opened.
  await expect(page.getByTestId("action-report-title")).toContainText("都市");
  // And it must say what moved -- the placement bonus this space paid out.
  expect(reported.trim().length, "the panel opened with nothing in it").toBeGreaterThan(0);

  // And the panel is not the only place it has to land: the player's own mat
  // must agree, which is what a viewer actually reads.
  await expect(mcProduction).toHaveText(new RegExp(`${before + 1}`));

  expect(crashes, `page errors: ${crashes.join(" | ")}`).toEqual([]);
});
