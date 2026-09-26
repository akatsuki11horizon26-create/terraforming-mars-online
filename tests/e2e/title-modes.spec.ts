import { test, expect } from "@playwright/test";

// Hotseat has been implemented and tested for a long time, and was unreachable
// for just as long: the title screen offered solo, robot and online, and the
// only control that asks how many people are playing lived behind a header
// button you could not press until a game was already running. A mode nobody
// can start is not a shipped mode, and no engine test can notice that.

test("hotseat is reachable from the title screen", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("mode-hotseat").click();

  // Reaching the panel is not enough: it has to be asking the question only a
  // hotseat game asks, with a seat count a second player can actually use.
  await expect(page.getByText("プレイ人数", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "2人", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByPlaceholder("プレイヤー1")).toBeVisible();
  await expect(page.getByPlaceholder("プレイヤー2")).toBeVisible();
});

test("long Venus track is offered only with Amazonis and Venus Next", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto("/");
  await page.getByTestId("mode-solo").click();
  const longTrack = page.getByTestId("setup-extended-venus");
  await expect(longTrack).toHaveCount(0);
  await page.getByRole("button", { name: /アマゾニス/ }).click();
  await expect(longTrack).toHaveCount(0);
  await page.getByText("金星 (Venus Next)", { exact: true }).click();
  await expect(longTrack).toBeChecked();
  await longTrack.uncheck();
  await expect(longTrack).not.toBeChecked();
  await page.getByRole("button", { name: /タルシス/ }).click();
  await expect(longTrack).toHaveCount(0);
});
