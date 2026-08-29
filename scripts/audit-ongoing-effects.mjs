// Checks that an ongoing effect is felt where it is supposed to be felt.
//
// The other audits play a card and look at what changed. An ongoing effect
// changes nothing when played -- it changes what happens LATER, so it has to be
// observed at the moment it applies: a steel value at the price of a building
// card, a discount at the price of the card it discounts, a trade concession
// when a colony is traded with.
//
// This is the audit that would have caught Decomposers collecting nothing and
// Martian Lumber Corp's plants being unusable: both had a requirement and a
// score that worked, and an ongoing half that did not exist.
//
// Usage: node scripts/audit-ongoing-effects.mjs [--list]
import {
  getInitialState,
  getPlayer,
  getCardPaymentCost,
  getCardPlayableStatus,
  placeTileAt,
  tradePaymentOptions,
  tradeWith,
  COLONY_TILES,
  ALL_CARDS
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { OFFICIAL_PROJECTS } from "../app/official-content.js";
import { getCardResourceType } from "../app/card-resource-types.js";

// Answers whatever a card stopped to ask, through the command layer rather
// than through resolvePendingChoice directly. The difference is not cosmetic:
// a card that parks on a question carries an `afterPlay` continuation, and the
// triggers it owes -- Advertising's production, Optimal Aerobraking's heat --
// are paid when the command layer settles that continuation. Answering the
// choice through the engine helper alone skips them, which reports three
// working cards as broken.
const settleChoices = state => {
  let current = state;
  let asked = 0;
  while (current.pendingChoice && asked < 8) {
    const choice = current.pendingChoice;
    const option = choice.options?.[0];
    if (!option) break;
    const answered = executeGameCommand(current, {
      type: COMMAND.RESOLVE_PENDING,
      playerId: choice.ownerPlayerId,
      optionId: option.id
    });
    if (!answered.ok || answered.state.pendingChoice === choice) break;
    current = answered.state;
    asked += 1;
  }
  return current;
};

// Enough plain tags to clear a card's own requirement, chosen from cards that
// declare no ongoing effect of their own so they cannot colour the reading.
const requirementFodder = (card, excludeId) => {
  const fodder = [];
  for (const requirement of card?.requirements ?? []) {
    const tag = requirement.tag;
    if (!tag || requirement.max) continue;
    const wanted = String(tag).toLowerCase();
    const count = requirement.count ?? requirement.amount ?? 1;
    const source = ALL_CARDS.filter(item =>
      item.id !== excludeId &&
      !item.effectSpec?.cardDiscount &&
      !item.effectSpec?.globalParameterRequirementBonus &&
      !item.effectSpec?.behavior?.steelValue &&
      !item.effectSpec?.behavior?.titanumValue &&
      (item.tags ?? []).some(entry => String(entry).toLowerCase() === wanted)
    );
    for (let index = 0; index < count && index < source.length; index += 1) {
      fodder.push(source[index].id);
    }
  }
  return fodder;
};

const rig = tableau => {
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
  // Some ongoing-effect cards charge a production as their cost (Shuttles takes
  // an energy production), so there has to be production to take.
  for (const field of ["mcProd", "steelProd", "titaniumProd", "plantsProd", "energyProd", "heatProd"]) {
    seat[field] = 10;
  }
  seat.actionsRemaining = 20;
  // Far enough along that a parameter requirement is not what stops a card
  // being played, and not so far that a threshold bonus lands mid-measurement.
  state.oceans = 5;
  state.oxygen = 7;
  state.temperature = -8;
  state.venus = 26;

  // The card has to be PLAYED, not planted. An ongoing effect reaches its
  // observation point by two different routes: steelValue is read back off the
  // tableau live, while cardDiscount and globalParameterRequirementBonus are
  // accumulated into state when the card resolves. Planting the id in
  // playedProjects satisfies the first and silently misses the second, so a
  // planted rig reports a working discount as broken and, worse, would report a
  // broken accumulator as working if the reader ever changed.
  let current = state;
  for (const cardId of tableau) {
    const card = ALL_CARDS.find(item => item.id === cardId);
    const seated = getPlayer(current, "player");
    seated.hand = [cardId];
    seated.mc = 400;
    // A tag requirement is not what is being measured, so it is satisfied the
    // cheap way: cards that carry the tag and nothing else this observes.
    seated.playedProjects = requirementFodder(card, cardId);
    // Ecological Zone wants a greenery already on the board. Placing one is
    // cheaper than teaching the rig every requirement type, and a greenery is
    // not something any observation here measures.
    if ((card?.requirements ?? []).some(entry => entry.greeneries !== undefined)) {
      const free = Object.values(current.board).find(
        cell => cell.tileType === "empty" && !cell.isOceanOnly && !cell.reservedFor
      );
      if (!free) throw new Error("no empty cell for the greenery this card requires");
      placeTileAt(current, free, "forest", "player");
    }
    const played = executeGameCommand(current, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId, card
    });
    if (!played.ok) throw new Error(`could not play ${cardId}: ${JSON.stringify(played.error)}`);
    current = played.state;
    current = settleChoices(current);
  }
  const seated = getPlayer(current, "player");
  seated.mc = 400;
  seated.hand = [];
  current.currentPlayerId = "player";
  return current;
};

