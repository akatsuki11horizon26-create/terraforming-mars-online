// Fetches the printed values of every card from the reference implementation
// and writes them to a manifest checked into the repo.
//
// Every other audit asks whether the engine honours our catalogue. None of them
// can ask whether our catalogue matches the real card -- a card whose cost says
// 9 where the real one says 11 is honoured perfectly by every contract, and is
// wrong in every game anyone plays.
//
// The manifest is committed rather than fetched during a test run: a check that
// depends on the network fails for reasons that have nothing to do with the
// code, and one that follows `main` silently changes what "correct" means when
// upstream edits a card.
//
// Usage: UPSTREAM_REF=<sha> node scripts/build-upstream-manifest.mjs > data/upstream-cards.json
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const RAW = "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars";
const REF = process.env.UPSTREAM_REF ?? "main";
const CONCURRENCY = 8;

// The printed values -- what is on the card face. Behaviour is deliberately not
// here: upstream expresses it as `behavior` objects, bespoke `play()` methods
// and class inheritance all at once, so a field-by-field comparison would
// report differences of expression rather than of rules.
const FIELDS = ["cost", "tags", "requirements", "type", "resourceType", "victoryPoints"];

// A card may declare a field twice: once as a render helper for the card face,
// once as the value the engine reads. The engine's form wins wherever both
// appear -- for victoryPoints that is the object or number, not the helper call.
// Only the constructor's own keys, which sit at six spaces. A deeper line is
// a key of some nested object and means something else entirely: Celestic's
// `type: CardResource.FLOATER` at ten spaces belongs to its resource
// declaration, and reading it as the card type says a corporation is a floater.
//
// A declaration that opens a brace or bracket and does not close it on its own
// line continues onto the next ones, and eleven cards write their requirements
// that way. Stopping at the first line would store `requirements: {` -- which
// reads as "requires nothing" and would report every requirement we correctly
// carry as one we invented.
const declarationsIn = (text, field) => {
  const lines = text.split("\n");
  const opener = new RegExp("^ {4,8}" + field + ":");
  const found = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!opener.test(lines[index])) continue;
    let declaration = lines[index];
    let depth = 0;
    for (const character of declaration) {
      if (character === "{" || character === "[") depth += 1;
      if (character === "}" || character === "]") depth -= 1;
    }
    let cursor = index;
    while (depth > 0 && cursor + 1 < lines.length) {
      cursor += 1;
      declaration += " " + lines[cursor].trim();
      for (const character of lines[cursor]) {
        if (character === "{" || character === "[") depth += 1;
        if (character === "}" || character === "]") depth -= 1;
      }
    }
    found.push(declaration.replace(/\s+/g, " "));
  }
  return found;
};

const preferred = (lines, field) => {
  if (lines.length === 0) return null;
  if (field !== "victoryPoints") return lines[0].trim().replace(/,$/, "");
  const engineForm = lines.find(line => /victoryPoints:\s*[{'"\-\d]/.test(line));
  return (engineForm ?? lines[0]).trim().replace(/,$/, "");
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const manifest = {};
const missing = [];

const readOne = async card => {
  if (!card.source) { missing.push([card.id, "no source path"]); return; }
  const response = await fetch(`${RAW}/${REF}/${card.source}`);
  if (!response.ok) { missing.push([card.id, `HTTP ${response.status}`]); return; }
  const text = await response.text();
  const entry = { source: card.source };
  for (const field of FIELDS) {
    const value = preferred(declarationsIn(text, field), field);
    if (value !== null) entry[field] = value;
  }
  // Three shapes carry no readable field, and all three are legitimate rather
  // than a wrong path: a prelude prints no cost or tags at all, a corporation
  // declares startingMegaCredits instead of a cost, and a handful of cards
  // (Mining Rights, Mining Area) pass their values positionally to a base
  // class. They are recorded as unreadable so the audit skips them by name
  // rather than silently having nothing to say.
  if (Object.keys(entry).length === 1) entry.unreadable = "no field declared in the constructor";
  manifest[card.id] = entry;
};

for (let index = 0; index < cards.length; index += CONCURRENCY) {
  await Promise.all(cards.slice(index, index + CONCURRENCY).map(readOne));
}

console.log(JSON.stringify({ ref: REF, cards: manifest }, null, 2));
for (const [id, why] of missing) console.error(`missing ${id}: ${why}`);
