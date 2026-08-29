// Checks that a card's ACTION pays what its spec declares, and charges what it
// declares.
//
// audit-card-contracts.mjs measures what happens when a card is played. A blue
// card's action happens later and through a different command, so it needs its
// own pass: "spend 8 heat, raise your rating" must take exactly eight heat and
// give exactly one step.
//
// A branching action is exercised on every branch, not just the first: each
// branch of an `or` promises something different, so checking one says nothing
// about the others.
//
// Usage: node scripts/audit-card-actions.mjs [--list]
import { getInitialState, getPlayer, getCardActionStatus, resolvePendingChoice } from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";
import { OFFICIAL_PROJECTS } from "../app/official-content.js";
import { getCardResourceType } from "../app/card-resource-types.js";

const PRODUCTION_FIELD = {
  megacredits: "mcProd", mc: "mcProd", steel: "steelProd",
  titanium: "titaniumProd", plants: "plantsProd", energy: "energyProd", heat: "heatProd"
};
const STOCK_FIELD = {
  megacredits: "mc", mc: "mc", steel: "steel",
  titanium: "titanium", plants: "plants", energy: "energy", heat: "heat"
};

// What one branch of an action promises: what it takes, and what it gives.
function branchContract(branch) {
  const expected = {};
  let understood = false;

  for (const [source, amount] of Object.entries(branch.spend ?? {})) {
    if (source === "resourcesHere") {
      if (typeof amount !== "number") return null;
      expected.cardResource = (expected.cardResource ?? 0) - amount;
      understood = true;
      continue;
    }
    if (source.startsWith("canUse")) continue;
    const field = STOCK_FIELD[source];
    if (!field) return null;
    // "8 M€, and you may use steel" is paid in steel first, so which field goes
    // down is the player's business. What is fixed is the value taken, so the
    // contract is measured in M€ worth rather than in one field.
    if (field === "mc" && (branch.spend.canUseSteel || branch.spend.canUseTitanium)) {
      expected.paidValue = (expected.paidValue ?? 0) + amount;
      understood = true;
      continue;
    }
    expected[field] = (expected[field] ?? 0) - amount;
    understood = true;
  }

  for (const [source, amount] of Object.entries(branch.stock ?? {})) {
    if (typeof amount !== "number") return null;
    const field = STOCK_FIELD[source];
    if (!field) return null;
    expected[field] = (expected[field] ?? 0) + amount;
    understood = true;
  }
  for (const [source, amount] of Object.entries(branch.production ?? {})) {
    if (typeof amount !== "number") return null;
    const field = PRODUCTION_FIELD[source];
    if (!field) return null;
    expected[field] = (expected[field] ?? 0) + amount;
    understood = true;
  }
  if (typeof branch.addResources === "number") {
    expected.cardResource = (expected.cardResource ?? 0) + branch.addResources;
    understood = true;
  }
  if (typeof branch.drawCard === "number") {
    expected.handSize = branch.drawCard;
    understood = true;
  }
  if (typeof branch.tr === "number") {
    expected.tr = branch.tr;
    understood = true;
  }
  // An ocean pays a rating step of its own, as it does when a card is played.
  if (branch.ocean) {
    expected.oceans = 1;
    expected.tr = (expected.tr ?? 0) + 1;
    understood = true;
  }

  return understood ? expected : null;
}

// Every branch of an `or`, or the single behaviour of a plain action.
function branchesOf(card) {
  const action = card.effectSpec?.action;
  if (!action) return [];
  if (action.or?.behaviors) {
    return action.or.behaviors.map((behavior, index) => ({ behavior, index }));
  }
  return [{ behavior: action, index: null }];
}

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
  }
  const seat = getPlayer(state, "player");
  seat.mc = 400;
  seat.steel = 40;
  seat.titanium = 40;
  seat.plants = 40;
  seat.energy = 40;
  seat.heat = 40;
  for (const field of Object.values(PRODUCTION_FIELD)) seat[field] = 10;
  seat.actionsRemaining = 20;
  // Away from the thresholds, where a crossing would pay an extra step.
  state.oceans = 5;
  state.oxygen = 2;
  state.temperature = -10;
  state.venus = 2;
  return state;
};

