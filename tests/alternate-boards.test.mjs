import assert from "node:assert/strict";
import test from "node:test";
import { getInitialState, getBoardCells } from "../app/game-logic.js";
import { milestonesForBoard, awardsForBoard } from "../app/board-milestones.js";
import { getMilestone, getAward } from "../app/milestones-awards.js";

// Titan, Enceladus and Miranda stay off the track until a card that can hold
// their resource is played, so a test that just wants "a colony" has to ask for
// one that is usable -- the tiles in play are shuffled.
function activeTile(colonies) {
  const id = colonies.tilesInPlay.find(tile => colonies.tiles[tile]?.active !== false);
  if (!id) throw new Error("no active colony tile in play");
  return id;
}


const MAPS = ["tharsis", "hellas", "elysium", "utopia", "amazonis", "terra-cimmeria"];

test("every map is a complete 61-space board", () => {
  for (const id of MAPS) {
    const cells = getBoardCells(id);
    assert.equal(cells.length, 61, `${id} must have 61 spaces`);

    // Nine rows of 5,6,7,8,9,8,7,6,5 — the printed layout.
    const perRow = {};
    for (const cell of cells) perRow[cell.r] = (perRow[cell.r] ?? 0) + 1;
    assert.deepEqual(
      Object.keys(perRow).sort((a, b) => a - b).map(r => perRow[r]),
      [5, 6, 7, 8, 9, 8, 7, 6, 5],
      `${id} row layout`
    );

    // Coordinates must be unique or two spaces would occupy one hex.
    const keys = new Set(cells.map(cell => `${cell.q},${cell.r}`));
    assert.equal(keys.size, 61, `${id} has duplicate coordinates`);

    // The board holds more ocean areas than the nine ocean tiles in the game.
    const oceans = cells.filter(cell => cell.isOceanOnly).length;
    assert.ok(oceans >= 9, `${id} has only ${oceans} ocean areas`);
  }
});

test("a game can be dealt on any map", () => {
  for (const id of MAPS) {
    const state = getInitialState({ playerCount: 2, board: id });
    assert.equal(state.boardId, id);
    assert.equal(Object.keys(state.board).length, 61);
  }
});

test("an unknown map falls back to Tharsis rather than dealing an empty board", () => {
  const state = getInitialState({ playerCount: 1, board: "not-a-map" });
  assert.equal(state.boardId, "tharsis");
  assert.equal(Object.keys(state.board).length, 61);
});

test("each map brings its own five milestones and five awards", () => {
  for (const id of MAPS) {
    const milestones = milestonesForBoard(id);
    const awards = awardsForBoard(id);
    assert.equal(milestones.length, 5, `${id} milestones`);
    assert.equal(awards.length, 5, `${id} awards`);

    // Claiming resolves an id back to its definition; an unregistered id would
    // make the milestone unclaimable on that map.
    for (const milestone of milestones) {
      assert.ok(getMilestone(milestone.id), `${milestone.id} must resolve`);
      assert.equal(typeof milestone.getScore, "function");
    }
    for (const award of awards) {
      assert.ok(getAward(award.id), `${award.id} must resolve`);
      assert.equal(typeof award.getScore, "function");
    }
  }
});

test("the Hellas south pole charges to place and pays an ocean", () => {
  const pole = getBoardCells("hellas").find(cell => cell.name === "南極");
  assert.ok(pole, "Hellas must have a south pole space");
  assert.equal(pole.placementCost, 6, "the rulebook charges 6 M€ there");
  assert.equal(pole.bonusType, "ocean-tile");
});

test("the maps differ from each other", () => {
  const fingerprint = id =>
    getBoardCells(id)
      .map(cell => `${cell.bonusType}${cell.bonusAmount}${cell.isOceanOnly ? "o" : ""}`)
      .join("|");
  const seen = new Map();
  for (const id of MAPS) {
    const print = fingerprint(id);
    const twin = seen.get(print);
    assert.equal(twin, undefined, `${id} is identical to ${twin}`);
    seen.set(print, id);
  }
});

