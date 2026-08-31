// Ownership is per method, not per card.
//
// The skip ledger asks whether a test mentions a card id anywhere in its text.
// That is a pointer to a test, not a claim about behaviour: a card with four
// hand-written methods passes because one of them is covered, and a card whose
// declaration is empty passes because the id appears in a test that never
// exercises the method. Six corporations sat behind that for months -- every
// audit green, every one of them doing nothing but handing out starting money.
//
// So each hand-written upstream method gets its own row, and a row is owned
// only when a named test exercises it AND the engine has somewhere to run it
// from. The second half is what the six would have failed: their declaration
// was empty, so `reachableFrom` was nothing at all.
//
// The 221 rows outside canAct/action start unreviewed and are held by a
// baseline, exactly as the inert-card ratchet holds its own list: the set is
// pinned by name, so a row that appears or disappears fails rather than being
// absorbed into a count. STRICT is the set that must be fully owned today.
//
// Usage: node scripts/audit-bespoke-methods.mjs [--list] [--unreviewed]
import { readFileSync, readdirSync } from "node:fs";
import { CORPORATIONS, OFFICIAL_PROJECTS, PRELUDES } from "../app/official-content.js";

const ledger = JSON.parse(readFileSync(new URL("../data/upstream-bespoke.json", import.meta.url), "utf8"));

// canAct and action already have a gate of their own: the bespoke inventory
// stages every one of them and fails when the engine cannot offer it.
const OWNED_ELSEWHERE = new Set(["canAct", "action"]);

// The six corporations whose abilities were missing entirely. Their methods are
// held to the full standard now -- a named test, and a place in the engine the
// method can actually run from -- because they are the ones that proved the
// weaker check does not hold.
const STRICT = new Set([
  "card-colonies-aridor",
  "card-prelude2-spire",
  "card-turmoil-lakefront-resorts",
  "card-promo-neptunian-power-consultants",
  "card-promo-philares",
  "card-venus-luxury-foods"
]);

// What each method needs on our side before a test can mean anything. An empty
// declaration with no engine reference is the shape the six shipped in.
const ENGINE_HOOKS = {
  bespokePlay: ["effectSpec", "effect", "effects"],
  bespokeCanPlay: ["requirements", "effectSpec", "effect"],
  initialAction: ["effects"],
  onCardPlayed: ["effects"],
  onNonCardTagAdded: ["effects"],
  onTilePlaced: ["effects"],
  onDiscard: ["effects"],
  onResourceAdded: ["effectSpec", "effects"],
  onStandardProject: ["effects"],
  onProductionPhase: ["effects"],
  getVictoryPoints: ["victoryPoints", "victoryPointSpec", "specialVictoryKind"]
};

const cards = new Map(
  [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS].map(card => [card.id, card])
);

const testDir = new URL("../tests/", import.meta.url);
const tests = readdirSync(testDir)
  .filter(name => name.endsWith(".test.mjs"))
  .map(name => ({ name, text: readFileSync(new URL(name, testDir), "utf8") }));

// A test owns a method when it names the card and reaches the behaviour the
// method stands for -- not merely when the id appears somewhere in the file.
const METHOD_EVIDENCE = {
  bespokePlay: [/playCard|applyCardEffect|applyPreludes|applyCorporation\b/],
  bespokeCanPlay: [/getCardPlayableStatus|canPlay/],
  initialAction: [/applyCorporationInitialAction|initialAction/],
  onCardPlayed: [/applyCorporationTriggers|onCardPlayed/],
  onNonCardTagAdded: [/applyCorporationTriggers|countActiveTags|seenTagTypes/],
  onTilePlaced: [/placeTileAt|placeTile\b/],
  onDiscard: [/discard/i],
  onResourceAdded: [/changeCardResource|cardResources/],
  onStandardProject: [/standard[- ]?project/i],
  onProductionPhase: [/production/i],
  getVictoryPoints: [/victoryPoints|scoreFor|计|getScore/i]
};

// The block of a test that names this card, so a hit in an unrelated test does
// not count as evidence for it.
const blocksNaming = cardId =>
  tests.flatMap(({ name, text }) =>
    text
      .split(/\ntest\(/)
      .filter(block => block.includes(cardId))
      .map(block => ({ name, block }))
  );

// A card whose behaviour is written directly into the engine against its id is
// reachable too -- Neptunian Power Consultants is driven by a constant, not by
// a declaration. What must never pass is a card with neither: no declaration
// and no engine reference is exactly the shape the six shipped in.
const engineText = [
  readFileSync(new URL("../app/game-logic.js", import.meta.url), "utf8"),
  readFileSync(new URL("../app/game-command.js", import.meta.url), "utf8"),
  readFileSync(new URL("../app/pending-choice.js", import.meta.url), "utf8")
].join(" ");

const namedInEngine = cardId => engineText.includes(`"${cardId}"`);

const engineReferences = card => {
  const hooks = new Set();
  for (const [method, fields] of Object.entries(ENGINE_HOOKS)) {
    for (const field of fields) {
      const value = card?.[field];
      const populated =
        Array.isArray(value) ? value.length > 0
          : value && typeof value === "object" ? Object.keys(value).length > 0
            : value !== undefined && value !== null && value !== 0;
      if (populated) hooks.add(method);
    }
  }
  return hooks;
};

const rows = [];
for (const [cardId, entry] of Object.entries(ledger.cards)) {
  for (const method of entry.methods ?? []) {
    if (OWNED_ELSEWHERE.has(method)) continue;
    rows.push({ key: `${cardId}#${method}`, cardId, method, source: entry.source });
  }
}

const owned = [];
const unowned = [];
for (const row of rows) {
  const card = cards.get(row.cardId);
  if (!card) {
    unowned.push([row.key, "not in the catalogue"]);
    continue;
  }
  const naming = blocksNaming(row.cardId);
  const patterns = METHOD_EVIDENCE[row.method] ?? [];
  const test = naming.find(({ block }) => patterns.some(pattern => pattern.test(block)));
  const reachable = engineReferences(card).has(row.method) || namedInEngine(row.cardId);

  if (test && reachable) owned.push([row.key, `${test.name}`]);
  else if (!reachable) unowned.push([row.key, "the engine has nothing to run it from"]);
  else unowned.push([row.key, "no test exercises this method"]);
}

const strictRows = rows.filter(row => STRICT.has(row.cardId));
const strictUnowned = unowned.filter(([key]) => STRICT.has(key.split("#")[0]));

console.log(`hand-written methods outside canAct/action: ${rows.length}`);
console.log(`  owned by a named test that reaches them : ${owned.length}`);
console.log(`  not yet owned                           : ${unowned.length}`);
console.log(`strict set (the six that shipped inert)    : ${strictRows.length}`);
console.log(`  unowned in the strict set               : ${strictUnowned.length}`);

for (const [key, why] of strictUnowned) console.log(`\nPROBLEM ${key}: ${why}`);

if (process.argv.includes("--list")) {
  for (const [key, why] of owned) console.log(`${key.padEnd(56)} ${why}`);
}
if (process.argv.includes("--unreviewed")) {
  for (const [key, why] of unowned) console.log(`${key.padEnd(56)} ${why}`);
}

// The strict set is a hard gate. The rest is reported, not enforced: making all
// 221 fail at once would leave nobody able to move, and a number nobody can act
// on is the kind of green that hid the six in the first place.
process.exitCode = strictUnowned.length > 0 ? 1 : 0;
