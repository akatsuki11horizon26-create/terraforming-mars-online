import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { THARSIS_CELLS, NOCTIS_CITY_ID } from "../app/tharsis-board.js";
import { INITIAL_CELLS, getAdjacentCells, getInitialState } from "../app/game-logic.js";

const AXIAL_OFFSETS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

test("The board is the official 61-space Tharsis map", () => {
  assert.equal(THARSIS_CELLS.length, 61);
  assert.equal(INITIAL_CELLS, THARSIS_CELLS, "the engine uses the generated board");

  const oceans = THARSIS_CELLS.filter(cell => cell.isOceanOnly);
  assert.equal(oceans.length, 12, "Tharsis reserves twelve ocean spaces");

  const keys = new Set(THARSIS_CELLS.map(cell => `${cell.q},${cell.r}`));
  assert.equal(keys.size, 61, "axial coordinates are unique");
});

test("Rows follow the printed 5-6-7-8-9-8-7-6-5 layout", () => {
  const rows = {};
  for (const cell of THARSIS_CELLS) {
    rows[cell.r] = (rows[cell.r] ?? 0) + 1;
  }
  assert.deepEqual(
    [-4, -3, -2, -1, 0, 1, 2, 3, 4].map(r => rows[r]),
    [5, 6, 7, 8, 9, 8, 7, 6, 5]
  );
});

test("Adjacency is symmetric with 37 interior spaces", () => {
  const byKey = new Map(THARSIS_CELLS.map(cell => [`${cell.q},${cell.r}`, cell]));

  let interior = 0;
  for (const cell of THARSIS_CELLS) {
    const neighbours = AXIAL_OFFSETS
      .map(([dq, dr]) => byKey.get(`${cell.q + dq},${cell.r + dr}`))
      .filter(Boolean);
    if (neighbours.length === 6) interior += 1;

    for (const neighbour of neighbours) {
      const mutual = getAdjacentCells(neighbour.q, neighbour.r).some(
        pos => pos.q === cell.q && pos.r === cell.r
      );
      assert.ok(mutual, `adjacency must be mutual between ${cell.id} and ${neighbour.id}`);
    }
  }
  assert.equal(interior, 37, "the reference board has 37 fully-surrounded spaces");
});

test("Named landmarks match the printed board", () => {
  const noctis = THARSIS_CELLS.find(cell => cell.id === NOCTIS_CITY_ID);
  assert.ok(noctis);
  assert.equal(noctis.name, "Noctis City");
  assert.equal(noctis.reservedFor, "noctis-city");
  assert.equal(noctis.isOceanOnly, false);

  const volcanoes = THARSIS_CELLS.filter(cell => cell.volcanic).map(cell => cell.name);
  assert.deepEqual(volcanoes, [
    "Tharsis Tholus",
    "Ascraeus Mons",
    "Pavonis Mons",
    "Arsia Mons"
  ]);
});

test("Placement bonuses survive generation", () => {
  const withBonus = THARSIS_CELLS.filter(cell => cell.bonusType !== "none");
  assert.ok(withBonus.length > 20, "most of the board carries a placement bonus");

  const multi = THARSIS_CELLS.filter(cell => cell.bonusType === "multi");
  assert.ok(multi.length > 0, "spaces with two different bonuses are preserved");
  for (const cell of multi) {
    assert.ok(Array.isArray(cell.bonus) && cell.bonus.length >= 2);
  }

  const steelPairs = THARSIS_CELLS.filter(
    cell => cell.bonusType === "steel" && cell.bonusAmount === 2
  );
  assert.ok(steelPairs.length > 0, "double-steel spaces exist");
});

test("The board centre is exported so rendering can offset by it", async () => {
  const { BOARD_CENTRE } = await import("../app/tharsis-board.js");
  const qs = THARSIS_CELLS.map(cell => cell.q);
  const rs = THARSIS_CELLS.map(cell => cell.r);

  // The axial origin is a corner of this map, not its middle: q runs 0..8.
  // Rendering that assumes (0,0) is central pushes the whole board off the planet.
  assert.equal(Math.min(...qs), 0);
  assert.equal(Math.max(...qs), 8);
  assert.equal(BOARD_CENTRE.q, 4);
  assert.equal(BOARD_CENTRE.r, 0);
  assert.equal(BOARD_CENTRE.q, (Math.min(...qs) + Math.max(...qs)) / 2);
  assert.equal(BOARD_CENTRE.r, (Math.min(...rs) + Math.max(...rs)) / 2);
});

