// Turns "74 promo projects" into a list of specific cards, matched to the
// official card numbers printed on them.
//
// The audit's §4.1: "428 projects as a total does not identify what is
// included; list the product, the year, the card number, the source and the
// status." The card number is the part that can be verified from the reference
// implementation, and data/promo-card-numbers.json carries it. This reconciles
// that list against our own catalogue so the promo range is a table rather than
// a count -- and, more usefully, so a promo card we have NOT implemented is
// named rather than absent.
//
// The product and the year are not in the reference source and are not guessed.
import { readFileSync } from "node:fs";
import { ALL_CARDS, PRELUDES, CORPORATIONS } from "../app/game-logic.js";

const manifest = JSON.parse(readFileSync(new URL("../data/promo-card-numbers.json", import.meta.url), "utf8"));

const ours = [...ALL_CARDS, ...PRELUDES, ...CORPORATIONS].filter(card => card.expansion === "promo");

// Our ids are slugs of the English name: card-promo-16-psyche, corp-promo-...
// Compare on a normalised name rather than on the id's shape, which differs
// between projects, preludes and corporations.
function slug(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const oursByName = new Map();
for (const card of ours) {
  const key = slug(card.englishName ?? card.name);
  if (key) oursByName.set(key, card);
  // Several carry only a Japanese name, so the id is the other way in.
  const fromId = slug(String(card.id).replace(/^(card|corp|prelude)-promo-/, ""));
  if (fromId && !oursByName.has(fromId)) oursByName.set(fromId, card);
}

const matched = [];
const missing = [];
for (const entry of manifest.cards) {
  const card = oursByName.get(slug(entry.englishName));
  if (card) matched.push({ ...entry, id: card.id });
  else missing.push(entry);
}

// Ours that the manifest does not name. Not an error on its own -- the manifest
// only covers upstream's promo directory -- but it has to be visible.
const claimedIds = new Set(matched.map(entry => entry.id));
const unlisted = ours.filter(card => !claimedIds.has(card.id));

console.log(`promo cards in this catalogue        : ${ours.length}`);
console.log(`official numbers in the manifest     : ${manifest.numbered} (of ${manifest.filesRead} files)`);
console.log(`  matched to a card here             : ${matched.length}`);
console.log(`  numbered upstream, not implemented : ${missing.length}`);
console.log(`  here but not in the manifest       : ${unlisted.length}`);

if (missing.length > 0) {
  console.log("\nnumbered upstream and not implemented here:");
  for (const entry of missing) console.log(`  ${entry.cardNumber.padEnd(5)} ${entry.englishName ?? entry.cardName}`);
}
if (unlisted.length > 0) {
  console.log("\nin this catalogue with no official number matched:");
  for (const card of unlisted) console.log(`  ${card.id}`);
}
if (manifest.withoutNumber.length > 0) {
  console.log("\nupstream promo files carrying no card number:");
  for (const file of manifest.withoutNumber) console.log(`  ${file}`);
}

// This reports rather than gates: the promo range is a scope decision, not a
// defect, and OFFICIAL_SCOPE.md is where that decision is recorded. It exits
// non-zero only if the manifest itself is unusable.
if (manifest.numbered === 0) {
  console.error("\nthe manifest names no cards; rebuild it with build-promo-manifest.mjs");
  process.exit(1);
}
