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
  audit-ongoing-effects  an ongoing effect is felt where it applies -- a
                         discount at a price, a concession at a trade, a
                         watcher at the next card played
  audit-card-scoring     every variable-VP card pays what its spec declares at
                         0, per-1, per and per+1 of whatever it counts, with
                         "all" shapes split across both players
  audit-playable-        the reference implementation's own requirement cases,
    against-upstream     run against our engine on the boards its authors chose
  audit-actions-         the same, for whether a card's action can be used --
    against-upstream     the half a playability check cannot see
  audit-vp-cases-        and the same again for what a card is worth: the spec
    against-upstream     comparison checks the declaration, the boundary sweep
                         checks the arithmetic, this checks the answer
  audit-empty-spec-      every card with no effectSpec says by name why it has
    registry             none, so a card cannot go quietly dead
  audit-cards-against-   our cost, tags, requirements, type and resource type
    upstream             say what the real cards say, compared against a
                         manifest pinned to one upstream commit
  audit-vp-against-      the same, for victory points
    upstream

Not verified:
  a bespoke card's effect beyond "something changed"
  whether OUR TEXT describes the real card. Every audit here checks that the
    engine honours what the catalogue says; a card whose text promises nothing
    passes them all while doing nothing. Seven cards were in exactly that state
    -- their upstream behaviour lives in a hand-written method the catalogue
    generator could not copy -- and only reading the real cards found them.
    audit-empty-spec-registry is the gate for the next one, but it can only
    ask whether a card is accounted for, never whether the account is true
  four ongoing effects the audit has no reading for -- Rover Construction,
    Cutting Edge Technology, Martian Lumber Corp and Meat Industry. Each has a
    test in strict-rules, so they are checked; they are not checked by a
    mechanical sweep that would notice if a fifth appeared
  Capital, Law Suit, St Joseph and Vermin, which score by their own rule
    rather than by a spec, and are covered by tests instead
  the order effects resolve in, where the order changes the outcome
  the upstream test blocks the three oracle builders could not read -- 164 for
    playability, 80 for actions, 91 for scoring. Each is named with a reason in
    its manifest rather than counted, because a builder that discards half the
    corpus and then reports no skips says the audit is complete when it is not
  whether a tile a card places has anywhere legal to go. Upstream decides that
    in bespokeCanPlay and refuses the play; we do not, which is seven of the
    known differences in the playability audit
  whether a card's BEHAVIOUR matches the real card. Its printed values are
    compared with upstream; what it does when played is not, because upstream
    expresses that as behavior objects, bespoke play() methods and class
    inheritance at once, and a field-by-field comparison would report
    differences of expression rather than of rules
  31 cards whose upstream constructor declares no readable field: a prelude
    prints no cost or tags, a corporation declares startingMegaCredits, and a
    few pass their values positionally to a base class

"Every card does something" is not "every card is right", and the numbers above
are the first claim. The second is only true where a contract or a test says so.`);
