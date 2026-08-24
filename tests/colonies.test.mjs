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

// Titan, Enceladus and Miranda stay off the track until a card that can hold
// their resource is played, so a test that just wants "a colony" has to ask for
// one that is actually usable -- tilesInPlay[0] is shuffled.
function activeTile(colonies) {
  const id = colonies.tilesInPlay.find(tile => colonies.tiles[tile]?.active !== false);
  if (!id) throw new Error("no active colony tile in play");
  return id;
}


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
  const tileId = activeTile(state.colonies);

  const first = buildColonyOn(state, tileId, state.logs, "player");
  const second = buildColonyOn(first.state, tileId, first.logs, "player");

  assert.equal(second.built, false);
  assert.equal(second.state.colonies.tiles[tileId].colonies.length, 1);
});

test("A tile holds at most three colonies", () => {
  let state = getInitialState({ playerCount: 5, colonies: true });
  const tileId = activeTile(state.colonies);

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
  const tileId = activeTile(state.colonies);

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
  const tileId = activeTile(state.colonies);

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
  const traded = tradeWith(state, activeTile(state.colonies), state.logs, "player");
  assert.equal(availableFleets(traded.state.colonies, "player"), 0);

  const produced = triggerProduction(traded.state, traded.logs);

  assert.equal(availableFleets(produced.colonies, "player"), STARTING_FLEET_SIZE);
  assert.equal(
    produced.colonies.tiles[activeTile(state.colonies)].tradedThisGeneration,
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

  state = buildColonyOn(state, activeTile(state.colonies), state.logs, "player").state;
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

  // Colony tiles are drawn at random, and each seed() call deals a fresh game,
  // so two runs need not share a tile. Build one game and fork it, which keeps
  // every comparison on the same tile paying the same income.
  const base = table({});
  const tile = activeTile(base.colonies);
  function fork(overrides) {
    const state = cloneGameState(base);
    state.players = state.players.map(player => ({ ...player, ...overrides }));
    return state;
  }

  const paidMc = tradeWith(fork({ mc: 40, energy: 0, titanium: 0 }), tile, [], "player");
  assert.equal(paidMc.traded, true);

  // Energy is spent ahead of megacredits, so this run pays nothing in M€ and
  // the difference between the two is exactly the megacredit price.
  const paidEnergy = tradeWith(fork({ mc: 40, energy: 5, titanium: 0 }), tile, [], "player");

  // Some tiles pay energy as trade income -- Callisto pays 2 -- so the closing
  // balance is not the price. Two runs differing only in starting energy share
  // that income, and the gap between them is what the trade actually charged.
  const spareEnergy = tradeWith(fork({ mc: 40, energy: 9, titanium: 0 }), tile, [], "player");
  assert.equal(
    spareEnergy.state.players[0].energy - paidEnergy.state.players[0].energy,
    4,
    "both runs paid the same 3 energy, so only the 4 extra remains"
  );
  assert.equal(
    paidMc.state.players[0].mc,
    paidEnergy.state.players[0].mc - 9,
    "paying in megacredits costs 9 more than not paying in them"
  );

  const broke = tradeWith(fork({ mc: 2, energy: 0, titanium: 0 }), tile, [], "player");
  assert.equal(broke.traded, false, "a player who cannot pay cannot trade");

  // Cryo-Sleep reduces the cost by one resource of whichever kind is paid.
  const discounted = fork({
    mc: 40,
    energy: 0,
    titanium: 0,
    playedProjects: ["card-colonies-cryo-sleep"]
  });
  assert.deepEqual(tradePaymentOptions(discounted, "player"), [{ resource: "mc", cost: 8 }]);
  assert.equal(
    tradeWith(discounted, tile, [], "player").state.players[0].mc,
    paidMc.state.players[0].mc + 1,
    "the discount saves exactly one megacredit"
  );

  const built = buildColonyOn(fork({ mc: 40 }), tile, [], "player");
  assert.equal(built.built, true);
  assert.equal(built.state.players[0].mc, 23, "building a colony costs 17 M€");

  assert.equal(buildColonyOn(fork({ mc: 10 }), tile, [], "player").built, false);
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

// Colonies rules, Solar phase STEP 3: "Return all Trade Fleets from the Colony
// Tiles to the Trade Fleets Tile. Move the white marker one step up the Colony
// track on each Colony Tile."
test("Every colony track climbs one step when the generation ends", () => {
  let state = getInitialState({ playerCount: 2, colonies: true });
  const before = Object.fromEntries(
    Object.values(state.colonies.tiles).map(tile => [tile.id, tile.trackPosition])
  );

  const after = triggerProduction(state, state.logs);

  for (const tile of Object.values(after.colonies.tiles)) {
    assert.equal(
      tile.trackPosition,
      Math.min(before[tile.id] + 1, 6),
      `${tile.id} advances one step up the colony track`
    );
  }
});

test("The colony track stops at the top of the track", () => {
  let state = getInitialState({ playerCount: 2, colonies: true });
  for (const tile of Object.values(state.colonies.tiles)) tile.trackPosition = 6;

  const after = triggerProduction(state, state.logs);
  for (const tile of Object.values(after.colonies.tiles)) {
    assert.equal(tile.trackPosition, 6, "a maxed track does not overshoot");
  }
});

// The tile file is generated from the reference implementation and carries its
// English effect text, so the Colonies panel read half Japanese and half English
// ("Gain n titanium" beside カリスト). The translation is a separate layer; this
// pins it against a tile being added without one.
test("every colony effect shown to the player is translated", async () => {
  const { COLONY_TILES } = await import("../app/colony-tiles.js");
  const { colonyDescriptionJP, COLONY_DESCRIPTION_JP } = await import("../app/colony-text.js");

  const shown = new Set();
  for (const tile of COLONY_TILES) {
    for (const key of ["build", "trade", "colony"]) {
      if (tile[key]?.description) shown.add(tile[key].description);
    }
  }

  const untranslated = [...shown].filter(text => !(text in COLONY_DESCRIPTION_JP));
  assert.deepEqual(untranslated, [], "a colony effect has no Japanese text");

  // Latin letters surviving translation means the entry is still the source string.
  for (const text of shown) {
    const jp = colonyDescriptionJP(text);
    assert.equal(/[A-Za-z]/.test(jp.replace(/MC|n/g, "")), false, `not translated: ${text} -> ${jp}`);
  }

  assert.equal(colonyDescriptionJP(""), "", "an empty description stays empty");
  assert.equal(colonyDescriptionJP("Unknown effect"), "Unknown effect", "an unknown string falls back visibly");
});

// Research Colony and Space Port Colony override the one-colony-per-tile rule.
// The choice handler always passed { allowDuplicates }, but buildColony only
// declared three parameters, so the flag was dropped and the cards did nothing.
test("A card that allows it may place a second colony on the same tile", async () => {
  const { buildColony, canBuildColony } = await import("../app/colonies.js");
  const state = getInitialState({ playerCount: 2, colonies: true });
  const tile = activeTile(state.colonies);

  const first = buildColony(state.colonies, tile, "player");
  assert.equal(first.built, true);

  assert.equal(
    canBuildColony(first.colonies, tile, "player").ok,
    false,
    "the ordinary rule still refuses a duplicate"
  );
  assert.equal(
    canBuildColony(first.colonies, tile, "player", { allowDuplicates: true }).ok,
    true,
    "the card's exception is honoured"
  );

  const second = buildColony(first.colonies, tile, "player", { allowDuplicates: true });
  assert.equal(second.built, true);
  assert.deepEqual(second.colonies.tiles[tile].colonies, ["player", "player"]);
});

// Titan, Enceladus and Miranda pay out in a resource that has to live on a
// card, so their marker starts on the moon picture: until somebody plays a card
// that can hold floaters, microbes or animals, the colony cannot be settled or
// traded with. All three were available from turn one.
test("Resource colonies stay dormant until a card can hold their resource", async () => {
  const { getPlayer, canTrade, canBuildColony, ALL_CARDS } = await import("../app/game-logic.js");
  const { executeGameCommand, COMMAND } = await import("../app/game-command.js");
  const { getCardResourceType } = await import("../app/card-resource-types.js");

  const state = getInitialState({ playerCount: 2, colonies: true });
  for (const id of ["titan", "enceladus", "miranda"]) {
    if (!state.colonies.tilesInPlay.includes(id)) {
      state.colonies.tilesInPlay.push(id);
      state.colonies.tiles[id] = { id, trackPosition: 0, colonies: [], active: false };
    }
  }

  assert.equal(canTrade(state.colonies, "titan", "player").ok, false, "dormant: no trade");
  assert.equal(canBuildColony(state.colonies, "titan", "player").ok, false, "dormant: no colony");

  const floaterCard = ALL_CARDS.find(
    card => getCardResourceType(card.id) === "floater" && card.cost < 20 && !card.requirements?.length
  );
  state.phase = "action";
  state.currentPlayerId = "player";
  const seat = getPlayer(state, "player");
  seat.mc = 200;
  seat.hand = [floaterCard.id];
  seat.actionsRemaining = 2;

  const played = executeGameCommand(state, {
    type: COMMAND.PLAY_CARD, playerId: "player", cardId: floaterCard.id
  });
  assert.equal(played.ok, true);

  assert.equal(played.state.colonies.tiles.titan.active, true, "a floater card wakes Titan");
  assert.equal(canTrade(played.state.colonies, "titan", "player").ok, true);
  assert.equal(
    played.state.colonies.tiles.enceladus.active, false,
    "and only the colony matching that resource"
  );
});

// The rules let the trader pick which of the three costs to pay, and the choice
// is real: energy is scarce for some engines and worthless to others. Callers
// that pass nothing keep the old automatic order, so the bot and saved games
// are unaffected.
test("A trade can name which resource pays for it", async () => {
  const { tradeWith, getPlayer, tradePaymentOptions, cloneGameState } =
    await import("../app/game-logic.js");

  const table = () => {
    const state = getInitialState({ playerCount: 2, colonies: true });
    state.phase = "action";
    state.currentPlayerId = "player";
    const seat = getPlayer(state, "player");
    seat.mc = 40;
    seat.energy = 10;
    seat.titanium = 10;
    return state;
  };

  assert.equal(tradePaymentOptions(table(), "player").length, 3, "all three are affordable");

  // The trade also PAYS OUT, and the payout resource depends on which colony
  // was dealt -- a colony paying energy nets against an energy cost. Comparing
  // the SAME trade paid two different ways isolates the choice from the payout.
  // One table, forked -- calling table() twice deals different colonies, and a
  // different colony pays a different reward, which is not what is under test.
  const shared = table();
  const sharedTile = activeTile(shared.colonies);
  const balances = payWith => {
    const state = cloneGameState(shared);
    const before = { ...getPlayer(state, "player") };
    const out = tradeWith(state, sharedTile, state.logs, "player", payWith ? { payWith } : {});
    assert.equal(out.traded, true, `${payWith ?? "auto"} trades`);
    const after = getPlayer(out.state, "player");
    return {
      energy: after.energy - before.energy,
      titanium: after.titanium - before.titanium,
      mc: after.mc - before.mc
    };
  };

  // The payout is whatever this one colony pays; the DIFFERENCE between two
  // payment choices for the SAME trade is the payment itself.
  const viaTitanium = balances("titanium");
  const viaMc = balances("mc");
  assert.equal(
    viaMc.titanium - viaTitanium.titanium, 3,
    "paying with titanium costs exactly 3 titanium more than not paying with it"
  );
  assert.equal(
    viaTitanium.mc - viaMc.mc, 9,
    "and paying with megacredits costs exactly 9 M€ more"
  );

  // A resource that cannot pay is refused rather than quietly swapped. One
  // table, so the tile it names is the tile it trades with.
  const state = table();
  const refused = tradeWith(state, activeTile(state.colonies), [], "player", { payWith: "plants" });
  assert.equal(refused.traded, false);
});
