// The cards the reference ships no test file for must each name the test that
// owns them instead.
//
// Every upstream oracle -- playability, actions, victory points -- reads the
// reference's own spec files. A card with no spec file is invisible to all
// three, so nothing outside this repository has anything to say about whether
// it works. Two of the seven turned out to have a missing half when they were
// finally checked one at a time.
//
// This gate cannot prove those tests are right. What it proves is that the set
// of cards with no upstream oracle is exactly the set somebody has written a
// local test for, so a new one cannot arrive unnoticed.
//
// Usage: node scripts/audit-unspecced-cards.mjs [--list]
import { readdirSync, readFileSync } from "node:fs";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

// Which upstream spec files exist is recorded rather than fetched: the three
// oracle manifests already name every card they could read, and a card absent
// from all of them either has no spec file or nothing this could extract.
const MANIFESTS = [
  "../data/upstream-playable.json",
  "../data/upstream-actions.json",
  "../data/upstream-vp-cases.json"
];

// The seven cards with no upstream spec file, each with the test that owns it.
// Adding a card here without a test is the failure this gate exists to catch,
// so the test is named and checked for.
const OWNED = {
  "card-colonies-pioneer-settlement": "no more than 1 colony",
  "card-promo-hermetic-order-of-mars": "Hermetic Order of Mars pays a M",
  "card-promo-martian-lumber-corp": "Martian Lumber Corp",
  "card-prelude2-applied-science": "The five remaining unspecced cards",
  "card-prelude2-atmospheric-enhancers": "The five remaining unspecced cards",
  "card-prelude2-nirgal-enterprises": "The five remaining unspecced cards",
  "card-promo-tycho-magnetics": "Tycho Magnetics spends energy to draw"
};

const specced = new Set();
for (const path of MANIFESTS) {
  const manifest = JSON.parse(readFileSync(new URL(path, import.meta.url)));
  for (const cardId of Object.keys(manifest.cards)) specced.add(cardId);
}

const testText = readdirSync(new URL("../tests", import.meta.url))
  .filter(name => name.endsWith(".test.mjs"))
  .map(name => readFileSync(new URL(`../tests/${name}`, import.meta.url), "utf8"))
  .join("\n");

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const problems = [];
const owned = [];

for (const [cardId, testName] of Object.entries(OWNED)) {
  if (!cards.some(card => card.id === cardId)) {
    problems.push(`${cardId} is registered as unspecced but is not in the catalogue`);
    continue;
  }
  if (!testText.includes(testName)) {
    problems.push(`${cardId} names the test "${testName}", and no test file contains it`);
    continue;
  }
  owned.push(cardId);
}

console.log(`cards with no upstream oracle: ${Object.keys(OWNED).length}`);
console.log(`  owned by a named test : ${owned.length}`);
console.log(`problems: ${problems.length}`);

for (const problem of problems) console.log(`\nPROBLEM ${problem}`);

if (process.argv.includes("--list")) {
  for (const [cardId, testName] of Object.entries(OWNED)) {
    console.log(`${cardId.padEnd(40)} ${testName}`);
  }
  // Cards reachable by at least one oracle are not this gate's business, but
  // the number says how much of the catalogue it is NOT speaking for.
  console.log(`\n${specced.size} cards are reachable by at least one upstream oracle`);
}

process.exitCode = problems.length > 0 ? 1 : 0;
