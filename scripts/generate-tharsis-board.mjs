// Generates the official Tharsis board from the same builder calls the reference
// implementation uses (src/server/boards/TharsisBoard.ts), so the 61 spaces, their
// bonuses and the ocean reservations match the printed board exactly.
//
// Row layout and id assignment follow BoardBuilder.build(): nine rows of
// [5,6,7,8,9,8,7,6,5], xOffset = 9 - tilesInThisRow, ids starting at 3.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PLANT = "plant";
const STEEL = "steel";
const CARD = "card";
const TITANIUM = "titanium";

const spaceTypes = [];
const bonuses = [];
const volcanic = new Set();
const unshufflable = new Set();

function push(type, bonus) {
  spaceTypes.push(type);
  bonuses.push(bonus);
}
const land = (...b) => push("land", b);
const ocean = (...b) => push("ocean", b);
const volc = (...b) => {
  push("land", b);
  volcanic.add(spaceTypes.length - 1);
};
const doNotShuffleLastSpace = () => unshufflable.add(spaceTypes.length - 1);

// y=0
land(STEEL, STEEL); ocean(STEEL, STEEL); land(); ocean(CARD); ocean();
// y=1
land(); volc(STEEL); land(); land(); land(); ocean(CARD, CARD);
// y=2
volc(CARD); land(); land(); land(); land(); land(); land(STEEL);
// y=3
volc(PLANT, TITANIUM); land(PLANT); land(PLANT); land(PLANT); land(PLANT, PLANT); land(PLANT); land(PLANT); ocean(PLANT, PLANT);
// y=4
volc(PLANT, PLANT); land(PLANT, PLANT); land(PLANT, PLANT); doNotShuffleLastSpace(); // Noctis City
ocean(PLANT, PLANT); ocean(PLANT, PLANT); ocean(PLANT, PLANT); land(PLANT, PLANT); land(PLANT, PLANT); land(PLANT, PLANT);
// y=5
land(PLANT); land(PLANT, PLANT); land(PLANT); land(PLANT); land(PLANT); ocean(PLANT); ocean(PLANT); ocean(PLANT);
// y=6
land(); land(); land(); land(); land(); land(PLANT); land();
// y=7
land(STEEL, STEEL); land(); land(CARD); land(CARD); land(); land(TITANIUM);
// y=8
land(STEEL); land(STEEL, STEEL); land(); land(); ocean(TITANIUM, TITANIUM);

const TILES_PER_ROW = [5, 6, 7, 8, 9, 8, 7, 6, 5];
const ROW_SHIFT = [0, 0, 0, 0, 0, -1, -2, -3, -4];
const NOCTIS_CITY_ID = "31";

// The four Tharsis volcanoes, in the order the builder declares them
// (rows y=1..y=4). Ids are assigned during the build loop below.
const VOLCANO_ORDER = ["Tharsis Tholus", "Ascraeus Mons", "Pavonis Mons", "Arsia Mons"];
const volcanicOrdered = [...volcanic].sort((a, b) => a - b);
const VOLCANIC_NAMES = {};
volcanicOrdered.forEach((index, i) => {
  VOLCANIC_NAMES[index] = VOLCANO_ORDER[i];
});

const total = TILES_PER_ROW.reduce((a, b) => a + b, 0);
if (spaceTypes.length !== total) {
  throw new Error(`Expected ${total} spaces from the builder calls, got ${spaceTypes.length}`);
}

const cells = [];
let idx = 0;
for (let row = 0; row < 9; row++) {
  const tilesInThisRow = TILES_PER_ROW[row];
  const xOffset = 9 - tilesInThisRow;
  for (let i = 0; i < tilesInThisRow; i++) {
    const id = String(idx + 3).padStart(2, "0");
    const x = xOffset + i;
    const bonus = bonuses[idx];

    // Reference x/y are display coordinates whose neighbour rule changes at the
    // middle row (Board.computeAdjacentSpaces). Converting with a per-row shift of
    // ROW_SHIFT reproduces that adjacency exactly under standard axial offsets,
    // verified cell-by-cell against the reference rule for all 61 spaces.
    const r = row - 4;
    const q = x + ROW_SHIFT[row];

    const counts = {};
    for (const b of bonus) counts[b] = (counts[b] ?? 0) + 1;
    const entries = Object.entries(counts);

    let bonusType = "none";
    let bonusAmount = 0;
    let multi;
    if (entries.length === 1) {
      bonusType = entries[0][0];
      bonusAmount = entries[0][1];
    } else if (entries.length > 1) {
      bonusType = "multi";
      bonusAmount = 0;
      multi = entries.map(([type, amount]) => ({ type, amount }));
    }

    const cell = {
      id,
      q,
      r,
      isOceanOnly: spaceTypes[idx] === "ocean",
      bonusType,
      bonusAmount
    };
    if (multi) cell.bonus = multi;
    if (volcanic.has(idx)) cell.volcanic = true;
    if (VOLCANIC_NAMES[idx]) cell.name = VOLCANIC_NAMES[idx];
    if (id === NOCTIS_CITY_ID) {
      cell.name = "Noctis City";
      cell.reservedFor = "noctis-city";
    }
    cells.push(cell);
    idx++;
  }
}

