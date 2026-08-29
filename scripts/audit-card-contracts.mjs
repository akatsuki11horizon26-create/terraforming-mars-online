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
import {
  getInitialState,
  getPlayer,
  getCardPlayableStatus,
  resolvePendingChoice,
  applyPreludes,
  applyCorporation,
  getPreludeCost
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

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
  const oceanCount = behavior.ocean
    ? (typeof behavior.ocean.count === "number" ? behavior.ocean.count : 1)
    : 0;
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
  // An ocean is a global parameter too: laying one pays a rating step, the same
  // as raising the temperature.
  const oceanSteps = oceanCount;
  const printedTr = typeof behavior.tr === "number" ? behavior.tr : 0;
  if (printedTr || fromParameters || oceanSteps) {
    expected.tr = printedTr + fromParameters + oceanSteps;
  }

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

  // The ocean counter is its own promise: "place 2 oceans" must move it by two,
  // not merely pay two rating steps.
  if (oceanCount > 0) expected.oceans = oceanCount;

  // Immigrant City collects a M€ production step from every city placed,
  // including the one it places itself, so its net is one better than printed.
  if (card.id === "card-base-immigrant-city" && expected.mcProd !== undefined) {
    expected.mcProd += 1;
  }

  // "1 M€ per Earth tag" is still a contract, just one the board decides. The
  // engine works the number out from the same spec, so what is being checked
  // is that the amount it computed is the amount it actually paid -- a card
  // that computes 3 and pays 1 fails here.
  // Read from the raw spec, NOT from getCardEffect: that is the same normaliser
  // the engine runs, so an amount it read wrongly would be expected wrongly and
  // the two would agree on being wrong.
  for (const [where, fields] of [["production", PRODUCTION_FIELD], ["stock", STOCK_FIELD]]) {
    for (const [source, amount] of Object.entries(behavior[where] ?? {})) {
      if (typeof amount !== "number" && amount && typeof amount === "object") {
        const field = fields[source];
        if (!field) return null;
        const counted = countedAmount(state, amount);
        if (counted === null) return null;
        expected[field] = (expected[field] ?? 0) + counted;
      }
    }
  }
  return Object.keys(expected).length > 0 ? expected : null;
}

// Re-derives what a counted gain should pay, from the same board the engine
// sees. Anything this cannot count is skipped rather than guessed at.
// Works the counted amount out from the raw spec shape, independently of the
// engine's own normaliser.
function countedAmount(state, raw) {
  const seat = getPlayer(state, "player");
  // `others` counts the opponents' and not the player's own -- Toll Station
  // reads "for each space tag your OPPONENTS have".
  const players = raw.others
    ? state.players.filter(player => player.id !== seat.id)
    : raw.all
      ? state.players
      : [seat];

  let units = 0;
  if (raw.tag !== undefined) {
    const wanted = (Array.isArray(raw.tag) ? raw.tag : [raw.tag]).map(tag => String(tag).toLowerCase());
    for (const player of players) {
      for (const id of player.playedProjects ?? []) {
        const held = OFFICIAL_PROJECTS.find(item => item.id === id);
        for (const tag of held?.tags ?? []) {
          if (wanted.includes(String(tag).toLowerCase())) units += 1;
        }
      }
    }
  } else if (raw.cities !== undefined) {
    units = Object.values(state.board).filter(cell => cell.tileType === "city").length;
  } else if (raw.greeneries !== undefined) {
    units = Object.values(state.board).filter(cell => cell.tileType === "forest").length;
  } else if (raw.eventsPlayed !== undefined) {
    for (const player of players) units += (player.playedEvents ?? []).length;
  } else {
    return null;
  }
  // A compound count -- "cities AND colonies" on one line -- is more than one
  // thing added together, and this only knows how to count one.
  const shapes = ["tag", "cities", "greeneries", "eventsPlayed", "colonies"]
    .filter(key => raw[key] !== undefined).length;
  if (shapes > 1) return null;
  return Math.floor(units / (raw.per ?? 1)) * (raw.each ?? 1);
}

// A card that stops to ask a question has not finished resolving when the
// command returns, so its numbers are not final yet. Everything else -- a tile,
// a draw, a parameter step -- may move other fields, but the production and
// stock lines this checks are still exactly what the spec declares.
const ASKS_A_QUESTION = ["or", "spend", "standardResource", "addResourcesToAnyCard"];

