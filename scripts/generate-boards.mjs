// Generates the alternate maps from the same builder calls the reference
// implementation uses (src/server/boards/*Board.ts), so each board's 61 spaces,
// their bonuses and ocean reservations match the printed boards exactly.
//
// The row layout and id assignment follow BoardBuilder.build(): nine rows of
// [5,6,7,8,9,8,7,6,5], xOffset = 9 - tilesInThisRow, ids starting at 3.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const PLANT = "plant";
const STEEL = "steel";
const CARD = "card";
const TITANIUM = "titanium";
const HEAT = "heat";
const ENERGY = "energy";
const MICROBE = "microbe";
const ANIMAL = "animal";
const OCEAN = "ocean";

const TILES_PER_ROW = [5, 6, 7, 8, 9, 8, 7, 6, 5];
const ROW_SHIFT = [0, 0, 0, 0, 0, -1, -2, -3, -4];
const TOTAL = TILES_PER_ROW.reduce((a, b) => a + b, 0);

// Mirrors BoardBuilder's chained calls so a board reads the same here as it does
// in the reference source, which is what makes the transcription checkable.
function makeBuilder() {
  const spaceTypes = [];
  const bonuses = [];
  const volcanic = new Set();
  const restricted = new Set();
  const unshufflable = new Set();
  const api = {
    land(...b) { spaceTypes.push("land"); bonuses.push(b); return api; },
    ocean(...b) { spaceTypes.push("ocean"); bonuses.push(b); return api; },
    volcanic(...b) { spaceTypes.push("land"); bonuses.push(b); volcanic.add(spaceTypes.length - 1); return api; },
    restricted() { spaceTypes.push("land"); bonuses.push([]); restricted.add(spaceTypes.length - 1); return api; },
    doNotShuffleLastSpace() { unshufflable.add(spaceTypes.length - 1); return api; },
    result: () => ({ spaceTypes, bonuses, volcanic, restricted, unshufflable })
  };
  return api;
}

// Each board, transcribed from the reference implementation one row per line.
const BOARDS = {
  hellas: {
    name: "ヘラス",
    englishName: "Hellas",
    // The south pole costs 6 M€ to place on and pays an ocean tile in return.
    build(b) {
      b.ocean(PLANT, PLANT).land(PLANT, PLANT).land(PLANT, PLANT).land(PLANT, STEEL).land(PLANT);
      b.ocean(PLANT, PLANT).land(PLANT, PLANT).land(PLANT).land(PLANT, STEEL).land(PLANT).land(PLANT);
      b.ocean(PLANT).land(PLANT).land(STEEL).land(STEEL).land().land(PLANT, PLANT).land(PLANT, CARD);
      b.ocean(PLANT).land(PLANT).land(STEEL).land(STEEL, STEEL).land(STEEL).ocean(PLANT).ocean(PLANT).land(PLANT);
      b.land(CARD).land().land().land(STEEL, STEEL).land().ocean(CARD).ocean(HEAT, HEAT, HEAT).ocean().land(PLANT);
      b.land(TITANIUM).land().land(STEEL).land().land().ocean().ocean(STEEL).land();
      b.ocean(TITANIUM, TITANIUM).land().land().land(CARD).land().land().land(TITANIUM);
      b.land(STEEL).land(CARD).land(HEAT, HEAT).land(HEAT, HEAT).land(TITANIUM).land(TITANIUM);
      b.land().land(HEAT, HEAT).land(OCEAN).doNotShuffleLastSpace().land(HEAT, HEAT).land();
    },
    southPoleCost: 6,
    // Hellas has no volcanoes and no Noctis region, so those cards lose their
    // placement restrictions here.
    noVolcanicRestriction: true
  },
  elysium: {
    name: "エリシウム",
    englishName: "Elysium",
    build(b) {
      b.ocean().ocean(TITANIUM).ocean(CARD).ocean(STEEL).land(CARD);
      b.volcanic(TITANIUM).land().land().ocean().ocean().land(STEEL, STEEL);
      b.volcanic(TITANIUM, TITANIUM).land().land(CARD).land().ocean(PLANT).ocean().volcanic(CARD, CARD, CARD);
      b.land(PLANT).land(PLANT).land(PLANT).ocean(PLANT, PLANT).land(PLANT).ocean(PLANT).ocean(PLANT).land(PLANT, STEEL);
      b.land(PLANT, PLANT).land(PLANT, PLANT).land(PLANT, PLANT).ocean(PLANT, PLANT).land(PLANT, PLANT).land(PLANT, PLANT, PLANT).land(PLANT, PLANT).land(PLANT, PLANT).volcanic(PLANT, TITANIUM);
      b.land(STEEL).land(PLANT).land(PLANT).land(PLANT).land(PLANT).land(PLANT).land(PLANT).land();
      b.land(TITANIUM).land(STEEL).land().land().land(STEEL).land().land();
      b.land(STEEL, STEEL).land().land().land().land(STEEL, STEEL).land();
      b.land(STEEL).land().land(CARD).land(CARD).land(STEEL, STEEL);
    },
    volcanoNames: ["Elysium Mons", "Hecates Tholus", "Olympus Mons", "Arsia Mons"]
  },
  utopia: {
    name: "ユートピア平原",
    englishName: "Utopia Planitia",
    build(b) {
      b.land().land().land(ENERGY, ENERGY).land().land();
      b.land().land(STEEL, STEEL).land(ENERGY, ENERGY).land(ENERGY, ENERGY, CARD).land().land();
      b.ocean(PLANT, PLANT, PLANT).land().land(STEEL).land().land().land(CARD, CARD, TITANIUM).land(TITANIUM, TITANIUM);
      b.ocean(PLANT, CARD).land(PLANT).land(PLANT).land(PLANT, PLANT).ocean(PLANT, PLANT).ocean(PLANT).ocean(PLANT).land(PLANT);
      b.land().land().land().land(PLANT).land(PLANT).land(PLANT, PLANT).land().ocean().land(PLANT, TITANIUM);
      b.land(STEEL).land(STEEL, STEEL).ocean(PLANT, PLANT).land(PLANT, PLANT).land().land().land(STEEL, STEEL).land();
      b.land(STEEL).land().ocean().ocean(PLANT, PLANT).land().land().land();
      b.land().land(CARD, CARD).ocean().ocean(PLANT, PLANT).land(STEEL, TITANIUM).land(PLANT, PLANT);
      b.land().land().land(STEEL, STEEL).ocean(PLANT).land(PLANT);
    },
    noVolcanicRestriction: true
  },
  amazonis: {
    name: "アマゾニス平原",
    englishName: "Amazonis Planitia",
    build(b) {
      b.land().ocean(PLANT).land(PLANT, PLANT, PLANT).land(MICROBE).land(ANIMAL);
      b.ocean(TITANIUM).volcanic(MICROBE, MICROBE).land().land().ocean(CARD, CARD).ocean();
      b.land(PLANT, PLANT).land(STEEL, PLANT).land(STEEL, HEAT).land(HEAT, PLANT).land(ANIMAL).land().land(MICROBE);
      b.land().ocean(PLANT).land().land(PLANT).land(HEAT, PLANT).land(STEEL).land(PLANT).ocean(STEEL, PLANT);
      b.land(PLANT).land(PLANT).land().land(HEAT, HEAT).restricted().doNotShuffleLastSpace()
        .land(HEAT, HEAT).land().land(PLANT).land(PLANT);
      b.ocean(PLANT, PLANT).land(PLANT).land(STEEL).land(HEAT, PLANT).land(PLANT).volcanic(CARD).land().ocean(PLANT);
      b.ocean(PLANT).land().land(MICROBE).volcanic(HEAT, PLANT).land().land(PLANT, PLANT).ocean(PLANT, PLANT);
      b.land(TITANIUM).ocean(PLANT).land(STEEL).land().land(ANIMAL).land(PLANT);
      b.land().land(CARD).land(STEEL).ocean(PLANT).land(STEEL, STEEL);
    }
  }
};

