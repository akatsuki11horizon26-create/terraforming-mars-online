// Says what the card audits actually verify, and what they do not.
//
// The individual audits each print a number, and read together they invite a
// conclusion none of them supports: "547/547" is every card doing something,
// "0 inert" is every card being known to the engine, and neither is every card
// being right. This prints the split by what a card is, so the honest sentence
// is available rather than assembled from three green ticks.
//
// Usage: node scripts/audit-coverage-report.mjs
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const kindOf = card => {
  const text = card.effectText ?? "";
  const spec = card.effectSpec ?? {};
  if (spec.action && Object.keys(spec.action).length > 0) return "action";
  if (/^効果:/.test(text)) return "ongoing";
  if (spec.behavior && Object.keys(spec.behavior).length > 0) return "onPlay";
  if (card.victoryPoints || card.victoryPointSpec) return "scoring";
  return "bespoke";
};

const groups = {};
for (const card of OFFICIAL_PROJECTS) {
  const kind = kindOf(card);
  groups[kind] = (groups[kind] ?? 0) + 1;
}

console.log("What the audits check, by what a card is\n");
console.log(`projects       ${OFFICIAL_PROJECTS.length}`);
for (const [kind, count] of Object.entries(groups).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${kind.padEnd(12)} ${count}`);
}
console.log(`preludes       ${PRELUDES.length}`);
console.log(`corporations   ${CORPORATIONS.length}`);

console.log(`
Verified:
  audit-inert-cards      every card is known to the engine (a gate at 0)
  card-coverage          every card changes the state when played
  audit-card-contracts   the declared amount is the amount paid, for the
                         cards whose promise is a fixed or countable number
  audit-card-actions     every branch of every declared action takes what it
                         says and gives what it says

Not verified:
  a bespoke card's effect beyond "something changed"
  an ongoing effect firing at the right moment, except where a test covers it
  scoring beyond the cards a test names
  the order effects resolve in, where the order changes the outcome

"Every card does something" is not "every card is right", and the numbers above
are the first claim. The second is only true where a contract or a test says so.`);
