// What the card shows, against what upstream prints on it.
//
// Until now there was nothing to compare. The catalogue generator read each
// upstream card's render tree and kept only the strings inside it, so every
// icon, every count and the whole layout were gone before anything of ours saw
// them; our cards render a sentence of Japanese and nothing else. That is not
// "the icons disagree", it is "there are no icons" -- and it means a wrong
// quantity in the text had nothing to contradict it.
//
// So this compares the two things that can be compared today: the resources and
// amounts upstream draws on a card, against the numbers our Japanese text
// gives for the same resources. It is deliberately narrow. A number that
// appears on the card and not in the text, or the other way round, is a real
// disagreement; wording, order and layout are not checked, because our text is
// a translation rather than a transcription and would produce noise rather than
// findings.
//
// Usage: node scripts/audit-render-parity.mjs [--list] [--diff]
import { readFileSync } from "node:fs";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";
import { JAPANESE_TEXT } from "../app/japanese-text.js";

const upstream = JSON.parse(
  readFileSync(new URL("../data/upstream-render-data.json", import.meta.url), "utf8")
);

// The resources whose amounts our Japanese text states in figures. Anything
// drawn as a bare icon with no number, and anything whose Japanese is a word
// rather than a figure, is out of scope here rather than counted wrong.
const COUNTED = {
  megacredits: ["MC"],
  steel: ["建材"],
  titanium: ["チタン"],
  plants: ["植物"],
  energy: ["エネルギー", "電力"],
  heat: ["熱"],
  cards: ["カード"],
  oceans: ["海洋"],
  tr: ["TR"]
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];

// Every {type, amount} the card draws, flattened out of the render tree.
const drawnAmounts = node => {
  const found = [];
  const walk = value => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    if (value.is === "item" && typeof value.type === "string" && typeof value.amount === "number") {
      found.push({ type: value.type, amount: Math.abs(value.amount) });
    }
    for (const key of Object.keys(value)) if (key !== "type") walk(value[key]);
  };
  walk(node);
  return found;
};

// The figures our Japanese text states beside each resource word. Both orders
// occur -- "MC3" and "3MC" -- and so does the +N form on production lines.
const statedAmounts = (text, words) => {
  const found = new Set();
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Japanese puts a counter word between the noun and the figure often enough
    // that strict adjacency reports the translation rather than the number:
    // "植物を最大3個", "海洋タイルを2枚". The gap is bounded, and stops at a full
    // stop, so the figure still has to belong to this resource.
    for (const pattern of [
      new RegExp(`${escaped}[^0-9。]{0,8}?([0-9]+)`, "g"),
      new RegExp(`([0-9]+)[^0-9。]{0,4}?${escaped}`, "g")
    ]) {
      for (const match of text.matchAll(pattern)) found.add(Number(match[1]));
    }
  }
  return found;
};

const agree = [];
const differ = [];
const skipped = [];

for (const card of cards) {
  const key = card.englishName ?? card.name;
  const entry = upstream.cards[key];
  if (!entry) {
    skipped.push([card.id, "upstream draws no render tree for it"]);
    continue;
  }
  const text = JAPANESE_TEXT[card.id]?.effectText ?? "";
  if (!text.trim()) {
    skipped.push([card.id, "no Japanese text"]);
    continue;
  }

  const drawn = drawnAmounts(entry.render);
  const problems = [];
  for (const [type, words] of Object.entries(COUNTED)) {
    const printed = drawn.filter(item => item.type === type).map(item => item.amount);
    if (printed.length === 0) continue;
    const stated = statedAmounts(text, words);
    // A card can draw the same icon several times; the text needs to account
    // for each distinct amount, not repeat them.
    for (const amount of new Set(printed)) {
      // One is usually drawn as a bare icon and read as "a card", "an ocean",
      // so its absence from the text is not evidence of anything.
      if (amount <= 1) continue;
      if (!stated.has(amount)) problems.push(`${type} ${amount} is drawn but not stated`);
    }
  }

  if (problems.length === 0) agree.push(card.id);
  else differ.push([card.id, key, problems]);
}

console.log(`cards compared : ${agree.length + differ.length}`);
console.log(`  amounts agree: ${agree.length}`);
console.log(`  disagree     : ${differ.length}`);
console.log(`skipped        : ${skipped.length}`);

if (process.argv.includes("--diff")) {
  for (const [id, name, problems] of differ) {
    console.log(`\n${id} (${name})`);
    for (const problem of problems) console.log(`  ${problem}`);
  }
}
if (process.argv.includes("--list")) {
  for (const [id, why] of skipped) console.log(`${id.padEnd(44)} ${why}`);
}

// Reported rather than enforced for now: the text is a translation, so some of
// these are wording rather than a wrong number, and calling them all failures
// would make the gate noise. The count is what a ratchet would hold.
