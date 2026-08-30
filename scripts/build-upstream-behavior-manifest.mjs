// Extracts the behaviour each card DECLARES upstream, so ours can be compared
// with it.
//
// The printed-value audit compares what is on the card face. The three oracles
// run the reference's own tests. Neither asks the question this one does: does
// our spec say the same thing upstream's does? A card can print the right cost
// and pass every test anyone wrote about it while its declared effect quietly
// differs in a key nobody tested.
//
// Only the top-level keys are read, and only from cards whose block parses. A
// block that does not is recorded by name rather than dropped, because the
// number of cards this cannot read is the honest measure of what it covers.
//
// Usage: UPSTREAM_REF=<sha> node scripts/build-upstream-behavior-manifest.mjs > data/upstream-behavior.json
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const RAW = "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars";
const REF = process.env.UPSTREAM_REF ?? "main";
const CONCURRENCY = 8;

// Takes the text from an opening brace to its match, so a nested object comes
// out whole rather than truncated at the first line.
const blockAt = (text, start) => {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return null;
};

// TypeScript object literal to JSON. The vocabulary in these blocks is small:
// bare keys, enum members, quoted strings, numbers, booleans and nesting.
const toJson = source => {
  const withoutComments = source.replace(/\/\/[^\n]*/g, "");
  const normalised = withoutComments
    // Enum members become their leaf, lowercased, the way every other audit
    // compares them: CardResource.MICROBE and Tag.SPACE are values, not paths.
    .replace(/\b(?:CardResource|Tag|Resource|PartyName|SpaceType|TileType|CardType|SpaceBonus)\.(\w+)/g,
      (whole, leaf) => `"${leaf.toLowerCase()}"`)
    .replace(/'([^']*)'/g, (whole, inner) => JSON.stringify(inner))
    // A bare key becomes a quoted one.
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
    // A trailing comma is legal TypeScript and not JSON.
    .replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(normalised);
  } catch {
    return null;
  }
};

const declaredBlock = (text, key) => {
  const opener = new RegExp(`^ {4,8}${key}:\\s*\\{`, "m");
  const match = text.match(opener);
  if (!match) return undefined;
  const braceAt = text.indexOf("{", match.index);
  const block = blockAt(text, braceAt);
  return block === null ? null : toJson(block);
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const manifest = {};
const stats = { read: 0, unreadable: 0, absent: 0 };

const readOne = async card => {
  if (!card.source) { stats.absent += 1; return; }
  const response = await fetch(`${RAW}/${REF}/${card.source}`);
  if (!response.ok) { stats.absent += 1; return; }
  const text = await response.text();

  const entry = { source: card.source };
  let sawSomething = false;
  let unreadable = false;
  for (const key of ["behavior", "action"]) {
    const parsed = declaredBlock(text, key);
    if (parsed === undefined) continue;
    sawSomething = true;
    if (parsed === null) { unreadable = true; continue; }
    entry[key] = parsed;
  }

  if (!sawSomething) { stats.absent += 1; return; }
  if (unreadable && !entry.behavior && !entry.action) {
    entry.unreadable = "declared a block this cannot parse";
    stats.unreadable += 1;
  } else {
    stats.read += 1;
  }
  manifest[card.id] = entry;
};

for (let index = 0; index < cards.length; index += CONCURRENCY) {
  await Promise.all(cards.slice(index, index + CONCURRENCY).map(readOne));
}

console.log(JSON.stringify({ ref: REF, cards: manifest }, null, 2));
console.error(
  `declared blocks read: ${stats.read}, unreadable: ${stats.unreadable}, ` +
  `cards declaring none: ${stats.absent}`
);
