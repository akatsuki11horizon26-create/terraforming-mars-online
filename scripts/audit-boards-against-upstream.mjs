// Compares every alternate map's builder calls against the reference
// implementation's own board sources.
//
// The four maps were transcribed by hand from src/server/boards/*Board.ts, and
// three of them were perfect. Amazonis was not: the last four spaces of row
// y=4 carried the wrong bonuses and dropped a volcanic space entirely, which
// no test could see because every test asked "are there 61 spaces" and "do the
// maps differ from each other" -- both true of a wrong board.
//
// This normalises both sides to the same shape and diffs them, so the next
// transcription slip is a failed audit rather than a quietly wrong map.
//
// Usage:
//   git clone <upstream> <dir> && git checkout <REF>
//   TM_SOURCE=<dir> node scripts/audit-boards-against-upstream.mjs
//
// Without a checkout it reports that it could not run and exits 0: CI has no
// upstream clone, and an audit that fails for lack of input teaches nothing.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = process.env.TM_SOURCE ?? "C:/Users/takkun/AppData/Local/Temp/tm-src";
const boardsDir = join(sourceRoot, "src/server/boards");

const MAPS = [
  { id: "hellas", file: "HellasBoard.ts" },
  { id: "elysium", file: "ElysiumBoard.ts" },
  { id: "utopia", file: "UtopiaPlanitiaBoard.ts" },
  { id: "terra-cimmeria", file: "TerraCimmeriaBoard.ts" },
  { id: "amazonis", file: "AmazonisBoard.ts" }
];

if (!existsSync(boardsDir)) {
  console.log(`no upstream checkout at ${sourceRoot}; set TM_SOURCE to compare.`);
  console.log("boards not compared.");
  process.exit(0);
}

// Both sides are chained builder calls. Reduce each to one string per row so a
// difference names the row rather than a character offset.
function normalise(chain) {
  return chain
    .trim()
    .replace(/^(builder|b)\./, "")
    .replace(/SpaceBonus\./g, "")
    .replace(/DRAW_CARD/g, "CARD")
    .replace(/\s+/g, "")
    .replace(/;$/, "");
}

// Collect complete statements: a chain may be split across lines.
function rowsFrom(text, prefix) {
  const rows = [];
  let buffer = "";
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const starts = trimmed.startsWith(prefix);
    if (!starts && !(buffer && trimmed.startsWith("."))) continue;
    buffer += trimmed;
    if (trimmed.endsWith(";")) {
      rows.push(normalise(buffer));
      buffer = "";
    }
  }
  return rows.filter(row => !row.includes("build()"));
}

const ours = readFileSync(new URL("./generate-boards.mjs", import.meta.url), "utf8");

function ourRows(id) {
  // A key with a hyphen has to be quoted in the object literal; one without
  // may or may not be.
  const start = [`  ${id}: {`, `  "${id}": {`]
    .map(marker => ours.indexOf(marker))
    .find(index => index >= 0);
  if (start === undefined) throw new Error(`${id} is not in generate-boards.mjs`);
  const buildAt = ours.indexOf("build(b) {", start);
  const end = ours.indexOf("\n    }", buildAt);
  return rowsFrom(ours.slice(buildAt, end), "b.");
}

let problems = 0;
for (const map of MAPS) {
  const upstream = rowsFrom(readFileSync(join(boardsDir, map.file), "utf8"), "builder.");
  const mine = ourRows(map.id);

  if (upstream.length !== mine.length) {
    console.log(`PROBLEM ${map.id}: ${mine.length} rows here, ${upstream.length} upstream`);
    problems += 1;
    continue;
  }
  let differing = 0;
  for (let row = 0; row < upstream.length; row += 1) {
    if (upstream[row] === mine[row]) continue;
    differing += 1;
    problems += 1;
    console.log(`PROBLEM ${map.id} row ${row}:`);
    console.log(`  upstream: ${upstream[row]}`);
    console.log(`  ours    : ${mine[row]}`);
  }
  console.log(`${map.id.padEnd(10)} ${upstream.length} rows, ${differing} differing`);
}

console.log(problems === 0 ? "every map matches the reference boards." : `${problems} problems.`);
process.exit(problems === 0 ? 0 : 1);
