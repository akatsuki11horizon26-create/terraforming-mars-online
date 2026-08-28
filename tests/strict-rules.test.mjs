import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  getCardPlayableStatus,
  computeScore,
  handleActionSpend,
  triggerProduction,
  isCellPlacementValid,
  countAdjacentOceans,
  checkParameterThresholds,
  getAdjacentCells,
  ALL_CARDS,
  INITIAL_CELLS
} from "../app/game-logic.js";
import { executeGameCommand, COMMAND } from "../app/game-command.js";

// Titan, Enceladus and Miranda stay off the track until a card that can hold
// their resource is played, so a test that just wants "a colony" has to ask for
// one that is actually usable -- tilesInPlay[0] is shuffled.
function activeTile(colonies) {
  const id = colonies.tilesInPlay.find(tile => colonies.tiles[tile]?.active !== false);
  if (!id) throw new Error("no active colony tile in play");
  return id;
}


test("Initial state setup tests", () => {
  const state = getInitialState();
  
  assert.equal(state.generation, 1);
  assert.equal(state.phase, "setup");
  assert.equal(state.tr, 14);
  assert.equal(state.mc, 42);
  assert.equal(state.mcProd, 0);
  assert.equal(state.steelProd, 0);
  assert.equal(state.titaniumProd, 0);
  assert.equal(state.plantsProd, 0);
  assert.equal(state.energyProd, 0);
  assert.equal(state.heatProd, 0);
  assert.equal(state.hand.length, 0);
  assert.equal(state.researchCards.length, 10);
  
  // Solo setup seeds two neutral cities, each with an adjacent neutral greenery.
  // Positions depend on the discarded cards' costs, so assert the rule, not
  // fixed coordinates.
  const neutralCities = Object.values(state.board).filter(
    cell => cell.placedBy === "neutral" && cell.tileType === "city"
  );
  const neutralForests = Object.values(state.board).filter(
    cell => cell.placedBy === "neutral" && cell.tileType === "forest"
  );
  assert.equal(neutralCities.length, 2);
  assert.equal(neutralForests.length, 2);

  for (const forest of neutralForests) {
    const touchesNeutralCity = getAdjacentCells(forest.q, forest.r).some(pos => {
      const neighbour = state.board[`${pos.q},${pos.r}`];
      return neighbour?.tileType === "city" && neighbour.placedBy === "neutral";
    });
    assert.ok(touchesNeutralCity, "each neutral greenery sits beside a neutral city");
  }

  for (const cell of [...neutralCities, ...neutralForests]) {
    assert.equal(cell.isOceanOnly, false, "neutral tiles never occupy ocean reservations");
  }
});

test("Research phase card purchase cost logic", () => {
  const card = ALL_CARDS.find(c => c.id === "p-power-plant");
  let state = getInitialState();
  state.mc = 10;
  
  // Card should be playable with 10 MC
  const status = getCardPlayableStatus(card, state, 0, 0);
  assert.equal(status.playable, true);

  // Card shouldn't be playable if MC is less than cost after discount
  state.mc = 3;
  const statusFail = getCardPlayableStatus(card, state, 0, 0);
  assert.equal(statusFail.playable, false);
});

test("One-vs-two-action turn state transitions", () => {
  let state = getInitialState();
  state.phase = "action";
  state.actionsRemaining = 2;
  state.turnStep = "start";

  // Take 1 action
  state = handleActionSpend(state, state.logs);
  assert.equal(state.actionsRemaining, 1);
  assert.equal(state.turnStep, "one_action_taken");

  // Choose "another action" and take 2nd action
  state.turnStep = "second_action_allowed";
  state = handleActionSpend(state, state.logs);
  assert.equal(state.actionsRemaining, 2); // Resets
  assert.equal(state.turnStep, "start");    // Resets
});

test("Pass-to-production transitions", () => {
  let state = getInitialState();
  state.generation = 1;
  state.tr = 15;
  state.mcProd = 2;
  state.mc = 10;
  state.energy = 3;
  state.heat = 2;
  state.energyProd = 1;
  state.heatProd = 1;

  state = triggerProduction(state, state.logs);

  // Energy is converted to heat: heat = 2 (old) + 3 (energy) + 1 (prod) = 6
  assert.equal(state.heat, 6);
  // Energy becomes 0 (converted) + 1 (prod) = 1
  assert.equal(state.energy, 1);
  // MC increases by TR + MC prod: 10 + 15 + 2 = 27
  assert.equal(state.mc, 27);
  // Generation increases to 2
  assert.equal(state.generation, 2);
  // Phase becomes research
  assert.equal(state.phase, "research");
  assert.equal(state.researchCards.length, 4);
});

test("Standard project cost and requirements", () => {
  let state = getInitialState();
  state.mc = 20;

  // Greenery standard project cost is 23. Player has 20, cannot afford.
  assert.equal(state.mc >= 23, false);

  // Power plant is 11. Afford is true.
  assert.equal(state.mc >= 11, true);
});

test("Greenery adjacency rules", () => {
  const state = getInitialState({ playerCount: 2 });

  // Pick an interior land space so it is guaranteed to have free neighbours.
  const anchor = Object.values(state.board).find(cell => {
    if (cell.isOceanOnly || cell.tileType !== "empty" || cell.reservedFor) return false;
    const free = getAdjacentCells(cell.q, cell.r)
      .map(pos => state.board[`${pos.q},${pos.r}`])
      .filter(neighbour => neighbour && !neighbour.isOceanOnly && neighbour.tileType === "empty");
    return free.length >= 2;
  });
  assert.ok(anchor, "the board must contain an interior land space");

  anchor.placedBy = "player";
  anchor.tileType = "city";

  const adjacent = getAdjacentCells(anchor.q, anchor.r)
    .map(pos => state.board[`${pos.q},${pos.r}`])
    .find(cell => cell && !cell.isOceanOnly && cell.tileType === "empty" && !cell.reservedFor);
  assert.ok(adjacent);
  assert.equal(isCellPlacementValid(adjacent, "forest", state.board), true);

  // With a legal adjacent space available, a space touching none of the player's
  // tiles must be rejected.
  const adjacentKeys = new Set(
    getAdjacentCells(anchor.q, anchor.r).map(pos => `${pos.q},${pos.r}`)
  );
  const far = Object.values(state.board).find(
    cell =>
      !cell.isOceanOnly &&
      cell.tileType === "empty" &&
      !cell.reservedFor &&
      !adjacentKeys.has(`${cell.q},${cell.r}`)
  );
  assert.ok(far);
  assert.equal(isCellPlacementValid(far, "forest", state.board), false);
});

test("Ocean adjacency bonus MC", () => {
  const board = {};
  INITIAL_CELLS.forEach(cell => {
    board[`${cell.q},${cell.r}`] = {
      ...cell,
      tileType: "empty",
      placedBy: null
    };
  });

  // Place ocean at (1, 1) [ocean-reserved]
  board["1,1"].tileType = "ocean";

  // Count adjacent oceans for a city at (0, 1)
  const adjacentCount = countAdjacentOceans(0, 1, board);
  assert.equal(adjacentCount, 1);

  // MC bonus should be adjacentCount * 2 = 2 MC
  assert.equal(adjacentCount * 2, 2);
});

test("Parameter threshold bonuses", () => {
  let state = getInitialState();
  state.temperature = -26;
  state.heatProd = 0;
  state.pendingChoice = null;

  // Temperature increases from -26 to -22, crossing -24
  let logs = [];
  const result = checkParameterThresholds(-26, -22, 0, 0, state, logs);

  assert.equal(result.state.heatProd, 1); // gained +1 heat production
  // -24 pays heat production only; the free ocean is the 0°C threshold.
  assert.equal(result.state.pendingChoice, null);
});

test("Oxygen bonus crosses temperature thresholds without recursion", () => {
  let state = getInitialState();
  state.temperature = -26;
  state.heatProd = 0;
  const result = checkParameterThresholds(-26, -26, 7, 8, state, []);

  assert.equal(result.state.temperature, -24);
  assert.equal(result.state.tr, 15);
  assert.equal(result.state.heatProd, 1);
});

test("Production keeps negative MC production instead of clamping income", () => {
  let state = getInitialState();
  state.generation = 1;
  state.mc = 20;
  state.tr = 14;
  state.mcProd = -5;
  state = triggerProduction(state, state.logs);

  assert.equal(state.mc, 29);
});

test("Final scoring calculations", () => {
  // Solo setup seeds neutral tiles on spaces chosen from the shuffled deck, so
  // pick an empty pair at run time rather than hardcoding coordinates.
  const state = getInitialState();
  state.tr = 18;

  // The pair must touch no other tile, or a neutral greenery beside the city
  // would add an extra point.
  const isClear = cell =>
    cell &&
    cell.tileType === "empty" &&
    !cell.isOceanOnly &&
    getAdjacentCells(cell.q, cell.r).every(pos => {
      const neighbour = state.board[`${pos.q},${pos.r}`];
      return !neighbour || neighbour.tileType === "empty";
    });

  let greenerySpace;
  let citySpace;
  for (const candidate of Object.values(state.board)) {
    if (!isClear(candidate)) continue;
    const partner = getAdjacentCells(candidate.q, candidate.r)
      .map(pos => state.board[`${pos.q},${pos.r}`])
      .find(isClear);
    if (partner) {
      greenerySpace = candidate;
      citySpace = partner;
      break;
    }
  }
  assert.ok(greenerySpace && citySpace, "the board has an isolated pair of empty spaces");

  greenerySpace.placedBy = "player";
  greenerySpace.tileType = "forest";
  citySpace.placedBy = "player";
  citySpace.tileType = "city";

  state.playedProjects = ["p-solar-power"];

  // TR 18 + own greenery 1 + city adjacent to 1 greenery 1 + card VP 1 = 21
  assert.equal(computeScore(state), 21);
});

// Red events are set aside instead of staying in the tableau, and scoring only
// walked the tableau. Every event VP -- including the negative ones that are
// the whole cost of cards like Bribed Committee -- was silently dropped.
test("Victory points printed on played events reach the final score", async () => {
  const { calculateScoreBreakdowns, getPlayer } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 1 });
  const seat = getPlayer(state, "player");
  const baseline = calculateScoreBreakdowns(state)["player"].total;

  seat.playedEvents = ["card-base-bribed-committee", "card-base-interstellar-colony-ship"];
  const scored = calculateScoreBreakdowns(state)["player"];

  assert.equal(scored.cards, 2, "-2 for Bribed Committee and +4 for Interstellar Colony Ship");
  assert.equal(scored.total, baseline + 2);
});

// Raising a global parameter pays its threshold bonus however it was raised.
// Only PLAY_CARD checked, so the same oxygen step skipped the 8% bonus when it
// came from a blue card's action.
test("A card action that crosses a threshold collects its bonus", async () => {
  const { ALL_CARDS, getPlayer } = await import("../app/game-logic.js");
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const card = ALL_CARDS.find(entry => entry.id === "p-steelworks");

  const state = getInitialState({ playerCount: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.playedProjects = [card.id];
  seat.energy = 20;
  seat.mc = 100;
  seat.actionsRemaining = 2;
  state.oxygen = 7;
  state.temperature = -30;

  const result = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: card.id
  });
  assert.equal(result.ok, true);
  assert.equal(result.state.oxygen, 8);
  assert.equal(result.state.temperature, -28, "8% oxygen raises the temperature 2 steps");
});

// Venus Next's solo variant adds 30% Venus to the win condition. The three Mars
// tracks still END the game in every mode -- Venus only decides whether a solo
// mission was actually accomplished.
test("A Venus solo game is not won until Venus reaches 30%", async () => {
  const { isSoloMissionComplete, isGameOverCheck } = await import("../app/game-logic.js");
  const tracks = { temperature: 8, oxygen: 14, oceans: 9 };

  assert.equal(isGameOverCheck(8, 14, 9), true, "the Mars tracks still end the game");
  assert.equal(isSoloMissionComplete({ ...tracks, venusEnabled: false }), true);
  assert.equal(isSoloMissionComplete({ ...tracks, venusEnabled: true, venus: 0 }), false);
  assert.equal(isSoloMissionComplete({ ...tracks, venusEnabled: true, venus: 30 }), true);
});

// The UI advertises "2 steps to heat production +1". If the table it reads from
// drifts from what checkParameterThresholds actually pays, the game lies to the
// player about what a move buys -- so the claims are checked against the engine.
test("Every advertised threshold bonus is one the engine actually pays", async () => {
  const { checkParameterThresholds, cloneGameState, getPlayer } = await import("../app/game-logic.js");
  const { PARAMETER_THRESHOLDS, nextThreshold } = await import("../app/parameter-thresholds.js");

  for (const entry of PARAMETER_THRESHOLDS.temperature) {
    if (entry.at === 8) continue; // the cap is a stop, not a payout
    const before = entry.at - 2;
    const state = getInitialState({ playerCount: 1 });
    state.currentPlayerId = "player";
    const heatBefore = getPlayer(state, "player").heatProd;
    const crossed = checkParameterThresholds(
      before, entry.at, 0, 0, { ...cloneGameState(state), temperature: entry.at }, state.logs
    );
    const paid =
      getPlayer(crossed.state, "player").heatProd > heatBefore ||
      Boolean(crossed.state.pendingChoice);
    assert.ok(paid, `crossing ${entry.at}C must pay "${entry.reward}"`);
  }

  // Oxygen 8% is advertised as "+2C", so the engine must move the temperature.
  const state = getInitialState({ playerCount: 1 });
  state.currentPlayerId = "player";
  const crossed = checkParameterThresholds(
    -30, -30, 7, 8, { ...cloneGameState(state), oxygen: 8 }, state.logs
  );
  assert.equal(crossed.state.temperature, -28, "8% oxygen pays the +2C it advertises");

  // And the distance itself counts in steps, not raw units: temperature moves
  // 2C at a time, so -26 is ONE step from -24, not two.
  assert.equal(nextThreshold("temperature", -26).steps, 1);
  assert.equal(nextThreshold("oxygen", 7).steps, 1);
  assert.equal(nextThreshold("temperature", 8), null, "nothing left once the track is capped");
});

// Four follow-ups to the previous round's fixes: each fix covered the path it
// was found on and left a sibling path behind.
test("Venus solo does not end the game while Venus is short", async () => {
  const { triggerProduction } = await import("../app/game-logic.js");
  for (const [venus, expected] of [[0, "action"], [30, "final_greenery"]]) {
    const state = getInitialState({ playerCount: 1, venus: true });
    state.venusEnabled = true;
    state.temperature = 8;
    state.oxygen = 14;
    state.oceans = 9;
    state.venus = venus;
    state.phase = "action";
    state.currentPlayerId = "player";
    state.generation = 5;
    const produced = triggerProduction(state, state.logs);
    assert.equal(
      (produced.state ?? produced).phase, expected,
      `Mars complete with Venus at ${venus}% must ${expected === "action" ? "keep playing" : "end"}`
    );
  }
});