// Each entry says what the effect promises and where to stand to see it. The
// observation happens through a function the card itself does not run, so a
// card that declares the effect and never applies it fails here.
const OBSERVATIONS = [
  {
    key: "steelValue",
    of: card => card.effectSpec?.behavior?.steelValue,
    // Steel being worth more shows up where it is spent: a building card paid
    // with one steel costs that much less money.
    check(card, amount) {
      const target = ALL_CARDS.find(item =>
        item.id !== card.id && (item.tags ?? []).includes("Building") && item.cost >= 15
      );
      if (!target) return null;
      const before = getCardPaymentCost(target, rig([]), 1, 0);
      const after = getCardPaymentCost(target, rig([card.id]), 1, 0);
      return before - after === amount
        ? null
        : `a steel is worth ${before - after} more, expected ${amount}`;
    }
  },
  {
    key: "titanumValue",
    of: card => card.effectSpec?.behavior?.titanumValue,
    check(card, amount) {
      const target = ALL_CARDS.find(item =>
        item.id !== card.id && (item.tags ?? []).includes("Space") && item.cost >= 15
      );
      if (!target) return null;
      const before = getCardPaymentCost(target, rig([]), 0, 1);
      const after = getCardPaymentCost(target, rig([card.id]), 0, 1);
      return before - after === amount
        ? null
        : `a titanium is worth ${before - after} more, expected ${amount}`;
    }
  },
  {
    key: "cardDiscount",
    of: card => card.effectSpec?.cardDiscount,
    // The discount shows in what another card costs to buy.
    check(card, discount) {
      if (discount.nextCardOnly) return null;
      const wanted = discount.tag ? String(discount.tag).toLowerCase() : null;
      const target = ALL_CARDS.find(item =>
        item.id !== card.id &&
        item.cost >= 15 &&
        (!wanted || (item.tags ?? []).some(tag => String(tag).toLowerCase() === wanted))
      );
      if (!target) return null;
      const before = getCardPaymentCost(target, rig([]));
      const after = getCardPaymentCost(target, rig([card.id]));
      return before - after === discount.amount
        ? null
        : `${target.name} costs ${after}, expected ${before - discount.amount}`;
    }
  },
  {
    key: "colonies.tradeDiscount",
    of: card => card.effectSpec?.behavior?.colonies?.tradeDiscount,
    // A trade concession shows in what a trade costs to pay for.
    check(card, amount) {
      const before = tradePaymentOptions(rig([]), "player");
      const after = tradePaymentOptions(rig([card.id]), "player");
      const problems = [];
      for (const entry of before) {
        const match = after.find(item => item.resource === entry.resource);
        const paid = match ? entry.cost - match.cost : 0;
        if (paid !== amount) {
          problems.push(`${entry.resource} costs ${paid} less, expected ${amount}`);
        }
      }
      return problems.length > 0 ? problems.join("; ") : null;
    }
  },
  {
    key: "colonies.tradeOffset",
    of: card => card.effectSpec?.behavior?.colonies?.tradeOffset,
    // Reading the track further along means a bigger payout, so the effect is
    // felt in what the trade actually hands over. The tile is put at a step
    // where the payout genuinely differs; a step where it does not would let a
    // dead offset look identical to a live one.
    check(card, steps) {
      const measure = state => {
        const inPlay = state.colonies?.tilesInPlay ?? [];
        const tile = COLONY_TILES.find(entry => {
          if (!inPlay.includes(entry.id)) return false;
          const quantity = entry.trade?.quantity;
          return Array.isArray(quantity) && quantity[steps] > quantity[0];
        });
        if (!tile) throw new Error("no colony in play pays more further along the track");
        const colony = state.colonies.tiles[tile.id];
        colony.trackPosition = 0;
        const seat = getPlayer(state, "player");
        const before = { ...seat };
        const traded = tradeWith(state, tile.id, state.logs, "player");
        if (!traded.traded) throw new Error("the trade did not happen");
        const after = getPlayer(traded.state, "player");
        return ["mc", "steel", "titanium", "plants", "energy", "heat"].reduce(
          (sum, field) => sum + ((after[field] ?? 0) - (before[field] ?? 0)),
          0
        );
      };
      const without = measure(rig([]));
      const with_ = measure(rig([card.id]));
      // What the extra steps are worth is the colony's business; what is being
      // checked is that they were taken at all.
      return with_ > without
        ? null
        : `the trade pays ${with_}, unchanged from ${without} without the card`;
    }
  },
  {
    key: "globalParameterRequirementBonus",
    of: card => card.effectSpec?.globalParameterRequirementBonus,
    // A card just outside a parameter requirement becomes playable.
    check(card, bonus) {
      const steps = bonus.steps ?? 1;
      const gated = ALL_CARDS.find(item => {
        const oxygen = (item.requirements ?? []).find(entry => entry.oxygen !== undefined && !entry.max);
        return oxygen && oxygen.oxygen > 7 && oxygen.oxygen <= 7 + steps;
      });
      if (!gated) return null;
      const without = getCardPlayableStatus(gated, rig([])).playable;
      const with_ = getCardPlayableStatus(gated, rig([card.id])).playable;
      return !without && with_
        ? null
        : `${gated.name}: playable ${without} -> ${with_}, the relaxation is not felt`;
    }
  }
];

