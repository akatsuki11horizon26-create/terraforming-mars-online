// Every card with no effectSpec must say, by name, why it has none.
//
// This is the gate for the blind spot that hid seven dead cards. Every other
// audit asks whether the engine honours the catalogue, so a card whose
// catalogue entry promises nothing passes all of them while doing nothing at
// all -- which is exactly what happens when a card's behaviour lives in a
// hand-written method upstream that the catalogue generator cannot copy.
//
// Nothing here can prove a card works; the tests do that. What this proves is
// that no card has an empty spec by accident. A new one, or a card that loses
// its spec, is unregistered and fails, and the only way to pass is to decide
// which of the two reasons applies and say so.
//
// Usage: node scripts/audit-empty-spec-registry.mjs [--list]
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

// Why a card carries no effectSpec. Both reasons are legitimate; being absent
// from this list is not.
//
//   engine   the rule is written into the engine by name, because it does not
//            fit the spec vocabulary. The engine holds the card's id.
//   effects  the rule is a curated flag on the card -- a discount, a rebate --
//            read by the engine from the card's effects rather than its spec.
//   printed  the card genuinely does nothing when played: it is a requirement,
//            a tag and some victory points, and that is the whole card. Research
//            Coordination is here because its whole rule is the Wild tag it
//            carries, which the tag counter already honours.
const REGISTRY = {
  // Rules written into the engine by name.
  "card-base-indentured-workers": "effects",
  "card-base-insulation": "engine",
  "card-base-land-claim": "engine",
  "card-base-media-group": "engine",
  "card-base-olympus-conference": "engine",
  "card-base-optimal-aerobraking": "engine",
  "card-base-power-infrastructure": "engine",
  "card-base-protected-habitats": "engine",
  "card-base-robotic-workforce": "engine",
  "card-base-rover-construction": "engine",
  "card-base-standard-technology": "effects",
  "card-base-viral-enhancers": "engine",
  "card-colonies-conscription": "effects",
  "card-colonies-market-manipulation": "engine",
  "card-colonies-productive-outpost": "engine",
  "card-prelude-research-coordination": "printed",
  "card-prelude2-terraforming-deal": "engine",
  "card-prelude2-venus-orbital-survey": "engine",
  "card-prelude2-wg-project": "engine",
  "card-promo-advertising": "engine",
  "card-promo-astra-mechanica": "engine",
  "card-promo-carbon-nanosystems": "engine",
  "card-promo-cutting-edge-technology": "engine",
  "card-promo-double-down": "engine",
  "card-promo-energy-market": "engine",
  "card-promo-floyd-continuum": "engine",
  "card-promo-hi-tech-lab": "engine",
  "card-promo-mars-nomads": "engine",
  "card-promo-meat-industry": "engine",
  "card-promo-merger": "engine",
  "card-promo-project-inspection": "engine",
  "card-promo-public-plans": "engine",
  "card-promo-self-replicating-robots": "engine",
  "card-turmoil-banned-delegate": "engine",
  "card-turmoil-gmo-contract": "engine",
  "card-turmoil-recruitment": "engine",
  "card-venus-sponsored-academies": "engine",
  "p-mars-university": "engine",
  "prelude-eccentric-sponsor": "engine",

  // Cards that are a requirement, a tag and some points, and nothing else.
  // Each was checked against the reference implementation: none declares a
  // behavior block, an action, or a hand-written method there either.
  "card-base-advanced-ecosystems": "printed",
  "card-base-breathing-filters": "printed",
  "card-base-colonizer-training-camp": "printed",
  "card-base-dust-seals": "printed",
  "card-base-interstellar-colony-ship": "printed",
  "card-base-trans-neptune-probe": "printed",
  "card-prelude2-venus-trade-hub": "printed",
  "card-turmoil-public-celebrations": "printed",
  "card-venus-luxury-foods": "printed"
};

const ENGINE_SOURCES = [
  "../app/game-logic.js",
  "../app/game-command.js",
  "../app/scoring.js",
  "../app/turmoil.js",
  "../app/colonies.js",
  // Protected Habitats lives here: the rule is that an attack cannot reach the
  // owner, so it is the attacking code that reads the card, not the card that
  // acts. Leaving this file out reported it as unimplemented.
  "../app/pending-choice.js"
];

const { readFileSync } = await import("node:fs");
const engineText = ENGINE_SOURCES.map(path =>
  readFileSync(new URL(path, import.meta.url), "utf8")
).join("\n");

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const empty = cards.filter(card => {
  const spec = card.effectSpec ?? {};
  return (
    Object.keys(spec).length === 0 &&
    !card.victoryPointSpec &&
    !card.specialVictoryKind &&
    !card.dynamicVictory
  );
});

const problems = [];

for (const card of empty) {
  const reason = REGISTRY[card.id];
  if (!reason) {
    problems.push(
      `${card.id} (${card.name}) has no effectSpec and is not registered. ` +
      `Decide which it is: a rule the engine holds by name, or a card that ` +
      `genuinely does nothing. Check the real card before answering.`
    );
    continue;
  }
  // A card registered as engine-held must actually be held: if its id has left
  // the engine, the rule went with it and the registry is now a lie.
  if (reason === "effects" && Object.keys(card.effect ?? {}).length === 0) {
    problems.push(`${card.id} is registered as carrying a curated effects flag, and carries none`);
    continue;
  }
  if (reason === "engine" && !engineText.includes(card.id)) {
    problems.push(`${card.id} is registered as engine-held, but no engine file names it`);
  }
}

// A registry entry for a card that now has a spec is stale, and a stale entry
// is how a card quietly stops being watched.
const emptyIds = new Set(empty.map(card => card.id));
for (const id of Object.keys(REGISTRY)) {
  if (!emptyIds.has(id)) {
    problems.push(`${id} is registered as having no effectSpec, but it has one now`);
  }
}

const byReason = {};
for (const card of empty) {
  const reason = REGISTRY[card.id] ?? "unregistered";
  byReason[reason] = (byReason[reason] ?? 0) + 1;
}

console.log(`cards with no effectSpec: ${empty.length}`);
for (const [reason, count] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${reason.padEnd(13)} ${count}`);
}
console.log(`problems: ${problems.length}`);

for (const problem of problems) console.log(`\nPROBLEM ${problem}`);

if (process.argv.includes("--list")) {
  for (const card of empty) {
    console.log(`${(REGISTRY[card.id] ?? "UNREGISTERED").padEnd(13)} ${card.id}`);
  }
}

process.exitCode = problems.length > 0 ? 1 : 0;