test("A requirement buffer relaxes ocean counts too", async () => {
  const { ALL_CARDS, getPlayer } = await import("../app/game-logic.js");
  const card = ALL_CARDS.find(
    entry => (entry.requirements ?? []).some(item => item.oceans !== undefined && !item.max)
  );
  const need = card.requirements.find(item => item.oceans !== undefined).oceans;

  const state = getInitialState({ playerCount: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  state.oceans = need - 1;
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.hand = [card.id];

  assert.equal(getCardPlayableStatus(card, state).playable, false, "one ocean short");
  seat.oneShotRequirementBuffer = 2;
  assert.equal(getCardPlayableStatus(card, state).playable, true, "the buffer covers it");
});

test("A card allowing duplicate colonies still cannot use a full tile", async () => {
  const { buildColony, canBuildColony } = await import("../app/colonies.js");
  const state = getInitialState({ playerCount: 4, colonies: true });
  let colonies = state.colonies;
  const tile = activeTile(colonies);
  for (const id of ["player", "player2", "player3"]) {
    colonies = buildColony(colonies, tile, id).colonies;
  }
  assert.equal(colonies.tiles[tile].colonies.length, 3, "the tile is full");
  assert.equal(
    canBuildColony(colonies, tile, "player", { allowDuplicates: true }).ok,
    false,
    "allowDuplicates lifts the one-per-tile rule, not the three-per-tile cap"
  );
});

test("A branch chosen inside a card action still pays threshold bonuses", async () => {
  const { ALL_CARDS, getPlayer, applyCardAction, resolvePendingChoice } =
    await import("../app/game-logic.js");
  const card = ALL_CARDS.find(entry => entry.id === "card-base-regolith-eaters");

  const state = getInitialState({ playerCount: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.playedProjects = [card.id];
  seat.mc = 100;
  seat.cardResources = { [card.id]: 5 };
  state.oxygen = 7;
  state.temperature = -30;

  const acted = applyCardAction(state, card, state.logs);
  let settled = acted.state;
  assert.ok(settled.pendingChoice, "the card asks which branch to take");
  const raising = settled.pendingChoice.options.find(option => /oxygen/i.test(option.label));
  settled = resolvePendingChoice(settled, raising.id, settled.logs, "player").state;

  assert.equal(settled.oxygen, 8);
  assert.equal(settled.temperature, -28, "8% oxygen pays +2C from a branch too");
});

// Thorgate's printed text discounts power-tag cards AND the power plant
// standard project. The Japanese effect line only mentioned the cards, so the
// project stayed at list price for the one corporation built around buying it.
test("Thorgate discounts the power plant standard project", async () => {
  const { getPlayer } = await import("../app/game-logic.js");
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");

  const paidBy = corporationId => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.corporationId = corporationId;
    seat.mc = 100;
    seat.actionsRemaining = 2;
    const before = seat.mc;
    const result = executeGameCommand(state, {
      type: COMMAND.STANDARD_PROJECT, playerId: "player", projectId: "power-plant"
    });
    assert.equal(result.ok, true);
    return before - getPlayer(result.state, "player").mc;
  };

  assert.equal(paidBy(null), 11);
  assert.equal(paidBy("corp-thorgate"), 8);
});

// Capital's curated override replaced the generated spec wholesale, and
// getCardEffect returns card.effect verbatim when it exists -- so the card that
// says "place a city tile" placed nothing.
test("Capital places a city", async () => {
  const { applyCardEffect, ALL_CARDS, getPlayer, getCardEffect } = await import("../app/game-logic.js");
  const card = ALL_CARDS.find(entry => entry.id === "p-capital");
  assert.equal(getCardEffect(card).tile, "city", "the effect still carries the tile");

  const state = getInitialState({ playerCount: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  state.oceans = 4;
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.energyProd = 3;

  const played = applyCardEffect(state, card, state.logs);
  const placedOrAsked =
    Boolean(played.state.pendingChoice) ||
    Object.values(played.state.board).filter(cell => cell.tileType === "city").length > 2;
  assert.ok(placedOrAsked, "the city is placed or its space is asked for");
});

// cardDiscount arrives in four shapes and only two were handled: Mass Converter
// carries per:"card" and Space Lanes carries a list, so both granted nothing.
test("Every shape of card discount is applied", async () => {
  const { applyCardEffect, applyPreludes, ALL_CARDS, PRELUDES, getPlayer, getCardPaymentCost } =
    await import("../app/game-logic.js");

  const space = ALL_CARDS.find(c => c.tags.includes("Space") && c.cost === 14);
  let state = getInitialState({ playerCount: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const listed = getCardPaymentCost(space, state, 0, 0);
  state = applyCardEffect(state, ALL_CARDS.find(c => c.id === "card-base-mass-converter"), state.logs).state;
  assert.equal(getCardPaymentCost(space, state, 0, 0), listed - 2, "a per-card discount is ongoing");

  const lanes = PRELUDES.find(p => p.id === "card-prelude2-space-lanes");
  let table = getInitialState({ playerCount: 1, prelude: true });
  const seat = getPlayer(table, "player");
  seat.setupStep = "prelude";
  seat.preludeOptions = [lanes.id, PRELUDES.find(p => p.id !== lanes.id).id];
  seat.mc = 100;
  const jovian = ALL_CARDS.find(c => c.tags.includes("Jovian"));
  const beforeLanes = getCardPaymentCost(jovian, table, 0, 0);
  table = applyPreludes(table, seat.preludeOptions, "player");
  assert.equal(getCardPaymentCost(jovian, table, 0, 0), beforeLanes - 2, "a list of discounts all apply");
});

// Preludes stay face up and their tags count. The card-requirement path already
// knew that; the milestone/award path counted only played projects, so Builder
// and Scientist were the only places a prelude tag did not exist.
test("Prelude tags count toward Builder and the Scientist award", async () => {
  const { PRELUDES, ALL_CARDS, getPlayer } = await import("../app/game-logic.js");
  const { countTags } = await import("../app/milestones-awards.js");

  const building = PRELUDES.find(p => (p.tags ?? []).some(t => /building/i.test(t)));
  const state = getInitialState({ playerCount: 2, prelude: true });
  const seat = getPlayer(state, state.players[0].id);
  seat.playedProjects = [];
  seat.selectedPreludeIds = [building.id];

  assert.equal(countTags(seat, ALL_CARDS, "Building", null, PRELUDES), 1);
});

// "The player with the lowest TR" is meaningless with one player, so the solo
// rules swap the comparison for a fixed threshold.
test("The Reds solo bonus stops above TR 20", async () => {
  // applyTrSwing is exercised directly: runTurmoilPhase also resolves whichever
  // global event was dealt, and some of those move TR, which made an
  // end-to-end assertion nondeterministic.
  const { applyTrSwing } = await import("../app/game-logic.js");
  const bonus = { kind: "lowestTr", amount: 1 };

  assert.equal(applyTrSwing([{ tr: 20 }], bonus)[0].tr, 21, "at the threshold the bonus applies");
  assert.equal(applyTrSwing([{ tr: 21 }], bonus)[0].tr, 21, "above it nothing is given");
  assert.equal(applyTrSwing([{ tr: 14 }], bonus)[0].tr, 15, "well under it applies");

  // With opponents the comparison is the real one again: only the lowest gains.
  const table = applyTrSwing([{ id: "a", tr: 30 }, { id: "b", tr: 25 }], bonus);
  assert.deepEqual(table.map(entry => entry.tr), [30, 26], "only the lowest TR moves");
});

// Solo neutral cities are written onto the board before anyone has a
// corporation, so the per-city trigger never saw them.
test("Tharsis Republic collects for the solo neutral cities", async () => {
  const { applyCorporation, getPlayer } = await import("../app/game-logic.js");
  const take = options => {
    const state = getInitialState(options);
    const seat = state.players[0];
    seat.corporationOptions = ["corp-tharsis"];
    return getPlayer(applyCorporation(state, "corp-tharsis", seat.id), seat.id).mcProd;
  };
  // Two neutral cities are already standing, and Tharsis' own first action
  // places a third: "when any city tile is placed ON MARS" pays for all of them.
  assert.equal(take({ playerCount: 1 }), 3, "two neutral cities plus its own");
  // At a full table nothing is on the board yet, and the initial action waits
  // until every player has chosen a corporation.
  assert.equal(take({ playerCount: 2 }), 0, "a normal table starts empty");
});

// Colonies' solo variant opens 2 M€ production down.
test("A Colonies solo game starts at -2 M€ production", async () => {
  const { applyCorporation, getPlayer } = await import("../app/game-logic.js");
  const start = options => {
    const state = getInitialState(options);
    const seat = state.players[0];
    seat.corporationOptions = ["corp-beginner"];
    return getPlayer(applyCorporation(state, "corp-beginner", seat.id), seat.id).mcProd;
  };
  assert.equal(start({ playerCount: 1, colonies: true }), -2);
  assert.equal(start({ playerCount: 1 }), 0, "without Colonies there is no penalty");
  assert.equal(start({ playerCount: 2, colonies: true }), 0, "and none at a normal table");
});

// Four cards override the default placement rule for their tile type, and the
// override lived in `on`, which only raw.tile carried through. Artificial Lake
// and Mangrove were placing on exactly the spaces they forbid.
test("A card's own placement rule beats the default for its tile type", async () => {
  const { ALL_CARDS, getCardEffect, legalCellsFor } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 1 });
  state.currentPlayerId = "player";

  const legalFor = id => {
    const effect = getCardEffect(ALL_CARDS.find(card => card.id === id));
    return {
      rule: effect.tilePlacementRule,
      cells: legalCellsFor(state, effect.tile, undefined, effect.tilePlacementRule)
    };
  };

  // "Place an ocean tile ON AN AREA NOT RESERVED FOR OCEAN."
  const lake = legalFor("card-base-artificial-lake");
  assert.equal(lake.rule, "land");
  assert.ok(lake.cells.length > 0);
  assert.ok(lake.cells.every(cell => !cell.isOceanOnly), "never on a reserved ocean space");

  // "Place a greenery tile ON AN AREA RESERVED FOR OCEAN."
  for (const id of ["card-base-mangrove", "card-base-protected-valley"]) {
    const greenery = legalFor(id);
    assert.equal(greenery.rule, "ocean", `${id} keeps its rule`);
    assert.ok(greenery.cells.length > 0, `${id} has somewhere to go`);
    assert.ok(greenery.cells.every(cell => cell.isOceanOnly), `${id} goes only on ocean spaces`);
  }

  // "Place a city tile NEXT TO NO OTHER TILE."
  const outpost = legalFor("card-base-research-outpost");
  assert.equal(outpost.rule, "isolated");
  assert.ok(outpost.cells.length > 0);
});

// The official rules place a card's tile "if possible" and state that being
// unable to place it does not stop the card being played. This looks like a
// missing guard, so it is pinned here: adding one would be a house rule.
test("A card is playable even when its tile has nowhere to go", async () => {
  const { applyCardEffect, ALL_CARDS, getPlayer } = await import("../app/game-logic.js");
  const card = ALL_CARDS.find(entry => entry.id === "card-base-research-outpost");

  const state = getInitialState({ playerCount: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.mc = 200;
  seat.hand = [card.id];

  // Fill every dry space, so nothing is isolated and the city cannot be placed.
  for (const cell of Object.values(state.board)) {
    if (cell.tileType === "empty" && !cell.isOceanOnly) {
      cell.tileType = "forest";
      cell.placedBy = "player";
    }
  }

  assert.equal(getCardPlayableStatus(card, state).playable, true, "still playable");
  const played = applyCardEffect(state, card, state.logs);
  assert.ok(played.state, "and it resolves rather than throwing");
});

// Standard Technology shipped with an empty effect spec: a 6 M€ science tag and
// nothing else. It refunds 3 M€ after a standard project is PAID FOR, which
// excludes Sell Patents and the two resource conversions -- those are standard
// actions, not projects -- and includes building a colony, which the Colonies
// rules name as a standard project.
test("Standard Technology refunds 3 M€ on standard projects only", async () => {
  const { getPlayer, buildColonyOn } = await import("../app/game-logic.js");
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const CARD = "card-base-standard-technology";

  const spend = (projectId, holding) => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.mc = 200;
    seat.plants = 30;
    seat.heat = 30;
    seat.actionsRemaining = 2;
    seat.hand = ["p-mine"];
    if (holding) seat.playedProjects = [CARD];
    const before = seat.mc;
    const result = executeGameCommand(state, {
      type: COMMAND.STANDARD_PROJECT, playerId: "player", projectId, cardIds: ["p-mine"]
    });
    assert.equal(result.ok, true, `${projectId} runs`);
    return before - getPlayer(result.state, "player").mc;
  };

  assert.equal(spend("power-plant", false), 11);
  assert.equal(spend("power-plant", true), 8, "3 M€ comes back");
  assert.equal(spend("asteroid", true), 11, "and on any other project");
  assert.equal(spend("convert-plants", true), 0, "a conversion is an action, not a project");
  assert.equal(spend("sell-patents", true), -1, "Sell Patents is excluded and still pays 1");

  const colony = holding => {
    const state = getInitialState({ playerCount: 2, colonies: true });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.mc = 100;
    if (holding) seat.playedProjects = [CARD];
    const before = seat.mc;
    const out = buildColonyOn(state, activeTile(state.colonies), state.logs, "player");
    assert.equal(out.built, true);
    return before - getPlayer(out.state, "player").mc;
  };
  assert.equal(colony(false), 17);
  assert.equal(colony(true), 14, "building a colony is a standard project too");
});

// The solo game is played against a neutral opponent, so "remove 3 plants from
// any player" and "decrease any production" have a target. Both guards fell
// through when there was only one player in state.players, and the decrement
// landed on the player who played the card -- Asteroid ate its owner's plants.
test("A solo attack hits the neutral opponent, not the player", async () => {
  const { applyCardEffect, ALL_CARDS, getPlayer } = await import("../app/game-logic.js");

  const asteroid = ALL_CARDS.find(card => card.id === "p-asteroid");
  const solo = getInitialState({ playerCount: 1 });
  solo.phase = "action";
  solo.currentPlayerId = "player";
  const seat = getPlayer(solo, "player");
  seat.mc = 100;
  seat.plants = 10;

  const played = applyCardEffect(solo, asteroid, solo.logs);
  assert.equal(getPlayer(played.state, "player").plants, 10, "own plants are untouched");
  assert.equal(played.state.pendingChoice, null, "and nothing is asked");
  assert.equal(played.state.temperature > solo.temperature, true, "the rest of the card still applies");

  // With an opponent the attack is a real choice again.
  const table = getInitialState({ playerCount: 2 });
  table.phase = "action";
  table.currentPlayerId = "player";
  getPlayer(table, "player").mc = 100;
  for (const player of table.players) player.plants = 10;
  const asked = applyCardEffect(table, asteroid, table.logs);
  assert.equal(asked.state.pendingChoice?.kind, "resource-attack");
});

test("Local Heat Trapping follows card-cost reserves and effect choices", () => {
  const makeState = ({ mc = 0, heat = 5, floaters = 0, animals = [] } = {}) => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = state.players[0];
    player.mc = mc;
    player.heat = heat;
    player.hand = ["card-base-local-heat-trapping"];
    player.playedProjects = animals;
    player.cardResources = {
      "card-colonies-stormcraft-incorporated": floaters,
      ...Object.fromEntries(animals.map(id => [id, 0]))
    };
    return state;
  };

  const mcPaid = executeGameCommand(makeState({ mc: 1 }), {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-local-heat-trapping"
  });
  assert.equal(mcPaid.ok, true);
  assert.equal(mcPaid.state.players[0].mc, 0);
  assert.equal(mcPaid.state.players[0].heat, 0);
  assert.equal(mcPaid.state.players[0].plants, 4);
  assert.equal(mcPaid.state.players[0].actionsRemaining, 1);

  const heatPaid = executeGameCommand(makeState({ heat: 6 }), {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-local-heat-trapping"
  });
  assert.equal(heatPaid.ok, true);
  assert.equal(heatPaid.state.players[0].heat, 0);

  const floaterPaid = executeGameCommand(makeState({ heat: 5, floaters: 1 }), {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-local-heat-trapping"
  });
  assert.equal(floaterPaid.ok, true);
  assert.equal(floaterPaid.state.players[0].cardResources["card-colonies-stormcraft-incorporated"], 0);
  assert.equal(floaterPaid.state.players[0].plants, 4);

  const effectFloaterPaid = executeGameCommand(makeState({ mc: 1, heat: 3, floaters: 1 }), {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-local-heat-trapping"
  });
  assert.equal(effectFloaterPaid.ok, true);
  assert.equal(effectFloaterPaid.state.players[0].heat, 0);
  assert.equal(effectFloaterPaid.state.players[0].cardResources["card-colonies-stormcraft-incorporated"], 0);
  assert.equal(effectFloaterPaid.state.players[0].plants, 4);

  const unavailable = makeState({ heat: 1, floaters: 1 });
  assert.equal(getCardPlayableStatus(ALL_CARDS.find(card => card.id === "card-base-local-heat-trapping"), unavailable).playable, false);
  const effectUnavailable = makeState({ mc: 1, heat: 2, floaters: 1 });
  assert.equal(getCardPlayableStatus(ALL_CARDS.find(card => card.id === "card-base-local-heat-trapping"), effectUnavailable).playable, false);

  const selected = executeGameCommand(makeState({ mc: 1, animals: ["card-base-birds", "card-base-fish"] }), {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-local-heat-trapping"
  });
  assert.equal(selected.state.pendingChoice.kind, "effect-branch");
  const animalBranch = executeGameCommand(selected.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: "1"
  });
  assert.equal(animalBranch.state.pendingChoice.kind, "any-card-resource");
  assert.equal(animalBranch.state.pendingChoice.options.some(option => option.targetCardId === "card-base-local-heat-trapping"), false);
  const target = animalBranch.state.pendingChoice.options.find(option => option.targetCardId === "card-base-fish");
  const resolved = executeGameCommand(animalBranch.state, {
    type: COMMAND.RESOLVE_PENDING, playerId: "player", optionId: target.id
  });
  assert.equal(resolved.state.players[0].cardResources["card-base-fish"], 2);
  assert.equal(resolved.state.players[0].actionsRemaining, 1);
});

test("Soil Enrichment lets PLAY_CARD choose an own microbe card", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.hand = ["card-promo-soil-enrichment"];
  seat.playedProjects = ["card-base-ants", "card-base-decomposers"];
  seat.cardResources = {
    "card-base-ants": 2,
    "card-base-decomposers": 1
  };
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: "player",
    cardId: "card-promo-soil-enrichment"
  });

  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "any-card-resource-removal");
  assert.equal(getPlayer(played.state, "player").plants, 0);
  const invalid = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: "player",
    optionId: "not-a-card"
  });
  assert.equal(invalid.ok, true);
  assert.equal(invalid.state.pendingChoice?.kind, "any-card-resource-removal");
  const chosen = played.state.pendingChoice.options.find(
    option => option.targetCardId === "card-base-decomposers"
  );
  assert.ok(chosen);

  const settled = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: "player",
    optionId: chosen.id
  });
  const result = getPlayer(settled.state, "player");
  assert.equal(settled.ok, true);
  assert.equal(result.cardResources["card-base-ants"], 2);
  assert.equal(result.cardResources["card-base-decomposers"], 0);
  assert.equal(result.plants, 5);
});

