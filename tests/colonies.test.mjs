import assert from "node:assert/strict";
import test from "node:test";
import {
  getInitialState,
  buildColonyOn,
  tradeWith,
  triggerProduction,
  availableFleets,
  countColonies,
  getCardPlayableStatus,
  COLONY_TILES
} from "../app/game-logic.js";
import { getColonyTile } from "../app/colony-tiles.js";
import { MAX_COLONIES_PER_TILE, STARTING_FLEET_SIZE } from "../app/colonies.js";

test("All twelve colony tiles carry a seven-step trade track", () => {
  assert.equal(COLONY_TILES.length, 12);
  for (const tile of COLONY_TILES) {
    const steps = tile.trade.quantity ?? tile.trade.resourceTrack;
    assert.ok(Array.isArray(steps), `${tile.id} has a track`);
    assert.equal(steps.length, 7, `${tile.id} has seven steps`);
    assert.ok(tile.build, `${tile.id} has a build bonus`);
    assert.ok(tile.colony, `${tile.id} has a colony bonus`);
  }
});

test("Known tiles match the printed values", () => {
  assert.deepEqual(getColonyTile("luna").trade.quantity, [1, 2, 4, 7, 10, 13, 17]);
  assert.deepEqual(getColonyTile("ceres").trade.quantity, [1, 2, 3, 4, 6, 8, 10]);
  // Europa's track grants a production type per step rather than an amount.
  assert.deepEqual(getColonyTile("europa").trade.resourceTrack, [
    "mc",
    "mc",
    "energy",
    "energy",
    "plants",
    "plants",
    "plants"
  ]);
  assert.equal(getColonyTile("europa").build.type, "PLACE_OCEAN_TILE");
});

test("Colonies is off unless requested", () => {
  assert.equal(getInitialState({ playerCount: 3 }).colonies, null);
});

test("The number of tiles in play follows the player count", () => {
  assert.equal(getInitialState({ playerCount: 2, colonies: true }).colonies.tilesInPlay.length, 5);
  assert.equal(getInitialState({ playerCount: 4, colonies: true }).colonies.tilesInPlay.length, 6);
  assert.equal(getInitialState({ playerCount: 5, colonies: true }).colonies.tilesInPlay.length, 7);
});

test("Every player starts with one trade fleet", () => {
  const state = getInitialState({ playerCount: 3, colonies: true });
  for (const id of state.turnOrder) {
    assert.equal(availableFleets(state.colonies, id), STARTING_FLEET_SIZE);
  }
});

test("Building a colony pays the build bonus and raises the track", () => {
  // Tiles in play are drawn at random, so seat a known resource-granting tile.
  const state = getInitialState({ playerCount: 2, colonies: true });
  const tileId = "ceres";
  state.colonies.tilesInPlay = [tileId];
  state.colonies.tiles = { [tileId]: { id: tileId, trackPosition: 1, colonies: [] } };

  const tile = getColonyTile(tileId);
  // Ceres grants steel production when colonised.
  assert.equal(tile.build.type, "GAIN_PRODUCTION");
  assert.equal(tile.build.resource, "steel");

  const before = state.players[0].steelProd;
  const result = buildColonyOn(state, tileId, state.logs, "player");

  assert.equal(result.built, true);
  assert.deepEqual(result.state.colonies.tiles[tileId].colonies, ["player"]);
  assert.ok(
    result.state.players[0].steelProd > before,
    "the builder collects the build bonus"
  );
});

test("A player may not colonise the same tile twice", () => {
  const state = getInitialState({ playerCount: 2, colonies: true });
  const tileId = state.colonies.tilesInPlay[0];

  const first = buildColonyOn(state, tileId, state.logs, "player");
  const second = buildColonyOn(first.state, tileId, first.logs, "player");

  assert.equal(second.built, false);
  assert.equal(second.state.colonies.tiles[tileId].colonies.length, 1);
});

test("A tile holds at most three colonies", () => {
  let state = getInitialState({ playerCount: 5, colonies: true });
  const tileId = state.colonies.tilesInPlay[0];

  for (const id of ["player", "player2", "player3"]) {
    state = buildColonyOn(state, tileId, state.logs, id).state;
  }
  assert.equal(state.colonies.tiles[tileId].colonies.length, MAX_COLONIES_PER_TILE);

  const overflow = buildColonyOn(state, tileId, state.logs, "player4");
  assert.equal(overflow.built, false, "a full tile refuses another colony");
});

test("Trading pays the trader and every colony owner", () => {
  let state = getInitialState({ playerCount: 3, colonies: true });
  // Ceres pays steel for both trading and the colony bonus, so one resource
  // shows both payouts.
  const tileId = "ceres";
  state.colonies.tilesInPlay = [tileId];
  state.colonies.tiles = { [tileId]: { id: tileId, trackPosition: 1, colonies: [] } };
  const tile = getColonyTile(tileId);
  const resource = tile.trade.resource;
  assert.equal(tile.colony.resource, resource);

  state = buildColonyOn(state, tileId, state.logs, "player").state;
  state = buildColonyOn(state, tileId, state.logs, "player2").state;

  const before = state.players.map(player => player[resource]);
  const result = tradeWith(state, tileId, state.logs, "player3");

  assert.equal(result.traded, true);
  assert.ok(result.state.players[2][resource] > before[2], "the trader collects the trade benefit");
  assert.ok(result.state.players[0][resource] > before[0], "colony owners collect their bonus");
  assert.ok(result.state.players[1][resource] > before[1]);
});