// These move the same fields the contract measures, so the declared amount is
// no longer the whole story for that field.
const TOUCHES_THE_SAME_FIELDS = ["stealFromPlayer", "removeResourcesFromAnyCard"];

// "Decrease any player's titanium production 1 step", and when it is `stealing`
// that step arrives on the player's own track. This is a contract about two
// parties, which is why it is measured apart from the single-player amounts:
// the victim came down AND the thief went up.
function attackContract(card) {
  const attack = card.effectSpec?.behavior?.decreaseAnyProduction;
  if (!attack || typeof attack.count !== "number") return null;
  const field = PRODUCTION_FIELD[attack.type];
  if (!field) return null;
  return { field, count: attack.count, stealing: attack.stealing === true };
}

// "Add a resource to this card" -- the card played, not the player's stock.
function selfResourceContract(card) {
  const amount = card.effectSpec?.behavior?.addResources;
  return typeof amount === "number" ? amount : null;
}

// Two boards: one low, one high. A card gated behind "requires 6% oxygen" is
// unplayable on the low board, and a card raising oxygen would cross a
// threshold on the high one, so each card is measured on whichever board keeps
// its contract clean and reachable.
const THRESHOLD_SAFE = [
  { oceans: 5, oxygen: 2, temperature: -10, venus: 2 },
  // Six oceans rather than eight: a card laying two more would otherwise hit
  // the nine-ocean cap, and an ocean that cannot be placed pays no rating.
  { oceans: 6, oxygen: 12, temperature: 2, venus: 20 }
];

// Two of the cheapest cards bearing each tag, so every "requires N of a tag"
// is satisfied without the tableau doing anything else.
const TAGS = ["Building", "Space", "Science", "Power", "Earth", "Jovian",
  "Venus", "Plant", "Microbe", "Animal", "City"];
