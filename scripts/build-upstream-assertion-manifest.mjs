// Every assertion in the upstream test blocks our oracles could not read.
//
// The three oracles report 335 dropped blocks -- 318 once the overlap between
// them is removed. "Dropped" means their builder could not reduce the block to
// a case, usually because the test arranges its game through helpers. The skip
// ledger then asks only whether some local test names the same card, which is a
// pointer to a test rather than a claim that the same thing is checked.
//
// This goes down to the assertion. Each `expect(...)` in those blocks becomes a
// row with a stable id, the text of the claim, and a hash of its source, so the
// coverage file can say which local test carries each one -- and so an upstream
// edit to a block invalidates the row rather than passing silently.
//
// Usage: TM_SOURCE=<checkout> node scripts/build-upstream-assertion-manifest.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const sourceRoot = process.env.TM_SOURCE ?? "C:/Users/takkun/AppData/Local/Temp/tm-src";
const outFile = process.env.ASSERTION_MANIFEST_OUTPUT ?? "data/upstream-assertions.json";
const REF = "1b26fe6989fe53c6a2a76cfe92f08eb9228f832f";

const ORACLES = [
  "../data/upstream-playable.json",
  "../data/upstream-actions.json",
  "../data/upstream-vp-cases.json"
];

// The blocks the oracles dropped, keyed by spec path so the same block reported
// by two oracles is one row rather than two.
const dropped = new Map();
for (const path of ORACLES) {
  const oracle = JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
  for (const [cardId, entry] of Object.entries(oracle.cards)) {
    for (const block of entry.unread ?? []) {
      const key = `${entry.spec}|${block.title}`;
      if (!dropped.has(key)) {
        dropped.set(key, { cardId, spec: entry.spec, title: block.title, reasons: new Set() });
      }
      dropped.get(key).reasons.add(block.reason);
    }
  }
}

// What each assertion claims, as far as it can be read from the call itself.
// Anything this cannot classify is left unclassified rather than guessed at --
// a wrong label here would be worse than no label.
const CLAIM_KINDS = [
  [/\bcanPlay\b/, "playable"],
  [/\bcanAct\b/, "action-available"],
  [/getVictoryPoints|victoryPoints/, "victory-points"],
  [/production\.(megacredits|steel|titanium|plants|energy|heat)/, "production"],
  [/player\.(megaCredits|steel|titanium|plants|energy|heat)\b/, "stock"],
  [/resourceCount|addResourceTo|removeResourceFrom/, "card-resource"],
  [/getTemperature|getOxygenLevel|getVenusScaleLevel|board\.|spaces/, "board-or-global"],
  [/terraformRating/, "terraform-rating"],
  [/cardsInHand|playedCards|tableau/, "hand-or-tableau"],
  [/popWaitingFor|deferred|OrOptions|SelectCard|SelectSpace|SelectOption/, "pending-input"]
];

const classify = text => {
  for (const [pattern, kind] of CLAIM_KINDS) if (pattern.test(text)) return kind;
  return null;
};

// Split a spec file into its `it(...)` blocks, keeping their order so a block
// title that appears twice in one file is still addressable.
const blocksIn = source => {
  const found = [];
  const pattern = /\n\s*it\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    found.push({ title: match[2], start: match.index, ordinal: found.length });
  }
  for (let i = 0; i < found.length; i++) {
    found[i].end = i + 1 < found.length ? found[i + 1].start : source.length;
    found[i].body = source.slice(found[i].start, found[i].end);
  }
  return found;
};

const assertions = [];
const unmatched = [];

for (const entry of dropped.values()) {
  let source;
  try {
    source = readFileSync(join(sourceRoot, entry.spec), "utf8");
  } catch {
    unmatched.push([entry.spec, "spec file not found in the checkout"]);
    continue;
  }

  const blocks = blocksIn(source).filter(block => block.title === entry.title);
  if (blocks.length === 0) {
    unmatched.push([`${entry.spec}|${entry.title}`, "block not found by title"]);
    continue;
  }

  for (const block of blocks) {
    const calls = [...block.body.matchAll(/expect\(([\s\S]*?)\)\s*\.([\s\S]*?);/g)];
    if (calls.length === 0) {
      unmatched.push([`${entry.spec}|${entry.title}`, "block asserts nothing this can read"]);
      continue;
    }
    calls.forEach((call, index) => {
      const text = `expect(${call[1]}).${call[2]}`.replace(/\s+/g, " ").trim();
      assertions.push({
        id: `${entry.spec}#${block.ordinal}#${index}`,
        cardId: entry.cardId,
        spec: entry.spec,
        blockOrdinal: block.ordinal,
        blockTitle: entry.title,
        assertionOrdinal: index,
        // An upstream edit changes this, which invalidates the row rather than
        // letting a stale coverage claim stand.
        sourceHash: `sha256:${createHash("sha256").update(text).digest("hex").slice(0, 16)}`,
        assertionText: text.slice(0, 200),
        claimKind: classify(text),
        droppedBecause: [...entry.reasons].sort()
      });
    });
  }
}

const classified = assertions.filter(row => row.claimKind !== null);
const byKind = new Map();
for (const row of classified) byKind.set(row.claimKind, (byKind.get(row.claimKind) ?? 0) + 1);

writeFileSync(outFile, `${JSON.stringify({ ref: REF, assertions }, null, 1)}\n`);

console.log(`upstream blocks the oracles dropped: ${dropped.size}`);
console.log(`assertions extracted from them     : ${assertions.length}`);
console.log(`  classified                       : ${classified.length}`);
console.log(`  unclassified                     : ${assertions.length - classified.length}`);
console.log(`blocks yielding nothing            : ${unmatched.length}`);
for (const [kind, count] of [...byKind].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${kind}`);
}
