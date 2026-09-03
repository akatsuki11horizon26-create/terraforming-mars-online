import { test, expect, type Page } from "@playwright/test";

// Placing a tile is the most ordinary move in this game, and it is the one
// path where the UI does the most work the engine cannot check: the board has
// to mark the legal spaces, the click has to resolve the pending choice, and
// the result has to reach three separate readouts. None of that is visible to
// the unit tests, which talk to the engine, or to the audits, which never open
// a page.
//
// The aquifer is the cheapest way in at 18 M€, and unlike the power plant its
// cost is a flat literal, so no corporation discount can move it.
//
// Both halves have been proven to fail when broken: neutering the board click
// dispatch (page.tsx:1980) and suppressing the cut-in emission (page.tsx:663)
// each turn this test red.

const AQUIFER_COST = 18;

async function startSoloGame(page: Page) {
  await page.goto("/");
  await page.getByTestId("mode-solo").click();
  await page.getByTestId("setup-start-button").click();

  // A first run opens the manual over everything, exactly as a new player sees
  // it, and it swallows clicks meant for the panel underneath.
  const manual = page.getByTestId("onboarding-dismiss");
  if (await manual.isVisible().catch(() => false)) await manual.click();

  // Setup runs corporation -> starting cards before the action phase opens.
  // The dealt corporations are random and TerraLabs (14 MC) starts below the
  // aquifer's price of 18 MC, so "the first one" would fail on deals that
  // offered it. Pick by what the seat can actually afford.
  const options = page.getByTestId("corp-option");
  await expect(options.first()).toBeVisible();
  const count = await options.count();
  let picked = false;
  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    const money = Number((await option.getAttribute("data-starting-mc")) ?? "0");
    if (money >= AQUIFER_COST) {
      await option.click();
      picked = true;
      break;
    }
  }
  expect(picked, "no dealt corporation could afford an aquifer").toBe(true);
  await page.getByTestId("corp-confirm-button").click();
  // Buying nothing is legal and keeps the opening deterministic: the dealt hand
  // is random, so selecting cards would make the starting MC vary.
  await page.getByTestId("buy-cards-confirm-button").click();
}

test("buying an aquifer places an ocean tile, advances ocean count and TR, and shows parameter cut-in", async ({ page }) => {
  const crashes: string[] = [];
  page.on("pageerror", error => crashes.push(String(error)));

  await startSoloGame(page);

  // Read initial ocean and TR values from the DOM to assert deltas rather than
  // assuming fixed starting values that could vary across setups or expansions.
  // The ocean chip and TR stats have no data-testid, so locate them via their
  // specific title attributes and child value classes.
  const oceanChip = page.locator('span.param-chip[title^="海洋 "]');
  await expect(oceanChip).toBeVisible();
  const oceanValue = oceanChip.locator(".param-chip-value");
  await expect(oceanValue).toHaveText("0/9");

  const trStat = page.locator('span.hud-stat[title="テラフォーミングレーティング"]');
  await expect(trStat).toBeVisible();
  const trValue = trStat.locator(".hud-stat-value");
  const trBefore = Number((await trValue.innerText()).trim());
  expect(Number.isFinite(trBefore), "TR readout did not contain a valid number").toBe(true);

  // Open the standard projects drawer and select the aquifer project.
  await page.getByTestId("open-standard-projects").click();
  const aquiferBtn = page.getByTestId("sp-aquifer-btn");
  await expect(aquiferBtn).toBeEnabled();
  await aquiferBtn.click();

  // The project costs 18 MC and prompts a confirmation dialog.
  await page.getByTestId("confirm-dialog-execute").click();

  // The board asks where to place the ocean tile. Choose the first legal hex.
  const chooseable = page.locator('[data-testid="board-cell"][data-placeable="true"]').first();
  await expect(chooseable).toBeVisible();

  // Save the coordinate key so we can assert on this exact cell after placement
  // (once placed, data-placeable is cleared).
  const cellKey = await chooseable.getAttribute("data-cell-key");
  expect(cellKey, "placeable cell missing data-cell-key").toBeTruthy();

  // The parameter cut-in unmounts after 1000ms (page.tsx:673). Polling after the
  // click risks missing the element entirely on loaded CI runners. Observe the
  // mount via a MutationObserver installed before the click, keeping the longest
  // text seen to avoid capturing half-rendered frames.
  await page.evaluate(() => {
    const seen: { label: string; reading: string } = { label: "", reading: "" };
    (window as unknown as { __cutInReport: typeof seen }).__cutInReport = seen;
    // Pick the ocean cut-in by name, not by whichever text happens to be
    // longest. Every parameter label here is two characters (気温/酸素/海洋),
    // so a "longest wins" rule would silently resolve to whichever one mounted
    // first if a placement ever raised two tracks at once.
    const read = () => {
      for (const cutIn of document.querySelectorAll(".param-cutin")) {
        const label = cutIn.querySelector(".param-cutin-label")?.textContent ?? "";
        if (!label.includes("海洋")) continue;
        const reading = cutIn.querySelector(".param-cutin-reading")?.textContent ?? "";
        seen.label = label;
        if (reading.length > seen.reading.length) seen.reading = reading;
      }
    };
    new MutationObserver(read).observe(document.body, { childList: true, subtree: true });
    read();
  });

  await chooseable.click();

  // 1. Verify that the parameter cut-in appeared and reported the ocean increase.
  await expect
    .poll(
      () => page.evaluate(() => (window as unknown as { __cutInReport: { reading: string } }).__cutInReport?.reading),
      { message: "the parameter cut-in never mounted", timeout: 10_000 }
    )
    .not.toBe("");

  const captured = await page.evaluate(
    () => (window as unknown as { __cutInReport: { label: string; reading: string } }).__cutInReport
  );
  expect(captured.label, "cut-in did not name the ocean parameter").toContain("海洋");
  expect(captured.reading, "cut-in did not show the ocean parameter transition").toMatch(/0\s*枚?\s*→\s*1\s*枚?/);

  // 2. Verify that the targeted board cell is now rendered as an ocean tile.
  const placedCell = page.locator(`[data-testid="board-cell"][data-cell-key="${cellKey}"]`);
  await expect(placedCell).toHaveClass(/hex-ocean/);

  // 3. Verify that the ocean readout in the compact planet bar updated from 0/9 to 1/9.
  await expect(oceanValue).toHaveText("1/9");

  // 4. Verify that the player's Terraforming Rating in the HUD bar went up by 1.
  await expect(trValue).toHaveText(String(trBefore + 1));

  expect(crashes, `page errors: ${crashes.join(" | ")}`).toEqual([]);
});