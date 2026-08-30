// Runs the reference implementation's own "can this action be used?" cases
// against our engine.
//
// audit-playable-against-upstream asks whether a card can be played. This asks
// the other half. A blue card's action happens later, through its own command,
// and a card whose action can never be taken is exactly the shape of the
// thirteen dead cards: playable, paid for, and inert for the rest of the game.
//
// The cases come from a manifest pinned to one upstream commit rather than the
// network. Rebuild it with scripts/build-upstream-action-manifest.mjs.
//
// Usage: node scripts/audit-actions-against-upstream.mjs [--list]
import { readFileSync } from "node:fs";
import { getInitialState, getPlayer, getCardActionStatus } from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const manifest = JSON.parse(readFileSync(new URL("../data/upstream-actions.json", import.meta.url)));

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

// Upstream's fresh player holds nothing: no money, no resources, no production.
// Half these cases are "cannot act without X", and handing the player a stocked
// rig would answer true to every one of them.
const rig = cardId => {
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
  seat.mc = 0;
  seat.steel = 0;
  seat.titanium = 0;
  seat.plants = 0;
  seat.energy = 0;
  seat.heat = 0;
  for (const field of Object.values(PRODUCTION_FIELD)) seat[field] = 0;
  seat.actionsRemaining = 2;
  // The card is in play -- that is what "player.playedCards.push(card)" says --
  // and a prelude's action is reached through the prelude list instead.
  seat.playedProjects = [cardId];
  seat.selectedPreludeIds = [cardId];
  state.oxygen = 0;
  state.temperature = -30;
  state.venus = 0;
  state.oceans = 0;
  return state;
};

const applyStep = (state, cardId, step) => {
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
  if (step.kind === "cardResource") {
    seat.cardResources = { ...seat.cardResources, [cardId]: step.amount };
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
    const state = rig(cardId);
    let staged = true;
    for (const step of testCase.steps) {
      if (!applyStep(state, cardId, step)) { staged = false; break; }
    }
    if (!staged) { skipped.push([cardId, `cannot stage: ${testCase.title}`]); continue; }

    // A corporation's action does not live in effectSpec and never reaches
    // getCardActionStatus: it is its own command. Asking the wrong function
    // would report every corporation action as missing.
    let verdict;
    if (CORPORATIONS.some(entry => entry.id === cardId)) {
      const seat = getPlayer(state, "player");
      seat.corporationId = cardId;
      seat.playedProjects = seat.playedProjects.filter(id => id !== cardId);
      verdict = executeGameCommand(state, {
        type: COMMAND.CORPORATION_ACTION,
        playerId: "player"
      }).ok;
    } else {
      verdict = getCardActionStatus(state, card)?.playable ?? false;
    }
    if (verdict === testCase.expected) passed.push([cardId, testCase.title]);
    else {
      wrong.push([
        card,
        testCase.title,
        `upstream expects canAct ${testCase.expected}, ours says ${verdict}`
      ]);
    }
  }
}

console.log(`upstream action cases run (${manifest.ref.slice(0, 7)}): ${passed.length + wrong.length}`);
console.log(`  agree    : ${passed.length}`);
console.log(`  differ   : ${wrong.length}`);
console.log(`skipped    : ${skipped.length}`);

for (const [card, title, problem] of wrong) {
  console.log(`\nDIFFERS ${card.id}  ${card.name}`);
  console.log(`   case: ${title}`);
  console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [id, why] of skipped) console.log(`skip ${id}: ${why}`);
}

process.exitCode = wrong.length > 0 ? 1 : 0;