test("Soil Enrichment is not playable without an own microbe", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const state = getInitialState({ playerCount: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = state.players[0];
  seat.mc = 100;
  seat.hand = ["card-promo-soil-enrichment"];
  const result = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD,
    playerId: "player",
    cardId: "card-promo-soil-enrichment"
  });

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "CARD_NOT_PLAYABLE");
});

test("Air Raid pays an own floater before choosing the stolen MC", async () => {
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getPlayer } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 2, colonies: true });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  const victim = getPlayer(state, "player2");
  seat.mc = 20;
  seat.hand = ["card-colonies-air-raid"];
  seat.playedProjects = ["card-colonies-atmo-collectors", "card-colonies-jovian-lanterns"];
  seat.cardResources = {
    "card-colonies-atmo-collectors": 1,
    "card-colonies-jovian-lanterns": 1
  };
  victim.mc = 3;

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-colonies-air-raid"
  });
  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "any-card-resource-removal");
  assert.equal(played.state.pendingChoice.options.length, 2);
  assert.equal(getPlayer(played.state, "player").mc, 20);
  assert.equal(getPlayer(played.state, "player2").mc, 3);

  const paid = executeGameCommand(played.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: "player",
    optionId: played.state.pendingChoice.options[1].id
  });
  assert.equal(paid.state.pendingChoice?.kind, "resource-steal");
  assert.equal(getPlayer(paid.state, "player").cardResources["card-colonies-atmo-collectors"], 1);
  assert.equal(getPlayer(paid.state, "player").cardResources["card-colonies-jovian-lanterns"], 0);
  assert.equal(getPlayer(paid.state, "player").mc, 20);
  assert.equal(getPlayer(paid.state, "player2").mc, 3);

  const settled = executeGameCommand(paid.state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: "player",
    optionId: paid.state.pendingChoice.options[0].id
  });
  assert.equal(getPlayer(settled.state, "player2").mc, 0);
  assert.equal(getPlayer(settled.state, "player").mc, 23);
  assert.equal(getPlayer(settled.state, "player").actionsRemaining, 1);

  const unavailable = getInitialState({ playerCount: 2, colonies: true });
  unavailable.phase = "action";
  unavailable.currentPlayerId = "player";
  const emptySeat = getPlayer(unavailable, "player");
  emptySeat.mc = 20;
  emptySeat.hand = ["card-colonies-air-raid"];
  getPlayer(unavailable, "player2").mc = 10;
  const refused = executeGameCommand(unavailable, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-colonies-air-raid"
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.error.code, "CARD_NOT_PLAYABLE");
});

// Ganymede Colony, Phobos Space Haven, Stanford Torus and the four Venus cities
// occupy reserved slots off the map. They were being turned into ordinary Mars
// cities: the player was asked where to put them, they took a board space, and
// they counted for everything that reads the board.
test("Cities on reserved off-board slots never reach the map", async () => {
  const { applyCardEffect, ALL_CARDS, getPlayer } = await import("../app/game-logic.js");

  const play = id => {
    const card = ALL_CARDS.find(entry => entry.id === id);
    const state = getInitialState({ playerCount: 1, venus: true });
    state.phase = "action";
    state.currentPlayerId = "player";
    state.oceans = 9;
    state.venus = 20;
    const seat = getPlayer(state, "player");
    seat.mc = 200;
    seat.energyProd = 5;
    const marsCitiesBefore = Object.values(state.board).filter(c => c.tileType === "city").length;
    const played = applyCardEffect(state, card, state.logs).state;
    return {
      marsCitiesBefore,
      marsCitiesAfter: Object.values(played.board).filter(c => c.tileType === "city").length,
      offBoard: (played.offBoardCities ?? []).map(entry => entry.space),
      asked: Boolean(played.pendingChoice)
    };
  };

  for (const id of ["card-base-ganymede-colony", "card-venus-stratopolis"]) {
    const result = play(id);
    assert.equal(result.marsCitiesAfter, result.marsCitiesBefore, `${id} adds no Mars city`);
    assert.equal(result.offBoard.length, 1, `${id} is recorded off the board`);
    assert.equal(result.asked, false, `${id} does not ask where to go`);
  }

  // A city that really is on Mars still asks.
  assert.equal(play("p-capital").asked, true, "Capital still picks a space");
});

// Off-board cities are city tiles the player owns, so they count where "cities
// you own" is the question, and never where the board is. Keeping those two as
// separate queries is what stops adjacency scoring picking them up.
test("Off-board cities count for Mayor and Landlord but not for board scoring", async () => {
  const { getPlayer, getMilestoneStatus, scoreAward, calculateScoreBreakdowns } =
    await import("../app/game-logic.js");
  const { getAward } = await import("../app/milestones-awards.js");

  const state = getInitialState({ playerCount: 2 });
  state.phase = "action";
  const seatId = state.players[0].id;
  getPlayer(state, seatId).mc = 100;

  let placed = 0;
  for (const cell of Object.values(state.board)) {
    if (placed < 2 && cell.tileType === "empty" && !cell.isOceanOnly) {
      cell.tileType = "city";
      cell.placedBy = seatId;
      placed += 1;
    }
  }

  assert.equal(getMilestoneStatus(state, "mayor", seatId).score, 2);
  const boardOnlyVp = calculateScoreBreakdowns(state)[seatId].board;

  state.offBoardCities = [
    { space: "01", ownerId: seatId, cardId: "card-base-ganymede-colony" }
  ];

  assert.equal(getMilestoneStatus(state, "mayor", seatId).score, 3, "Mayor counts it");
  const landlord = scoreAward(getAward("landlord"), state, { cards: [], corporations: [] });
  assert.equal(
    landlord.scores.find(entry => entry.playerId === seatId).score, 3,
    "Landlord counts it"
  );
  assert.equal(
    calculateScoreBreakdowns(state)[seatId].board, boardOnlyVp,
    "but it has no adjacency, so board VP is unchanged"
  );
});

// The ruling policy rewards what a player does on their turn. The final
// greenery conversion happens after the last generation, with no government in
// session, and the World Government's own tile pays nobody.
test("A tile policy does not fire for final greenery or the World Government", async () => {
  const { placeTileAt, legalCellsFor, getPlayer } = await import("../app/game-logic.js");

  const lay = options => {
    const state = getInitialState({ playerCount: 1, turmoil: true });
    state.turmoil.rulingParty = "greens";
    state.turmoil.rulingPolicyId = null;
    state.currentPlayerId = "player";
    for (const cell of Object.values(state.board)) {
      cell.bonusType = "none";
      cell.bonusAmount = 0;
      cell.bonus = null;
    }
    const before = getPlayer(state, "player").mc;
    placeTileAt(state, legalCellsFor(state, "forest", "player")[0], "forest", "player", undefined, options);
    return getPlayer(state, "player").mc - before;
  };

  assert.equal(lay({}), 4, "an ordinary greenery pays");
  assert.equal(lay({ finalGreenery: true }), 0);
  assert.equal(lay({ worldGovernment: true }), 0);
});

// The solo game has a neutral opponent that "has whatever resources are
// needed", and what is taken from it comes out of the general supply. Removal
// effects get no neutral target: removing a resource it does not really hold
// would achieve nothing.
test("Solo steals take from the neutral opponent; removals do not", async () => {
  const { applyCardEffect, resolvePendingChoice, ALL_CARDS, getPlayer } =
    await import("../app/game-logic.js");

  const play = id => {
    const card = ALL_CARDS.find(entry => entry.id === id);
    const state = getInitialState({ playerCount: 1, colonies: true, venus: true });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.mc = 100;
    seat.steel = 0;
    seat.cardResources = { [id]: 5 };
    if (id === "card-colonies-air-raid") {
      seat.playedProjects = ["card-colonies-atmo-collectors", "card-colonies-jovian-lanterns"];
      seat.cardResources = {
        "card-colonies-atmo-collectors": 1,
        "card-colonies-jovian-lanterns": 1
      };
    }
    const before = { mc: seat.mc, steel: seat.steel };
    const played = applyCardEffect(state, card, state.logs).state;
    return { before, state: played, options: played.pendingChoice?.options ?? [] };
  };

  const raiders = play("card-base-hired-raiders");
  assert.equal(raiders.options.length, 2, "steel or megacredits, from the neutral opponent");
  const took = resolvePendingChoice(
    raiders.state, raiders.options[0].id, raiders.state.logs, "player"
  ).state;
  assert.equal(
    getPlayer(took, "player").steel - raiders.before.steel, 2,
    "and the attacker actually gains it"
  );

  const airRaid = play("card-colonies-air-raid");
  assert.equal(airRaid.state.pendingChoice?.kind, "any-card-resource-removal");
  const afterFloater = resolvePendingChoice(
    airRaid.state, airRaid.options[0].id, airRaid.state.logs, "player"
  ).state;
  assert.equal(afterFloater.pendingChoice?.kind, "resource-steal");
  const raided = resolvePendingChoice(
    afterFloater, afterFloater.pendingChoice.options[0].id, afterFloater.logs, "player"
  ).state;
  assert.equal(getPlayer(raided, "player").mc - airRaid.before.mc, 5);

  // Sabotage removes rather than takes, so solo leaves it with nothing to do.
  assert.equal(play("card-base-sabotage").options.length, 0);
});

