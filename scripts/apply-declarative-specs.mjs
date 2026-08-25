// Turns the extracted declarative specs into curated overrides.
//
// Only the cards the engine can actually run are applied. A spec whose keys
// normalizeBehavior does not read would leave the card just as inert while
// looking implemented, which is the failure mode the whole audit exists to
// avoid, so those are reported and skipped.
//
// Usage: node scripts/apply-declarative-specs.mjs [--write]
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const WORK = join(process.env.TEMP ?? "/tmp", "luna-decl");
const extracted = JSON.parse(await readFile(join(WORK, "merged.json"), "utf8"));

const ready = extracted.filter(entry => entry.engineCompatibility === "full");
const blocked = extracted.filter(entry => entry.engineCompatibility !== "full");

console.log(`ready: ${ready.length}   blocked: ${blocked.length}\n`);

// Emit the override lines for pasting into official-content.js, so the file
// stays hand-reviewed rather than machine-rewritten.
for (const entry of ready) {
  const spec = JSON.stringify(entry.effectSpec);
  console.log(`  ${entry.cardId}`);
  console.log(`    ${spec}`);
  console.log(`    JP: ${entry.existingJapanese ?? entry.suggestedJapanese ?? "(none)"}`);
  console.log("");
}

if (blocked.length > 0) {
  console.log("blocked on engine capabilities:");
  for (const entry of blocked) {
    console.log(`  ${entry.cardId.padEnd(40)} ${JSON.stringify(entry.missingCapabilities ?? [])}`);
  }
}
