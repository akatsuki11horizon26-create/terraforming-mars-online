// Finds curated card effects the engine never reads.
//
// official-content.js hangs bespoke rules off an `effects` object, and nothing
// ties those keys to the code that honours them: a card can declare
// `firstAward: true` and have the rule simply not exist. That is how Vitor gave
// away a free award nobody was charged for and Valley Trust silently skipped
// three preludes -- both cards played, changed state, and passed coverage.
//
// A flag with zero readers is either an unimplemented rule or a dead constant.
// Both are worth seeing; only a human can say which.
//
// Usage: node scripts/audit-unread-flags.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CORPORATIONS, PRELUDES, OFFICIAL_PROJECTS } from "../app/official-content.js";

const APP = new URL("../app/", import.meta.url).pathname.replace(/^\//, "");
const code = readdirSync(APP)
  .filter(name => /\.(js|tsx?)$/.test(name) && name !== "official-content.js" && name !== "full-card-catalog.js")
  .map(name => readFileSync(join(APP, name), "utf8"))
  .join("\n");

const GROUPS = { corporation: CORPORATIONS, prelude: PRELUDES, project: OFFICIAL_PROJECTS };

let unreadTotal = 0;
for (const [kind, list] of Object.entries(GROUPS)) {
  const flags = new Map();
  for (const card of list) {
    for (const key of Object.keys(card.effects ?? {})) {
      if (!flags.has(key)) flags.set(key, []);
      flags.get(key).push(card.name);
    }
  }
  const unread = [...flags].filter(([key]) => !code.includes(key));
  unreadTotal += unread.length;
  console.log(`${kind}: ${list.length} cards, ${flags.size} flags, ${unread.length} unread`);
  for (const [key, names] of unread) console.log(`  ${key} -> ${names.join(", ")}`);
}

if (unreadTotal > 0) {
  console.error(`\n${unreadTotal} curated flag(s) have no reader in app/.`);
  process.exit(1);
}
console.log("\nEvery curated flag has a reader.");
