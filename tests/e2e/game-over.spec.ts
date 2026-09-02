import { test, expect, type Page } from "@playwright/test";
import { humanLoses, humanWins, tied, soloSuccess } from "./fixtures/finished-games.mjs";

// The winner display is the defect this project actually shipped: the engine
// knew the scores, the end screen read the planet's tracks instead, and the
// player who had been outscored 68 to 20 was told they had won. Every unit
// test passed, the playtests passed, and CI was green the whole time, because
// nothing rendered the screen. This does.

const SAVE_KEY = "mars_frontier_game";

async function openFinishedGame(page: Page, save: string) {
  // Seed before any script runs, so the restore effect finds it on first mount
  // -- the same door the "continue" button opens.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [SAVE_KEY, save] as const
  );
  await page.goto("/");
  await page.getByTestId("mode-continue").click();

  // A first-run manual can also be open, but the end screen stacks above it,
  // so the verdict is readable without dismissing anything.
  await expect(page.getByTestId("game-over-modal")).toBeVisible();
}

test("a beaten player is told they lost, not congratulated", async ({ page }) => {
  await openFinishedGame(page, humanLoses());

  const verdict = page.getByTestId("game-over-title");
  await expect(verdict).toContainText("敗北");
  // The exact regression: the solo mission wording standing in for a ranked
  // result is how a loss came to read as a win.
  await expect(verdict).not.toContainText("勝利");
  await expect(verdict).not.toContainText("テラフォーミング完了");

  // The ranking has to name who actually won, and by how much.
  const standings = page.getByTestId("game-over-standings");
  await expect(standings).toContainText("プレイヤー2");
  await expect(standings).toContainText("68");
  await expect(standings).toContainText("20");
  await expect(standings).toContainText("👑");
});

test("a winning player is told they won", async ({ page }) => {
  await openFinishedGame(page, humanWins());

  await expect(page.getByTestId("game-over-title")).toContainText("勝利");
  await expect(page.getByTestId("game-over-standings")).toContainText("71");
});

test("equal score and equal MC is a shared win", async ({ page }) => {
  await openFinishedGame(page, tied());

  // Not "someone won by tiebreak" -- both seats are winners.
  await expect(page.getByTestId("game-over-title")).toContainText("同点");
});

test("solo keeps its mission wording and shows no ranking", async ({ page }) => {
  await openFinishedGame(page, soloSuccess());

  // Solo is scored against the planet, so borrowing the ranked verdict here
  // would be the same confusion running the other way.
  await expect(page.getByTestId("game-over-title")).toContainText("テラフォーミング完了");
  await expect(page.getByTestId("game-over-standings")).toHaveCount(0);
});
