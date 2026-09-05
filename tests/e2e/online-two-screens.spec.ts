import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// Online is the half of this project that shipped broken twice while every
// suite stayed green: once it crashed the moment a room opened, and once it
// could not reach generation 3. Both were found by hand or by a driver, not by
// a test, because nothing here ever opened two browsers at once.
//
// The WebSocket driver in scripts/online-playtest.mjs owns whole-game
// progression and server authority. This owns the part the driver structurally
// cannot see: what two real browsers render, and whether either of them throws
// on the way to the table.
//
// It deliberately stops at the corporation screen. Everything past that is the
// driver's job, and duplicating it here would buy nothing but flake.

const LOBBY_TIMEOUT = 20_000;

async function openTable(context: BrowserContext) {
  const page = await context.newPage();
  const crashes: string[] = [];
  page.on("pageerror", error => crashes.push(String(error)));
  // The dev server streams and hydrates; a click that lands before React
  // attaches is swallowed silently -- the button reports enabled and visible,
  // the handler simply never runs. Waiting for the network to settle is what
  // separates "the click did nothing" from "the feature is broken".
  await page.goto("/", { waitUntil: "networkidle" });

  // The first run puts the manual over everything, including the online button.
  const manual = page.getByTestId("onboarding-dismiss");
  if (await manual.isVisible().catch(() => false)) await manual.click();

  return { page, crashes };
}

async function openLobby(page: Page) {
  const online = page.getByTestId("mode-online");
  // If this build gated online off, the whole scenario is meaningless -- say so
  // rather than failing later on a missing button.
  await expect(online, "this build has online disabled; run the dev server build").toBeEnabled();
  await online.click();
}

test("two browsers reach the same table through the lobby", async ({ browser }) => {
  // Separate contexts, not just separate pages: the seat id lives in storage,
  // so sharing one context would put both seats on the same player.
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();

  try {
    const host = await openTable(hostContext);
    const guest = await openTable(guestContext);

    await openLobby(host.page);
    await host.page.getByRole("button", { name: "新しい部屋を作成" }).click();

    const code = (await host.page.getByTestId("room-code").innerText({ timeout: LOBBY_TIMEOUT })).trim();
    // Five characters from the server's own alphabet. A code that does not
    // survive normalisation is a different room, and the guest would silently
    // open an empty one -- the same collision that made a batch of driver games
    // look identical.
    expect(code, `room code was not issued: ${JSON.stringify(code)}`).toMatch(/^[A-Z0-9]{5}$/);

    await openLobby(guest.page);
    await guest.page.getByPlaceholder("ABCDE").fill(code);
    await guest.page.getByRole("button", { name: "参加" }).click();

    // Both clients must see two seats before the host may start; the server
    // refuses a one-player start, and a host that starts too early is the
    // failure this waits out rather than races.
    for (const view of [host.page, guest.page]) {
      await expect(view.getByText("2 / 5人")).toBeVisible({ timeout: LOBBY_TIMEOUT });
    }

    const start = host.page.getByRole("button", { name: "ゲーム開始" });
    await expect(start).toBeEnabled({ timeout: LOBBY_TIMEOUT });
    await start.click();

    // The table itself: each browser must render its own corporation choice.
    // This is what "the room opened and both players can act" looks like, and
    // it is exactly what was broken when online crashed on entry.
    for (const view of [host.page, guest.page]) {
      await expect(view.getByTestId("corp-confirm-button")).toBeVisible({ timeout: LOBBY_TIMEOUT });
      await expect(view.getByTestId("corp-option").first()).toBeVisible();
      // Reaching this panel is not enough. A client that never receives a
      // server view falls back to the local placeholder -- a solo setup that
      // renders the same panel -- so both browsers would show a corporation
      // choice with the server sending nothing at all. Suppressing
      // broadcastViews entirely used to leave this test green.
      const panel = view.getByTestId("corp-panel");
      await expect(panel, "the table is the local placeholder, not the server's").toHaveAttribute("data-online", "1");
      await expect(panel, "the server dealt a solo table, not the two-seat room").toHaveAttribute("data-seats", "2");
    }

    // A crash on either side is a failure even if the DOM happened to arrive.
    expect(host.crashes, `host page errors: ${host.crashes.join(" | ")}`).toEqual([]);
    expect(guest.crashes, `guest page errors: ${guest.crashes.join(" | ")}`).toEqual([]);
  } finally {
    // Closing must not mask the assertion that failed first.
    await hostContext.close().catch(() => {});
    await guestContext.close().catch(() => {});
  }
});