const TAG_BEARERS = (() => {
  const chosen = new Set();
  for (const tag of TAGS) {
    // Six of each, so "requires 5 science tags" is satisfied too. A card that
    // watches for later plays is left out: Advertising in the tableau pays a
    // M€ production step for every card costing 20 or more, which is correct
    // behaviour and would read as the card under test paying one too many.
    const bearers = OFFICIAL_PROJECTS
      .filter(card =>
        (card.tags ?? []).includes(tag) &&
        card.type !== "event" &&
        // Anything that pays out when something else happens later distorts the
        // measurement: Advertising pays for an expensive card, Immigrant City
        // for a city placed anywhere.
        !/効果:/.test(card.effectText ?? "")
      )
      .sort((a, b) => a.cost - b.cost)
      .slice(0, 6);
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
  // Opponents hold production and resources of their own, or an attack has
  // nothing to take and reads as doing nothing.
  for (const player of state.players) {
    if (player.id === "player") continue;
    player.mc = 40;
    player.steel = 10;
    player.titanium = 10;
    player.plants = 10;
    player.energy = 10;
    player.heat = 10;
    for (const field of Object.values(PRODUCTION_FIELD)) player[field] = 5;
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
  // Cities and greeneries on the board, for the cards that ask for them. They
  // are placed for nobody in particular so they do not feed the player's own
  // adjacency or scoring.
  const spaces = Object.keys(state.board)
    .filter(key => !state.board[key].isOceanOnly && !state.board[key].reservedFor)
    .slice(0, 12);
  spaces.slice(0, 6).forEach((key, index) => {
    state.board[key] = {
      ...state.board[key],
      tileType: index % 2 === 0 ? "city" : "forest",
      placedBy: "player2"
    };
  });

  state.oceans = levels.oceans;
  state.oxygen = levels.oxygen;
  state.temperature = levels.temperature;
  state.venus = levels.venus;
  return state;
};

const GLOBAL_FIELD_NAMES = new Set(["temperature", "oxygen", "venus"]);

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
  // The card under test may already be one of the tag bearers, and counting it
  // twice inflates the expectation by one.
  getPlayer(counting, "player").playedProjects = [
    ...new Set([...getPlayer(counting, "player").playedProjects, card.id])
  ];
  const expected = contractFor(card, counting);
  const hasRelational = attackContract(card) !== null || selfResourceContract(card) !== null;
  if (!expected && !hasRelational) {
    return { status: "skip", why: "no contract this can compute" };
  }
  const behavior = card.effectSpec?.behavior ?? {};
  if ([...ASKS_A_QUESTION, ...TOUCHES_THE_SAME_FIELDS].some(key => behavior[key] !== undefined)) {
    return { status: "skip", why: "does not finish resolving, or moves the measured fields" };
  }

  // ...and it must not be in the tableau while it is being played from hand.
  getPlayer(state, "player").playedProjects =
    getPlayer(state, "player").playedProjects.filter(id => id !== card.id);
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
  // A card that asks where its tile goes, or whom it hits, has not finished
  // paying out until the question is answered. Answering with the first option
  // resolves it -- what is being checked is the amount, not which space the
  // player would have chosen.
  let settled = played.state;
  let asked = 0;
  while (settled.pendingChoice && asked < 8) {
    const choice = settled.pendingChoice;
    // "Decrease ANY player's production" legally includes the player's own, and
    // choosing yourself nets zero -- which reads as the card doing nothing. The
    // contract is about what an attack takes, so aim it at somebody else.
    const option =
      choice.options?.find(entry => entry.targetPlayerId && entry.targetPlayerId !== "player") ??
      choice.options?.[0];
    if (!option) return { status: "skip", why: "asked something with no answer" };
    const answered = resolvePendingChoice(settled, option.id, settled.logs, choice.ownerPlayerId);
    if (answered.state.pendingChoice === choice) {
      return { status: "skip", why: "the question would not resolve" };
    }
    settled = answered.state;
    asked += 1;
  }
  if (settled.pendingChoice) return { status: "skip", why: "still asking after 8 answers" };
  const after = getPlayer(settled, "player");

  const GLOBAL_FIELDS = GLOBAL_FIELD_NAMES;
  const countTiles = board => Object.values(board).filter(cell => cell.tileType !== "empty").length;
  const problems = [];

  // Somebody else's production must have come down by the stated amount, and a
  // stealing card must have collected it.
  const attack = attackContract(card);
  if (attack) {
    const worstLoss = state.players
      .filter(player => player.id !== "player")
      .reduce((worst, player) => {
        const now = getPlayer(settled, player.id)?.[attack.field] ?? 0;
        return Math.max(worst, (player[attack.field] ?? 0) - now);
      }, 0);
    if (worstLoss !== attack.count) {
      problems.push(`an opponent lost ${worstLoss} ${attack.field}, spec says ${attack.count}`);
    }
    if (attack.stealing) {
      const gained = (after[attack.field] ?? 0) - (before[attack.field] ?? 0);
      if (gained !== attack.count) {
        problems.push(`stole ${gained} ${attack.field}, spec says ${attack.count}`);
      }
    }
  }

  // A card that puts resources on itself holds exactly that many.
  const onSelf = selfResourceContract(card);
  if (onSelf !== null) {
    const held = (after.cardResources?.[card.id] ?? 0) - (before.cardResources?.[card.id] ?? 0);
    if (held !== onSelf) {
      problems.push(`holds ${held} of its own resource, spec says ${onSelf}`);
    }
  }

  for (const [field, delta] of Object.entries(expected ?? {})) {
    // Playing the card costs money, so M€ moves by the card's own price too,
    // and the card itself leaves the hand.
    const paid = field === "mc" ? card.cost : 0;
    const got = GLOBAL_FIELDS.has(field)
      ? (settled[field] ?? 0) - (state[field] ?? 0)
      : field === "oceans"
        ? (settled.oceans ?? 0) - (state.oceans ?? 0)
      : field === "tiles"
        ? countTiles(settled.board) - countTiles(state.board)
        : field === "handSize"
          ? (after.hand ?? []).length - (before.hand ?? []).length + 1
          : (after[field] ?? 0) - (before[field] ?? 0) + paid;
    if (got !== delta) problems.push(`${field} ${got >= 0 ? "+" : ""}${got}, spec says ${delta >= 0 ? "+" : ""}${delta}`);
  }
  return problems.length > 0 ? { status: "wrong", problems } : { status: "checked" };
}

// Preludes and corporations do not go through PLAY_CARD, so they are measured
// through the entry points that do apply them.
const preludeResults = { checked: 0, wrong: [], skipped: 0 };
for (const prelude of PRELUDES) {
  const expected = contractFor(prelude, rig());
  if (!expected) { preludeResults.skipped += 1; continue; }
  const behavior = prelude.effectSpec?.behavior ?? {};
  if ([...ASKS_A_QUESTION, ...TOUCHES_THE_SAME_FIELDS].some(key => behavior[key] !== undefined)) {
    preludeResults.skipped += 1;
    continue;
  }

  const state = rig();
  const seat = getPlayer(state, "player");
  seat.setupStep = "prelude";
  // Paired with an inert partner so what moves is this prelude's doing.
  const partner = PRELUDES.find(item =>
    item.id !== prelude.id && Object.keys(item.effectSpec?.behavior ?? {}).length === 0
  );
  if (!partner) { preludeResults.skipped += 1; continue; }
  seat.preludeOptions = [prelude.id, partner.id];
  const before = { ...getPlayer(state, "player") };
  const after = applyPreludes(state, [prelude.id, partner.id], "player");
  if (after === state) { preludeResults.skipped += 1; continue; }
  if (after.pendingChoice) { preludeResults.skipped += 1; continue; }

  const seated = getPlayer(after, "player");
  const problems = [];
  for (const [field, delta] of Object.entries(expected)) {
    if (field === "tiles" || field === "handSize" || GLOBAL_FIELD_NAMES.has(field)) continue;
    // A prelude that costs money pays for itself out of the same M€.
    const paid = field === "mc" ? getPreludeCost(prelude) : 0;
    const got = (seated[field] ?? 0) - (before[field] ?? 0) + paid;
    if (got !== delta) problems.push(`${field} ${got}, spec says ${delta}`);
  }
  if (problems.length > 0) preludeResults.wrong.push([prelude, problems]);
  else preludeResults.checked += 1;
}

// A corporation's starting resources are printed on the card; choosing it must
// produce exactly those.
const corpResults = { checked: 0, wrong: [], skipped: 0 };
for (const corporation of CORPORATIONS) {
  const starting = corporation.starting ?? {};
  const production = starting.production ?? {};
  if (Object.keys(production).length === 0 && starting.mc === undefined) {
    corpResults.skipped += 1;
    continue;
  }
  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 4
  });
  state.players = state.players.map(player =>
    player.id === "player"
      ? { ...player, corporationOptions: [...(player.corporationOptions ?? []), corporation.id] }
      : player
  );
  state.currentPlayerId = "player";
  const seated = getPlayer(applyCorporation(state, corporation.id, "player"), "player");

  const problems = [];
  if (typeof starting.mc === "number" && seated.mc !== starting.mc) {
    problems.push(`mc ${seated.mc}, card says ${starting.mc}`);
  }
  for (const [source, amount] of Object.entries(production)) {
    const field = PRODUCTION_FIELD[source];
    if (!field || typeof amount !== "number") continue;
    if ((seated[field] ?? 0) !== amount) {
      problems.push(`${field} ${seated[field] ?? 0}, card says ${amount}`);
    }
  }
  if (problems.length > 0) corpResults.wrong.push([corporation, problems]);
  else corpResults.checked += 1;
}

console.log(`cards with a fixed numeric contract: ${checked.length + wrong.length}`);
console.log(`  honoured : ${checked.length}`);
console.log(`  wrong    : ${wrong.length}`);
console.log(`skipped (no fixed contract, or does more): ${skipped.length}`);
console.log(`preludes     : ${preludeResults.checked} honoured, ${preludeResults.wrong.length} wrong, ${preludeResults.skipped} skipped`);
console.log(`corporations : ${corpResults.checked} honoured, ${corpResults.wrong.length} wrong, ${corpResults.skipped} skipped`);

for (const [card, problems] of [...preludeResults.wrong, ...corpResults.wrong]) {
  console.log(`
WRONG ${card.id}  ${card.name}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

for (const [card, problems] of wrong) {
  console.log(`\nWRONG ${card.id}  ${card.name}`);
  console.log(`   spec: ${JSON.stringify(card.effectSpec.behavior)}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [card, why] of skipped) console.log(`skip ${card.id}: ${why}`);
}

// exitCode rather than process.exit: the latter can cut a buffered stdout short
// when the output is piped, which would truncate --list.
process.exitCode =
  wrong.length + preludeResults.wrong.length + corpResults.wrong.length > 0 ? 1 : 0;