// A watcher fires when a LATER card is played, so it is observed by playing a
// second card that qualifies and measuring what the owner gained. What each one
// promises is written here from the card text, not read from the engine's own
// watcher table: an audit that reads the same table the engine reads would
// agree with it about a missing entry.
const WATCHERS = [
  { cardId: "card-base-ecological-zone", qualifies: c => hasTag(c, "Animal") || hasTag(c, "Plant"), gain: { cardResource: 1 } },
  { cardId: "card-base-viral-enhancers", qualifies: c => (hasTag(c, "Plant") || hasTag(c, "Microbe") || hasTag(c, "Animal")) && !holdsResource(c), gain: { plants: 1 } },
  { cardId: "card-base-decomposers", qualifies: c => hasTag(c, "Animal") || hasTag(c, "Plant") || hasTag(c, "Microbe"), gain: { cardResource: 1 } },
  { cardId: "card-venus-venusian-animals", qualifies: c => hasTag(c, "Science"), gain: { cardResource: 1 } },
  { cardId: "card-promo-carbon-nanosystems", qualifies: c => hasTag(c, "Science"), gain: { cardResource: 1 } },
  { cardId: "card-base-media-group", qualifies: c => c.type === "event", gain: { mc: 3 } },
  { cardId: "card-base-optimal-aerobraking", qualifies: c => c.type === "event" && hasTag(c, "Space"), gain: { mc: 3, heat: 3 } },
  { cardId: "card-promo-advertising", qualifies: c => (c.cost ?? 0) >= 20, gain: { mcProd: 1 } }
];

const hasTag = (card, tag) =>
  (card.tags ?? []).some(entry => String(entry).toLowerCase() === tag.toLowerCase());