const checked = [];
const skipped = [];
const wrong = [];

for (const card of OFFICIAL_PROJECTS) {
  const branches = branchesOf(card);
  if (branches.length === 0) continue;

  const problems = [];
  let measured = 0;

  for (const { behavior, index } of branches) {
    const expected = branchContract(behavior);
    if (!expected) continue;

    const state = rig();
    const seat = getPlayer(state, "player");
    // A card that eats another card's resources needs one to eat: Ants takes a
    // microbe from somebody else's card before adding one to itself.
    // The prey must hold the very resource this action eats, or the removal
    // finds no target and the action bails before granting anything.
    const wanted = String(
      behavior.removeResourcesFromAnyCard?.type ?? ""
    ).toLowerCase();
    const prey = OFFICIAL_PROJECTS.find(item =>
      item.id !== card.id &&
      item.type !== "event" &&
      String(item.resourceType ?? getCardResourceType(item.id) ?? "").toLowerCase() === wanted
    );
    seat.playedProjects = [card.id];
    seat.cardResources = { [card.id]: 6 };
    if (prey) {
      const victim = state.players.find(player => player.id !== "player");
      victim.playedProjects = [prey.id];
      victim.cardResources = { [prey.id]: 6 };
    }

    if (!getCardActionStatus(state, card).playable) continue;

    const before = { ...getPlayer(state, "player") };
    const used = executeGameCommand(state, {
      type: COMMAND.USE_CARD_ACTION,
      playerId: "player",
      cardId: card.id,
      branchIndex: index ?? undefined
    });
    if (!used.ok) continue;

    // Answer whatever it asks: a branch to take, a card to put a resource on.
    let settled = used.state;
    let asked = 0;
    while (settled.pendingChoice && asked < 6) {
      const choice = settled.pendingChoice;
      const option =
        (index !== null && choice.kind === "effect-branch"
          ? choice.options?.find(entry => Number(entry.id) === index)
          : null) ??
        choice.options?.find(entry => entry.targetPlayerId && entry.targetPlayerId !== "player") ??
        choice.options?.[0];
      if (!option) break;
      const answered = resolvePendingChoice(settled, option.id, settled.logs, choice.ownerPlayerId);
      if (answered.state.pendingChoice === choice) break;
      settled = answered.state;
      asked += 1;
    }
    if (settled.pendingChoice) continue;

    const after = getPlayer(settled, "player");
    measured += 1;
    const label = index === null ? "" : ` (branch ${index})`;

    for (const [field, delta] of Object.entries(expected)) {
      let got;
      if (field === "cardResource") {
        got = (after.cardResources?.[card.id] ?? 0) - (before.cardResources?.[card.id] ?? 0);
      } else if (field === "handSize") {
        got = (after.hand ?? []).length - (before.hand ?? []).length;
      } else if (field === "paidValue") {
        // What it cost, whichever resources covered it.
        const steelWorth = 2;
        const titaniumWorth = 3;
        got =
          (before.mc ?? 0) - (after.mc ?? 0) +
          ((before.steel ?? 0) - (after.steel ?? 0)) * steelWorth +
          ((before.titanium ?? 0) - (after.titanium ?? 0)) * titaniumWorth;
      } else if (field === "oceans") {
        got = (settled.oceans ?? 0) - (state.oceans ?? 0);
      } else {
        got = (after[field] ?? 0) - (before[field] ?? 0);
      }
      if (got !== delta) problems.push(`${field}${label} ${got}, spec says ${delta}`);
    }
  }

  if (measured === 0) { skipped.push([card, "no branch this can compute"]); continue; }
  if (problems.length > 0) wrong.push([card, problems]);
  else checked.push(card);
}

console.log(`card actions with a contract: ${checked.length + wrong.length}`);
console.log(`  honoured : ${checked.length}`);
console.log(`  wrong    : ${wrong.length}`);
console.log(`skipped    : ${skipped.length}`);

for (const [card, problems] of wrong) {
  console.log(`\nWRONG ${card.id}  ${card.name}`);
  console.log(`   action: ${JSON.stringify(card.effectSpec.action)}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [card, why] of skipped) console.log(`skip ${card.id}: ${why}`);
}

process.exitCode = wrong.length > 0 ? 1 : 0;