const oceanCount = cells.filter(c => c.isOceanOnly).length;
if (oceanCount !== 12) {
  throw new Error(`Tharsis must reserve 12 ocean spaces, generated ${oceanCount}`);
}
const keys = new Set(cells.map(c => `${c.q},${c.r}`));
if (keys.size !== cells.length) {
  throw new Error(`Axial coordinates collide: ${cells.length} cells produced ${keys.size} keys`);
}

// Verify the axial conversion reproduces the reference adjacency rule exactly
// (Board.computeAdjacentSpaces), so placement, city scoring and greenery
// adjacency behave like the printed board.
{
  const display = new Map();
  let i = 0;
  for (let row = 0; row < 9; row++) {
    const n = TILES_PER_ROW[row];
    const xOffset = 9 - n;
    for (let k = 0; k < n; k++) {
      display.set(`${xOffset + k}|${row}`, cells[i]);
      i++;
    }
  }
  const middle = 4;
  const referenceNeighbours = (x, y) => {
    const left = [x - 1, y];
    const right = [x + 1, y];
    const topLeft = [x, y - 1];
    const topRight = [x, y - 1];
    const bottomLeft = [x, y + 1];
    const bottomRight = [x, y + 1];
    if (y < middle) {
      bottomLeft[0]--;
      topRight[0]++;
    } else if (y === middle) {
      bottomRight[0]++;
      topRight[0]++;
    } else {
      bottomRight[0]++;
      topLeft[0]--;
    }
    return [topLeft, topRight, right, bottomRight, bottomLeft, left]
      .filter(([nx, ny]) => display.has(`${nx}|${ny}`))
      .map(([nx, ny]) => display.get(`${nx}|${ny}`).id)
      .sort();
  };

  const axialOffsets = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const byAxial = new Map(cells.map(cell => [`${cell.q},${cell.r}`, cell]));
  let mismatches = 0;
  for (const [displayKey, cell] of display) {
    const [x, y] = displayKey.split("|").map(Number);
    const axial = axialOffsets
      .map(([dq, dr]) => byAxial.get(`${cell.q + dq},${cell.r + dr}`))
      .filter(Boolean)
      .map(neighbour => neighbour.id)
      .sort();
    if (axial.join(" ") !== referenceNeighbours(x, y).join(" ")) mismatches++;
  }
  if (mismatches > 0) {
    throw new Error(`Axial conversion breaks adjacency on ${mismatches} spaces`);
  }
  const interior = cells.filter(
    cell => axialOffsets.filter(([dq, dr]) => byAxial.has(`${cell.q + dq},${cell.r + dr}`)).length === 6
  ).length;
  if (interior !== 37) {
    throw new Error(`Expected 37 interior spaces on Tharsis, found ${interior}`);
  }
}

const banner = `// GENERATED by scripts/generate-tharsis-board.mjs — do not edit by hand.
// Source: reference implementation src/server/boards/TharsisBoard.ts.
// ${cells.length} spaces, ${oceanCount} ocean reservations, Noctis City fixed at id ${NOCTIS_CITY_ID}.
`;

const body = cells
  .map(cell => `  ${JSON.stringify(cell)}`)
  .join(",\n");

const out = `${banner}
export const THARSIS_CELLS = [
${body}
];

export const NOCTIS_CITY_ID = ${JSON.stringify(NOCTIS_CITY_ID)};
`;

const target = resolve(process.cwd(), "app", "tharsis-board.js");
await writeFile(target, out, "utf8");
console.log(`Wrote ${cells.length} spaces (${oceanCount} ocean) to ${target}`);
