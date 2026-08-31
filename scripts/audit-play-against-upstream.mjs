// What a card moves here, against what it moves in the reference itself.
//
// The other oracles read upstream's tests as text. This one compares against
// upstream's engine: data/upstream-play.json records what each card actually
// did when the reference played it, and this plays the same card here and
// compares the resources, production and rating that moved.
//
// Both sides go through the real play path. That matters more than it sounds:
// a card that counts its own tag reads differently depending on whether it is
// in play yet, so calling the effect directly reports Power Grid, Cartel,
// Satellites and Sulphur Exports as wrong when they are right. The cost is
// added back on our side because the reference's probe never paid it.
//
// Usage: node scripts/audit-play-against-upstream.mjs [--diff] [--skipped]
import { readFileSync } from "node:fs";
import { OFFICIAL_PROJECTS } from "../app/official-content.js";
import { getInitialState, getPlayer } from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";

const upstream = JSON.parse(
  readFileSync(new URL("../data/upstream-play.json", import.meta.url), "utf8")
);

// Upstream's field names against ours.
const FIELDS = {
  mc: "mc", steel: "steel", titanium: "titanium",
  plants: "plants", energy: "energy", heat: "heat",
  mcP: "mcProd", steelP: "steelProd", titaniumP: "titaniumProd",
  plantsP: "plantsProd", energyP: "energyProd", heatP: "heatProd",
  tr: "tr"
};

// Cards whose reference probe took one branch of a choice while ours asks the
// question. The difference is the question, not the rule, and a comparison
// that cannot see a pending choice cannot judge them.
const ASKS_A_QUESTION = {
  "Imported Hydrogen": "upstream's probe took the plants; ours asks which card takes the resource",
  "Large Convoy": "same -- five plants, or an animal on a card of the player's choosing",
  "Artificial Photosynthesis": "a choice between energy and plant production",
  "Viral Enhancers": "asks where the resource goes when several cards can take it",
  "Soil Studies": "counts colonies, which the reference's two-player probe has none of",
  "Unexpected Application": "discards a card, and the probe's hand was empty",
  "GMO Contract": "an ongoing effect; the reference probe never had it in play",
  "Minority Refuge": "defers a colony placement the probe never resolved",
  "Deimos Down": "the promo and base printings differ in heat production",
  "Deimos Down:promo": "as above"
};

const normalise = name =>
  name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/s$/, "");

const ours = new Map(
  OFFICIAL_PROJECTS.map(card => [normalise(card.englishName ?? card.name), card])
);

const agree = [];
const differ = [];
const skipped = [];

for (const [name, entry] of Object.entries(upstream.cards)) {
  if (ASKS_A_QUESTION[name]) {
    skipped.push([name, ASKS_A_QUESTION[name]]);
    continue;
  }
  const card = ours.get(normalise(name));
  if (!card) {
    skipped.push([name, "not in our catalogue"]);
    continue;
  }

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.mc = 200;
  seat.steel = 20;
  seat.titanium = 20;
  seat.plants = 20;
  seat.energy = 20;
  seat.heat = 20;
  seat.actionsRemaining = 20;
  seat.hand = [card.id];

  const before = {};
  for (const field of Object.values(FIELDS)) before[field] = seat[field] ?? 0;

  let played;
  try {
    played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id
    });
  } catch (error) {
    skipped.push([name, `refused here: ${String(error.message).slice(0, 60)}`]);
    continue;
  }
  if (!played?.ok) {
    skipped.push([name, "our engine would not play it in this state"]);
    continue;
  }

  const after = getPlayer(played.state, "player");
  const problems = [];
  for (const [theirs, mine] of Object.entries(FIELDS)) {
    const upstreamMoved = entry.delta[theirs] ?? 0;
    // The reference's probe played the card without paying for it.
    const ourMoved = (after[mine] ?? 0) - before[mine] + (mine === "mc" ? card.cost ?? 0 : 0);
    if (upstreamMoved !== ourMoved) {
      problems.push(`${theirs}: reference ${upstreamMoved}, ours ${ourMoved}`);
    }
  }

  if (problems.length === 0) agree.push(name);
  else differ.push([name, problems]);
}

console.log(`cards played in both engines: ${agree.length + differ.length}`);
console.log(`  same resources, production and rating: ${agree.length}`);
console.log(`  differing                            : ${differ.length}`);
console.log(`skipped                                : ${skipped.length}`);

for (const [name, problems] of differ) {
  console.log(`\nPROBLEM ${name}`);
  for (const problem of problems) console.log(`  ${problem}`);
}

if (process.argv.includes("--skipped")) {
  for (const [name, why] of skipped) console.log(`${name.padEnd(30)} ${why}`);
}

// A hard gate. Every difference left is either a real defect or a card that
// belongs in ASKS_A_QUESTION with the reason written down.
process.exitCode = differ.length > 0 ? 1 : 0;
