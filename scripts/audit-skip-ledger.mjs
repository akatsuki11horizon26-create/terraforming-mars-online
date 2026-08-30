// Every card the upstream oracles could not speak for, and who speaks for it
// instead.
//
// Each oracle reports what it ran and what its builder could not read. Read one
// at a time those numbers look small; read together they are 335 upstream test
// blocks across 210 cards that no oracle checks. This is the list, and the rule
// is that a card the oracles cannot reach must be reachable some other way --
// by a local test naming it, or by a contract audit measuring it.
//
// The gate is deliberately not "every card is covered by something". That would
// pass on card-coverage alone, which says only that a card changes the state.
// It is: every card an oracle DROPPED must be named by a local test or measured
// by one of the contract audits, and a card that is neither is unowned.
//
// Usage: node scripts/audit-skip-ledger.mjs [--list]
import { readdirSync, readFileSync } from "node:fs";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const ORACLES = [
  ["playability", "../data/upstream-playable.json"],
  ["actions", "../data/upstream-actions.json"],
  ["victory-points", "../data/upstream-vp-cases.json"]
];

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const byId = new Map(cards.map(card => [card.id, card]));

const testText = readdirSync(new URL("../tests", import.meta.url))
  .filter(name => name.endsWith(".test.mjs"))
  .map(name => readFileSync(new URL(`../tests/${name}`, import.meta.url), "utf8"))
  .join("\n");

// What the ledger holds: one row per card an oracle had something to say about.
const ledger = new Map();
const record = (cardId, oracle, status, count) => {
  if (!ledger.has(cardId)) ledger.set(cardId, { ran: 0, unread: 0, oracles: new Set() });
  const row = ledger.get(cardId);
  row[status] += count;
  row.oracles.add(oracle);
};

for (const [oracle, path] of ORACLES) {
  const manifest = JSON.parse(readFileSync(new URL(path, import.meta.url)));
  for (const [cardId, entry] of Object.entries(manifest.cards)) {
    record(cardId, oracle, "ran", (entry.cases ?? []).length);
    record(cardId, oracle, "unread", (entry.unread ?? []).length);
  }
}

// A card whose spec declares a fixed amount is measured by the contract audits
// whether or not an oracle could read a block about it.
const hasContract = card => {
  const behavior = card.effectSpec?.behavior;
  const action = card.effectSpec?.action;
  return Boolean(
    (behavior && Object.keys(behavior).length > 0) ||
    (action && Object.keys(action).length > 0) ||
    card.victoryPointSpec
  );
};

// The two audits an oracle-dropped card most often lands in. A discount is
// measured where it applies by audit-ongoing-effects; a printed victory point
// is compared with the real card by audit-vp-against-upstream, which skips
// nothing.
const hasOngoingReading = card =>
  Boolean(
    card.effectSpec?.cardDiscount ||
    card.effectSpec?.globalParameterRequirementBonus ||
    card.effectSpec?.behavior?.steelValue ||
    card.effectSpec?.behavior?.titanumValue ||
    card.effectSpec?.behavior?.colonies?.tradeDiscount ||
    card.effectSpec?.behavior?.colonies?.tradeOffset
  );

const hasPrintedPoints = card => typeof card.victoryPoints === "number" && card.victoryPoints !== 0;

// A corporation's opening money is compared with the real card by
// audit-cards-against-upstream, which skips nothing and covers 525 cards.
const hasPrintedStart = card =>
  typeof (card.starting?.mc ?? card.effectSpec?.startingMegaCredits) === "number";

const owned = [];
const unowned = [];

// Every card an oracle dropped a block about, PLUS every card no oracle
// mentions at all. The second group is larger and was the easier one to
// overlook: an oracle that never names a card says nothing about it, which is
// the same silence as one that dropped its blocks.
const needsOwner = cards.filter(card => {
  const row = ledger.get(card.id);
  return !row || row.unread > 0;
});

for (const card of needsOwner) {
  const cardId = card.id;

  // Named by a test, or measured by a contract audit. Either is an owner; being
  // dropped by every oracle and neither is not.
  if (testText.includes(cardId)) owned.push([cardId, "named by a local test"]);
  else if (hasContract(card)) owned.push([cardId, "measured by the contract audits"]);
  else if (hasOngoingReading(card)) owned.push([cardId, "observed by audit-ongoing-effects"]);
  else if (hasPrintedPoints(card)) owned.push([cardId, "its points compared by audit-vp-against-upstream"]);
  else if (hasPrintedStart(card)) owned.push([cardId, "its printed values compared by audit-cards-against-upstream"]);
  else {
    const dropped = ledger.get(cardId)?.unread ?? 0;
    unowned.push([
      cardId,
      dropped > 0
        ? `${dropped} upstream blocks dropped, and nothing measures it`
        : "no upstream oracle mentions it, and nothing measures it"
    ]);
  }
}

const totals = { ran: 0, unread: 0 };
for (const row of ledger.values()) {
  totals.ran += row.ran;
  totals.unread += row.unread;
}

console.log(`upstream oracle blocks: ${totals.ran} run, ${totals.unread} the builders could not read`);
console.log(`cards needing an owner (dropped blocks, or no oracle at all): ${owned.length + unowned.length}`);
console.log(`  owned    : ${owned.length}`);
console.log(`  unowned  : ${unowned.length}`);
console.log(`  of those, no oracle mentions: ${cards.length - ledger.size}`);

for (const [cardId, why] of unowned) console.log(`\nUNOWNED ${cardId}: ${why}`);

if (process.argv.includes("--list")) {
  const reasons = {};
  for (const [, why] of owned) reasons[why] = (reasons[why] ?? 0) + 1;
  for (const [why, count] of Object.entries(reasons)) console.log(`${count} ${why}`);
}

process.exitCode = unowned.length > 0 ? 1 : 0;
