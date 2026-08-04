// Splits the deck's art briefs into per-batch files for the art generator.
// Cards already drawn are skipped, so a rerun only covers what is missing.
//
// Usage: node scripts/split-art-briefs.mjs <out-dir> [--size=12] [--done=<dir>...]
import { readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const outDir = args.find(a => !a.startsWith("--"));
if (!outDir) {
  console.error("usage: node scripts/split-art-briefs.mjs <out-dir> [--size=N] [--done=<dir>]");
  process.exit(1);
}
const size = Number(args.find(a => a.startsWith("--size="))?.split("=")[1] ?? 12);
const doneDirs = args.filter(a => a.startsWith("--done=")).map(a => a.slice(7));

const done = new Set();
for (const dir of doneDirs) {
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir)) {
    if (file.endsWith(".svg")) done.add(file.replace(/\.svg$/, ""));
  }
}

const briefs = JSON.parse(
  execFileSync("node", ["scripts/build-art-briefs.mjs", "--json"], { maxBuffer: 1e8 }).toString()
);
const todo = briefs.filter(b => !done.has(b.id));

function render(b) {
  return (
    `${b.id}.svg | ${b.name} | タグ:${b.tags.join("/") || "なし"} | 種別:${b.type}\n` +
    `  ★中心に描くもの(最重要): ${b.focus}\n` +
    `  背景・文脈: ${b.setting}\n` +
    `  色調: ${b.palette}\n` +
    `  画の性格: ${b.mood}\n` +
    (b.supporting ? `  添える要素(脇役): ${b.supporting}\n` : "") +
    (b.requirement ? `  条件(背景に含める): ${b.requirement}\n` : "") +
    `  効果: ${b.effect}\n`
  );
}

mkdirSync(outDir, { recursive: true });
let count = 0;
for (let i = 0; i < todo.length; i += size) {
  const batch = todo.slice(i, i + size);
  const name = `batch-${String(++count).padStart(2, "0")}.txt`;
  writeFileSync(join(outDir, name), batch.map(render).join("\n"));
}

console.log(`${todo.length} cards to draw (${done.size} already done) -> ${count} batches in ${outDir}`);
