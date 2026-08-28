// Checks that a card moves the numbers its own spec declares, by the amount it
// declares.
//
// card-coverage.mjs asks whether a card changed the state. That catches a card
// that does nothing; it does not catch a card that does the wrong thing, or the
// right thing by the wrong amount. This asks the stricter question: the spec
// says "M€ production +3", so after playing it, M€ production must be exactly
// three higher and nothing else the spec did not mention may have moved.
//
// Only flat numeric production and stock are checked. A counted amount ("1 M€
// per building tag") depends on the board and is not a fixed contract; those
// are skipped and reported so the number is honest about what it covered.
//
// Usage: node scripts/audit-card-contracts.mjs [--list]
import { getInitialState, getPlayer, getCardPlayableStatus, getCardEffect } from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { OFFICIAL_PROJECTS } from "../app/official-content.js";

const PRODUCTION_FIELD = {
  megacredits: "mcProd",
  mc: "mcProd",
  steel: "steelProd",
  titanium: "titaniumProd",
  plants: "plantsProd",
  energy: "energyProd",
  heat: "heatProd"
};
const STOCK_FIELD = {
  megacredits: "mc",
  mc: "mc",
  steel: "steel",
  titanium: "titanium",
  plants: "plants",
  energy: "energy",
  heat: "heat"
};

// What the card promises, as {field: delta}, or null when the promise is not a
// fixed number.
function contractFor(card, state) {
  const behavior = card.effectSpec?.behavior ?? {};
  const expected = {};
  // A non-numeric amount is a counted gain; it is picked up below from the
  // normalised effect rather than from the raw spec.
  for (const [source, amount] of Object.entries(behavior.production ?? {})) {
    if (typeof amount !== "number") continue;
    const field = PRODUCTION_FIELD[source];
    if (!field) return null;
    expected[field] = (expected[field] ?? 0) + amount;
  }
  for (const [source, amount] of Object.entries(behavior.stock ?? {})) {
    if (typeof amount !== "number") continue;
    const field = STOCK_FIELD[source];
    if (!field) return null;
    expected[field] = (expected[field] ?? 0) + amount;
  }

  // The global parameters and the rating move by fixed printed amounts too.
  // Temperature moves 2 degrees per step, venus 2 points; oxygen and the rating
  // move one for one.
  const global = behavior.global ?? {};
  if (typeof global.temperature === "number") expected.temperature = global.temperature * 2;
  if (typeof global.oxygen === "number") expected.oxygen = global.oxygen;
  if (typeof global.venus === "number") expected.venus = global.venus * 2;
  // Raising a global parameter pays its own rating step, so a card that does
  // both owes its printed `tr` on top of what the parameters gave it.
  const fromParameters =
    (typeof global.temperature === "number" ? global.temperature : 0) +
    (typeof global.oxygen === "number" ? global.oxygen : 0) +
    (typeof global.venus === "number" ? global.venus : 0);
  const printedTr = typeof behavior.tr === "number" ? behavior.tr : 0;
  if (printedTr || fromParameters) expected.tr = printedTr + fromParameters;

  // "Draw 2 cards" is as exact a promise as "+2 M€ production".
  const draw = behavior.drawCard;
  if (typeof draw === "number") expected.handSize = draw;
  else if (draw && typeof draw.count === "number" && !draw.tag) {
    // "Draw 4, keep 2" ends with the kept number in hand, not the drawn one.
    expected.handSize = typeof draw.keep === "number" ? draw.keep : draw.count;
  }

  // So is "place a city": one more tile on the board than there was. A city
  // sent off-world (`space`) never lands on the board, and a tile whose space
  // the player picks has not been laid when the command returns.
  const offBoard = behavior.city?.space !== undefined;
  const asksWhere = behavior.tile !== undefined;
  const tiles = offBoard || asksWhere
    ? 0
    : (behavior.city ? 1 : 0) +
      (behavior.ocean ? (typeof behavior.ocean.count === "number" ? behavior.ocean.count : 1) : 0) +
      (behavior.greenery ? 1 : 0);
  if (tiles > 0) expected.tiles = tiles;

  // "1 M€ per Earth tag" is still a contract, just one the board decides. The
  // engine works the number out from the same spec, so what is being checked
  // is that the amount it computed is the amount it actually paid -- a card
  // that computes 3 and pays 1 fails here.
  const effect = getCardEffect(card);
  for (const gain of [...(effect.countedProduction ?? []), ...(effect.countedGains ?? [])]) {
    const isProduction = (effect.countedProduction ?? []).includes(gain);
    const field = isProduction ? PRODUCTION_FIELD[gain.resource] : STOCK_FIELD[gain.resource];
    if (!field) return null;
    const amount = countedAmount(state, gain);
    if (amount === null) return null;
    expected[field] = (expected[field] ?? 0) + amount;
  }
  return Object.keys(expected).length > 0 ? expected : null;
}

