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
  assert.equal(take({ playerCount: 1 }), 2, "two neutral cities are already standing");
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
  assert.equal(airRaid.options.length, 1);
  const raided = resolvePendingChoice(
    airRaid.state, airRaid.options[0].id, airRaid.state.logs, "player"
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
