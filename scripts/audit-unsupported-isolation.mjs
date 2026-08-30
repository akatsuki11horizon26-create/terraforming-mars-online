// A card we have not implemented must not reach a player.
//
// The bespoke inventory records what an unimplemented card would take, which is
// an honest note but not ownership: a card in that table is still shuffled into
// the deck, still drawn, still bought, and then does nothing when its owner
// tries to use it. sol's point exactly -- a debt ledger is not a decision.
//
// This names the gap rather than closing it. Three of the six can still be
// drawn or chosen, and keeping them out of the pools is a product decision
// about what a game contains -- removing preludes changed which ones the seeded
// deals produce, and two existing tests that trusted the deal broke. That is
// the user's call, not a thing to slip in under a card fix.
//
// What the audit does gate is the list itself: a card that starts working while
// still listed fails, so the register cannot quietly go stale.
//
// BASELINE is the number reachable today. It may fall and must not rise.
//
// Usage: node scripts/audit-unsupported-isolation.mjs [--list]
import { getInitialState, getPlayer, getCardActionStatus } from "../app/game-logic.js";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

// Cards whose action our engine cannot offer, each with what implementing it
// would take. They are kept out of play until that happens.
export const UNSUPPORTED = {
  "card-prelude2-board-of-directors":
    "draw a prelude, then discard it or pay 12 M€ to play it",
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];

// Everything a player can reach at the start of a game with every expansion on.
const reachable = () => {
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, prelude: true, seed: 4
  });
  const pools = new Set([...(state.deck ?? []), ...(state.discardPile ?? [])]);
  for (const player of state.players) {
    for (const id of player.hand ?? []) pools.add(id);
    for (const id of player.researchCards ?? []) pools.add(id);
    for (const id of player.corporationOptions ?? []) pools.add(id);
    for (const id of player.preludeOptions ?? []) pools.add(id);
  }
  return pools;
};

// Whether our engine will offer the card's action on a board with everything on
// it -- the same question the bespoke inventory asks.
const actionWorks = card => {
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
  seat.actionsRemaining = 20;
  seat.hand = state.deck.slice(0, 3);
  seat.playedProjects = [card.id];
  seat.selectedPreludeIds = [card.id];
  seat.cardResources = { [card.id]: 5 };
  state.oxygen = 9;
  state.venus = 20;
  state.temperature = 0;
  state.oceans = 6;
  return getCardActionStatus(state, card)?.playable ?? false;
};

const inPlay = reachable();
const problems = [];
const isolated = [];

for (const [cardId, why] of Object.entries(UNSUPPORTED)) {
  const card = cards.find(item => item.id === cardId);
  if (!card) {
    problems.push(`${cardId} is listed as unsupported and is not in the catalogue`);
    continue;
  }
  if (CORPORATIONS.some(item => item.id === cardId)) {
    // A corporation's action is its own command; the inventory owns that check.
    if (inPlay.has(cardId)) problems.push(`${cardId} is unsupported and still offered as a corporation`);
    else isolated.push([cardId, why]);
    continue;
  }
  if (actionWorks(card)) {
    problems.push(`${cardId} is listed as unsupported, and its action works now`);
    continue;
  }
  if (inPlay.has(cardId)) {
    problems.push(`${cardId} is unsupported and still reaches a player: ${why}`);
    continue;
  }
  isolated.push([cardId, why]);
}

console.log(`cards we have not implemented: ${Object.keys(UNSUPPORTED).length}`);
console.log(`  kept out of play : ${isolated.length}`);
console.log(`problems: ${problems.length}`);

for (const problem of problems) console.log(`\nPROBLEM ${problem}`);

if (process.argv.includes("--list")) {
  for (const [cardId, why] of isolated) console.log(`${cardId.padEnd(44)} ${why}`);
}

// Every unimplemented card is now kept out of play, so this is a gate rather
// than a ratchet: a card that can be drawn and not used fails, and so does a
// listed card that starts working.
process.exitCode = problems.length > 0 ? 1 : 0;
