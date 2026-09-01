// How much of what upstream checks, in the blocks our oracles could not read,
// anything here checks too.
//
// The 913 assertions in data/upstream-assertions.json are the ones no oracle
// could reduce to a case. This reports, per claim kind, how many have a local
// test that at least names the same card and reaches the same kind of thing --
// playability through getCardPlayableStatus, an action through
// USE_CARD_ACTION, points through the scorer, and so on.
//
// That is a candidate search, not proof, and this file does not pretend
// otherwise: a test naming Arctic Algae and touching plants is not evidence
// that it checks the same proposition upstream checks. sol's word for the
// stronger thing is a coverage file listing each assertion against a named
// local assertion, which is not what this is. What this does give is a number
// that cannot drift silently: the baseline pins which assertions currently
// have a candidate, so one losing its test fails even when the total is
// unchanged.
//
// Usage: node scripts/audit-upstream-assertions.mjs [--missing] [--write-baseline]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const manifest = JSON.parse(
  readFileSync(new URL("../data/upstream-assertions.json", import.meta.url), "utf8")
);
const baselineFile = new URL("../data/upstream-assertion-baseline.json", import.meta.url);

// What a local test has to touch to be a candidate for each kind of claim.
const REACHES = {
  playable: /getCardPlayableStatus|PLAY_CARD/,
  "action-available": /getCardActionStatus|USE_CARD_ACTION|CORPORATION_ACTION/,
  "victory-points": /victoryPoints|scoreFor|finalScore/,
  production: /Prod\b|production/,
  stock: /\.(mc|steel|titanium|plants|energy|heat)\b/,
  "card-resource": /cardResources|changeCardResource/,
  "board-or-global": /placeTileAt|oxygen|temperature|oceans|venus/,
  "terraform-rating": /\.tr\b|increaseTerraformRating/,
  "hand-or-tableau": /\.hand\b|playedProjects/,
  "pending-input": /pendingChoice|resolvePendingChoice/
};

const testDir = new URL("../tests/", import.meta.url);
const testBlocks = readdirSync(testDir)
  .filter(name => name.endsWith(".test.mjs"))
  .flatMap(name => readFileSync(new URL(name, testDir), "utf8").split(/\ntest\(/));

const hasCandidate = row => {
  const pattern = REACHES[row.claimKind];
  if (!pattern) return false;
  return testBlocks.some(block => block.includes(row.cardId) && pattern.test(block));
};

const classified = manifest.assertions.filter(row => row.claimKind !== null);
const covered = [];
const missing = [];
for (const row of classified) (hasCandidate(row) ? covered : missing).push(row);

const coveredIds = new Set(covered.map(row => row.id));
const baseline = new Set(JSON.parse(readFileSync(baselineFile, "utf8")).covered);

// A row that had a candidate and no longer does is a regression even when the
// total holds steady, which is the whole reason the set is pinned by name.
const lost = [...baseline].filter(id => !coveredIds.has(id)).sort();

if (process.argv.includes("--write-baseline")) {
  writeFileSync(baselineFile, `${JSON.stringify({
    note: "Upstream assertions that currently have a candidate local test. Losing one fails; gaining one is free.",
    covered: [...coveredIds].sort()
  }, null, 1)}\n`);
  console.log(`baseline rewritten: ${coveredIds.size} rows`);
}

const byKind = new Map();
for (const row of classified) {
  const entry = byKind.get(row.claimKind) ?? { covered: 0, missing: 0 };
  if (coveredIds.has(row.id)) entry.covered += 1;
  else entry.missing += 1;
  byKind.set(row.claimKind, entry);
}

console.log(`upstream assertions the oracles could not read: ${manifest.assertions.length}`);
console.log(`  classified into a kind of claim             : ${classified.length}`);
console.log(`  with a candidate local test                 : ${covered.length}`);
console.log(`  with none                                   : ${missing.length}`);
for (const [kind, entry] of [...byKind].sort((a, b) => (b[1].covered + b[1].missing) - (a[1].covered + a[1].missing))) {
  console.log(`  ${kind.padEnd(18)} candidate ${String(entry.covered).padStart(4)} | none ${entry.missing}`);
}

for (const id of lost) console.log(`\nPROBLEM ${id} had a candidate test and no longer does`);

if (process.argv.includes("--missing")) {
  for (const row of missing) console.log(`${row.id.padEnd(64)} ${row.claimKind}`);
}

// Only the regression direction gates. The absolute number is a measurement,
// and calling a candidate search a proof would be the exact mistake the skip
// ledger made.
process.exitCode = lost.length > 0 ? 1 : 0;