// "Increase your M€ production 1 step for each Earth tag you have" and its
// eighteen siblings. The stock path already resolved counted amounts against
// live state; the production path accepted only a plain number and dropped
// anything else on the floor, so these cards were bought and did nothing.
test("Production that scales with the tableau is counted", async () => {
  const { applyCardEffect, ALL_CARDS, getPlayer, getCardEffect } = await import("../app/game-logic.js");

  const counted = ALL_CARDS.filter(card => (getCardEffect(card).countedProduction ?? []).length > 0);
  assert.ok(counted.length >= 18, "the catalog has scaling production cards");

  const play = (cardId, prepare) => {
    const state = getInitialState({ playerCount: 2, colonies: true, venus: true });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.mc = 200;
    prepare(state, seat);
    const before = { ...seat };
    const played = applyCardEffect(state, ALL_CARDS.find(c => c.id === cardId), state.logs).state;
    const after = getPlayer(played, "player");
    return { before, after };
  };

  // Per tag.
  const cartel = play("card-base-cartel", (state, seat) => {
    seat.playedProjects = ALL_CARDS.filter(c => c.tags.includes("Earth")).slice(0, 3).map(c => c.id);
  });
  assert.equal(cartel.after.mcProd - cartel.before.mcProd, 3, "one step per Earth tag");

  // Per tile on the board.
  const saving = play("card-base-energy-saving", state => {
    let placed = 0;
    for (const cell of Object.values(state.board)) {
      if (placed < 4 && cell.tileType === "empty" && !cell.isOceanOnly) {
        cell.tileType = "city";
        cell.placedBy = "player";
        placed += 1;
      }
    }
  });
  assert.equal(saving.after.energyProd - saving.before.energyProd, 4, "one step per city");

  // Counting the OPPONENTS' tags, not your own.
  const toll = play("card-base-toll-station", (state, seat) => {
    seat.playedProjects = [];
    getPlayer(state, "player2").playedProjects =
      ALL_CARDS.filter(c => c.tags.includes("Space")).slice(0, 4).map(c => c.id);
  });
  assert.equal(toll.after.mcProd - toll.before.mcProd, 4, "one step per opponent Space tag");
});

// "1 M€ per 2 Building tags" divides and rounds down. The divisor was ignored
// entirely, so Medical Lab paid per tag rather than per pair -- and it was
// ignored on the stock side too, which is why Solar Probe over-drew.
test("A per-N divisor divides the count and rounds down", async () => {
  const { applyCardEffect, ALL_CARDS, getPlayer } = await import("../app/game-logic.js");

  const state = getInitialState({ playerCount: 2 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.mc = 200;
  seat.playedProjects = ALL_CARDS.filter(c => c.tags.includes("Building")).slice(0, 7).map(c => c.id);

  const before = seat.mcProd;
  const played = applyCardEffect(state, ALL_CARDS.find(c => c.id === "card-base-medical-lab"), state.logs).state;
  assert.equal(
    getPlayer(played, "player").mcProd - before, 3,
    "seven Building tags is three pairs, not seven"
  );
});

// Branch actions were filtered on `resourcesHere` alone, so a branch costing
// plants, steel, titanium, energy or megacredits was offered to anybody:
// Electro Catapult handed 7 M€ to a player holding neither a plant nor a steel.
test("A branch action only offers branches the player can pay for", async () => {
  const { applyCardAction, resolvePendingChoice, getCardActionStatus, ALL_CARDS, getPlayer } =
    await import("../app/game-logic.js");
  const card = ALL_CARDS.find(entry => entry.id === "card-base-electro-catapult");

  const seat = (plants, steel) => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.playedProjects = [card.id];
    player.plants = plants;
    player.steel = steel;
    player.mc = 0;
    return state;
  };

  // Neither cost is payable, so the action is not available at all.
  assert.equal(getCardActionStatus(seat(0, 0), card).playable, false);

  // Exactly one is payable: it resolves without asking which.
  const onlyPlant = applyCardAction(seat(1, 0), card, []);
  assert.equal(onlyPlant.state.pendingChoice, null, "no question when only one branch is open");
  assert.equal(getPlayer(onlyPlant.state, "player").plants, 0, "and the plant is spent");
  assert.equal(getPlayer(onlyPlant.state, "player").mc, 7);

  // Both payable: a real choice, and the branch ids still address the card's
  // own behaviours rather than positions in a filtered list.
  const both = applyCardAction(seat(1, 1), card, []);
  assert.equal(both.state.pendingChoice.options.length, 2);
  const steelOption = both.state.pendingChoice.options.find(option => /steel|建材/.test(option.label));
  const settled = resolvePendingChoice(both.state, steelOption.id, both.state.logs, "player").state;
  assert.equal(getPlayer(settled, "player").steel, 0, "the chosen branch is the one that is paid");
  assert.equal(getPlayer(settled, "player").plants, 1, "and the other resource is untouched");
});

// "Decrease any energy production 1 step and increase your own 1 step." The
// taking half was modelled and the gaining half was not, so four cards cost
// their money and only hurt somebody. A steal MOVES the step.
test("Production-stealing cards move the step to the player", async () => {
  const { applyCardEffect, resolvePendingChoice, ALL_CARDS, getPlayer } =
    await import("../app/game-logic.js");

  const cards = [
    ["card-base-energy-tapping", "energyProd"],
    ["card-base-power-supply-consortium", "energyProd"],
    ["card-base-great-escarpment-consortium", "steelProd"],
    ["card-base-asteroid-mining-consortium", "titaniumProd"]
  ];

  for (const [cardId, field] of cards) {
    const state = getInitialState({ playerCount: 2 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const mine = getPlayer(state, "player");
    const theirs = getPlayer(state, "player2");
    mine.mc = 200;
    theirs.energyProd = 4;
    theirs.steelProd = 4;
    theirs.titaniumProd = 4;
    mine.energyProd = 1;
    mine.steelProd = 1;
    mine.titaniumProd = 1;

    const played = applyCardEffect(state, ALL_CARDS.find(c => c.id === cardId), state.logs).state;
    assert.equal(played.pendingChoice?.kind, "production-attack", `${cardId} asks who to take from`);

    const victim = played.pendingChoice.options.find(option => option.targetPlayerId === "player2");
    const settled = resolvePendingChoice(played, victim.id, played.logs, "player").state;

    assert.equal(getPlayer(settled, "player2")[field], 3, `${cardId} takes a step`);
    assert.equal(getPlayer(settled, "player")[field], 2, `${cardId} gives that step to the player`);
  }

  // Nothing to take means nothing to gain: the step moves, it is not created.
  const empty = getInitialState({ playerCount: 2 });
  empty.phase = "action";
  empty.currentPlayerId = "player";
  getPlayer(empty, "player").mc = 200;
  getPlayer(empty, "player").energyProd = 2;
  getPlayer(empty, "player2").energyProd = 0;
  const asked = applyCardEffect(empty, ALL_CARDS.find(c => c.id === "card-base-energy-tapping"), empty.logs).state;
  const onlySelf = resolvePendingChoice(asked, asked.pendingChoice.options[0].id, asked.logs, "player").state;
  assert.equal(getPlayer(onlySelf, "player").energyProd, 2, "taking from yourself nets zero");
});

// Ants eat a microbe off any card to feed themselves; Predators eat an animal.
// The adding direction was built and the removing one was not, so those actions
// had nothing to spend. `source: 'all'` means anyone's card, not just yours.
test("An action can remove a resource from any card to feed its own", async () => {
  const { applyCardAction, resolvePendingChoice, ALL_CARDS, getPlayer } =
    await import("../app/game-logic.js");

  // Exercised through a spec shaped exactly as the reference declares it.
  const base = ALL_CARDS.find(entry => entry.id === "card-base-ants");
  const card = {
    ...base,
    effectSpec: {
      action: { removeResourcesFromAnyCard: { type: "Microbe", source: "all" }, addResources: 1 }
    }
  };

  const table = opponentMicrobes => {
    const state = getInitialState({ playerCount: 2 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const host = ALL_CARDS.find(entry => entry.id === "card-base-tardigrades");
    const mine = getPlayer(state, "player");
    const theirs = getPlayer(state, "player2");
    mine.playedProjects = [card.id];
    mine.cardResources = { [card.id]: 0 };
    theirs.playedProjects = [host.id];
    theirs.cardResources = { [host.id]: opponentMicrobes };
    return { state, hostId: host.id };
  };

  const { state, hostId } = table(3);
  const acted = applyCardAction(state, card, state.logs);
  let settled = acted.state;
  if (settled.pendingChoice) {
    settled = resolvePendingChoice(settled, settled.pendingChoice.options[0].id, settled.logs, "player").state;
  }
  assert.equal(getPlayer(settled, "player2").cardResources[hostId], 2, "the microbe is taken");
  assert.equal(getPlayer(settled, "player").cardResources[card.id], 1, "and fed to this card");

  // Nothing holds the resource, so there is nothing to spend and no action.
  const empty = table(0);
  assert.equal(applyCardAction(empty.state, card, empty.state.logs).playable, false);
});

// "Spend 8 M€ ... STEEL MAY BE USED as if you were playing a building card."
// The flags sit beside the amount in `spend` and were dropped in
// normalisation, so four cards that let a megacredit cost be paid in steel or
// titanium had no way to do it.
test("A card cost can be paid with steel or titanium when the card says so", async () => {
  const { applyCardEffect, getCardPlayableStatus, getPlayer } = await import("../app/game-logic.js");

  // Shaped exactly as the reference declares Aquifer Pumping's action.
  const card = {
    id: "test-alternate-payment",
    name: "Test Alternate Payment",
    cost: 0,
    type: "automated",
    tags: [],
    requirements: [],
    effectSpec: { behavior: { spend: { megacredits: 8, canUseSteel: true }, ocean: {} } }
  };

  const seat = (mc, steel) => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.mc = mc;
    player.steel = steel;
    player.hand = [card.id];
    return state;
  };

  // Steel is worth 2, so eight megacredits is four steel.
  const cash = getPlayer(applyCardEffect(seat(50, 0), card, []).state, "player");
  assert.equal(cash.mc, 42, "megacredits alone pay the whole cost");
  assert.equal(cash.steel, 0, "and no steel is taken");

  const ore = getPlayer(applyCardEffect(seat(0, 5), card, []).state, "player");
  assert.equal(ore.steel, 1, "four steel covers it");
  assert.equal(ore.mc, 0);

  const mixed = getPlayer(applyCardEffect(seat(4, 3), card, []).state, "player");
  assert.equal(mixed.steel, 0, "three steel is six, and the rest is cash");
  assert.equal(mixed.mc, 2);

  // Affordability counts the combined worth, not megacredits alone.
  assert.equal(getCardPlayableStatus(card, seat(8, 0)).playable, true);
  assert.equal(getCardPlayableStatus(card, seat(0, 4)).playable, true);
  assert.equal(getCardPlayableStatus(card, seat(2, 3)).playable, true);
  assert.equal(getCardPlayableStatus(card, seat(0, 3)).playable, false, "three steel is only six");
  assert.equal(getCardPlayableStatus(card, seat(0, 0)).playable, false);
});

test("Official alternate-payment card actions accept the named resource", async () => {
  const { applyCardAction, getCardActionStatus, getPlayer } = await import("../app/game-logic.js");

  const cases = [
    ["card-base-aquifer-pumping", "steel", 4],
    ["card-base-water-import-from-europa", "titanium", 4],
    ["card-promo-directed-impactors", "titanium", 2],
    ["card-venus-rotator-impacts", "titanium", 2]
  ];

  for (const [cardId, resource, amount] of cases) {
    const card = ALL_CARDS.find(entry => entry.id === cardId);
    assert.ok(card?.effectSpec?.action, `${cardId} carries its extracted action`);

    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.mc = 0;
    player.steel = 0;
    player.titanium = 0;
    player[resource] = amount;
    player.playedProjects = [card.id];
    player.cardResources = { [card.id]: 0 };

    assert.equal(getCardActionStatus(state, card).playable, true, `${cardId} is payable`);
    const result = applyCardAction(state, card, state.logs);
    assert.equal(result.playable, true, `${cardId} can execute`);
    assert.equal(getPlayer(result.state, "player")[resource], 0, `${cardId} spends ${resource}`);
  }
});

// "Spend 6 M€ to add 1 asteroid to ANY CARD." Card actions run their own chain
// instead of going through queuePendingChoices, and only the removing
// direction had been given that detour, so the action charged the titanium and
// the asteroid never arrived anywhere.
test("A card action that adds a resource to any card asks which card", async () => {
  const { applyCardAction, resolvePendingChoice, getPlayer, getCardResourceType } =
    await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");

  const card = OFFICIAL_PROJECTS.find(item => item.id === "card-promo-directed-impactors");
  const others = OFFICIAL_PROJECTS
    .filter(item => item.id !== card.id && getCardResourceType(item.id) === "asteroid")
    .slice(0, 2);
  assert.ok(others.length === 2, "the board needs rival asteroid cards for a choice to exist");

  const seat = extra => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.titanium = 2;
    player.playedProjects = [card.id, ...extra.map(item => item.id)];
    player.cardResources = Object.fromEntries([card, ...extra].map(item => [item.id, 0]));
    return state;
  };

  // Branch 1 is the paying half; titanium covers the six megacredits.
  const alone = applyCardAction(seat([]), card, [], 1);
  assert.ok(!alone.state.pendingChoice, "a sole target is not a decision");
  assert.equal(getPlayer(alone.state, "player").cardResources[card.id], 1,
    "the asteroid lands on the only card that can hold it");

  const contested = applyCardAction(seat(others), card, [], 1);
  const choice = contested.state.pendingChoice;
  assert.equal(choice?.kind, "any-card-resource");
  assert.equal(choice.options.length, 3, "every asteroid card in play is offered");

  const target = choice.options[2];
  const resolved = resolvePendingChoice(contested.state, target.id, contested.logs ?? []);
  const after = getPlayer(resolved.state ?? resolved, "player").cardResources;
  assert.equal(after[target.targetCardId], 1, "the chosen card receives it");
  assert.equal(after[card.id], 0, "and the acting card does not");
});

// "生産量を下げる場合、下げるだけの生産量がなければ、そのカードはプレイできません"
// applyProduction floors every track but MC at zero, so without this check the
// cost was simply waived: 地下都市 could be played at zero energy production
// and pay nothing. 29 cards had the hole.
test("A card that lowers production needs the production to lower", async () => {
  const { getCardPlayableStatus, getPlayer } = await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS, PRELUDES } = await import("../app/official-content.js");

  const seat = (card, key, value) => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.mc = 999;
    if (key) player[key] = value;
    player.hand = [card.id];
    return state;
  };

  // Underground City spends two energy production for a city and two steel.
  const city = OFFICIAL_PROJECTS.find(item => item.id === "card-base-underground-city");
  assert.equal(getCardPlayableStatus(city, seat(city, "energyProd", 1)).playable, false,
    "one step is not the two the card spends");
  assert.equal(getCardPlayableStatus(city, seat(city, "energyProd", 2)).playable, true,
    "exactly enough is enough");

  // The MC track is the one exception: it may be driven to -5.
  const mcCard = OFFICIAL_PROJECTS.find(item => item.effectSpec?.behavior?.production?.megacredits < 0);
  assert.equal(getCardPlayableStatus(mcCard, seat(mcCard, "mcProd", 0)).playable, true,
    "MC production is allowed below zero");

  // No card anywhere should be able to waive a production cost.
  const holes = [];
  for (const card of [...OFFICIAL_PROJECTS, ...PRELUDES]) {
    for (const [resource, amount] of Object.entries(card.effectSpec?.behavior?.production ?? {})) {
      if (typeof amount !== "number" || amount >= 0 || resource === "megacredits") continue;
      const key = { energy: "energyProd", heat: "heatProd", plants: "plantsProd", steel: "steelProd", titanium: "titaniumProd" }[resource];
      if (!key) continue;
      if (getCardPlayableStatus(card, seat(card, key, 0)).playable) holes.push(`${card.id} (${resource} ${amount})`);
    }
  }
  assert.deepEqual(holes, [], "every production cost must be checked before the card is playable");
});

// Copying a production box is subject to the same rule as printing one, so a
// building whose decrease the player cannot pay is not a legal target. The
// production phase assigns energy straight from energyProd, so duplicating
// 地下都市 at one energy production put the player on -1 energy every turn.
test("Robotic Workforce cannot copy a production box the player cannot pay", async () => {
  const { applyCardEffect, getPlayer } = await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");

  const workforce = OFFICIAL_PROJECTS.find(item => item.id === "card-base-robotic-workforce");
  // Underground City is a Building whose box spends two energy production.
  const city = OFFICIAL_PROJECTS.find(item => item.id === "card-base-underground-city");

  const seat = energyProd => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.mc = 999;
    player.energyProd = energyProd;
    player.playedProjects = [city.id];
    return state;
  };

  const poor = applyCardEffect(seat(1), workforce, []);
  assert.ok(!poor.state.pendingChoice, "with no affordable target there is nothing to choose");
  assert.ok((getPlayer(poor.state, "player").energyProd ?? 0) >= 0,
    "and energy production never goes below zero");

  const rich = applyCardEffect(seat(2), workforce, []);
  const offered = rich.state.pendingChoice;
  assert.equal(offered?.kind, "building-production");
  assert.deepEqual(offered.options.map(option => option.cardId), [city.id],
    "an affordable box is still offered");
});

