// Runs the reference implementation's own "can this be played?" cases against
// our engine.
//
// The other upstream audits compare printed values -- cost, tags, requirements
// as written. This one asks a different question: given the board upstream sets
// up, does our engine reach the same verdict? A requirement can be transcribed
// perfectly and still be read wrongly: an inclusive bound treated as exclusive,
// a maximum treated as a minimum, a tag requirement counting cards instead of
// tags. Those are all invisible to a field-by-field comparison and all decided
// here, on the exact boundary the card's own authors chose to test.
//
// The cases come from a manifest pinned to one upstream commit rather than the
// network. Rebuild it with scripts/build-upstream-playable-manifest.mjs.
//
// Usage: node scripts/audit-playable-against-upstream.mjs [--list]
import { readFileSync } from "node:fs";
import { getInitialState, getPlayer, getCardPlayableStatus, ALL_CARDS } from "../app/game-logic.js";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const manifest = JSON.parse(readFileSync(new URL("../data/upstream-playable.json", import.meta.url)));

const PRODUCTION_FIELD = {
  megacredits: "mcProd",
  steel: "steelProd",
  titanium: "titaniumProd",
  plants: "plantsProd",
  energy: "energyProd",
  heat: "heatProd"
};

const STOCK_FIELD = {
  megacredits: "mc",
  steel: "steel",
  titanium: "titanium",
  plants: "plants",
  energy: "energy",
  heat: "heat"
};

// Upstream's testGame starts every global parameter at its floor, and a case
// that does not move one is relying on that floor. Starting anywhere else would
// answer a question it never asked.
const rig = () => {
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
    player.playedProjects = [];
    player.cardResources = {};
  }
  const seat = getPlayer(state, "player");
  // Money is never the question in a requirement case, and upstream's player
  // is given whatever the card costs before canPlay is asked.
  seat.mc = 1000;
  seat.steel = 0;
  seat.titanium = 0;
  seat.plants = 0;
  seat.energy = 0;
  seat.heat = 0;
  for (const field of Object.values(PRODUCTION_FIELD)) seat[field] = 0;
  state.oxygen = 0;
  state.temperature = -30;
  state.venus = 0;
  state.oceans = 0;
  return state;
};

// The tags upstream fakes with tagsForTest are given to us the honest way:
// cards carrying that tag and nothing else this measures.
const tagFodder = (tag, count) => {
  const wanted = String(tag).toLowerCase();
  const carriers = ALL_CARDS.filter(card =>
    (card.tags ?? []).filter(entry => String(entry).toLowerCase() === wanted).length === 1 &&
    (card.requirements ?? []).length === 0 &&
    card.type !== "event"
  );
  if (carriers.length < count) return null;
  return carriers.slice(0, count).map(card => card.id);
};

const applyStep = (state, step) => {
  const seat = getPlayer(state, "player");
  if (step.kind === "parameter") {
    state[step.parameter] = step.value;
    return true;
  }
  if (step.kind === "production") {
    const field = PRODUCTION_FIELD[step.resource];
    if (!field) return false;
    seat[field] = (seat[field] ?? 0) + step.amount;
    return true;
  }
  if (step.kind === "stock") {
    const field = STOCK_FIELD[step.resource];
    if (!field) return false;
    seat[field] = step.amount;
    return true;
  }
  if (step.kind === "tags") {
    const ids = [];
    for (const [tag, count] of Object.entries(step.tags)) {
      const fodder = tagFodder(tag, count);
      if (!fodder) return false;
      ids.push(...fodder);
    }
    seat.playedProjects = [...seat.playedProjects, ...ids];
    return true;
  }
  return false;
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const passed = [];
const skipped = [];
const wrong = [];

for (const [cardId, entry] of Object.entries(manifest.cards)) {
  const card = cards.find(item => item.id === cardId);
  if (!card) { skipped.push([cardId, "not in our catalogue"]); continue; }

  for (const testCase of entry.cases) {
    const state = rig();
    let staged = true;
    for (const step of testCase.steps) {
      if (!applyStep(state, step)) { staged = false; break; }
    }
    if (!staged) { skipped.push([cardId, `cannot stage: ${testCase.title}`]); continue; }

    getPlayer(state, "player").hand = [card.id];
    const verdict = getCardPlayableStatus(card, state).playable;
    if (verdict === testCase.expected) passed.push([cardId, testCase.title]);
    else {
      wrong.push([
        card,
        testCase.title,
        `upstream expects playable ${testCase.expected}, ours says ${verdict}`
      ]);
    }
  }
}

console.log(`upstream playability cases run (${manifest.ref.slice(0, 7)}): ${passed.length + wrong.length}`);
console.log(`  agree    : ${passed.length}`);
console.log(`  differ   : ${wrong.length}`);
console.log(`skipped    : ${skipped.length}`);
// Named in the manifest rather than merely counted: printing it here is what
// stops "differ: 0" from reading as "every case upstream wrote passes".
console.log(
  `not extracted: ${Object.values(manifest.cards).reduce(
    (sum, entry) => sum + (entry.unread ?? []).length, 0
  )} upstream blocks the builder could not read`
);

for (const [card, title, problem] of wrong) {
  console.log(`\nDIFFERS ${card.id}  ${card.name}`);
  console.log(`   case: ${title}`);
  console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [id, why] of skipped) console.log(`skip ${id}: ${why}`);
}

// Three cases are known to differ, each decided upstream inside a bespokeCanPlay
// method our engine has no equivalent for: whether Noctis City's reserved space
// still has the energy production to run it, whether a floater exists somewhere
// for Stratospheric Birds to spend, and Immigrant City, whose M€ cost upstream
// does not declare as a behavior and so never checks. They are a ratchet rather
// than a gate -- the number may fall, and a rise is a regression.
const BASELINE = 3;

if (wrong.length > BASELINE) {
  console.log(`
MORE than the ${BASELINE} known differences: this is a regression.`);
  process.exitCode = 1;
} else if (wrong.length < BASELINE) {
  console.log(`
Fewer differences than the baseline of ${BASELINE}. Lower BASELINE to ${wrong.length}.`);
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