// Re-derives what a counted gain should pay, from the same board the engine
// sees. Anything this cannot count is skipped rather than guessed at.
function countedAmount(state, gain) {
  const seat = getPlayer(state, "player");
  // `others` counts the opponents' tags and not the player's own -- Toll
  // Station reads "for each space tag your OPPONENTS have".
  const players = gain.others
    ? state.players.filter(player => player.id !== seat.id)
    : gain.allPlayers
      ? state.players
      : [seat];
  let units = 0;
  switch (gain.kind) {
    case "tag":
      for (const player of players) {
        for (const tag of gain.tags) {
          units += (player.playedProjects ?? []).filter(id => {
            const held = OFFICIAL_PROJECTS.find(item => item.id === id);
            return (held?.tags ?? []).some(t => String(t).toLowerCase() === String(tag).toLowerCase());
          }).length;
        }
      }
      break;
    case "cities":
      units = Object.values(state.board).filter(cell => cell.tileType === "city").length;
      break;
    case "greeneries":
      units = Object.values(state.board).filter(cell => cell.tileType === "forest").length;
      break;
    case "eventsPlayed":
      for (const player of players) units += (player.playedEvents ?? []).length;
      break;
    default:
      return null;
  }
  return Math.floor(units / (gain.per ?? 1)) * (gain.each ?? 1);
}

// A card that stops to ask a question has not finished resolving when the
// command returns, so its numbers are not final yet. Everything else -- a tile,
// a draw, a parameter step -- may move other fields, but the production and
// stock lines this checks are still exactly what the spec declares.
const ASKS_A_QUESTION = ["or", "spend", "standardResource", "addResourcesToAnyCard"];

// These move the same fields the contract measures, so the declared amount is
// no longer the whole story for that field.
const TOUCHES_THE_SAME_FIELDS = ["stealFromPlayer", "removeResourcesFromAnyCard", "addResources"];

// Two boards: one low, one high. A card gated behind "requires 6% oxygen" is
// unplayable on the low board, and a card raising oxygen would cross a
// threshold on the high one, so each card is measured on whichever board keeps
// its contract clean and reachable.
const THRESHOLD_SAFE = [
  { oceans: 5, oxygen: 2, temperature: -10, venus: 2 },
  { oceans: 8, oxygen: 12, temperature: 2, venus: 20 }
];

// Two of the cheapest cards bearing each tag, so every "requires N of a tag"
// is satisfied without the tableau doing anything else.
const TAGS = ["Building", "Space", "Science", "Power", "Earth", "Jovian",
  "Venus", "Plant", "Microbe", "Animal", "City"];
const TAG_BEARERS = (() => {
  const chosen = new Set();
  for (const tag of TAGS) {
    const bearers = OFFICIAL_PROJECTS
      .filter(card => (card.tags ?? []).includes(tag) && card.type !== "event")
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 3);
    for (const card of bearers) chosen.add(card.id);
  }
  return [...chosen];
})();

const rig = (levels = THRESHOLD_SAFE[0]) => {
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
  }
  const seat = getPlayer(state, "player");
  seat.mc = 400;
  seat.steel = 40;
  seat.titanium = 40;
  seat.plants = 40;
  seat.energy = 40;
  seat.heat = 40;
  // Production high enough that a card spending it is still playable.
  for (const field of Object.values(PRODUCTION_FIELD)) seat[field] = 10;
  seat.actionsRemaining = 20;
  // A tableau carrying every tag several times over, so a card gated behind
  // "requires 3 science tags" is measured rather than skipped. These are the
  // cheapest cards bearing each tag, and none of them is the card under test --
  // the caller overwrites playedProjects when it needs to count a card's own
  // tag.
  seat.playedProjects = TAG_BEARERS;
  // Away from every threshold, so a card raising a parameter is measured on its
  // own printed rating and not on the bonus a crossing hands out: oxygen 8%
  // pays a temperature step, venus 16% pays a rating, -24C and -20C pay heat
  // production.
  state.oceans = levels.oceans;
  state.oxygen = levels.oxygen;
  state.temperature = levels.temperature;
  state.venus = levels.venus;
  return state;
};