// The offered options are a convenience, not the rule. Online play resolves
// choices through the engine, so a submitted card id has to be validated on its
// own: forging one the engine never offered copied a production box the player
// could not pay for and drove the track below zero.
test("Robotic Workforce rejects an unaffordable target it never offered", async () => {
  const { applyCardEffect, resolvePendingChoice, getPlayer } = await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");

  const workforce = OFFICIAL_PROJECTS.find(item => item.id === "card-base-robotic-workforce");
  const city = OFFICIAL_PROJECTS.find(item => item.id === "card-base-underground-city");

  const seat = energyProd => {
    const state = getInitialState({ playerCount: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.mc = 999;
    player.energyProd = energyProd;
    player.playedProjects = [city.id];
    return state;
  };

  const forge = state => ({
    ...state,
    pendingChoice: {
      id: "building-production:forged:player",
      kind: "building-production",
      ownerPlayerId: "player",
      options: [{ id: city.id, cardId: city.id, label: city.name }],
      continuation: {
        sourceKind: "card",
        sourceId: workforce.id,
        stage: "building-production",
        consumedAction: true,
        paid: true
      }
    }
  });

  const poor = resolvePendingChoice(forge(applyCardEffect(seat(1), workforce, []).state), city.id, []);
  assert.equal(poor.status, "pending", "an unaffordable box is refused");
  assert.equal(getPlayer(poor.state, "player").energyProd, 1, "and production is untouched");

  const rich = resolvePendingChoice(forge(applyCardEffect(seat(2), workforce, []).state), city.id, []);
  assert.equal(rich.status, "resolved");
  assert.equal(getPlayer(rich.state, "player").energyProd, 0, "exactly enough pays exactly");
});

// The deck shuffled itself with Math.random, so a playtest seed only drove the
// move picker: the same command produced different games and a CI failure could
// not be replayed. The shuffle is now a pure function of the seed and how many
// shuffles have happened, both carried on state.
test("A seeded game deals reproducibly and keeps dealing reproducibly", async () => {
  const { getInitialState, drawCards } = await import("../app/game-logic.js");
  const { serializeSavedState, loadSavedState } = await import("../app/save-migration.js");

  const deal = state => JSON.stringify({
    deck: state.deck.slice(0, 10),
    corporations: state.players.map(player => player.corporationOptions),
    hands: state.players.map(player => player.researchCards)
  });

  const options = { playerCount: 2, prelude: true, turmoil: true, colonies: true, venus: true };
  assert.equal(deal(getInitialState({ ...options, seed: 12345 })),
               deal(getInitialState({ ...options, seed: 12345 })),
               "the same seed deals the same game");
  assert.notEqual(deal(getInitialState({ ...options, seed: 12345 })),
                  deal(getInitialState({ ...options, seed: 999 })),
                  "a different seed deals a different game");
  // Callers that pass no seed must still get a fresh game each time.
  assert.notEqual(deal(getInitialState(options)), deal(getInitialState(options)),
                  "an unseeded game is still random");

  // A reshuffle mid-game has to continue the sequence rather than start a new
  // one, including after the game has been saved and loaded.
  const exhausted = () => {
    const state = getInitialState({ playerCount: 1, seed: 42 });
    state.discardPile = [...state.deck];
    state.deck = [];
    return state;
  };
  const fresh = exhausted();
  const reloaded = loadSavedState(serializeSavedState(exhausted()));
  assert.equal(reloaded.rngSeed, 42, "the seed survives a save");
  assert.deepEqual(drawCards(reloaded, 5), drawCards(fresh, 5),
    "a reloaded game reshuffles into the same order");

  // A save written before the deck was seeded has no sequence to resume, so it
  // must be given one; leaving it undefined would silently re-randomise.
  const legacy = JSON.parse(serializeSavedState(exhausted()));
  delete legacy.rngSeed;
  delete legacy.rngDraws;
  legacy.rulesVersion = 4;
  const migrated = loadSavedState(JSON.stringify(legacy));
  assert.equal(typeof migrated.rngSeed, "number", "a legacy save is given a seed");
  assert.equal(migrated.rngDraws, 0);
});

// Both of these requirements were stubbed out with a single line that returned
// "expansion board condition unavailable" for either, so the two cards could
// never be played at all -- and the message described neither of them.
test("Diversity Support counts nine different resource types", async () => {
  const { getCardPlayableStatus, getPlayer, getCardResourceType } = await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const card = OFFICIAL_PROJECTS.find(item => item.id === "card-promo-diversity-support");

  // One card per distinct card-resource kind, so the count can be dialled.
  const seen = new Set();
  const holders = [];
  for (const item of OFFICIAL_PROJECTS) {
    const type = getCardResourceType(item.id);
    if (type && !seen.has(type)) { seen.add(type); holders.push(item.id); }
  }

  const seat = extraKinds => {
    const state = getInitialState({ playerCount: 1, promo: true, seed: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    // The six board resources are six of the nine.
    player.mc = 100;
    player.steel = 1; player.titanium = 1; player.plants = 1; player.energy = 1; player.heat = 1;
    const carrying = holders.slice(0, extraKinds);
    player.playedProjects = carrying;
    player.cardResources = Object.fromEntries(carrying.map(id => [id, 2]));
    player.hand = [card.id];
    return state;
  };

  assert.equal(getCardPlayableStatus(card, seat(2)).playable, false, "eight types is not nine");
  assert.equal(getCardPlayableStatus(card, seat(3)).playable, true, "nine is enough");
  // A card holding none of its resource does not count as a type.
  const empty = seat(3);
  const player = getPlayer(empty, "player");
  player.cardResources = Object.fromEntries(Object.keys(player.cardResources).map(id => [id, 0]));
  assert.equal(getCardPlayableStatus(card, empty).playable, false, "an empty card carries no type");
});

test("Crash Site Cleanup needs plants removed this generation", async () => {
  const { getCardPlayableStatus, getPlayer } = await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");
  const card = OFFICIAL_PROJECTS.find(item => item.id === "card-promo-crash-site-cleanup");

  const seat = ledger => {
    const state = getInitialState({ playerCount: 2, promo: true, seed: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.mc = 100;
    player.hand = [card.id];
    state.generationAttackLedger = ledger.map(entry => ({ ...entry, generation: state.generation }));
    return state;
  };
  const attack = resource => ({ attackerPlayerId: "player2", victimPlayerId: "player", resource, amount: 3 });

  assert.equal(getCardPlayableStatus(card, seat([])).playable, false, "nobody has been attacked");
  assert.equal(getCardPlayableStatus(card, seat([attack("steel")])).playable, false,
    "a steel raid is not a plant removal");
  assert.equal(getCardPlayableStatus(card, seat([attack("plants")])).playable, true);

  // "Requires that a player removed ANOTHER PLAYER's plants." Spending your own
  // plants on a greenery is not something anyone can point at.
  const ownPlants = seat([]);
  ownPlants.generationAttackLedger = [
    { attackerPlayerId: "player", victimPlayerId: "player", resource: "plants", amount: 3, generation: ownPlants.generation }
  ];
  assert.equal(getCardPlayableStatus(card, ownPlants).playable, false,
    "removing your own plants does not satisfy it");

  // The requirement is scoped to this generation, not the whole game.
  const stale = seat([attack("plants")]);
  stale.generationAttackLedger = stale.generationAttackLedger.map(entry => ({ ...entry, generation: entry.generation - 1 }));
  assert.equal(getCardPlayableStatus(card, stale).playable, false, "last generation does not count");
});


// "Gain 1 titanium or 2 steel." The generated catalogue carries Crash Site
// Cleanup's requirement but no reward at all, so the card cost 4 M€ and paid
// nothing. Coverage did not catch it: the requirement gate alone moved state.
test("Crash Site Cleanup pays 1 titanium or 2 steel", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");

  const card = OFFICIAL_PROJECTS.find(item => item.id === "card-promo-crash-site-cleanup");
  const state = getInitialState({ playerCount: 2, promo: true, seed: 1 });
  state.phase = "action";
  state.currentPlayerId = "player";
  const player = getPlayer(state, "player");
  player.mc = 100;
  player.hand = [card.id];
  state.generationAttackLedger = [
    { attackerPlayerId: "player2", victimPlayerId: "player", resource: "plants", amount: 3, generation: state.generation }
  ];

  const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id });
  assert.equal(played.ok, true);
  const choice = played.state.pendingChoice;
  assert.equal(choice?.kind, "effect-branch", "the card offers a choice of payout");
  assert.equal(choice.options.length, 2);

  const takings = choice.options.map(option => {
    const after = getPlayer(resolvePendingChoice(played.state, option.id, []).state, "player");
    return [after.titanium, after.steel];
  });
  assert.deepEqual(takings.sort(), [[0, 2], [1, 0]].sort(), "one titanium, or two steel");
});

// "Duplicate only the production box of one of your building cards." The copy
// read only the flat `production` map, so a box expressed as a count was
// invisible and a box carrying a decrease was copied without it.
test("Robotic Workforce copies the whole production box", async () => {
  const { applyCardEffect, resolvePendingChoice, getPlayer } = await import("../app/game-logic.js");
  const { OFFICIAL_PROJECTS } = await import("../app/official-content.js");

  const workforce = OFFICIAL_PROJECTS.find(item => item.id === "card-base-robotic-workforce");
  const seat = (played, fillers = 0) => {
    const state = getInitialState({ playerCount: 2, seed: 1 });
    state.phase = "action";
    state.currentPlayerId = "player";
    const player = getPlayer(state, "player");
    player.mc = 200;
    player.mcProd = 0;
    player.energyProd = 5;
    player.heatProd = 5;
    const padding = OFFICIAL_PROJECTS
      .filter(item => item.tags.includes("Building") && !played.includes(item.id))
      .slice(0, fillers)
      .map(item => item.id);
    player.playedProjects = [...played, ...padding];
    return state;
  };
  const copy = (state, cardId) => {
    const started = applyCardEffect(state, workforce, []);
    const option = started.state.pendingChoice?.options?.find(entry => entry.cardId === cardId);
    assert.ok(option, `${cardId} should be offered as a copy target`);
    return resolvePendingChoice(started.state, option.id, []);
  };

  // Medical Lab's box is "1 M€ per 2 building tags", which normalises to an
  // empty production map, so the card could not be copied at all.
  const lab = copy(seat(["card-base-medical-lab"], 4), "card-base-medical-lab");
  assert.equal(getPlayer(lab.state, "player").mcProd, 2, "five building tags is two megacredits");

  // Heat Trappers' box is "-2 heat production anywhere, +1 energy". The
  // decrease is part of the box, so it is copied too and needs a victim.
  const trappers = copy(seat(["card-base-heat-trappers"]), "card-base-heat-trappers");
  assert.equal(getPlayer(trappers.state, "player").energyProd, 6);
  const attack = trappers.state.pendingChoice;
  assert.equal(attack?.kind, "production-attack", "the copied decrease still asks who loses it");

  const victim = attack.options.find(entry => /player2|プレイヤー2/i.test(entry.label)) ?? attack.options[0];
  const settled = resolvePendingChoice(trappers.state, victim.id, []);
  const hit = (settled.state ?? settled).players.find(entry => entry.heatProd < 5);
  assert.ok(hit, "somebody's heat production came down");
});

test("Vitor funds an award for free as its first action", async () => {
  const { applyCorporation, advanceSetupTurn, resolvePendingChoice, getAwardStatus, getPlayer } =
    await import("../app/game-logic.js");

  // "As your first action, fund an award for free": it happens during setup,
  // not whenever the player next decides to fund one, so the free funding
  // cannot be banked and spent later in the game.
  let state = getInitialState({ mode: "multi", playerCount: 2, seed: 7 });
  const ids = state.players.map(player => player.id);
  state.players = state.players.map(player =>
    player.id === ids[0]
      ? { ...player, corporationOptions: [...(player.corporationOptions ?? []), "corp-vitor"] }
      : player
  );
  for (const id of ids) {
    state.currentPlayerId = id;
    const corporation = id === ids[0] ? "corp-vitor" : getPlayer(state, id).corporationOptions[0];
    state = applyCorporation(state, corporation, id);
  }
  state = advanceSetupTurn(state);

  const choice = state.pendingChoice;
  assert.equal(choice?.kind, "vitor-award", "setup asks which award to fund");
  const opening = getPlayer(state, ids[0]).mc;
  const settled = resolvePendingChoice(state, choice.options[0].id, state.logs, ids[0]);

  assert.equal(settled.status, "resolved");
  assert.equal(getPlayer(settled.state, ids[0]).mc, opening, "funding it cost nothing");
  assert.equal(settled.state.fundedAwards.length, 1, "the award is funded");

  // The ladder advanced, so anything funded later costs what it would have.
  const after = settled.state;
  after.phase = "action";
  after.setupStep = "done";
  const later = getAwardStatus(after, "banker", ids[0]);
  assert.ok(later.cost > 0, "only the first action is comped");
});

test("Vitor asks nothing in solo, where awards are not used", async () => {
  const { applyCorporation, advanceSetupTurn } = await import("../app/game-logic.js");
  let state = getInitialState({ mode: "solo", playerCount: 1, seed: 7 });
  state.players = state.players.map(player => ({ ...player, corporationOptions: ["corp-vitor"] }));
  state.currentPlayerId = "player";
  state = applyCorporation(state, "corp-vitor", "player");
  state = advanceSetupTurn(state);
  assert.equal(state.pendingChoice, null, "no award choice in a solo game");
});

test("Valley Trust draws three preludes and plays one for free", async () => {
  const { applyCorporation, applyPreludes, advanceSetupTurn, resolvePendingChoice, getPlayer } =
    await import("../app/game-logic.js");

  let state = getInitialState({ mode: "multi", playerCount: 2, prelude: true, seed: 11 });
  const ids = state.players.map(player => player.id);
  state.players = state.players.map(player =>
    player.id === ids[0]
      ? { ...player, corporationOptions: [...(player.corporationOptions ?? []), "corp-valley-trust"] }
      : player
  );
  for (const id of ids) {
    state.currentPlayerId = id;
    const corporation =
      id === ids[0] ? "corp-valley-trust" : getPlayer(state, id).corporationOptions[0];
    state = applyCorporation(state, corporation, id);
  }
  state = advanceSetupTurn(state);

  const deckBefore = state.preludeDeck.length;
  state.currentPlayerId = ids[0];
  state = applyPreludes(state, getPlayer(state, ids[0]).preludeOptions.slice(0, 2), ids[0]);

  const choice = state.pendingChoice;
  assert.equal(choice?.kind, "valley-trust-prelude");
  assert.equal(choice.options.length, 3, "three preludes are drawn");
  assert.equal(state.preludeDeck.length, deckBefore - 3, "all three leave the deck");

  const before = getPlayer(state, ids[0]);
  const settled = resolvePendingChoice(state, choice.options[0].id, state.logs, ids[0]);
  const after = getPlayer(settled.state, ids[0]);

  assert.equal(settled.status, "resolved");
  assert.equal(after.mc, before.mc, "the free prelude is not paid for");
  assert.equal(
    after.selectedPreludeIds.length,
    before.selectedPreludeIds.length + 1,
    "the chosen prelude is played on top of the usual two"
  );
  assert.equal(settled.state.pendingChoice, null, "setup is no longer blocked");
});

test("every corporation's printed starting production reaches the player", async () => {
  const { applyCorporation, getPlayer } = await import("../app/game-logic.js");
  const { CORPORATIONS } = await import("../app/official-content.js");

  // "megacredits" and "mc" name the same production box. Four corporations were
  // written with the long name, and the setup read only the short one, so they
  // opened with nothing.
  const canonical = { megacredits: "mc", mc: "mc", steel: "steel", titanium: "titanium",
    plants: "plants", energy: "energy", heat: "heat" };

  for (const corporation of CORPORATIONS) {
    const printed = corporation.starting?.production ?? {};
    if (Object.keys(printed).length === 0) continue;

    let state = getInitialState({
      mode: "multi", playerCount: 2, colonies: true, venus: true, prelude: true, seed: 3
    });
    state.players = state.players.map(player =>
      player.id === "player"
        ? { ...player, corporationOptions: [...(player.corporationOptions ?? []), corporation.id] }
        : player
    );
    state.currentPlayerId = "player";
    state = applyCorporation(state, corporation.id, "player");
    const seat = getPlayer(state, "player");

    for (const [key, amount] of Object.entries(printed)) {
      const box = canonical[key];
      assert.ok(box, `${corporation.name}: unknown production key ${key}`);
      assert.equal(
        seat[`${box}Prod`],
        amount,
        `${corporation.name} should open with ${amount} ${box} production`
      );
    }
  }
});

test("corporation initial actions do not depend on the Prelude expansion", async () => {
  const { applyCorporation, applyPreludes, advanceSetupTurn, getPlayer } =
    await import("../app/game-logic.js");

  // The initial action used to run only from the prelude path, so Tharsis
  // Republic's free city never appeared in a game without that expansion.
  const cities = (prelude, first) => {
    let state = getInitialState({ mode: "multi", playerCount: 2, prelude, seed: 5 });
    const ids = state.players.map(player => player.id);
    state.players = state.players.map(player =>
      player.id === ids[0]
        ? { ...player, corporationOptions: [...(player.corporationOptions ?? []), first] }
        : player
    );
    for (const id of ids) {
      state.currentPlayerId = id;
      const corporation = id === ids[0] ? first : getPlayer(state, id).corporationOptions[0];
      state = applyCorporation(state, corporation, id);
    }
    state = advanceSetupTurn(state);
    for (const id of ids) {
      const seat = getPlayer(state, id);
      if (seat.setupStep !== "prelude") continue;
      state.currentPlayerId = id;
      state = applyPreludes(state, seat.preludeOptions.slice(0, 2), id);
    }
    return Object.values(state.board).filter(cell => cell.tileType === "city").length;
  };

  // The preludes this seed deals build cities of their own, so the corporation's
  // contribution is the difference against a corporation that places none.
  for (const prelude of [false, true]) {
    const withTharsis = cities(prelude, "corp-tharsis");
    const without = cities(prelude, "corp-credicor");
    assert.equal(
      withTharsis - without,
      1,
      `Tharsis places exactly one city (prelude=${prelude})`
    );
  }
});

test("Celestic opens by drawing two floater cards", async () => {
  const { applyCorporation, advanceSetupTurn, getPlayer, ALL_CARDS } =
    await import("../app/game-logic.js");
  const { getCardResourceType } = await import("../app/card-resource-types.js");

  let state = getInitialState({ mode: "multi", playerCount: 2, venus: true, colonies: true, promo: true, seed: 5 });
  const ids = state.players.map(player => player.id);
  state.players = state.players.map(player =>
    player.id === ids[0]
      ? { ...player, corporationOptions: [...(player.corporationOptions ?? []), "card-venus-celestic"] }
      : player
  );
  for (const id of ids) {
    state.currentPlayerId = id;
    const corporation =
      id === ids[0] ? "card-venus-celestic" : getPlayer(state, id).corporationOptions[0];
    state = applyCorporation(state, corporation, id);
  }
  state = advanceSetupTurn(state);

  const hand = getPlayer(state, ids[0]).hand ?? [];
  assert.equal(hand.length, 2, "two cards are drawn");
  for (const id of hand) {
    const card = ALL_CARDS.find(item => item.id === id);
    assert.equal(
      card?.resourceType ?? getCardResourceType(id),
      "floater",
      `${card?.name ?? id} should hold floaters`
    );
  }
});

test("Media Group and Optimal Aerobraking pay out on events", async () => {
  const { getPlayer, ALL_CARDS, getCardPlayableStatus } = await import("../app/game-logic.js");

  // Neither card declares a behaviour -- their whole text is a trigger -- so
  // both sat in the tableau paying nothing while every test passed.
  const play = (tableau, pick) => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 2
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      // A corporation discount would move the same M€ this is measuring.
      player.corporationId = null;
    }
    const seat = getPlayer(state, "player");
    seat.playedProjects = [tableau];
    seat.mc = 100;
    seat.heat = 0;
    seat.actionsRemaining = 2;
    const event = ALL_CARDS.find(
      card => card.type === "event" && pick(card) && getCardPlayableStatus(card, state).playable
    );
    assert.ok(event, "an affordable event to play");
    seat.hand = [event.id];
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: event.id
    });
    assert.equal(played.ok, true);
    return { after: getPlayer(played.state, "player"), cost: event.cost };
  };

  const media = play("card-base-media-group", () => true);
  assert.equal(media.after.mc, 100 - media.cost + 3, "an event pays Media Group 3 M€");

  const braking = play("card-base-optimal-aerobraking", card => card.tags.includes("Space"));
  assert.equal(braking.after.mc, 100 - braking.cost + 3, "a space event pays 3 M€");
  assert.equal(braking.after.heat, 3, "and 3 heat");
});

