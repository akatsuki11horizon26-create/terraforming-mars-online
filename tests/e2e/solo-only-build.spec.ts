import { test, expect } from "@playwright/test";
import { humanLoses } from "./fixtures/finished-games.mjs";

// The two published sites are built from one source. Pages has no server, so
// its build sets NEXT_PUBLIC_SOLO_ONLY=1 and ONLINE_ENABLED goes false. That
// flag gates three separate places, and nothing else in the project checks
// that the shipped bundle actually honours it: the unit tests import modules
// rather than a build, and the audits never see the DOM. If a gate were
// dropped, the Pages site would offer a lobby that can never connect and the
// suites would all stay green.
//
// This runs against static-dist/, which is the solo build after minification,
// so it is the artefact the Pages workflow uploads.

const SAVE_KEY = "mars_frontier_game";

test("the solo build offers online play but refuses to start it", async ({ page }) => {
  await page.goto("/");

  const online = page.getByTestId("mode-online");

  // Present rather than hidden: a player who came looking for online play is
  // told why it is missing, instead of finding two modes where docs say three.
  await expect(online).toBeVisible();
  await expect(online).toBeDisabled();
  await expect(online).toHaveAttribute("title", "この配信版はソロ専用です");
  await expect(online).toContainText("この配信版では利用できません。");

  // The modes that this build does serve are untouched by the flag.
  await expect(page.getByTestId("mode-solo")).toBeEnabled();
  await expect(page.getByTestId("mode-robot")).toBeEnabled();
});

test("the solo build mounts no lobby button in the in-game header", async ({ page }) => {
  // The second gate. A disabled title button is not enough on its own: the
  // header carries its own entry to the lobby, and it is reachable from any
  // state past the title screen.
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [SAVE_KEY, humanLoses()] as const
  );
  await page.goto("/");
  await page.getByTestId("mode-continue").click();

  const header = page.locator("header.header");
  await expect(header).toBeVisible();
  await expect(header.getByRole("button", { name: "オンライン対戦" })).toHaveCount(0);
  // The neighbouring header buttons still mount, so the assertion above is
  // about the flag and not about a header that failed to render.
  await expect(header.getByRole("button", { name: "タイトルへ" })).toBeVisible();
  await expect(header.getByRole("button", { name: "マニュアル表示" })).toBeVisible();
});