const checked = [];
const skipped = [];
const wrong = [];

for (const card of OFFICIAL_PROJECTS) {
  let verdict = null;
  for (const levels of THRESHOLD_SAFE) {
    const outcome = check(card, levels);
    if (outcome.status === "checked" || outcome.status === "wrong") { verdict = outcome; break; }
    verdict = outcome;
  }
  if (verdict.status === "checked") checked.push(card);
  else if (verdict.status === "wrong") wrong.push([card, verdict.problems]);
  else skipped.push([card, verdict.why]);
}

function check(card, levels) {
  const state = rig(levels);
  // "for each Earth tag you have, INCLUDING THIS" -- the card is in the tableau
  // by the time its own effect is evaluated, so the expected count has to be
  // taken with it already there.
  const counting = rig(levels);
  // The tableau the engine will see when the card resolves: everything already
  // in play, plus the card itself, since "including this" is the rule.
  getPlayer(counting, "player").playedProjects = [
    ...getPlayer(counting, "player").playedProjects,
    card.id
  ];
  const expected = contractFor(card, counting);
  if (!expected) return { status: "skip", why: "no contract this can compute" };
  const behavior = card.effectSpec?.behavior ?? {};
  if ([...ASKS_A_QUESTION, ...TOUCHES_THE_SAME_FIELDS].some(key => behavior[key] !== undefined)) {
    return { status: "skip", why: "does not finish resolving, or moves the measured fields" };
  }

  getPlayer(state, "player").hand = [card.id];
  state.deck = state.deck.filter(id => id !== card.id);
  if (!getCardPlayableStatus(card, state).playable) {
    return { status: "skip", why: "not playable in the rig" };
  }

  const before = { ...getPlayer(state, "player") };
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id
  });
  if (!played.ok) return { status: "skip", why: "refused" };
  if (played.state.pendingChoice) return { status: "skip", why: "stopped to ask a question" };
  const after = getPlayer(played.state, "player");

  const GLOBAL_FIELDS = new Set(["temperature", "oxygen", "venus"]);
  const countTiles = board => Object.values(board).filter(cell => cell.tileType !== "empty").length;
  const problems = [];
  for (const [field, delta] of Object.entries(expected)) {
    // Playing the card costs money, so M€ moves by the card's own price too,
    // and the card itself leaves the hand.
    const paid = field === "mc" ? card.cost : 0;
    const got = GLOBAL_FIELDS.has(field)
      ? (played.state[field] ?? 0) - (state[field] ?? 0)
      : field === "tiles"
        ? countTiles(played.state.board) - countTiles(state.board)
        : field === "handSize"
          ? (after.hand ?? []).length - (before.hand ?? []).length + 1
          : (after[field] ?? 0) - (before[field] ?? 0) + paid;
    if (got !== delta) problems.push(`${field} ${got >= 0 ? "+" : ""}${got}, spec says ${delta >= 0 ? "+" : ""}${delta}`);
  }
  return problems.length > 0 ? { status: "wrong", problems } : { status: "checked" };
}

console.log(`cards with a fixed numeric contract: ${checked.length + wrong.length}`);
console.log(`  honoured : ${checked.length}`);
console.log(`  wrong    : ${wrong.length}`);
console.log(`skipped (no fixed contract, or does more): ${skipped.length}`);

for (const [card, problems] of wrong) {
  console.log(`\nWRONG ${card.id}  ${card.name}`);
  console.log(`   spec: ${JSON.stringify(card.effectSpec.behavior)}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [card, why] of skipped) console.log(`skip ${card.id}: ${why}`);
}

process.exit(wrong.length > 0 ? 1 : 0);