test("Advertising raises production only for cards costing 20 or more", async () => {
  const { getPlayer, ALL_CARDS, getCardPlayableStatus } = await import("../app/game-logic.js");

  const rig = () => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 12
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
    }
    const seat = getPlayer(state, "player");
    seat.mc = 300;
    seat.steel = 20;
    seat.titanium = 20;
    seat.actionsRemaining = 20;
    state.oceans = 4;
    state.oxygen = 6;
    state.temperature = -10;
    state.venus = 10;
    return state;
  };

  let state = rig();
  getPlayer(state, "player").hand = ["card-promo-advertising"];
  const seated = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-promo-advertising"
  });
  assert.equal(seated.ok, true);
  state = seated.state;

  // A card of its own that moves production, or that stops to ask where a tile
  // goes, would measure something other than the trigger.
  const plain = card =>
    !/production|tile|city|ocean|greenery|removeAnyPlants|decreaseAnyProduction/
      .test(JSON.stringify(card.effectSpec ?? {})) &&
    card.id !== "card-promo-advertising";

  const check = (want, expected) => {
    const card = ALL_CARDS.find(
      item => plain(item) && want(item.cost ?? 0) && getCardPlayableStatus(item, state).playable
    );
    assert.ok(card, "a card to play");
    const before = getPlayer(state, "player").mcProd;
    const ready = { ...state };
    ready.players = state.players.map(player =>
      player.id === "player" ? { ...player, hand: [card.id] } : player
    );
    const played = executeGameCommand(ready, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id
    });
    assert.equal(played.ok, true, `${card.name} was refused`);
    assert.equal(
      getPlayer(played.state, "player").mcProd - before,
      expected,
      `${card.name} (cost ${card.cost})`
    );
  };

  check(cost => cost >= 20, 1);
  check(cost => cost > 0 && cost < 20, 0);
});

test("cards that count something in play pay for what they count", async () => {
  const { getPlayer, ALL_CARDS } = await import("../app/game-logic.js");

  // All four had an empty effectSpec, so they took the player's money and did
  // nothing. Each needs a different thing counted.
  const rig = () => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
    }
    const seat = getPlayer(state, "player");
    seat.mc = 300;
    seat.actionsRemaining = 20;
    state.oceans = 5;
    state.oxygen = 8;
    state.temperature = -6;
    state.venus = 12;
    return state;
  };

  const play = (state, cardId) => {
    getPlayer(state, "player").hand = [cardId];
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId
    });
    assert.equal(played.ok, true, `${cardId} was refused`);
    return getPlayer(played.state, "player");
  };

  // "1 M€ production per card with no tags, including this one."
  const services = rig();
  const noTag = ALL_CARDS.filter(c => (c.tags ?? []).length === 0 && c.type !== "event").slice(0, 2);
  getPlayer(services, "player").playedProjects = noTag.map(c => c.id);
  assert.equal(play(services, "card-colonies-community-services").mcProd, noTag.length + 1);

  // "1 M€ production per distinct tag in play, including this card's own."
  const trade = rig();
  getPlayer(trade, "player").playedProjects = ["card-base-acquired-company"];
  assert.equal(play(trade, "card-promo-interplanetary-trade").mcProd, 2, "Earth plus its own Space");

  // "1 M€ per event played by ANY player."
  const archives = rig();
  getPlayer(archives, "player").playedEvents = ["card-base-asteroid"];
  archives.players.find(p => p.id !== "player").playedEvents = ["card-base-comet", "card-base-big-asteroid"];
  const opening = getPlayer(archives, "player").mc;
  const card = ALL_CARDS.find(c => c.id === "card-base-media-archives");
  assert.equal(play(archives, card.id).mc, opening - card.cost + 3, "three events across the table");

  // "1 M€ production per colony in play, whoever built it."
  const quantum = rig();
  getPlayer(quantum, "player").playedProjects =
    ALL_CARDS.filter(c => (c.tags ?? []).includes("Science")).slice(0, 4).map(c => c.id);
  const tiles = Object.values(quantum.colonies?.tiles ?? {});
  tiles[0].colonies = ["player"];
  tiles[1].colonies = ["player2", "player"];
  assert.equal(play(quantum, "card-colonies-quantum-communications").mcProd, 3);
});

test("the two colony-placing cards spend production and place a colony", async () => {
  const { getPlayer, ALL_CARDS, getCardPlayableStatus, resolvePendingChoice, countColonies } =
    await import("../app/game-logic.js");

  const rig = () => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
    }
    const seat = getPlayer(state, "player");
    seat.mc = 300;
    seat.mcProd = 5;
    seat.actionsRemaining = 20;
    return state;
  };

  for (const id of ["card-colonies-minority-refuge", "card-colonies-pioneer-settlement"]) {
    const state = rig();
    getPlayer(state, "player").hand = [id];
    const played = executeGameCommand(state, { type: COMMAND.PLAY_CARD, playerId: "player", cardId: id });
    assert.equal(played.ok, true, `${id} was refused`);
    assert.equal(getPlayer(played.state, "player").mcProd, 3, `${id} spends 2 M€ production`);
    assert.equal(played.state.pendingChoice?.kind, "colony-placement", `${id} asks where`);

    const settled = resolvePendingChoice(
      played.state, played.state.pendingChoice.options[0].id, played.state.logs, "player"
    );
    assert.equal(countColonies(settled.state.colonies, "player"), 1, `${id} places one colony`);
  }

  // "Requires that you have no more than 1 colony": `max` was ignored, so the
  // requirement read as a floor and the card could never be played at all.
  const blocked = rig();
  const tiles = Object.values(blocked.colonies.tiles);
  tiles[0].colonies = ["player"];
  tiles[1].colonies = ["player"];
  const status = getCardPlayableStatus(
    ALL_CARDS.find(card => card.id === "card-colonies-pioneer-settlement"), blocked
  );
  assert.equal(status.playable, false, "two colonies is over the cap");
});

