// Pulls the `behavior:` / `action:` block out of each fetched reference source.
// Only the cards that declare one can be handled this way -- most implement
// their effect as TypeScript methods instead, which is not extractable data.
//
// Usage: node scripts/extract-declarative-specs.mjs [sourceDir]
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = process.argv[2] ?? join(process.env.TEMP ?? "/tmp", "tm-card-sources");

// Matches from the key to the line that closes it at the same indent depth.
function block(source, key) {
  const start = source.search(new RegExp("^[ \\t]+" + key + ":[ \\t]*\\{", "m"));
  if (start < 0) return null;
  const indent = source.slice(start).match(/^([ \t]+)/)[1];
  const rest = source.slice(start);
  const end = rest.search(new RegExp("^" + indent + "\\},?[ \\t]*$", "m"));
  if (end < 0) return null;
  return rest.slice(0, end + rest.slice(end).indexOf("\n"));
}

const files = (await readdir(DIR)).filter(f => f.endsWith(".ts"));
const found = [];
for (const file of files) {
  const source = await readFile(join(DIR, file), "utf8");
  const behavior = block(source, "behavior");
  const action = block(source, "action");
  if (!behavior && !action) continue;
  found.push({ id: file.replace(/\.ts$/, ""), behavior, action });
}

console.log(`cards declaring a behavior/action block: ${found.length} of ${files.length}\n`);
for (const card of found) {
  console.log("=".repeat(70));
  console.log(card.id);
  console.log("=".repeat(70));
  if (card.behavior) console.log(card.behavior);
  if (card.action) console.log(card.action);
  console.log("");
}
