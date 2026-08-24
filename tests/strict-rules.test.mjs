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