test("the mining cards take a mineral space and pay that mineral", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  const rig = () => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
    }
    const seat = getPlayer(state, "player");
    seat.mc = 200;
    seat.actionsRemaining = 20;
    return state;
  };

  const state = rig();
  getPlayer(state, "player").hand = ["card-base-mining-rights"];
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-mining-rights"
  });
  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "tile-placement");

  // Only spaces that actually pay a mineral are offered.
  for (const option of played.state.pendingChoice.options) {
    const cell = played.state.board[option.targetCellKey];
    assert.ok(
      (cell.bonusType === "steel" || cell.bonusType === "titanium") && cell.bonusAmount > 0,
      `${option.label} pays a mineral`
    );
  }

  // The production follows whichever bonus the chosen space pays.
  const titanium = played.state.pendingChoice.options.find(
    option => played.state.board[option.targetCellKey]?.bonusType === "titanium"
  );
  assert.ok(titanium, "a titanium space is on offer");
  const settled = resolvePendingChoice(played.state, titanium.id, played.state.logs, "player");
  const after = getPlayer(settled.state, "player");
  assert.equal(after.titaniumProd, 1, "a titanium space raises titanium production");
  assert.equal(after.steelProd, 0, "and not steel");
});

test("two cards collect on every city placed, including the opponent's", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  const rig = () => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
      player.mc = 200;
      player.mcProd = 5;
      player.energyProd = 3;
      player.actionsRemaining = 20;
    }
    return state;
  };

  // Immigrant City pays for its city with production, then collects on it:
  // 5 - 2 + 1.
  const own = rig();
  getPlayer(own, "player").hand = ["card-base-immigrant-city"];
  const played = executeGameCommand(own, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-immigrant-city"
  });
  assert.equal(played.ok, true);
  const settled = resolvePendingChoice(
    played.state, played.state.pendingChoice.options[0].id, played.state.logs, "player"
  );
  const seat = getPlayer(settled.state, "player");
  assert.equal(seat.energyProd, 2, "one energy production is spent");
  assert.equal(seat.mcProd, 4, "two M€ production spent, one paid back by its own city");

  // "When a city tile is placed" -- not "when you place one".
  const theirs = rig();
  getPlayer(theirs, "player").playedProjects = ["card-base-rover-construction"];
  const other = theirs.players.find(player => player.id !== "player");
  other.hand = ["card-base-immigrant-city"];
  theirs.currentPlayerId = other.id;
  const opening = getPlayer(theirs, "player").mc;
  const byOther = executeGameCommand(theirs, {
    type: COMMAND.PLAY_CARD, playerId: other.id, cardId: "card-base-immigrant-city"
  });
  const done = resolvePendingChoice(
    byOther.state, byOther.state.pendingChoice.options[0].id, byOther.state.logs, other.id
  );
  assert.equal(getPlayer(done.state, "player").mc, opening + 2, "the opponent's city still pays");
});

test("Insulation converts as much heat production as the player chooses", async () => {
  const { getPlayer, ALL_CARDS, getCardPlayableStatus, resolvePendingChoice } =
    await import("../app/game-logic.js");

  // "Any number of steps" has no number on the card, so the amounts become the
  // options rather than a fixed effect.
  const rig = heatProd => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
    }
    const seat = getPlayer(state, "player");
    seat.mc = 200;
    seat.heatProd = heatProd;
    seat.mcProd = 1;
    seat.actionsRemaining = 20;
    seat.hand = ["card-base-insulation"];
    return state;
  };

  const card = ALL_CARDS.find(item => item.id === "card-base-insulation");
  assert.equal(
    getCardPlayableStatus(card, rig(0)).playable,
    false,
    "nothing to convert without heat production"
  );

  const state = rig(4);
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-insulation"
  });
  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "amount");
  assert.deepEqual(
    played.state.pendingChoice.options.map(option => option.amount),
    [1, 2, 3, 4],
    "every step the player can afford is offered"
  );

  const three = played.state.pendingChoice.options.find(option => option.amount === 3);
  const settled = resolvePendingChoice(played.state, three.id, played.state.logs, "player");
  const seat = getPlayer(settled.state, "player");
  assert.equal(seat.heatProd, 1, "three steps of heat production are spent");
  assert.equal(seat.mcProd, 4, "and the same three arrive as M€ production");
});

test("Power Infrastructure converts as much energy as the player chooses", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
  }
  const seat = getPlayer(state, "player");
  seat.mc = 10;
  seat.energy = 5;
  seat.actionsRemaining = 20;
  seat.playedProjects = ["card-base-power-infrastructure"];

  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: "card-base-power-infrastructure"
  });
  assert.equal(used.ok, true);
  assert.deepEqual(
    used.state.pendingChoice.options.map(option => option.amount),
    [1, 2, 3, 4, 5],
    "every energy the player holds is on offer"
  );

  const four = used.state.pendingChoice.options.find(option => option.amount === 4);
  const settled = resolvePendingChoice(used.state, four.id, used.state.logs, "player");
  const after = getPlayer(settled.state, "player");
  assert.equal(after.energy, 1);
  assert.equal(after.mc, 14);
  // "Each card action may be used once per generation."
  assert.ok((after.usedCardActions ?? []).includes("card-base-power-infrastructure"));
});

test("Floyd Continuum pays 3 M€ per finished global parameter", async () => {
  const { getPlayer } = await import("../app/game-logic.js");

  const take = setUp => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
    }
    const seat = getPlayer(state, "player");
    seat.mc = 0;
    seat.actionsRemaining = 20;
    seat.playedProjects = ["card-promo-floyd-continuum"];
    setUp(state);
    const used = executeGameCommand(state, {
      type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: "card-promo-floyd-continuum"
    });
    assert.equal(used.ok, true);
    return getPlayer(used.state, "player").mc;
  };

  assert.equal(take(state => {
    state.temperature = -10; state.oxygen = 5; state.oceans = 3; state.venus = 10;
  }), 0, "nothing finished pays nothing, and the action is still legal");

  assert.equal(take(state => {
    state.temperature = 8; state.oxygen = 14; state.oceans = 3; state.venus = 10;
  }), 6, "temperature and oxygen");

  assert.equal(take(state => {
    state.temperature = 8; state.oxygen = 14; state.oceans = 9; state.venus = 30;
  }), 12, "all four, Venus included when the expansion is on");
});

test("Energy Market offers both halves of its action in one list", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  const rig = (mc, energyProd) => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
    }
    const seat = getPlayer(state, "player");
    seat.mc = mc;
    seat.energy = 0;
    seat.energyProd = energyProd;
    seat.actionsRemaining = 20;
    seat.playedProjects = ["card-promo-energy-market"];
    return state;
  };

  const used = executeGameCommand(rig(7, 2), {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: "card-promo-energy-market"
  });
  assert.equal(used.ok, true);

  // "Spend 2X M€ to gain X energy": 7 M€ buys at most three.
  const buying = used.state.pendingChoice.options.filter(option => option.energy);
  assert.deepEqual(buying.map(option => option.energy), [1, 2, 3]);

  const three = resolvePendingChoice(
    used.state, buying[2].id, used.state.logs, "player"
  );
  assert.equal(getPlayer(three.state, "player").mc, 1);
  assert.equal(getPlayer(three.state, "player").energy, 3);

  // "Decrease energy production 1 step to gain 8 M€."
  const selling = used.state.pendingChoice.options.find(option => option.sellProduction);
  const sold = resolvePendingChoice(used.state, selling.id, used.state.logs, "player");
  assert.equal(getPlayer(sold.state, "player").energyProd, 1);
  assert.equal(getPlayer(sold.state, "player").mc, 15);

  // Neither half is affordable, so the action is refused rather than empty.
  const broke = executeGameCommand(rig(1, 0), {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: "card-promo-energy-market"
  });
  assert.equal(broke.ok, false);
});

test("Hi-Tech Lab draws for energy and keeps exactly one card", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.energy = 4;
  seat.hand = [];
  seat.actionsRemaining = 20;
  seat.playedProjects = ["card-promo-hi-tech-lab"];
  const discardedBefore = state.discardPile.length;

  const used = executeGameCommand(state, {
    type: COMMAND.USE_CARD_ACTION, playerId: "player", cardId: "card-promo-hi-tech-lab"
  });
  assert.equal(used.ok, true);
  assert.deepEqual(used.state.pendingChoice.options.map(option => option.amount), [1, 2, 3, 4]);

  const three = used.state.pendingChoice.options.find(option => option.amount === 3);
  const drawn = resolvePendingChoice(used.state, three.id, used.state.logs, "player");
  assert.equal(getPlayer(drawn.state, "player").energy, 1, "three energy is spent");
  assert.equal(drawn.state.pendingChoice?.options.length, 3, "and three cards are on offer");

  // The pick is the card KEPT, not the card discarded.
  const keep = drawn.state.pendingChoice.options[0];
  const settled = resolvePendingChoice(drawn.state, keep.id, drawn.state.logs, "player");
  const after = getPlayer(settled.state, "player");
  assert.deepEqual(after.hand, [keep.cardId], "only the chosen card stays in hand");
  assert.equal(settled.state.discardPile.length, discardedBefore + 2, "the other two are discarded");
});

test("Sponsored Academies discards one, draws three, and pays the opponents", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 3, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.actionsRemaining = 20;
  seat.hand = ["card-venus-sponsored-academies", "card-base-acquired-company", "card-base-asteroid"];
  // A card dealt into hand has to leave the deck, or drawing hands it back.
  state.deck = state.deck.filter(id => !seat.hand.includes(id));

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-venus-sponsored-academies"
  });
  assert.equal(played.ok, true);
  assert.equal(played.state.pendingChoice?.kind, "discard-card");

  const discard = played.state.pendingChoice.options[0];
  const settled = resolvePendingChoice(played.state, discard.id, played.state.logs, "player");

  // Three in hand, one played, one discarded, three drawn.
  const after = getPlayer(settled.state, "player");
  assert.equal(after.hand.length, 4);
  assert.ok(!after.hand.includes(discard.cardId), "the discarded card is gone");

  // "All opponents draw 1", and they keep what they draw.
  for (const player of settled.state.players) {
    if (player.id === "player") continue;
    assert.equal(player.hand.length, 1, `${player.id} drew one`);
  }
});

test("Recruitment swaps a neutral delegate for one of the player's own", async () => {
  const { getPlayer, ALL_CARDS, getCardPlayableStatus, resolvePendingChoice } =
    await import("../app/game-logic.js");
  const { countDelegates, NEUTRAL } = await import("../app/turmoil.js");

  const rig = setUp => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
      player.hand = [];
    }
    const seat = getPlayer(state, "player");
    seat.mc = 200;
    seat.actionsRemaining = 20;
    seat.hand = ["card-turmoil-recruitment"];
    state.deck = state.deck.filter(id => id !== "card-turmoil-recruitment");
    for (const id of Object.keys(state.turmoil.parties)) {
      state.turmoil.parties[id].delegates = [];
      state.turmoil.parties[id].leader = null;
    }
    state.turmoil.delegateReserve.player = 3;
    setUp(state);
    return state;
  };

  const card = ALL_CARDS.find(item => item.id === "card-turmoil-recruitment");

  // A party's leader seat does not move, so a lone neutral leader is not
  // swappable and the card has no legal target.
  const lone = rig(state => {
    state.turmoil.parties.greens.delegates = [NEUTRAL];
    state.turmoil.parties.greens.leader = NEUTRAL;
  });
  assert.equal(getCardPlayableStatus(card, lone).playable, false);

  const state = rig(inner => {
    inner.turmoil.parties.greens.delegates = [NEUTRAL, NEUTRAL];
    inner.turmoil.parties.greens.leader = NEUTRAL;
  });
  const opening = getPlayer(state, "player").mc;
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-turmoil-recruitment"
  });
  assert.equal(played.state.pendingChoice?.kind, "turmoil-recruitment");

  const settled = resolvePendingChoice(
    played.state, played.state.pendingChoice.options[0].id, played.state.logs, "player"
  );
  const greens = settled.state.turmoil.parties.greens;
  assert.equal(greens.delegates.length, 2, "the party is the same size");
  assert.equal(countDelegates(settled.state.turmoil, "greens", "player"), 1, "one of them is now mine");
  assert.equal(settled.state.turmoil.delegateReserve.player, 2, "taken from my reserve");

  // This is not lobbying: sendDelegateToParty would have charged 5 M€.
  assert.equal(getPlayer(settled.state, "player").mc, opening - card.cost);
});

test("Vote Of No Confidence takes the chairman's seat, untaxed", async () => {
  const { getPlayer, ALL_CARDS, getCardPlayableStatus } = await import("../app/game-logic.js");
  const { NEUTRAL } = await import("../app/turmoil.js");

  const rig = setUp => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
      player.hand = [];
    }
    const seat = getPlayer(state, "player");
    seat.mc = 200;
    seat.actionsRemaining = 20;
    seat.hand = ["card-turmoil-vote-of-no-confidence"];
    state.deck = state.deck.filter(id => id !== "card-turmoil-vote-of-no-confidence");
    for (const id of Object.keys(state.turmoil.parties)) {
      state.turmoil.parties[id].delegates = [];
      state.turmoil.parties[id].leader = null;
    }
    // The card requires being a party leader somewhere.
    state.turmoil.parties.greens.delegates = ["player"];
    state.turmoil.parties.greens.leader = "player";
    state.turmoil.delegateReserve.player = 2;
    state.turmoil.chairman = NEUTRAL;
    setUp(state);
    return state;
  };

  const card = ALL_CARDS.find(item => item.id === "card-turmoil-vote-of-no-confidence");
  assert.equal(getCardPlayableStatus(card, rig(state => {
    state.turmoil.chairman = "player2";
  })).playable, false, "only a neutral chairman can be unseated");
  assert.equal(getCardPlayableStatus(card, rig(state => {
    state.turmoil.delegateReserve.player = 0;
  })).playable, false, "and only with a delegate to seat");

  const state = rig(() => {});
  const neutralBefore = state.turmoil.delegateReserve[NEUTRAL];
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id
  });
  assert.equal(played.ok, true);
  assert.equal(played.state.turmoil.chairman, "player");
  assert.equal(getPlayer(played.state, "player").tr, 21);
  assert.equal(played.state.turmoil.delegateReserve[NEUTRAL], neutralBefore + 1);
  assert.equal(played.state.turmoil.delegateReserve.player, 1);
  // The delegate comes from the reserve straight to the seat.
  assert.deepEqual(played.state.turmoil.parties.greens.delegates, ["player"]);

  // The chairman's rating is not terraforming the player chose to do, so the
  // Reds levy does not reach it: the only cost is the card.
  const reds = rig(inner => {
    inner.turmoil.rulingParty = "reds";
    inner.turmoil.dominantParty = "reds";
  });
  const opening = getPlayer(reds, "player").mc;
  const underReds = executeGameCommand(reds, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id
  });
  assert.equal(getPlayer(underReds.state, "player").mc, opening - card.cost);
});

