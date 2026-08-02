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

test("No hardcoded rust or ember values survive", () => {
  // These were the source of the red cast; colour now comes from tokens.
  assert.equal(css.includes("rgba(168, 50, 32"), false);
  assert.equal(css.includes("rgba(239, 90, 50"), false);
});
