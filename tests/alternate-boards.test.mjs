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


const MAPS = ["tharsis", "hellas", "elysium", "utopia", "amazonis"];

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