function buildCells(definition) {
  const builder = makeBuilder();
  definition.build(builder);
  const { spaceTypes, bonuses, volcanic, restricted, unshufflable } = builder.result();

  if (spaceTypes.length !== TOTAL) {
    throw new Error(`${definition.englishName}: expected ${TOTAL} spaces, got ${spaceTypes.length}`);
  }

  const volcanoOrder = [...volcanic].sort((a, b) => a - b);
  const cells = [];
  let idx = 0;
  for (let row = 0; row < 9; row++) {
    const tilesInThisRow = TILES_PER_ROW[row];
    const xOffset = 9 - tilesInThisRow;
    for (let i = 0; i < tilesInThisRow; i++) {
      const id = String(idx + 3).padStart(2, "0");
      const bonus = bonuses[idx];
      const r = row - 4;
      const q = xOffset + i + ROW_SHIFT[row];

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
        multi = entries.map(([type, amount]) => ({ type, amount }));
      }

      const cell = { id, q, r, isOceanOnly: spaceTypes[idx] === "ocean", bonusType, bonusAmount };
      if (multi) cell.bonus = multi;
      if (volcanic.has(idx)) {
        cell.volcanic = true;
        const name = definition.volcanoNames?.[volcanoOrder.indexOf(idx)];
        if (name) cell.name = name;
      }
      // Amazonis reserves one space for its own city; it is never shuffled.
      if (restricted.has(idx)) cell.restricted = true;
      if (unshufflable.has(idx)) cell.unshufflable = true;
      // The Hellas south pole: pay to place, receive an ocean tile.
      if (bonus.includes(OCEAN)) {
        cell.bonusType = "ocean-tile";
        cell.bonusAmount = 1;
        cell.placementCost = definition.southPoleCost ?? 0;
        cell.name = "南極";
        delete cell.bonus;
      }
      cells.push(cell);
      idx++;
    }
  }
  return cells;
}

const output = {};
for (const [key, definition] of Object.entries(BOARDS)) {
  output[key] = {
    id: key,
    name: definition.name,
    englishName: definition.englishName,
    noVolcanicRestriction: Boolean(definition.noVolcanicRestriction),
    cells: buildCells(definition)
  };
}

const body = Object.entries(output)
  .map(([key, board]) => `  ${JSON.stringify(key)}: ${JSON.stringify(board)}`)
  .join(",\n");

await writeFile(
  resolve("app/alternate-boards.js"),
  `// GENERATED by scripts/generate-boards.mjs — do not edit by hand.\n` +
    `// Transcribed from the reference implementation's board builders so the\n` +
    `// spaces, bonuses and ocean reservations match the printed boards.\n` +
    `export const ALTERNATE_BOARDS = {\n${body}\n};\n`,
  "utf8"
);

for (const [key, board] of Object.entries(output)) {
  const oceans = board.cells.filter(c => c.isOceanOnly).length;
  console.log(`${key.padEnd(10)} ${board.cells.length} spaces, ${oceans} ocean areas`);
}
