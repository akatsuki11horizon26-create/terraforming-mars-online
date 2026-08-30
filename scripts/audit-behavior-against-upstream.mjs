// Checks that our declared behaviour says what the real card's declared
// behaviour says.
//
// The printed-value audit compares what is on the card face. The three oracles
// run the reference's own tests. Neither asks this: a card can print the right
// cost, pass every test anyone wrote about it, and still have a declared effect
// that differs in a key nobody happened to test.
//
// Only keys BOTH sides use are compared, and only where they mean the same
// thing -- upstream's Behavior type and our effectSpec share their names
// because the catalogue was generated from it. A key only one side has is
// reported as a difference, since that is how a half goes missing.
//
// Usage: node scripts/audit-behavior-against-upstream.mjs [--list]
import { readFileSync } from "node:fs";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const manifest = JSON.parse(readFileSync(new URL("../data/upstream-behavior.json", import.meta.url)));

// Keys whose name and meaning are shared. Anything outside this set is left
// alone: our catalogue carries keys upstream expresses another way (`lose`,
// `stealFromPlayer`, `drawCardByTagCount`), and reporting those would be
// reporting differences of expression rather than of rules.
const COMPARED = new Set([
  "production", "stock", "tr", "global", "drawCard", "addResources",
  "addResourcesToAnyCard", "removeResourcesFromAnyCard", "decreaseAnyProduction",
  "steelValue", "titanumValue", "greeneryDiscount", "spend"
]);

// Cards whose curated entry deliberately says something other than upstream's
// declaration, each with the reason. A divergence with a reason is a decision.
const DIVERGENT = {
  "card-base-immigrant-city":
    "upstream sheds its production with LoseProduction, which never blocks the play; ours says lose",
  "card-promo-asteroid-deflection-system":
    "its reveal action lives in the curated effect, where the normaliser reads it",
  "card-base-noctis-city":
    "the energy cost is in the card text and absent from upstream's behavior block",
  "card-base-nitrophilic-moss":
    "the two plants it spends are stated in the text and spent in bespokePlay upstream",
  "card-promo-potatoes":
    "the two plants it spends are stated in the text and spent in bespokePlay upstream",
  "card-venus-stratospheric-birds":
    "the floater it spends is stated in the text and checked in bespokeCanPlay upstream",
  "card-promo-hermetic-order-of-mars":
    "the per-empty-area money is counted in bespokePlay upstream",
  "card-base-industrial-center":
    "its tile placement rule is stated in the text and enforced in bespokeCanPlay upstream",
  "card-base-urbanized-area":
    "its two-city placement rule is enforced in bespokeCanPlay upstream",
  "card-base-terraforming-ganymede":
    "the per-Jovian rating is counted in bespokePlay upstream",
  "card-prelude2-preservation-program":
    "upstream declares tr at the top level rather than inside a behavior block",
  "card-promo-hospitals":
    "its action spends a disease resource off any card, which our engine cannot express",
  "card-promo-kuiper-cooperative":
    "its action adds a resource to a card by tag, chosen by the player",
  "card-prelude2-palladin-shipping":
    "a corporation action lives in the command table, not in effectSpec"
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];

// Compares two values the way the catalogues write them: objects by their
// shared keys, arrays in order, everything else by value with enum leaves
// lowercased on both sides.
const leaf = value =>
  typeof value === "string" ? value.split(".").pop().toLowerCase() : value;

const differences = (theirs, ours, path = "") => {
  const found = [];
  if (theirs === null || ours === null || typeof theirs !== "object" || typeof ours !== "object") {
    if (leaf(theirs) !== leaf(ours)) {
      found.push(`${path || "value"}: upstream ${JSON.stringify(theirs)}, ours ${JSON.stringify(ours)}`);
    }
    return found;
  }
  if (Array.isArray(theirs) !== Array.isArray(ours)) {
    found.push(`${path}: one is a list and the other is not`);
    return found;
  }
  for (const key of new Set([...Object.keys(theirs), ...Object.keys(ours)])) {
    const here = path ? `${path}.${key}` : key;
    if (!(key in theirs)) { found.push(`${here}: ours only`); continue; }
    if (!(key in ours)) { found.push(`${here}: upstream only`); continue; }
    found.push(...differences(theirs[key], ours[key], here));
  }
  return found;
};

const agreed = [];
const skipped = [];
const wrong = [];

for (const [cardId, entry] of Object.entries(manifest.cards)) {
  const card = cards.find(item => item.id === cardId);
  if (!card) { skipped.push([cardId, "not in our catalogue"]); continue; }
  if (entry.unreadable) { skipped.push([cardId, entry.unreadable]); continue; }
  if (DIVERGENT[cardId]) { skipped.push([cardId, DIVERGENT[cardId]]); continue; }

  const problems = [];
  let compared = 0;
  for (const half of ["behavior", "action"]) {
    const theirs = entry[half];
    if (!theirs) continue;
    const ours = card.effectSpec?.[half] ?? {};
    for (const key of Object.keys(theirs)) {
      if (!COMPARED.has(key)) continue;
      compared += 1;
      if (!(key in ours)) {
        problems.push(`${half}.${key}: upstream declares it, ours does not`);
        continue;
      }
      problems.push(...differences(theirs[key], ours[key], `${half}.${key}`));
    }
  }

  if (compared === 0) { skipped.push([cardId, "no shared key to compare"]); continue; }
  if (problems.length > 0) wrong.push([card, problems]);
  else agreed.push(cardId);
}

console.log(`declared behaviour compared with upstream ${manifest.ref.slice(0, 7)}: ${agreed.length + wrong.length}`);
console.log(`  agree    : ${agreed.length}`);
console.log(`  differ   : ${wrong.length}`);
console.log(`skipped    : ${skipped.length}`);

for (const [card, problems] of wrong) {
  console.log(`\nDIFFERS ${card.id}  ${card.name}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [id, why] of skipped) console.log(`skip ${id}: ${why}`);
}

process.exitCode = wrong.length > 0 ? 1 : 0;
