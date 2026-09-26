// Generates the alternate maps from board-builder rows. The standard maps use
// 61 spaces; the printed Amazonis board uses 91.
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
const OCEAN = "ocean";
const TEMPERATURE = "temperature";
const WILD = "wild";
const DELEGATE = "delegate";

const TILES_PER_ROW = [5, 6, 7, 8, 9, 8, 7, 6, 5];
const ROW_SHIFT = [0, 0, 0, 0, 0, -1, -2, -3, -4];

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

// Standard boards follow the reference builder; Amazonis follows the printed
// 2024 board, whose extra ring is absent from that reference implementation.
const BOARDS = {
  "vastitas-borealis": {
    name: "ヴァスティタス・ボレアリス",
    englishName: "Vastitas Borealis",
    volcanoNames: ["Hecates Tholus", "Elysium Mons", "Alba Mons", "Uranius Tholus"],
    build(b) {
      b.land(STEEL, STEEL).land(PLANT).volcanic().land().land(TITANIUM, TITANIUM);
      b.land(STEEL, STEEL).land(STEEL).land().land().land(TITANIUM).volcanic();
      b.land(TITANIUM).land().land().land().land(CARD).ocean(PLANT, CARD).ocean(PLANT);
      b.volcanic(TITANIUM, TITANIUM).land(STEEL, CARD).land(STEEL).ocean(HEAT, HEAT).ocean(HEAT, HEAT).ocean().ocean(PLANT, PLANT).land(DELEGATE);
      b.land().land().land().ocean(HEAT, HEAT).land(TEMPERATURE).doNotShuffleLastSpace().land(STEEL).land().land(PLANT).ocean(TITANIUM);
      b.land(PLANT).land().land(PLANT).ocean(HEAT, HEAT).land(HEAT, HEAT).land().land(PLANT).land(TITANIUM, PLANT);
      b.volcanic(CARD).land().ocean().land().land(STEEL, PLANT).land(PLANT).land(PLANT, PLANT);
      b.ocean(PLANT).land().land(CARD).land(STEEL).land().land(PLANT, PLANT);
      b.land(DELEGATE).land().land(PLANT).land(PLANT, PLANT).land(STEEL, PLANT);
    }
  },
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
  "terra-cimmeria": {
    name: "テラ・キンメリア",
    englishName: "Terra Cimmeria",
    build(b) {
      b.ocean().land(PLANT).volcanic(STEEL).land(PLANT, PLANT).ocean(PLANT, PLANT);
      b.ocean(TITANIUM, TITANIUM).land().land().land(PLANT).land(PLANT, STEEL).ocean(PLANT);
      b.land().land(PLANT).land(ENERGY, ENERGY, ENERGY).land().land(PLANT).land(PLANT).land(PLANT);
      b.volcanic(STEEL, STEEL).land(PLANT, PLANT).land().land(ENERGY, ENERGY).land().land().volcanic(CARD).land();
      b.land().land(PLANT, ENERGY).land(ENERGY, ENERGY).land(STEEL).land(STEEL)
        .land(CARD).land().land(STEEL).ocean(CARD);
      b.volcanic(CARD, CARD).land().land(TITANIUM).land().land().land(STEEL, STEEL).land().land(STEEL, STEEL);
      b.land().land(TITANIUM).land(PLANT).land(PLANT, STEEL, STEEL).land(PLANT, PLANT).land(PLANT).ocean(PLANT, PLANT);
      b.ocean(STEEL, STEEL).land(PLANT).land(TITANIUM).land(CARD).land(PLANT).ocean(PLANT);
      b.ocean(PLANT, PLANT).ocean(PLANT, PLANT).ocean(PLANT, PLANT).land(PLANT).ocean(PLANT, PLANT);
    }
  },
  amazonis: {
    name: "アマゾニス平原",
    englishName: "Amazonis Planitia",
    // Printed board: https://boardgamegeek.com/image/8344818/terraforming-mars-amazonis-and-vastitas
    tilesPerRow: [6, 7, 8, 9, 10, 11, 10, 9, 8, 7, 6],
    volcanoNames: ["Hecates Tholus", "Olympus Mons", "Ascraeus Mons", "Pavonis Mons", "Arsia Mons"],
    build(b) {
      b.land(STEEL).land(STEEL, STEEL).land(STEEL).land(TITANIUM).land(WILD, WILD).land();
      b.ocean().land(DELEGATE).land(STEEL).land().land(PLANT).ocean(PLANT, PLANT).ocean(WILD, WILD);
      b.ocean(STEEL, STEEL).land().land(TITANIUM, TITANIUM).land().land(PLANT).ocean().land().land();
      b.land(WILD).ocean().land().land().land(PLANT).land(PLANT).land(PLANT, PLANT).land(PLANT).land(PLANT, TITANIUM);
      b.volcanic(STEEL, STEEL).land(PLANT).land(CARD).land(PLANT).ocean(TITANIUM).land(PLANT).land(PLANT, PLANT).land(PLANT).land(CARD).ocean(PLANT, PLANT);
      b.land(PLANT).land(PLANT).land(PLANT, PLANT).land(PLANT, PLANT).ocean(PLANT, PLANT).ocean(PLANT, PLANT)
        .land(STEEL, PLANT, PLANT).land(PLANT).land().land(PLANT).ocean(TITANIUM);
      b.land(PLANT).land(PLANT, PLANT).ocean(PLANT, PLANT).land(ENERGY, ENERGY).land(ENERGY)
        .land(ENERGY, ENERGY).land(PLANT).land(PLANT).land().land();
      b.land().ocean(TITANIUM, TITANIUM).land(PLANT).land(ENERGY).land(ENERGY, ENERGY)
        .land(PLANT).volcanic(DELEGATE, DELEGATE).land(STEEL).volcanic(DELEGATE);
      b.ocean(STEEL, WILD).land().land(WILD).land().land().land(PLANT, PLANT).land().volcanic(WILD);
      b.ocean().land().land(CARD).land().land(PLANT, PLANT, PLANT).land(PLANT, PLANT).volcanic(STEEL, STEEL);
      b.land().land(STEEL, WILD).land(STEEL, STEEL).land().land(PLANT).land(TITANIUM);
    }
  }
};