test("board milestones read the same tile names the engine writes", async () => {
  const { getInitialState, applyCorporation, completeSetupPurchase, cloneGameState, getPlayer, placeTileAt, ALL_CARDS } =
    await import("../app/game-logic.js");
  const { milestonesForBoard, awardsForBoard } = await import("../app/board-milestones.js");

  let state = getInitialState({ playerCount: 2, board: "hellas" });
  for (const player of state.players) {
    state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";

  const { legalCellsFor } = await import("../app/game-logic.js");
  for (let i = 0; i < 2; i++) {
    placeTileAt(state, legalCellsFor(state, "forest", "player")[0], "forest", "player");
  }

  const context = {
    player: getPlayer(state, "player"),
    board: state.board,
    cards: ALL_CARDS,
    corporation: null,
    colonyCount: 0
  };

  // The engine writes greeneries as "forest"; scoring them as "greenery" meant
  // nobody could ever win Cultivator.
  const cultivator = awardsForBoard("hellas").find(award => award.id === "cultivator");
  assert.equal(cultivator.getScore(context), 2, "Cultivator counts the greeneries placed");

  // And Manager counts special tiles, which an ordinary greenery is not.
  const manager = milestonesForBoard("utopia").find(milestone => milestone.id === "manager");
  assert.equal(manager.getScore(context), 0, "an ordinary greenery is not a special tile");
});

test("Pioneer reads the live colony count", async () => {
  const { getInitialState, applyCorporation, completeSetupPurchase, cloneGameState, getPlayer, buildColonyOn, getMilestoneStatus } =
    await import("../app/game-logic.js");

  let state = getInitialState({ playerCount: 2, colonies: true, board: "utopia" });
  for (const player of state.players) {
    state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";
  state.players = state.players.map(player => ({ ...player, mc: 80 }));

  const tile = activeTile(state.colonies);
  state = buildColonyOn(state, tile, [], "player").state;

  // milestoneContext did not pass colonyCount, so Pioneer was unclaimable.
  assert.equal(getMilestoneStatus(state, "pioneer", "player").score, 1);
});

// The board data carries these three fields and the engine read none of them.
// A test that asserts only the data passes while the rule is entirely absent —
// which is how "the Hellas south pole charges to place" sat green above with
// nothing ever charging it.
test("the Hellas south pole charges 6 M€ and pays an ocean tile", async () => {
  const { getInitialState, getBoardCells, placeTileAt, getPlayer } =
    await import("../app/game-logic.js");
  const state = getInitialState({ board: "hellas", mode: "solo" });
  const pole = getBoardCells("hellas").find(cell => cell.name === "南極");
  const before = getPlayer(state, "player").mc;
  const oceansBefore = state.oceans;

  // It is a land space whose placement bonus is an ocean tile, so the tile laid
  // here is an ordinary city/greenery — the ocean comes from the bonus.
  placeTileAt(state, state.board[`${pole.q},${pole.r}`], "city", "player");

  assert.equal(before - getPlayer(state, "player").mc, 6,
    "placing on the south pole charges 6 M€");
  assert.equal(state.oceans, oceansBefore + 1,
    "the south pole pays an ocean tile as its placement bonus");
});

// `tile.on` is parsed into effect.tilePlacementRule and then read by nothing,
// so every card that names where its tile may go offered the whole board.
// Mohole Area is the sharp case: it must go ON an ocean-reserved space, but a
// special tile is only allowed on dry land, so none of the spaces it was
// offered were ever legal ones.
test("a card that names where its tile goes only offers those spaces", async () => {
  const { getInitialState, legalCellsFor } = await import("../app/game-logic.js");
  const state = getInitialState({ board: "tharsis", mode: "solo" });

  const mohole = legalCellsFor(state, "special", "player", "ocean");
  assert.ok(mohole.length > 0, "Mohole Area must have somewhere legal to go");
  assert.ok(mohole.every(cell => cell.isOceanOnly),
    "Mohole Area goes on a space reserved for an ocean");

  const lava = legalCellsFor(state, "special", "player", "volcanic");
  assert.ok(lava.length > 0, "Lava Flows must have somewhere legal to go");
  assert.ok(lava.every(cell => cell.volcanic),
    "Lava Flows goes on a volcano");

  const preserve = legalCellsFor(state, "special", "player", "isolated");
  assert.ok(preserve.length > 0, "Natural Preserve must have somewhere legal to go");
  assert.ok(preserve.every(cell => cell.isOceanOnly === false),
    "Natural Preserve still needs dry land");
});

// Hellas and Utopia have no volcanic spaces, so enforcing the volcanic rule
// there would leave Lava Flows with nowhere legal to go. The board data has
// carried noVolcanicRestriction from the start for exactly this reason.
test("a card needing a volcano loses that restriction on maps without one", async () => {
  const { getInitialState, legalCellsFor, BOARDS } = await import("../app/game-logic.js");
  for (const id of MAPS) {
    const state = getInitialState({ board: id, mode: "solo" });
    const legal = legalCellsFor(state, "special", "player", "volcanic");
    assert.ok(legal.length > 0, `${id} must leave Lava Flows somewhere to go`);
    if (!BOARDS[id].noVolcanicRestriction) {
      assert.ok(legal.every(cell => cell.volcanic),
        `${id} has volcanoes, so the tile belongs on one`);
    }
  }
});

// The Elysium sheet prints its own five awards; the code aliased them to the
// Hellas set, so every Elysium game scored the wrong five.
// Source: TM_HE_WRAP_ENGi.pdf (Hellas & Elysium rulebook).
test("Elysium funds its own five awards, not the Hellas set", () => {
  const ids = awardsForBoard("elysium").map(award => award.id).sort();
  assert.deepEqual(
    ids,
    ["benefactor", "celebrity", "desert-settler", "estate-dealer", "industrialist"].sort(),
    "Elysium prints Celebrity, Industrialist, Desert Settler, Estate Dealer and Benefactor"
  );
  const hellas = awardsForBoard("hellas").map(award => award.id).sort();
  assert.notDeepEqual(ids, hellas, "the two maps must not share one award set");
});

test("Incorporator counts cards costing 10 M€ or less", async () => {
  const award = awardsForBoard("utopia").find(entry => entry.id === "entrepreneur");
  const cards = [
    { id: "c10", cost: 10, tags: [] },
    { id: "c11", cost: 11, tags: [] },
    { id: "c19", cost: 19, tags: [] },
    { id: "c20", cost: 20, tags: [] }
  ];
  const score = id =>
    award.getScore({ player: { id: "player", playedProjects: [id] }, board: {}, cards, corporation: null });

  // The printed threshold is 10 M€; 11 through 19 were being counted too.
  assert.equal(score("c10"), 1, "10 M€ counts");
  assert.equal(score("c11"), 0, "11 M€ does not count");
  assert.equal(score("c19"), 0, "19 M€ does not count");
  assert.equal(score("c20"), 0, "20 M€ does not count");
});

// Amazonis borrowed the Utopia sheet, so every Amazonis game claimed and scored
// the wrong ten. Transcribed from the reference implementation
// (src/server/milestones/amazonisPlanitia, src/server/awards/amazonisPlanitia),
// which is the same source the boards themselves came from.
test("Amazonis brings its own five milestones and five awards", () => {
  assert.deepEqual(
    milestonesForBoard("amazonis").map(entry => entry.id).sort(),
    ["colonizer", "forester", "minimalist", "terran", "tropicalist"].sort()
  );
  assert.deepEqual(
    awardsForBoard("amazonis").map(entry => entry.id).sort(),
    ["curator", "amazonis-engineer", "promoter", "tourist", "amazonis-zoologist"].sort()
  );
  // And they must not simply be the Utopia set under new names.
  assert.notDeepEqual(
    milestonesForBoard("amazonis").map(entry => entry.id),
    milestonesForBoard("utopia").map(entry => entry.id)
  );
});

test("the Amazonis milestones score what the reference scores", () => {
  const milestone = id => milestonesForBoard("amazonis").find(entry => entry.id === id);

  // Minimalist: "Have no more than 2 cards in hand" -- the only one here whose
  // claim is a ceiling rather than a floor.
  const minimalist = milestone("minimalist");
  assert.equal(minimalist.atMost, true, "Minimalist is claimed by holding FEW cards");
  assert.equal(minimalist.threshold, 2);
  assert.equal(minimalist.getScore({ player: { hand: ["a", "b"] } }), 2);

  // Forester: 4 plant production. Production, not plants held.
  assert.equal(milestone("forester").threshold, 4);
  assert.equal(milestone("forester").getScore({ player: { plantsProd: 4, plants: 0 } }), 4);

  // Colonizer: 4 colonies, where Utopia's Pioneer wanted 3.
  assert.equal(milestone("colonizer").threshold, 4);
  assert.equal(milestone("colonizer").getScore({ colonyCount: 4 }), 4);

  // Terran: 6 Earth tags.
  assert.equal(milestone("terran").threshold, 6);

  // Tropicalist: 3 tiles in the middle three equatorial rows (y 3..5).
  const tropicalist = milestone("tropicalist");
  assert.equal(tropicalist.threshold, 3);
  // A full nine-row board, so the row offsets are the printed ones rather than
  // whatever the fixture's lowest r happens to be.
  const board = {};
  for (let r = 0; r < 9; r += 1) board[`9,${r}`] = { q: 9, r, tileType: "empty", placedBy: null };
  for (const r of [2, 3, 4, 5, 6]) board[`0,${r}`] = { q: 0, r, tileType: "city", placedBy: "player" };
  assert.equal(
    tropicalist.getScore({ player: { id: "player" }, board }),
    3,
    "rows 3, 4 and 5 count; 2 and 6 do not"
  );
});

test("the Amazonis awards score what the reference scores", () => {
  const award = id => awardsForBoard("amazonis").find(entry => entry.id === id);
  const cards = [
    { id: "e1", type: "event", tags: ["Earth"] },
    { id: "e2", type: "event", tags: ["Space"] },
    { id: "p1", type: "automated", tags: ["Earth", "Earth"] }
  ];

  // Promoter counts the event pile, which the engine keeps separately.
  assert.equal(
    award("promoter").getScore({ player: { playedEvents: ["e1", "e2"], playedProjects: ["p1"] }, cards }),
    2
  );

  // Curator: the most tags of any ONE type, and events are excluded.
  assert.equal(
    award("curator").getScore({
      player: { playedProjects: ["p1"], playedEvents: ["e1", "e2"] },
      cards,
      corporation: null
    }),
    2,
    "two Earth tags on the played project; the events' tags do not count"
  );

  // A. Zoologist: animal and microbe resources only.
  const zooCards = [
    { id: "a", resourceType: "animal" },
    { id: "m", resourceType: "microbe" },
    { id: "f", resourceType: "floater" }
  ];
  assert.equal(
    award("amazonis-zoologist").getScore({
      player: { cardResources: { a: 3, m: 2, f: 9 } },
      cards: zooCards
    }),
    5,
    "floaters are not animals or microbes"
  );

  // Tourist: empty spaces ADJACENT to the player's tiles, counted once each.
  const board = {};
  for (let q = -2; q <= 2; q += 1) {
    for (let r = -2; r <= 2; r += 1) board[`${q},${r}`] = { q, r, tileType: "empty", placedBy: null };
  }
  board["0,0"] = { q: 0, r: 0, tileType: "city", placedBy: "player" };
  const tourist = award("tourist").getScore({ player: { id: "player" }, board });
  assert.equal(tourist, 6, "a lone tile in open ground touches six empty spaces");

  // A. Engineer: cards in play that alter the owner's own production.
  const prodCards = [
    { id: "prod", type: "automated", effectSpec: { production: { mc: 1 } } },
    { id: "flat", type: "automated", effectSpec: { mc: 3 } }
  ];
  assert.equal(
    award("amazonis-engineer").getScore({ player: { playedProjects: ["prod", "flat"] }, cards: prodCards }),
    1,
    "only the card that moves production counts"
  );
});

// Through the real claim path, not just the scoring function: Minimalist is the
// first milestone whose claim is a ceiling, and getMilestoneStatus compared
// score >= threshold for everything.
test("Minimalist is claimed by holding few cards, through the engine", async () => {
  const { getInitialState, applyCorporation, completeSetupPurchase, cloneGameState, getPlayer, getMilestoneStatus } =
    await import("../app/game-logic.js");

  let state = getInitialState({ playerCount: 2, board: "amazonis" });
  for (const player of state.players) {
    state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";

  const seat = "player";
  const withHand = size =>
    getMilestoneStatus(
      {
        ...state,
        players: state.players.map(player =>
          player.id === seat ? { ...player, hand: Array.from({ length: size }, (_, i) => `c${i}`), mc: 40 } : player
        )
      },
      "minimalist",
      seat
    );

  assert.equal(withHand(2).claimable, true, "two cards is at most two");
  assert.equal(withHand(0).claimable, true, "and none is fewer still");
  assert.equal(withHand(3).claimable, false, "three is one too many");
  assert.match(withHand(3).reason, /以下/, "the reason must read as a ceiling");

  // A floor milestone on the same board must still compare the usual way.
  const terran = getMilestoneStatus({ ...state, phase: "action" }, "terran", seat);
  assert.equal(terran.claimable, false, "no Earth tags yet");
});

// Terra Cimmeria's own five and five, transcribed from the reference
// (src/server/milestones/terraCimmeria, src/server/awards/terraCimmeria).
test("Terra Cimmeria brings its own five milestones and five awards", () => {
  assert.deepEqual(
    milestonesForBoard("terra-cimmeria").map(entry => entry.id).sort(),
    ["t-collector", "firestarter", "terra-pioneer", "spacefarer", "gambler"].sort()
  );
  assert.deepEqual(
    awardsForBoard("terra-cimmeria").map(entry => entry.id).sort(),
    ["biologist", "incorporator", "t-politician", "urbanist", "warmonger"].sort()
  );
});

test("the Terra Cimmeria milestones score what the reference scores", () => {
  const milestone = id => milestonesForBoard("terra-cimmeria").find(entry => entry.id === id);

  // Firestarter: 20 heat HELD, not produced.
  assert.equal(milestone("firestarter").threshold, 20);
  assert.equal(milestone("firestarter").getScore({ player: { heat: 20, heatProd: 0 } }), 20);

  // Spacefarer: 6 space tags.
  assert.equal(milestone("spacefarer").threshold, 6);

  // Gambler: two awards funded BY THIS PLAYER.
  const gambler = milestone("gambler");
  assert.equal(gambler.threshold, 2);
  assert.equal(
    gambler.getScore({
      player: { id: "player" },
      fundedAwards: [{ awardId: "a", playerId: "player" }, { awardId: "b", playerId: "rival" }]
    }),
    1,
    "a rival's funding is not this player's"
  );

  // T. Collector: complete SETS of green, blue and red -- the smallest of the
  // three counts, so two greens and no events is zero sets.
  const collector = milestone("t-collector");
  assert.equal(collector.threshold, 3);
  const cards = [
    { id: "g1", type: "automated" },
    { id: "g2", type: "automated" },
    { id: "b1", type: "active" }
  ];
  assert.equal(
    collector.getScore({ player: { playedProjects: ["g1", "g2", "b1"], playedEvents: [] }, cards }),
    0,
    "no events means no complete set"
  );
  assert.equal(
    collector.getScore({ player: { playedProjects: ["g1", "g2", "b1"], playedEvents: ["e1"] }, cards }),
    1,
    "one of each is one set"
  );

  // Terra Pioneer: tiles on Mars, and an ocean is not one of them.
  const pioneer = milestone("terra-pioneer");
  assert.equal(pioneer.threshold, 5);
  const board = {
    "0,0": { q: 0, r: 0, tileType: "city", placedBy: "player" },
    "1,0": { q: 1, r: 0, tileType: "forest", placedBy: "player" },
    "2,0": { q: 2, r: 0, tileType: "ocean", placedBy: "player" },
    "3,0": { q: 3, r: 0, tileType: "city", placedBy: "rival" }
  };
  assert.equal(
    pioneer.getScore({ player: { id: "player" }, board }),
    2,
    "the ocean does not count, and neither does the rival's city"
  );
});

test("the Terra Cimmeria awards score what the reference scores", () => {
  const award = id => awardsForBoard("terra-cimmeria").find(entry => entry.id === id);

  // Incorporator: 10 M€ or less, and NOT events -- unlike Utopia's version,
  // which reads the same threshold but is a different award entry.
  const cards = [
    { id: "cheap", cost: 8, type: "automated", tags: [] },
    { id: "cheapEvent", cost: 8, type: "event", tags: [] },
    { id: "dear", cost: 11, type: "automated", tags: [] }
  ];
  assert.equal(
    award("incorporator").getScore({ player: { playedProjects: ["cheap", "cheapEvent", "dear"] }, cards }),
    1,
    "only the cheap non-event counts"
  );

  // Biologist: animal, plant and microbe tags together.
  const tagged = [{ id: "t", type: "automated", tags: ["Plant", "Microbe", "Animal", "Space"] }];
  assert.equal(
    award("biologist").getScore({ player: { playedProjects: ["t"] }, cards: tagged, corporation: null }),
    3,
    "the space tag is not one of the three"
  );

  // T. Politician: delegates placed over the whole game, not those still seated.
  assert.equal(award("t-politician").getScore({ player: { delegatesPlaced: 4 } }), 4);

  // Warmonger: cards that take from other players, events included.
  const attacks = [
    { id: "attack", type: "event", effectSpec: { removeAnyPlants: 2 } },
    { id: "quiet", type: "automated", effectSpec: { mc: 3 } }
  ];
  assert.equal(
    award("warmonger").getScore({
      player: { playedProjects: ["quiet"], playedEvents: ["attack"] },
      cards: attacks
    }),
    1,
    "the event counts and the harmless card does not"
  );
});

// Through the engine rather than the scoring function: Gambler reads the game's
// funded awards and T. Politician a running count, and neither lives on the
// player where the other milestones look.
test("Gambler and T. Politician read state the engine actually maintains", async () => {
  const { getInitialState, applyCorporation, completeSetupPurchase, cloneGameState, getPlayer,
          getMilestoneStatus, fundAward, sendDelegateToParty } = await import("../app/game-logic.js");
  const { awardsForBoard } = await import("../app/board-milestones.js");

  let state = getInitialState({ playerCount: 2, board: "terra-cimmeria", turmoil: true, seed: 9 });
  for (const player of state.players) {
    state = applyCorporation(state, getPlayer(state, player.id).corporationOptions[0], player.id);
  }
  let guard = 0;
  while (state.phase === "setup" && guard++ < 12) state = completeSetupPurchase(state);
  state = cloneGameState(state);
  state.phase = "action";
  state.players = state.players.map(player => ({ ...player, mc: 120 }));

  // Gambler: nothing funded yet, so it must not be claimable.
  assert.equal(getMilestoneStatus(state, "gambler", "player").score, 0);

  const available = awardsForBoard("terra-cimmeria").map(entry => entry.id);
  let funded = state;
  for (const awardId of available.slice(0, 2)) {
    const result = fundAward(funded, awardId, funded.logs, "player");
    assert.equal(result.funded, true, `${awardId} must be fundable`);
    funded = result.state;
  }
  assert.equal(
    getMilestoneStatus(funded, "gambler", "player").score,
    2,
    "the milestone sees the awards this player funded"
  );

  // T. Politician: the count rises as delegates are sent, and it is per player.
  const party = Object.keys(funded.turmoil.parties)[0];
  const sent = sendDelegateToParty(funded, party, funded.logs, "player");
  assert.equal(sent.sent, true);
  assert.equal(getPlayer(sent.state, "player").delegatesPlaced, 1);
  assert.equal(getPlayer(sent.state, "player2").delegatesPlaced ?? 0, 0, "the rival sent none");
});
