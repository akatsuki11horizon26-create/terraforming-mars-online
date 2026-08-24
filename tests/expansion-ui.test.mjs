import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const appRoot = new URL("../app/", import.meta.url);

async function readApp(name) {
  return readFile(new URL(name, appRoot), "utf8");
}

test("The expansion stylesheet is loaded alongside the base theme", async () => {
  const layout = await readApp("layout.tsx");
  assert.match(layout, /globals\.css/);
  assert.match(layout, /expansion-ui\.css/, "the new surfaces are styled");
});

test("New surfaces reuse the existing colour tokens", async () => {
  const css = await readApp("expansion-ui.css");

  for (const token of ["--color-panel", "--color-ember", "--color-cyan", "--color-gold", "--color-ink"]) {
    assert.ok(css.includes(token), `${token} is reused rather than redefined`);
  }
  // The base palette must not be overwritten by the new sheet.
  assert.equal(
    /--color-ember:\s*#/.test(css),
    false,
    "the new sheet extends the palette instead of replacing it"
  );
});

test("Every new surface has styling", async () => {
  const css = await readApp("expansion-ui.css");

  for (const selector of [
    ".player-bar",
    ".player-chip",
    ".choice-overlay",
    ".choice-dialog",
    ".choice-option",
    ".claim-grid",
    ".claim-row",
    ".claim-button",
    ".party-row",
    ".delegate-dot",
    ".event-slot",
    ".colony-tile",
    ".colony-track",
    ".track-step",
    ".colony-slot",
    ".hex-special",
    ".section-title"
  ]) {
    assert.ok(css.includes(selector), `${selector} is styled`);
  }
});

test("The new panels stay responsive and keyboard-reachable", async () => {
  const css = await readApp("expansion-ui.css");
  assert.match(css, /@media \(max-width: 650px\)/, "narrow screens are handled");
  assert.match(css, /max-height: min\(80vh/, "the modal never exceeds the viewport");
  assert.match(css, /overflow-y: auto/, "long option lists scroll");

  const globals = await readApp("globals.css");
  assert.match(globals, /focus-visible/, "keyboard focus styling is still present");
  assert.match(globals, /prefers-reduced-motion/, "reduced motion is still honoured");
});

test("Panels are declared as components and exported for the page", async () => {
  const panels = await readApp("expansion-panels.tsx");

  for (const name of [
    "PlayerBar",
    "PendingChoiceDialog",
    "MilestonePanel",
    "AwardPanel",
    "TurmoilPanel",
    "ColonyPanel"
  ]) {
    assert.match(panels, new RegExp(`export function ${name}`), `${name} is exported`);
  }
});

test("The choice dialog is announced to assistive technology", async () => {
  const panels = await readApp("expansion-panels.tsx");
  assert.match(panels, /role="dialog"/);
  assert.match(panels, /aria-modal="true"/);
  assert.match(panels, /aria-label=\{choice\.prompt\}/, "the prompt names the dialog");
});

test("The player switcher marks the active player", async () => {
  const panels = await readApp("expansion-panels.tsx");
  assert.match(panels, /aria-current=\{player\.id === currentPlayerId\}/);
  assert.match(panels, /if \(players\.length <= 1\) return null/, "solo hides the switcher");
});

test("The page mounts every new panel and gates them on real state", async () => {
  const page = await readApp("page.tsx");

  assert.match(page, /<PendingChoiceDialog/);
  assert.match(page, /<MilestonePanel/);
  assert.match(page, /<AwardPanel/);
  // PlayerBar is deliberately gone: the standings row under the HUD carries the
  // same per-seat figures, and PlayerBar's chips were buttons with no handler.
  assert.doesNotMatch(page, /<PlayerBar/, "the duplicated player bar stays removed");
  assert.match(page, /<Standings/, "the standings row replaces it");

  // Expansion boards only appear when that expansion is switched on, so a plain
  // solo game looks unchanged.
  assert.match(page, /\{turmoilView && \(/, "the Turmoil board is conditional");
  assert.match(page, /colonyViews\.length > 0 && \(/, "the Colonies board is conditional");
  assert.match(page, /players\.length > 1 && \(/, "per-seat rows are conditional");
});

test("Panel actions are wired to the engine, not to local state", async () => {
  const page = await readApp("page.tsx");

  for (const handler of [
    "jsClaimMilestone",
    "jsFundAward",
    "jsSendDelegateToParty",
    "jsBuildColonyOn",
    "jsTradeWith",
    "jsResolvePendingChoice"
  ]) {
    assert.ok(page.includes(handler), `${handler} is called from the UI`);
  }
  assert.match(page, /const runEngine =/, "engine results are persisted through one path");
});

test("A fresh game renders the setup screen without expansion panels", async () => {
  const html = await readFile(new URL("../static-dist/index.html", import.meta.url), "utf8");

  // First paint is the title screen; a game only exists once a mode is chosen.
  assert.match(html, /title-mode/, "the entry point renders");
  // The expansion boards are gated behind an active game, so none of them
  // should appear before one has started.
  assert.equal(html.includes("claim-grid"), false);
  assert.equal(html.includes("choice-overlay"), false);
  assert.equal(html.includes("player-bar"), false);
});