// Whether a card can hold a resource decides which half of Viral Enhancers
// runs, and the engine answers it from the catalogue as well as the card, so
// reading card.resourceType alone picks a trigger that takes the other branch
// and measures a field nothing was ever going to change.
const holdsResource = card => Boolean(card.resourceType ?? getCardResourceType(card.id));

// The second card must not be a watcher itself, must not itself change what is
// being measured, and must be cheap enough and unconditional enough to play.
const triggerFor = (watcher, spec) => ALL_CARDS.find(card =>
  card.id !== watcher.cardId &&
  spec.qualifies(card) &&
  !WATCHERS.some(entry => entry.cardId === card.id) &&
  (card.requirements ?? []).length === 0 &&
  !card.effectSpec?.behavior?.production &&
  !card.effectSpec?.behavior?.stock &&
  !card.effectSpec?.cardDiscount &&
  (card.cost ?? 0) < 30
);

const watcherProblem = (spec) => {
  const trigger = triggerFor(spec, spec);
  if (!trigger) throw new Error(`no card qualifies as a trigger for ${spec.cardId}`);
  const measure = tableau => {
    const state = rig(tableau);
    const seat = getPlayer(state, "player");
    seat.hand = [trigger.id];
    seat.mc = 400;
    const before = {
      ...seat,
      cardResource: seat.cardResources?.[spec.cardId] ?? 0
    };
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: trigger.id, card: trigger
    });
    if (!played.ok) throw new Error(`could not play the trigger ${trigger.id}`);
    const current = settleChoices(played.state);
    const after = getPlayer(current, "player");
    const deltas = {};
    for (const field of Object.keys(spec.gain)) {
      deltas[field] = field === "cardResource"
        ? (after.cardResources?.[spec.cardId] ?? 0) - before.cardResource
        : (after[field] ?? 0) - (before[field] ?? 0);
    }
    return deltas;
  };
  // The trigger card pays for itself either way, so what the watcher is worth
  // is the difference between having it in play and not.
  const without = measure([]);
  const with_ = measure([spec.cardId]);
  const problems = [];
  for (const [field, amount] of Object.entries(spec.gain)) {
    const got = with_[field] - without[field];
    if (got !== amount) {
      problems.push(`playing ${trigger.name} pays ${field} ${got}, the card says ${amount}`);
    }
  }
  return problems.length > 0 ? problems.join("; ") : null;
};

const checked = [];
const skipped = [];
const wrong = [];

for (const card of OFFICIAL_PROJECTS) {
  let sawSomething = false;
  const problems = [];
  for (const observation of OBSERVATIONS) {
    const declared = observation.of(card);
    if (declared === undefined || declared === null) continue;
    sawSomething = true;
    const problem = observation.check(card, declared);
    if (problem) problems.push(`${observation.key}: ${problem}`);
  }
  if (!sawSomething) continue;
  if (problems.length > 0) wrong.push([card, problems]);
  else checked.push(card);
}

for (const spec of WATCHERS) {
  const card = OFFICIAL_PROJECTS.find(item => item.id === spec.cardId);
  if (!card) { skipped.push([{ id: spec.cardId, name: spec.cardId }, "not in the catalogue"]); continue; }
  const problem = watcherProblem(spec);
  if (problem) wrong.push([card, [`watcher: ${problem}`]]);
  else checked.push(card);
}

// Everything whose text is an ongoing effect but which declares nothing this
// knows how to observe. Reported rather than silently absent.
for (const card of OFFICIAL_PROJECTS) {
  if (!/^効果:/.test(card.effectText ?? "")) continue;
  if (checked.includes(card) || wrong.some(([entry]) => entry === card)) continue;
  skipped.push([card, "no declared key this can observe"]);
}

console.log(`ongoing effects observed at their point of use: ${checked.length + wrong.length}`);
console.log(`  honoured : ${checked.length}`);
console.log(`  wrong    : ${wrong.length}`);
console.log(`ongoing-effect cards this cannot observe: ${skipped.length}`);

for (const [card, problems] of wrong) {
  console.log(`\nWRONG ${card.id}  ${card.name}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [card, why] of skipped) console.log(`skip ${card.id}: ${why}`);
}

process.exitCode = wrong.length > 0 ? 1 : 0;
