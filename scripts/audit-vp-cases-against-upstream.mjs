// Runs the reference implementation's own "what is this card worth?" cases
// against our scorer.
//
// audit-vp-against-upstream compares our victory point SPEC with the real
// card's, and audit-card-scoring measures our scorer at 0, per-1, per and per+1
// of whatever it counts. Neither asks what these cases ask: put this many
// resources on the card, this many tags in play, and count. A spec can match
// perfectly and still be scored wrongly, and a boundary sweep only tests the
// shapes it knows how to drive.
//
// The cases come from a manifest pinned to one upstream commit rather than the
// network. Rebuild it with scripts/build-upstream-vp-cases-manifest.mjs.
//
// Usage: node scripts/audit-vp-cases-against-upstream.mjs [--list]
import { readFileSync } from "node:fs";
import { getInitialState, getPlayer, calculateScoreBreakdowns, ALL_CARDS } from "../app/game-logic.js";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const manifest = JSON.parse(readFileSync(new URL("../data/upstream-vp-cases.json", import.meta.url)));

const rig = () => {
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
    player.playedProjects = [];
    player.playedEvents = [];
    player.selectedPreludeIds = [];
    player.cardResources = {};
  }
  state.oxygen = 0;
  state.temperature = -30;
  state.venus = 0;
  state.oceans = 0;
  return state;
};

// The tags upstream fakes with tagsForTest, given to us the honest way: cards
// carrying that tag which score nothing themselves, so they add no points of
// their own to the number being measured.
const tagFodder = (tag, count) => {
  const wanted = String(tag).toLowerCase();
  const carriers = ALL_CARDS.filter(card =>
    (card.tags ?? []).filter(entry => String(entry).toLowerCase() === wanted).length === 1 &&
    !card.victoryPoints &&
    !card.victoryPointSpec &&
    !card.specialVictoryKind
  );
  if (carriers.length < count) return null;
  return carriers.slice(0, count).map(card => card.id);
};

const seatCard = (state, card) => {
  const seat = getPlayer(state, "player");
  if (CORPORATIONS.some(entry => entry.id === card.id)) seat.corporationId = card.id;
  else if (PRELUDES.some(entry => entry.id === card.id)) seat.selectedPreludeIds = [card.id];
  else if (card.type === "event") seat.playedEvents = [card.id];
  else seat.playedProjects = [card.id];
};

const applyStep = (state, cardId, step) => {
  const seat = getPlayer(state, "player");
  if (step.kind === "parameter") {
    state[step.parameter] = step.value;
    return true;
  }
  if (step.kind === "cardResource") {
    seat.cardResources = { ...seat.cardResources, [cardId]: step.amount };
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
    // What the card is worth is the difference it makes: the tag fodder and
    // anything else in the rig scores nothing, but reading the total rather
    // than the gap would fold in whatever else the board happens to pay.
    const measure = withCard => {
      const state = rig();
      if (withCard) seatCard(state, card);
      for (const step of testCase.steps) {
        if (!applyStep(state, cardId, step)) return null;
      }
      return calculateScoreBreakdowns(state).player.cards;
    };

    const without = measure(false);
    const withIt = measure(true);
    if (without === null || withIt === null) {
      skipped.push([cardId, `cannot stage: ${testCase.title}`]);
      continue;
    }

    const got = withIt - without;
    if (got === testCase.expected) passed.push([cardId, testCase.title]);
    else {
      wrong.push([card, testCase.title, `upstream says ${testCase.expected}, ours says ${got}`]);
    }
  }
}

console.log(`upstream victory point cases run (${manifest.ref.slice(0, 7)}): ${passed.length + wrong.length}`);
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
