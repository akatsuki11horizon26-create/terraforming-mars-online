// Downloads the reference implementation's source for every card whose
// effectSpec came out empty, so the spec can be regenerated from what the card
// actually declares rather than from its description line.
//
// The description alone is not enough: Ants ships `description: 'Requires 4%
// oxygen.'` and keeps its real behaviour in an `action:` block, which is why
// those cards read as requirement-only in our catalog.
//
// Usage: node scripts/fetch-missing-card-sources.mjs [outDir]
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { FULL_PROJECTS, FULL_PRELUDES, FULL_CORPORATIONS } from "../app/full-card-catalog.js";

const BASE = "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars/main/";
const OUT = process.argv[2] ?? join(process.env.TEMP ?? "/tmp", "tm-card-sources");
const CONCURRENCY = 6;

const missing = [...FULL_PROJECTS, ...FULL_PRELUDES, ...FULL_CORPORATIONS].filter(
  card => !card.effectSpec || Object.keys(card.effectSpec).length === 0
);

await mkdir(OUT, { recursive: true });

const failures = [];
let done = 0;

async function fetchOne(card) {
  const target = join(OUT, card.id + ".ts");
  // Skip what is already on disk so a re-run is cheap and resumable.
  try {
    const existing = await readFile(target, "utf8");
    if (existing.length > 0) return;
  } catch {
    // not fetched yet
  }
  const url = BASE + card.source;
  const response = await fetch(url);
  if (!response.ok) {
    failures.push([card.id, card.source, response.status]);
    return;
  }
  await writeFile(target, await response.text(), "utf8");
}

const queue = [...missing];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const card = queue.shift();
      try {
        await fetchOne(card);
      } catch (error) {
        failures.push([card.id, card.source, error.message]);
      }
      done += 1;
      if (done % 20 === 0) process.stdout.write(`  ${done}/${missing.length}\n`);
    }
  })
);

console.log(`fetched ${missing.length - failures.length}/${missing.length} into ${OUT}`);
if (failures.length > 0) {
  console.log("failed:");
  for (const [id, source, why] of failures) console.log("  ", id, source, why);
}