test("Trading consumes a fleet and closes the tile for the generation", () => {
  let state = getInitialState({ playerCount: 2, colonies: true });
  const tileId = state.colonies.tilesInPlay[0];

  const traded = tradeWith(state, tileId, state.logs, "player");
  assert.equal(traded.traded, true);
  assert.equal(availableFleets(traded.state.colonies, "player"), 0);

  const again = tradeWith(traded.state, tileId, traded.logs, "player2");
  assert.equal(again.traded, false, "the tile is spent for this generation");

  const noFleet = tradeWith(traded.state, traded.state.colonies.tilesInPlay[1], traded.logs, "player");
  assert.equal(noFleet.traded, false, "the player has no fleet left");
});

test("The trade track resets to the number of colonies present", () => {
  let state = getInitialState({ playerCount: 3, colonies: true });
  const tileId = state.colonies.tilesInPlay[0];

  state = buildColonyOn(state, tileId, state.logs, "player").state;
  state = buildColonyOn(state, tileId, state.logs, "player2").state;
  assert.equal(state.colonies.tiles[tileId].trackPosition, 2);

  const traded = tradeWith(state, tileId, state.logs, "player3");
  assert.equal(
    traded.state.colonies.tiles[tileId].trackPosition,
    2,
    "the marker never drops below the colonies on the tile"
  );
});

test("Fleets return at the end of the generation", () => {
  const state = getInitialState({ playerCount: 2, colonies: true });
  const traded = tradeWith(state, state.colonies.tilesInPlay[0], state.logs, "player");
  assert.equal(availableFleets(traded.state.colonies, "player"), 0);

  const produced = triggerProduction(traded.state, traded.logs);

  assert.equal(availableFleets(produced.colonies, "player"), STARTING_FLEET_SIZE);
  assert.equal(
    produced.colonies.tiles[state.colonies.tilesInPlay[0]].tradedThisGeneration,
    false,
    "tiles reopen for trade"
  );
});

test("Colony requirements read live state", () => {
  let state = getInitialState({ playerCount: 2, colonies: true });
  const card = {
    id: "colony-req",
    name: "Test",
    cost: 1,
    tags: [],
    requirements: [{ colonies: true, count: 1 }]
  };

  assert.equal(getCardPlayableStatus(card, state).playable, false);

  state = buildColonyOn(state, state.colonies.tilesInPlay[0], state.logs, "player").state;
  assert.equal(countColonies(state.colonies, "player"), 1);
  assert.equal(getCardPlayableStatus(card, state).playable, true);
});

test("trading and building colonies cost what the rulebook says", async () => {
  const {
    getInitialState, applyCorporation, completeSetupPurchase, cloneGameState,
    getPlayer, tradeWith, buildColonyOn, tradePaymentOptions, TRADE_COST, COLONY_BUILD_COST
  } = await import("../app/game-logic.js");

  // Colonies rulebook: "Pay the cost: 9 M€, or 3 energy, or 3 titanium".
  assert.deepEqual(TRADE_COST, { mc: 9, energy: 3, titanium: 3 });
  assert.equal(COLONY_BUILD_COST, 17);

  function table(overrides) {
    let state = getInitialState({ playerCount: 2, colonies: true });
    for (const player of state.players) {
      state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
    }
    let guard = 0;
    while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
    state = cloneGameState(state);
    state.phase = "action";
    state.players = state.players.map(player => ({ ...player, ...overrides }));
    return state;
  }

  // Colony tiles are drawn at random each game, so the tile has to come from
  // the same state it is used against.
  function seed(overrides) {
    const state = table(overrides);
    return { state, tile: Object.keys(state.colonies.tiles)[0] };
  }

  const mcRun = seed({ mc: 40, energy: 0, titanium: 0 });
  const paidMc = tradeWith(mcRun.state, mcRun.tile, [], "player");
  assert.equal(paidMc.traded, true);
  assert.equal(paidMc.state.players[0].mc, 31, "trading costs 9 M€");

  // Energy and titanium are spent ahead of megacredits when available.
  const energyRun = seed({ mc: 40, energy: 5, titanium: 0 });
  const paidEnergy = tradeWith(energyRun.state, energyRun.tile, [], "player");
  assert.equal(paidEnergy.state.players[0].energy, 2);
  assert.equal(paidEnergy.state.players[0].mc, 40);

  const brokeRun = seed({ mc: 2, energy: 0, titanium: 0 });
  const broke = tradeWith(brokeRun.state, brokeRun.tile, [], "player");
  assert.equal(broke.traded, false, "a player who cannot pay cannot trade");

  // Cryo-Sleep reduces the cost by one resource of whichever kind is paid.
  const discountRun = seed({ mc: 40, energy: 0, titanium: 0, playedProjects: ["card-colonies-cryo-sleep"] });
  assert.deepEqual(tradePaymentOptions(discountRun.state, "player"), [{ resource: "mc", cost: 8 }]);
  assert.equal(tradeWith(discountRun.state, discountRun.tile, [], "player").state.players[0].mc, 32);

  const buildRun = seed({ mc: 40 });
  const built = buildColonyOn(buildRun.state, buildRun.tile, [], "player");
  assert.equal(built.built, true);
  assert.equal(built.state.players[0].mc, 23, "building a colony costs 17 M€");

  const poorRun = seed({ mc: 10 });
  assert.equal(buildColonyOn(poorRun.state, poorRun.tile, [], "player").built, false);
});