test("Every hex lands inside the planet once centred", async () => {
  const { BOARD_CENTRE } = await import("../app/tharsis-board.js");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  const num = name => Number(page.match(new RegExp(`const ${name} = ([\\d.]+)`))[1]);
  const radius = num("SPHERE_RADIUS");
  const width = num("HEX_WIDTH");
  const height = num("HEX_HEIGHT");
  const stepX = num("HEX_STEP_X");
  const stepY = num("HEX_STEP_Y");

  let minLeft = Infinity;
  let maxRight = -Infinity;
  let minTop = Infinity;
  let maxBottom = -Infinity;

  for (const cell of THARSIS_CELLS) {
    const left =
      radius + stepX * ((cell.q - BOARD_CENTRE.q) + (cell.r - BOARD_CENTRE.r) / 2) - width / 2;
    const top = radius + stepY * (cell.r - BOARD_CENTRE.r) - height / 2;
    minLeft = Math.min(minLeft, left);
    maxRight = Math.max(maxRight, left + width);
    minTop = Math.min(minTop, top);
    maxBottom = Math.max(maxBottom, top + height);
  }

  const diameter = radius * 2;
  assert.ok(minLeft >= 0 && maxRight <= diameter, "the board fits horizontally");
  assert.ok(minTop >= 0 && maxBottom <= diameter, "the board fits vertically");
  assert.ok(Math.abs((minLeft + maxRight) / 2 - radius) < 1, "centred horizontally");
  assert.ok(Math.abs((minTop + maxBottom) / 2 - radius) < 1, "centred vertically");
});

test("A fresh game instantiates all 61 spaces as empty", () => {
  const state = getInitialState({ playerCount: 2 });
  assert.equal(Object.keys(state.board).length, 61);
  assert.ok(
    Object.values(state.board).every(cell => cell.tileType === "empty"),
    "multiplayer starts with no tiles placed"
  );
});

test("A tenth ocean can never be placed", async () => {
  const { isCellPlacementValid, MAX_OCEANS } = await import("../app/game-logic.js");
  const state = getInitialState({ playerCount: 2 });

  const oceanSpaces = Object.values(state.board).filter(cell => cell.isOceanOnly);
  assert.ok(oceanSpaces.length > MAX_OCEANS, "Tharsis reserves more spaces than there are tiles");

  // Fill the board to the limit.
  for (let i = 0; i < MAX_OCEANS; i++) {
    oceanSpaces[i].tileType = "ocean";
  }

  const spare = oceanSpaces[MAX_OCEANS];
  assert.equal(spare.tileType, "empty", "a reserved space is still free");
  assert.equal(
    isCellPlacementValid(spare, "ocean", state.board),
    false,
    "the ocean counter saturates at 9, so the board must refuse a tenth"
  );
});

// The tile help promises an ocean adjacency bonus; the engine pays one. They
// have to be the same number, and the help has to count the same neighbours.
test("the placement help matches what the engine actually pays", async () => {
  const { OCEAN_ADJACENCY_BONUS, getAdjacentCells } = await import("../app/game-logic.js");
  const { describePlacement, OCEAN_ADJACENCY_MC } = await import("../app/tile-help.js");

  assert.equal(
    OCEAN_ADJACENCY_MC,
    OCEAN_ADJACENCY_BONUS,
    "the help must quote the engine's own adjacency bonus"
  );

  // Two oceans beside one空きマス: the help must say 2 x the bonus, and it must
  // use the same six neighbours the engine does.
  const cell = { q: 0, r: 0, tileType: "empty" };
  const neighbours = getAdjacentCells(0, 0);
  assert.equal(neighbours.length, 6, "a hex has six neighbours");

  const board = { "0,0": cell };
  for (const pos of neighbours) {
    board[`${pos.q},${pos.r}`] = { ...pos, tileType: "empty" };
  }
  assert.equal(describePlacement(cell, board), "", "no oceans, nothing to promise");

  board[`${neighbours[0].q},${neighbours[0].r}`].tileType = "ocean";
  board[`${neighbours[3].q},${neighbours[3].r}`].tileType = "ocean";
  const help = describePlacement(cell, board);
  assert.match(help, /海洋2枚/, "it counts both");
  assert.ok(
    help.includes(`MC +${2 * OCEAN_ADJACENCY_BONUS}`),
    `it must price them at the engine's rate, got: ${help}`
  );

  // A space that charges to build on says so.
  assert.match(
    describePlacement({ q: 5, r: 5, tileType: "empty", placementCost: 6 }, {}),
    /6 MC/,
    "the Hellas south pole charges 6 M€"
  );
});
