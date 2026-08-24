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
