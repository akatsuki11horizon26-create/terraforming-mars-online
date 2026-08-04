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
    getPlayer, tradeWith, buildColonyOn, tradePaymentOptions, TRADE_COST, COLONY_BUILD_COST,
    getColonyTile
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
  // Colony tiles are drawn at random, and some pay their trade income in M€ —
  // Luna gives 2, which would net against the 9 M€ the trade costs. Pick a tile
  // whose income is something else so the payment is the only thing measured.
  function seed(overrides) {
    const state = table(overrides);
    const tile = Object.keys(state.colonies.tiles).find(id => {
      const definition = getColonyTile(id);
      // Luna pays its trade income in M€, which would net against the cost.
      return definition?.trade?.resource !== "mc";
    }) ?? Object.keys(state.colonies.tiles)[0];
    return { state, tile };
  }

  // Colony tiles pay their trade income in different currencies, and some pay
  // in M€, so compare against the same tile traded for free rather than a fixed
  // number. Only the payment is under test here.
  const mcRun = seed({ mc: 40, energy: 0, titanium: 0 });
  const paidMc = tradeWith(mcRun.state, mcRun.tile, [], "player");
  assert.equal(paidMc.traded, true);

  const freeRun = seed({ mc: 40, energy: 3, titanium: 0 });
  const paidEnergyInstead = tradeWith(freeRun.state, freeRun.tile, [], "player");
  assert.equal(
    paidMc.state.players[0].mc,
    paidEnergyInstead.state.players[0].mc - 9,
    "paying with megacredits costs exactly 9 more than not paying with them"
  );

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

test("every card's effect is implemented", async () => {
  const { ALL_CARDS, getCardEffect } = await import("../app/game-logic.js");

  // A card whose spec lands in `unsupported` is silently inert: it can be
  // played, costs its money, and does nothing. There must be none.
  const gaps = ALL_CARDS.filter(card => {
    const effect = getCardEffect(card);
    return [...(effect.unsupported ?? []), ...(effect.action?.unsupported ?? [])].length > 0;
  });

  assert.deepEqual(gaps.map(card => card.id), [], "cards with unimplemented effects");
});

test("Turmoil and Colonies card effects reach the game state", async () => {
  const {
    getInitialState, applyCorporation, completeSetupPurchase, cloneGameState,
    getPlayer, applyCardEffect, availableFleets, ALL_CARDS
  } = await import("../app/game-logic.js");

  function table(options) {
    let state = getInitialState({ playerCount: 2, ...options });
    for (const player of state.players) {
      state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
    }
    let guard = 0;
    while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
    state = cloneGameState(state);
    state.phase = "action";
    state.players = state.players.map(player => ({ ...player, mc: 60 }));
    return state;
  }

  const analysts = ALL_CARDS.find(card => card.id === "card-turmoil-event-analysts");
  const withBonus = applyCardEffect(table({ turmoil: true }), analysts, []).state;
  assert.equal(withBonus.turmoil.playersInfluenceBonus.player, 1, "influence bonus is recorded");

  const envoys = ALL_CARDS.find(card => card.id === "card-prelude2-envoys-from-venus");
  const sent = applyCardEffect(table({ turmoil: true }), envoys, []).state;
  const ruling = sent.turmoil.parties[sent.turmoil.dominantParty];
  assert.equal(ruling.delegates.filter(id => id === "player").length, 2, "two delegates are sent");

  const port = ALL_CARDS.find(card => card.id === "card-colonies-space-port");
  const before = table({ colonies: true });
  const after = applyCardEffect(before, port, []).state;
  assert.equal(
    availableFleets(after.colonies, "player"),
    availableFleets(before.colonies, "player") + 1,
    "the card grants an extra trade fleet"
  );
});