function buildCells(definition) {
  const builder = makeBuilder();
  definition.build(builder);
  const { spaceTypes, bonuses, volcanic, restricted, unshufflable } = builder.result();

  const tilesPerRow = definition.tilesPerRow ?? TILES_PER_ROW;
  const total = tilesPerRow.reduce((sum, count) => sum + count, 0);
  if (spaceTypes.length !== total) {
    throw new Error(`${definition.englishName}: expected ${total} spaces, got ${spaceTypes.length}`);
  }

  const volcanoOrder = [...volcanic].sort((a, b) => a - b);
  const cells = [];
  let idx = 0;
  for (let row = 0; row < tilesPerRow.length; row++) {
    const tilesInThisRow = tilesPerRow[row];
    const radius = Math.floor(tilesPerRow.length / 2);
    const xOffset = tilesPerRow[radius] - tilesInThisRow;
    for (let i = 0; i < tilesInThisRow; i++) {
      const id = String(idx + (definition.tilesPerRow ? 1 : 3)).padStart(2, "0");
      const bonus = bonuses[idx];
      const r = row - radius;
      const q = xOffset + i + (definition.tilesPerRow ? Math.min(0, radius - row) : ROW_SHIFT[row]);

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
    `// Standard maps follow the reference builder; Amazonis follows the 91-space printed board.\n` +
    `export const ALTERNATE_BOARDS = {\n${body}\n};\n`,
  "utf8"
);

for (const [key, board] of Object.entries(output)) {
  const oceans = board.cells.filter(c => c.isOceanOnly).length;
  console.log(`${key.padEnd(10)} ${board.cells.length} spaces, ${oceans} ocean areas`);
}
