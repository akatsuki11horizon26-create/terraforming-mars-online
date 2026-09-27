import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

function token(name) {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(match, `${name} must be defined as a hex value`);
  return match[1];
}

function channels(hex) {
  const clean = hex.replace("#", "");
  return [0, 2, 4].map(i => parseInt(clean.slice(i, i + 2), 16));
}

function relativeLuminance(hex) {
  const [r, g, b] = channels(hex).map(value => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const SURFACES = ["--surface-base", "--surface-1", "--surface-2", "--surface-3"];
const TEXT = ["--text-hi", "--text-mid", "--text-low"];
const ACCENTS = [
  "--accent-amber",
  "--accent-ember",
  "--accent-cyan",
  "--accent-green",
  "--accent-violet",
  "--accent-rose"
];

test("Every palette token is defined", () => {
  for (const name of [...SURFACES, ...TEXT, ...ACCENTS]) {
    assert.match(token(name), /^#[0-9A-Fa-f]{6}$/);
  }
});

test("Text meets WCAG AA on the panel surface", () => {
  const panel = token("--surface-1");
  for (const name of TEXT) {
    const ratio = contrast(token(name), panel);
    assert.ok(ratio >= 4.5, `${name} is ${ratio.toFixed(2)}:1 on --surface-1, AA needs 4.5`);
  }
});

test("Accents meet WCAG AA on the panel surface", () => {
  const panel = token("--surface-1");
  for (const name of ACCENTS) {
    const ratio = contrast(token(name), panel);
    assert.ok(ratio >= 4.5, `${name} is ${ratio.toFixed(2)}:1 on --surface-1, AA needs 4.5`);
  }
});

test("Primary text stays readable on the brightest surface", () => {
  // --text-low is documented as panel-only, so it is exempt here.
  const bright = token("--surface-3");
  for (const name of ["--text-hi", "--text-mid"]) {
    const ratio = contrast(token(name), bright);
    assert.ok(ratio >= 4.5, `${name} is ${ratio.toFixed(2)}:1 on --surface-3`);
  }
});

test("Each surface is lighter than the one below it", () => {
  const values = SURFACES.map(token);
  for (let i = 1; i < values.length; i++) {
    const below = relativeLuminance(values[i - 1]);
    const above = relativeLuminance(values[i]);
    assert.ok(above > below, `${SURFACES[i]} must be lighter than ${SURFACES[i - 1]}`);

    const step = contrast(values[i - 1], values[i]);
    assert.ok(
      step >= 1.1,
      `${SURFACES[i - 1]} to ${SURFACES[i]} is only ${step.toFixed(2)}:1 — the layers merge`
    );
  }
});

test("The background is dark but never pure black", () => {
  const base = token("--surface-base");
  assert.notEqual(base.toUpperCase(), "#000000", "pure black strains the eye against bright elements");
  assert.ok(relativeLuminance(base) < 0.02, "the base surface must still read as dark");
});

test("Text is tinted rather than pure white", () => {
  assert.notEqual(token("--text-hi").toUpperCase(), "#FFFFFF");
});

test("Corners are chamfered, not rounded", () => {
  // Rounded corners everywhere are what makes a dark UI look generic; the only
  // radius left should be the circular delegate markers.
  const radii = [...css.matchAll(/border-radius:\s*([^;]+);/g)].map(match => match[1].trim());
  const nonCircular = radii.filter(value => value !== "50%");
  assert.deepEqual(nonCircular, [], `unexpected rounded corners: ${nonCircular.join(", ")}`);
  assert.ok(css.includes("clip-path: polygon("), "chamfers are implemented with clip-path");
});

test("The layout is pinned to the viewport", () => {
  // The whole game must fit one screen; only columns scroll.
  assert.match(css, /height:\s*100dvh/, "dvh, not vh: a mobile URL bar changes the viewport");
  assert.match(css, /\.main-content\s*\{[^}]*overflow:\s*hidden/s);
});

test("the scaled board releases its unused space on mobile", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const stage = css.match(/\.board-stage\s*\{[^}]*\}/)?.[0];
  assert.ok(stage, "the sphere needs a layout box that matches its scaled size");
  assert.match(stage, /width:\s*calc\(460px \* var\(--board-scale, 1\)\)/);
  assert.match(stage, /height:\s*calc\(460px \* var\(--board-scale, 1\)\)/);
  assert.match(page, /className="board-stage"[\s\S]*?className="mars-sphere"/);
  assert.match(css, /\.mars-sphere\s*\{[^}]*transform-origin:\s*top left/s);
  assert.match(css, /@media \(max-width: 820px\)\s*\{\s*\.board-panel\s*\{[^}]*height:\s*min\(460px, calc\(100vw - 24px\)\)/);
});

test("mobile hand controls wrap instead of clipping the search and pass action", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /className="hand-toolbar"/);
  assert.match(page, /className="hand-toolbar-actions"/);
  assert.match(page, /className="hand-search"/);
  assert.match(page, /className="btn-secondary hand-turn-button"/);
  const mobile = css.slice(css.indexOf("@media (max-width: 650px)"));
  assert.match(mobile, /\.hand-toolbar\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(mobile, /\.hand-filters\s*\{[^}]*flex:\s*1 1 100%/s);
  assert.match(mobile, /\.hand-turn-button\s*\{[^}]*width:\s*100%/s);
});

test("mobile placement can be unselected before it changes the board", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const cancel = page.slice(page.indexOf('data-testid="cancel-board-placement"'), page.indexOf('data-testid="confirm-board-placement"'));
  assert.match(cancel, /onClick=\{\(\) => setSelectedPlacement\(null\)\}/);
  assert.doesNotMatch(cancel, /handleResolveChoice/);
  assert.match(page, /selectedPlacement\.choiceRef === tileChoice/);
  assert.match(page, /className="mobile-placement-confirm"[^>]*aria-live="polite"/);
  const mobile = css.slice(css.indexOf("@media (max-width: 820px)"));
  assert.match(mobile, /\.mobile-placement-confirm\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(mobile, /\.mobile-placement-confirm \.hud-btn\s*\{[^}]*min-height:\s*44px/s);
});

test("a new mobile placement choice brings the board into view", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const choiceEffect = page.slice(page.indexOf("const tileChoiceId ="), page.indexOf("const tileChoiceCells ="));
  assert.match(choiceEffect, /if \(showTitle \|\| !tileChoiceId \|\| !window\.matchMedia\("\(max-width: 820px\)"\)\.matches\) return/);
  assert.match(choiceEffect, /boardRef\.current\?\.scrollIntoView\(\{ block: "center", behavior: "auto" \}\)/);
  assert.match(choiceEffect, /\[showTitle, tileChoiceId\]/);
});

