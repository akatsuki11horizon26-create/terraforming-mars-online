// Every card whose behaviour upstream writes by hand, and what our engine does
// about it.
//
// A hand-written method is exactly what the catalogue generator cannot copy, so
// these 174 cards are where a promise gets lost between the real card and ours.
// Nineteen dead cards have come out of this shape already, each found one at a
// time; this is the list they all came from.
//
// The gate is narrow on purpose. It cannot say whether a bespoke effect is
// RIGHT -- only a test can -- but it can say whether a card upstream gives an
// action to has an action our engine will offer. A card that cannot act on a
// board with everything on it acts never.
//
// Usage: node scripts/audit-bespoke-inventory.mjs [--list]
import { readFileSync } from "node:fs";
import { getInitialState, getPlayer, getCardActionStatus } from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const inventory = JSON.parse(readFileSync(new URL("../data/upstream-bespoke.json", import.meta.url)));

// Cards whose upstream action needs machinery our engine does not have. Each
// names what it would take, so the entry is a decision rather than a shrug.
const UNREACHABLE = {
  "card-colonies-titan-floating-launch-pad": "spend a floater to trade with a colony for free",
  "card-prelude2-venus-shuttles": "a cost that falls by 1 for each Venus tag held",
  "card-prelude2-board-of-directors": "draw a prelude, then discard it or pay 12 M€ to play it",
  "card-prelude2-focused-organization": "discard a card and a standard resource for one of each",
  "card-promo-astrodrill": "spend an asteroid for a standard resource, or take one from any card",
  "card-promo-arcadian-communities": "place a community marker as a first action"
};

// Ongoing halves of cards whose play effect works, and whose watching half does
// not. Named here rather than left silent, because a card that does most of
// what it says reads as working.
export const PARTIAL = {
  "card-prelude2-preservation-program": "skip the first TR gained each generation"
};

// Refused for a board reason rather than a missing action. The rig cannot hand
// these what they need without becoming a different question: a city holding a
// cathedral, a card holding what they eat, a rating already raised this
// generation, a card action already used. Each is covered by its own test.
const BOARD_DEPENDENT = new Set([
  "card-promo-st-joseph-of-cupertino-mission",
  "card-promo-self-replicating-robots",
  "corp-unmi",
  "card-venus-viron"
]);

const rig = cardId => {
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.setupStep = "complete";
  seat.corporationId = null;
  seat.mc = 400;
  seat.steel = 40;
  seat.titanium = 40;
  seat.plants = 40;
  seat.energy = 40;
  seat.heat = 40;
  for (const field of ["mcProd", "steelProd", "titaniumProd", "plantsProd", "energyProd", "heatProd"]) {
    seat[field] = 10;
  }
  seat.actionsRemaining = 20;
  // A hand, because an action that discards from it is refused without one --
  // Ceres Tech Market trades cards for money and has nothing to trade on an
  // empty hand.
  seat.hand = state.deck.slice(0, 3);
  seat.playedProjects = [cardId];
  seat.selectedPreludeIds = [cardId];
  seat.cardResources = { [cardId]: 5 };
  state.oxygen = 9;
  state.venus = 20;
  state.temperature = 0;
  state.oceans = 6;
  return state;
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const reachable = [];
const unreachable = [];
const problems = [];

for (const [cardId, entry] of Object.entries(inventory.cards)) {
  if (!entry.methods.includes("canAct") && !entry.methods.includes("action")) continue;
  const card = cards.find(item => item.id === cardId);
  if (!card) continue;
  if (BOARD_DEPENDENT.has(cardId)) continue;

  // A corporation's action is its own command rather than getCardActionStatus,
  // and skipping them left four dead corporation actions unexamined.
  let usable;
  if (CORPORATIONS.some(item => item.id === cardId)) {
    const state = rig(cardId);
    const seat = getPlayer(state, "player");
    seat.corporationId = cardId;
    seat.playedProjects = [];
    usable = executeGameCommand(state, {
      type: COMMAND.CORPORATION_ACTION,
      playerId: "player"
    }).ok;
  } else {
    usable = getCardActionStatus(rig(cardId), card)?.playable ?? false;
  }
  if (usable) {
    reachable.push(cardId);
    if (UNREACHABLE[cardId]) {
      problems.push(`${cardId} is registered as unreachable, and its action works now`);
    }
  } else {
    unreachable.push(cardId);
    if (!UNREACHABLE[cardId]) {
      problems.push(
        `${cardId} has an action upstream and none our engine will offer, and is not registered. ` +
        `Implement it, or say here what it would take.`
      );
    }
  }
}

const byMethod = {};
for (const entry of Object.values(inventory.cards)) {
  for (const method of entry.methods) byMethod[method] = (byMethod[method] ?? 0) + 1;
}

console.log(`cards whose behaviour upstream writes by hand: ${Object.keys(inventory.cards).length}`);
for (const [method, count] of Object.entries(byMethod).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${method.padEnd(20)} ${count}`);
}
console.log(`\nof those with an action: ${reachable.length} our engine offers, ${unreachable.length} it does not`);
console.log(`problems: ${problems.length}`);

for (const problem of problems) console.log(`\nPROBLEM ${problem}`);

if (process.argv.includes("--list")) {
  console.log("\nregistered as needing machinery we do not have:");
  for (const [cardId, why] of Object.entries(UNREACHABLE)) {
    console.log(`  ${cardId.padEnd(44)} ${why}`);
  }
}

process.exitCode = problems.length > 0 ? 1 : 0;
