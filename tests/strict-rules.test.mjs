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
  const tile = colonies.tilesInPlay[0];
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
  const { runTurmoilPhase, getPlayer } = await import("../app/game-logic.js");
  const after = tr => {
    const state = getInitialState({ playerCount: 1, turmoil: true });
    state.turmoil.rulingParty = "reds";
    state.turmoil.rulingPolicyId = null;
    getPlayer(state, "player").tr = tr;
    const out = runTurmoilPhase(state, state.logs);
    return getPlayer(out.state ?? out, "player").tr;
  };
  // Turmoil takes 1 TR from everyone; the Reds bonus gives it back below 20.
  assert.equal(after(20), 19, "at the threshold the bonus applies");
  assert.equal(after(21), 20, "above it only the -1 lands");
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
