import assert from "node:assert/strict";
import test from "node:test";
import { getInitialState, getBoardCells } from "../app/game-logic.js";
import { milestonesForBoard, awardsForBoard } from "../app/board-milestones.js";
import { getMilestone, getAward } from "../app/milestones-awards.js";

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

  const tile = Object.keys(state.colonies.tiles)[0];
  state = buildColonyOn(state, tile, [], "player").state;

  // milestoneContext did not pass colonyCount, so Pioneer was unclaimable.
  assert.equal(getMilestoneStatus(state, "pioneer", "player").score, 1);
});