test("No hardcoded rust or ember values survive", () => {
  // These were the source of the red cast; colour now comes from tokens.
  assert.equal(css.includes("rgba(168, 50, 32"), false);
  assert.equal(css.includes("rgba(239, 90, 50"), false);
});

test("card internals scale with the card, and the aspect ratios agree", async () => {
  const cardCss = await readFile(new URL("../app/expansion-ui.css", import.meta.url), "utf8");
  const tsx = await readFile(new URL("../app/project-card.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  const cssRatio = cardCss.match(/\.tm-card\s*\{[\s\S]*?--card-aspect:\s*([0-9.]+)/);
  const jsRatio = tsx.match(/export const CARD_ASPECT = ([0-9.]+)/);
  assert.ok(cssRatio, "--card-aspect must be declared in expansion-ui.css");
  assert.ok(jsRatio, "CARD_ASPECT must be exported from project-card.tsx");
  // page.tsx sizes the hand by CARD_ASPECT while the stylesheet lays the card
  // out by --card-aspect; if they drift the last row is silently clipped.
  assert.equal(cssRatio[1], jsRatio[1], "--card-aspect and CARD_ASPECT must match");

  const ref = tsx.match(/export const CARD_REFERENCE_WIDTH = ([0-9.]+)/);
  assert.ok(ref, "CARD_REFERENCE_WIDTH must be exported");
  // The fallback is part of the contract: .tm-card must NOT declare --card-w
  // itself, or it shadows the fitted width the hand strip inherits down and
  // every card renders at the reference size. It may only fall back to it.
  const scale = cardCss.match(/--s:\s*calc\(var\(--card-w(?:,\s*([0-9.]+)px)?\)\s*\/\s*([0-9.]+)\)/);
  assert.ok(scale, "--s must divide --card-w by the reference width");
  assert.equal(scale[2], ref[1], "--s divisor and CARD_REFERENCE_WIDTH must match");

  const cardRule = cardCss.slice(cardCss.indexOf(".tm-card {"), cardCss.indexOf("}", cardCss.indexOf(".tm-card {")));
  assert.equal(
    /^\s*--card-w:/m.test(cardRule),
    false,
    ".tm-card must inherit --card-w from the hand strip, not declare its own"
  );
  for (const [, fallback] of cardCss.matchAll(/var\(--card-w,\s*([0-9.]+)px\)/g)) {
    assert.equal(fallback, ref[1], "every --card-w fallback must be the reference width");
  }

  // A narrow card has to be the wide one scaled down. Any bare px font-size
  // inside the card would stay put while the box shrank, and squeeze the rules
  // text out of the card entirely.
  const card = cardCss.slice(cardCss.indexOf(".tm-card {"), cardCss.indexOf(".hand-cards"));
  for (const [rule] of card.matchAll(/\.tm-card[\w-]*[^{]*\{[^}]*\}/g)) {
    const bare = rule.match(/font-size:\s*[0-9.]+px/);
    assert.equal(bare, null, `card font sizes must scale with --s: ${bare?.[0]}`);
  }

  assert.match(
    page,
    /for \(let w = 148; w >= MIN_CARD_WIDTH; w -= 2\)/,
    "the hand must not shrink cards below the readable minimum"
  );
});

test("a hand that cannot fit scrolls instead of hiding its bottom row", async () => {
  const cardCss = await readFile(new URL("../app/expansion-ui.css", import.meta.url), "utf8");
  const hand = cardCss.match(/\.hand-cards\s*\{[^}]*\}/);
  assert.ok(hand, ".hand-cards must be styled");

  // page.tsx floors the card width at 78px, so on a short screen the hand can
  // genuinely exceed its box. Hiding that overflow makes cards unreachable.
  assert.match(hand[0], /overflow-y:\s*auto/, "the hand must scroll vertically");
  assert.doesNotMatch(
    hand[0],
    /overflow:\s*hidden/,
    "a blanket overflow:hidden clips the last row of a hand that does not fit"
  );
});

// The audit found 建材/鋼鉄, 木星/ジョビアン, 称号/マイルストーン and 表彰/褒賞 all in
// use for the same things, which makes the same rule read as two different
// rules. docs/TERMINOLOGY.md fixes one word for each; this stops the others
// coming back.
//
// Card names are exempt: 木星圏ランタン is a proper noun and the tag it needs is
// ジョビアンタグ -- those are different things that happen to share a kanji.
test("one word per concept in the interface text", async () => {
  const { readFile, readdir } = await import("node:fs/promises");

  const banned = [
    ["鋼鉄", "建材"],
    ["鋼材", "建材"],
    ["木星タグ", "ジョビアンタグ"],
    ["称号", "マイルストーン"],
    ["褒賞", "表彰"]
  ];

  const dir = new URL("../app/", import.meta.url);
  const names = (await readdir(dir)).filter(
    name =>
      (name.endsWith(".js") || name.endsWith(".tsx")) &&
      // The card catalogue carries the printed Japanese card names, which are
      // not ours to rewrite.
      name !== "japanese-text.js" &&
      !name.endsWith(".data.js")
  );

  const offences = [];
  for (const name of names) {
    const source = await readFile(new URL(name, dir), "utf8");
    for (const [wrong, right] of banned) {
      if (source.includes(wrong)) offences.push(`${name}: ${wrong} (use ${right})`);
    }
  }
  assert.deepEqual(offences, [], `mixed terminology: ${offences.join(", ")}`);
});
