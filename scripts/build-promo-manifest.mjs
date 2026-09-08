// Records which official card number each promo card carries, so "74 promo
// cards" can be turned into a list of specific cards that a person can check
// against a physical collection.
//
// The audit's §4.1 asked for a promo table with product, year, card number and
// status, and noted that a total on its own identifies nothing. Upstream prints
// the official card number on every card (X13, R21, 033 ...), which is the part
// that can actually be verified from source. The product and the year are NOT
// in the source, and are deliberately not invented here.
//
// Usage:
//   git clone <upstream> <dir> && git checkout <REF>
//   TM_SOURCE=<dir> node scripts/build-promo-manifest.mjs
//
// The manifest is committed so audit-promo-coverage can run without a checkout.
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const sourceRoot = process.env.TM_SOURCE ?? "C:/Users/takkun/AppData/Local/Temp/tm-src";
const promoDir = join(sourceRoot, "src/server/cards/promo");
const outFile = process.env.PROMO_MANIFEST_OUTPUT ?? "data/promo-card-numbers.json";

if (!existsSync(promoDir)) {
  console.error(`no upstream checkout at ${sourceRoot}; set TM_SOURCE.`);
  process.exit(1);
}

// CardName.PSYCHE = 'Psyche' -- the enum value is the printed English name,
// which is what our own catalogue can be matched against.
const nameEnum = readFileSync(join(sourceRoot, "src/common/cards/CardName.ts"), "utf8");
const englishByKey = new Map();
for (const line of nameEnum.split(/\r?\n/)) {
  const match = /^\s*([A-Z0-9_]+)\s*=\s*'(.*)',?\s*$/.exec(line);
  if (!match) continue;
  englishByKey.set(match[1], match[2].replace(/\\'/g, "'"));
}

const files = readdirSync(promoDir).filter(name => name.endsWith(".ts"));
const entries = [];
for (const file of files) {
  const source = readFileSync(join(promoDir, file), "utf8");
  const key = /name:\s*CardName\.([A-Z0-9_]+)/.exec(source)?.[1];
  const cardNumber = /cardNumber:\s*'([^']+)'/.exec(source)?.[1];
  if (!key || !cardNumber) continue;
  entries.push({
    file,
    cardName: key,
    englishName: englishByKey.get(key) ?? null,
    cardNumber
  });
}

entries.sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));

// A duplicate number means the extraction misread a file, not that two cards
// share a number. Failing here beats writing a manifest nobody can trust.
const seen = new Map();
for (const entry of entries) {
  const clash = seen.get(entry.cardNumber);
  if (clash) throw new Error(`${entry.cardNumber} claimed by both ${clash} and ${entry.file}`);
  seen.set(entry.cardNumber, entry.file);
}

writeFileSync(
  outFile,
  JSON.stringify(
    {
      source: "src/server/cards/promo",
      // Every file that yielded no number is named, so the manifest cannot
      // quietly cover less than the directory holds.
      filesRead: files.length,
      numbered: entries.length,
      withoutNumber: files.filter(file => !entries.some(entry => entry.file === file)),
      cards: entries
    },
    null,
    2
  ) + "\n"
);

console.log(`${entries.length} numbered promo cards from ${files.length} files -> ${outFile}`);