test("Red Tourism Wave pays for empty areas beside the player's own tiles", async () => {
  const { getPlayer, ALL_CARDS, getAdjacentCells } = await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.actionsRemaining = 20;
  seat.hand = ["card-turmoil-red-tourism-wave"];
  state.deck = state.deck.filter(id => id !== "card-turmoil-red-tourism-wave");
  state.turmoil.rulingParty = "reds";
  state.turmoil.dominantParty = "reds";

  // Two adjacent tiles of the player's own, so at least one empty area touches
  // both -- and must still be counted once.
  const first = Object.keys(state.board).find(
    key => !state.board[key].isOceanOnly && !state.board[key].reservedFor
  );
  const anchor = state.board[first];
  const second = getAdjacentCells(anchor.q, anchor.r)
    .map(pos => `${pos.q},${pos.r}`)
    .find(key => state.board[key] && !state.board[key].reservedFor);
  state.board[first] = { ...anchor, tileType: "city", placedBy: "player" };
  state.board[second] = { ...state.board[second], tileType: "forest", placedBy: "player" };

  const owned = new Set([first, second]);
  const expected = Object.values(state.board).filter(cell =>
    cell.tileType === "empty" &&
    !cell.reservedFor &&
    getAdjacentCells(cell.q, cell.r).some(pos => owned.has(`${pos.q},${pos.r}`))
  ).length;
  assert.ok(expected > 0, "the fixture leaves some empty neighbours");

  const card = ALL_CARDS.find(item => item.id === "card-turmoil-red-tourism-wave");
  const opening = getPlayer(state, "player").mc;
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: card.id
  });
  assert.equal(played.ok, true);
  assert.equal(getPlayer(played.state, "player").mc, opening - card.cost + expected);
  // The areas are counted, not built on.
  assert.equal(
    Object.values(played.state.board).filter(cell => cell.tileType !== "empty").length,
    2
  );
});

test("Industrial Complex lifts every production below 1 up to 1", async () => {
  const { applyCorporation, applyPreludes, advanceSetupTurn, getPlayer } =
    await import("../app/game-logic.js");

  let state = getInitialState({
    playerCount: 2, prelude: true, venus: true, colonies: true, promo: true, seed: 3
  });
  const ids = state.players.map(player => player.id);
  for (const id of ids) {
    state.currentPlayerId = id;
    state = applyCorporation(state, getPlayer(state, id).corporationOptions[0], id);
  }
  state = advanceSetupTurn(state);

  const seat = getPlayer(state, ids[0]);
  seat.preludeOptions = ["card-prelude2-industrial-complex", seat.preludeOptions[0]];
  seat.mc = 50;
  seat.mcProd = -2;
  seat.steelProd = 0;
  seat.titaniumProd = 3;
  seat.plantsProd = -1;
  seat.energyProd = 0;
  seat.heatProd = 5;
  state.currentPlayerId = ids[0];

  const before = getPlayer(state, ids[0]).mc;
  state = applyPreludes(state, seat.preludeOptions.slice(0, 2), ids[0]);
  const after = getPlayer(state, ids[0]);

  // Anything under 1 comes up to 1, however far below it started.
  assert.equal(after.mcProd, 1);
  assert.equal(after.steelProd, 1);
  assert.equal(after.plantsProd, 1);
  assert.equal(after.energyProd, 1);
  // Anything already at 1 or above is left alone.
  assert.equal(after.titaniumProd, 3);
  assert.equal(after.heatProd, 5);
  assert.ok(after.mc <= before - 18, "and it costs 18 M€");
});

test("Cutting Edge Technology discounts only cards that have a requirement", async () => {
  const { getPlayer, ALL_CARDS, getCardPaymentCost } = await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
  }
  getPlayer(state, "player").mc = 300;

  const gated = ALL_CARDS.find(card => (card.requirements ?? []).length > 0 && card.cost >= 10);
  const open = ALL_CARDS.find(card =>
    (card.requirements ?? []).length === 0 &&
    Object.keys(card.requires ?? {}).length === 0 &&
    card.cost >= 10
  );
  const before = [getCardPaymentCost(gated, state), getCardPaymentCost(open, state)];

  getPlayer(state, "player").playedProjects = ["card-promo-cutting-edge-technology"];
  assert.equal(getCardPaymentCost(gated, state), before[0] - 2, `${gated.name} is 2 cheaper`);
  assert.equal(getCardPaymentCost(open, state), before[1], `${open.name} is not`);
});

test("Productive Outpost collects a bonus for every colony held", async () => {
  const { getPlayer } = await import("../app/game-logic.js");
  const { getColonyTile } = await import("../app/colony-tiles.js");

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.actionsRemaining = 20;
  seat.hand = ["card-colonies-productive-outpost"];
  state.deck = state.deck.filter(id => id !== "card-colonies-productive-outpost");

  // Plain resource bonuses keep the arithmetic readable, and two colonies on
  // one tile should pay that tile's bonus twice.
  const tiles = Object.values(state.colonies.tiles).filter(
    tile => getColonyTile(tile.id)?.colony?.type === "GAIN_RESOURCES"
  );
  assert.ok(tiles.length >= 2, "the fixture has two resource colonies");
  tiles[0].colonies = ["player", "player"];
  tiles[1].colonies = ["player2", "player"];

  const owed = {};
  for (const [tile, count] of [[tiles[0], 2], [tiles[1], 1]]) {
    const bonus = getColonyTile(tile.id).colony;
    owed[bonus.resource] = (owed[bonus.resource] ?? 0) + (bonus.quantity ?? 1) * count;
  }

  const before = { ...getPlayer(state, "player") };
  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-colonies-productive-outpost"
  });
  assert.equal(played.ok, true);
  const after = getPlayer(played.state, "player");
  for (const [resource, amount] of Object.entries(owed)) {
    assert.equal(after[resource], (before[resource] ?? 0) + amount, `${resource} paid per colony`);
  }
});

test("Market Manipulation raises one colony track and lowers another", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.actionsRemaining = 20;
  seat.hand = ["card-colonies-market-manipulation"];
  state.deck = state.deck.filter(id => id !== "card-colonies-market-manipulation");

  const before = Object.fromEntries(
    Object.values(state.colonies.tiles).map(tile => [tile.id, tile.trackPosition])
  );

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-colonies-market-manipulation"
  });
  assert.equal(played.state.pendingChoice?.kind, "colony-track");
  assert.equal(played.state.pendingChoice.continuation.direction, "up");

  const raised = played.state.pendingChoice.options[0];
  const asked = resolvePendingChoice(played.state, raised.id, played.state.logs, "player");
  assert.equal(asked.state.pendingChoice.continuation.direction, "down");
  // "another colony tile": the one just raised is not on offer.
  assert.ok(
    !asked.state.pendingChoice.options.some(option => option.targetTileId === raised.targetTileId)
  );

  const lowered = asked.state.pendingChoice.options[0];
  const settled = resolvePendingChoice(asked.state, lowered.id, asked.state.logs, "player");
  assert.equal(settled.state.pendingChoice, null);

  const tiles = settled.state.colonies.tiles;
  assert.equal(tiles[raised.targetTileId].trackPosition, before[raised.targetTileId] + 1);
  assert.equal(tiles[lowered.targetTileId].trackPosition, before[lowered.targetTileId] - 1);
});

test("Public Plans pays for revealed cards without spending them", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.actionsRemaining = 20;
  seat.hand = [
    "card-promo-public-plans", "card-base-asteroid", "card-base-comet", "card-base-acquired-company"
  ];
  state.deck = state.deck.filter(id => !seat.hand.includes(id));

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-promo-public-plans"
  });
  assert.equal(played.state.pendingChoice?.kind, "amount");
  // The other three cards, and revealing none is allowed.
  assert.deepEqual(played.state.pendingChoice.options.map(option => option.amount), [0, 1, 2, 3]);

  const before = getPlayer(played.state, "player");
  const three = played.state.pendingChoice.options.find(option => option.amount === 3);
  const settled = resolvePendingChoice(played.state, three.id, played.state.logs, "player");
  const after = getPlayer(settled.state, "player");

  assert.equal(after.mc, before.mc + 3, "1 M€ per card revealed");
  assert.equal(after.hand.length, before.hand.length, "revealing is not discarding");
});

test("Astra Mechanica returns up to two events, and not tile-building ones", async () => {
  const { getPlayer, resolvePendingChoice, DECLINE_CHOICE } = await import("../app/game-logic.js");

  const rig = () => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
      player.hand = [];
    }
    const seat = getPlayer(state, "player");
    seat.mc = 100;
    seat.actionsRemaining = 20;
    seat.hand = ["card-promo-astra-mechanica"];
    seat.playedEvents = ["card-base-asteroid", "card-base-comet", "card-base-big-asteroid"];
    // Taking back a card that built a tile would leave the tile with nothing
    // behind it, so it is not on offer.
    seat.cardPlacements = { "card-base-comet": "1,1" };
    state.deck = state.deck.filter(id => id !== "card-promo-astra-mechanica");
    return state;
  };

  const played = executeGameCommand(rig(), {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-promo-astra-mechanica"
  });
  assert.equal(played.state.pendingChoice?.kind, "astra-mechanica");
  assert.deepEqual(
    played.state.pendingChoice.options.map(option => option.cardId),
    ["card-base-asteroid", "card-base-big-asteroid"]
  );

  const first = resolvePendingChoice(
    played.state, played.state.pendingChoice.options[0].id, played.state.logs, "player"
  );
  const second = resolvePendingChoice(
    first.state, first.state.pendingChoice.options[0].id, first.state.logs, "player"
  );
  const after = getPlayer(second.state, "player");
  assert.equal(second.state.pendingChoice, null, "two is the cap");
  assert.deepEqual(after.hand, ["card-base-asteroid", "card-base-big-asteroid"]);
  assert.deepEqual(after.playedEvents, ["card-base-comet"]);

  // "Up to 2": stopping after one is allowed.
  const stopped = resolvePendingChoice(first.state, DECLINE_CHOICE, first.state.logs, "player");
  assert.equal(stopped.state.pendingChoice, null);
  assert.equal(getPlayer(stopped.state, "player").hand.length, 1);
});

test("Frontier Town takes the space's printed bonus three times", async () => {
  const { getPlayer, resolvePendingChoice } = await import("../app/game-logic.js");

  // Mars First's own policy pays 1 steel per tile placed, which is a separate
  // payout from the space's printed bonus. Ruling with a different party keeps
  // the arithmetic to the bonus this card multiplies. The requirement is still
  // met by holding two delegates in Mars First.
  const rig = card => {
    const state = getInitialState({
      playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
    });
    state.phase = "action";
    state.currentPlayerId = "player";
    for (const player of state.players) {
      player.setupStep = "complete";
      player.corporationId = null;
      player.hand = [];
    }
    const seat = getPlayer(state, "player");
    seat.mc = 100;
    seat.mcProd = 5;
    seat.energyProd = 3;
    seat.actionsRemaining = 20;
    seat.hand = [card];
    state.deck = state.deck.filter(id => id !== card);
    state.turmoil.rulingParty = "greens";
    state.turmoil.dominantParty = "greens";
    state.turmoil.parties.mars.delegates = ["player", "player"];
    state.turmoil.parties.mars.leader = "player";
    return state;
  };

  const place = (state, cardId, pick) => {
    const played = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD, playerId: "player", cardId
    });
    assert.equal(played.ok, true, `${cardId} was refused`);
    const option = pick(played.state);
    assert.ok(option, "the fixture space is on offer");
    const before = getPlayer(played.state, "player");
    const settled = resolvePendingChoice(played.state, option.id, played.state.logs, "player");
    return { before, after: getPlayer(settled.state, "player"), option };
  };

  const steelSpace = state =>
    state.pendingChoice.options.find(option => {
      const cell = state.board[option.targetCellKey];
      return cell?.bonusType === "steel" && cell.bonusAmount === 2;
    });

  const town = place(rig("card-prelude2-frontier-town"), "card-prelude2-frontier-town", steelSpace);
  assert.equal(town.after.steel, town.before.steel + 6, "two steel, three times over");
  assert.equal(town.after.energyProd, 2, "and it costs an energy production");

  // The same space through a card with no multiplier pays it once.
  const plain = place(rig("card-base-immigrant-city"), "card-base-immigrant-city", state =>
    state.pendingChoice.options.find(option => option.targetCellKey === town.option.targetCellKey)
  );
  assert.equal(plain.after.steel, plain.before.steel + 2);
});

test("Terraforming Deal pays 2 M€ for each rating step its owner earns", async () => {
  const { getPlayer, increaseTerraformRating, cloneGameState } =
    await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 2, prelude: true, venus: true, colonies: true, promo: true, seed: 5
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.selectedPreludeIds = ["card-prelude2-terraforming-deal"];

  const own = cloneGameState(state);
  increaseTerraformRating(own, "player", 3, "card");
  assert.equal(getPlayer(own, "player").mc, 106, "2 M€ per step");

  // "When YOU raise your TR": the opponent's terraforming pays nothing.
  const theirs = cloneGameState(state);
  increaseTerraformRating(theirs, "player2", 3, "card");
  assert.equal(getPlayer(theirs, "player").mc, 100);

  // The chairman's rating is not terraforming the player did, and the reference
  // excludes the ratings handed out outside the action phase.
  const office = cloneGameState(state);
  increaseTerraformRating(office, "player", 2, "chairman");
  assert.equal(getPlayer(office, "player").mc, 100);
});

test("Land Claim reserves a space for the player who claimed it", async () => {
  const { getPlayer, resolvePendingChoice, legalCellsFor } = await import("../app/game-logic.js");

  const state = getInitialState({
    playerCount: 2, venus: true, colonies: true, turmoil: true, promo: true, seed: 3
  });
  state.phase = "action";
  state.currentPlayerId = "player";
  for (const player of state.players) {
    player.setupStep = "complete";
    player.corporationId = null;
    player.hand = [];
  }
  const seat = getPlayer(state, "player");
  seat.mc = 100;
  seat.actionsRemaining = 20;
  seat.hand = ["card-base-land-claim"];
  state.deck = state.deck.filter(id => id !== "card-base-land-claim");

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: "card-base-land-claim"
  });
  assert.equal(played.state.pendingChoice?.kind, "land-claim");

  const claim = played.state.pendingChoice.options[0];
  const settled = resolvePendingChoice(played.state, claim.id, played.state.logs, "player");

  const holds = playerId =>
    legalCellsFor(settled.state, "city", playerId)
      .some(cell => `${cell.q},${cell.r}` === claim.targetCellKey);

  assert.equal(holds("player"), true, "the claimer may still build there");
  assert.equal(holds("player2"), false, "nobody else may");
});
