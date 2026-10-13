import { test, expect } from "@playwright/test";
import { getInitialState } from "../../app/game-logic.js";
import { createDraft } from "../../app/draft.js";
import { SAVE_KEY, serializeSavedState } from "../../app/save-migration.js";

for (const width of [1343, 390]) {
  test(`initial hotseat draft reaches corporation selection at ${width}px`, async ({ page }) => {
    test.setTimeout(40_000);
    const state = getInitialState({ playerCount: 2, mode: "hotseat", draft: true, initialDraft: true, seed: 71 });
    state.onboarded = true;
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    }, { key: SAVE_KEY, saved: serializeSavedState(state) });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    await expect(page.getByTestId("corp-panel")).toBeHidden();
    for (let pick = 0; pick < 20; pick++) {
      await page.getByTestId("draft-card-option").first().click();
      await expect.poll(() => page.evaluate(key => {
        const saved = JSON.parse(localStorage.getItem(key)!);
        return saved.draft ? Object.values(saved.draft.picked).reduce((sum: number, cards) => sum + (cards as string[]).length, 0) : 20;
      }, SAVE_KEY)).toBe(pick + 1);
      if (pick === 6) {
        await page.reload({ waitUntil: "networkidle" });
        await page.getByTestId("mode-continue").click();
      }
    }
    await expect(page.getByTestId("draft-panel")).toBeHidden();
    await expect(page.getByTestId("corp-panel")).toBeVisible();
    await expect(page.getByTestId("setup-card-option")).toHaveCount(10);
  });

  for (const initial of [false, true]) {
  test(`CPU ${initial ? "initial" : "research"} draft reaches purchase at ${width}px`, async ({ page }) => {
    test.setTimeout(30_000);
    const state = getInitialState({ playerCount: 2, mode: "robot", botDifficulty: "easy", draft: true, initialDraft: initial, seed: 72 });
    state.onboarded = true;
    if (!initial) {
      state.phase = "research";
      state.generation = 2;
      for (const player of state.players) Object.assign(player, { corporationId: "corp-credicor", setupStep: "complete", researchCards: [], hand: [], mc: 50 });
      state.draft = createDraft(state.turnOrder, { player: state.deck.splice(0, 4), player2: state.deck.splice(0, 4) }, 2);
    }
    await page.addInitScript(({ key, saved }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, saved);
    }, { key: SAVE_KEY, saved: serializeSavedState(state) });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.getByTestId("mode-continue").click();
    const total = initial ? 10 : 4;
    for (let pick = 0; pick < total; pick++) {
      const first = page.getByTestId("draft-card-option").first();
      await expect(first).toBeEnabled();
      await first.click();
      await expect.poll(() => page.evaluate(({ key, total }) => {
        const saved = JSON.parse(localStorage.getItem(key)!);
        return saved.draft?.picked.player.length ?? total;
      }, { key: SAVE_KEY, total })).toBe(pick + 1);
    }
    await expect(page.getByTestId("draft-panel")).toBeHidden();
    if (initial) {
      await expect(page.getByTestId("setup-card-option")).toHaveCount(10);
      await page.getByTestId("corp-option").first().click();
      await page.getByTestId("corp-confirm-button").click();
    } else {
      await expect(page.getByTestId("research-card-option")).toHaveCount(4);
      await page.getByTestId("buy-cards-confirm-button").click();
    }
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).phase, SAVE_KEY)).toBe("action");
  });
  }
}
