// Extracts the "what is this card worth?" cases from the reference
// implementation's own test suite.
//
// audit-vp-against-upstream compares our victory point SPEC with the real
// card's, and audit-card-scoring measures our scorer at the boundaries. Neither
// asks the question these cases ask: put this many resources on the card, this
// many tags in play, and count. A spec can match perfectly and still be scored
// wrongly, and a boundary sweep only tests the shapes it knows how to drive.
//
// Only cases whose every setup line is understood are kept. A case with one
// unrecognised line is dropped and counted.
//
// Usage: UPSTREAM_REF=<sha> node scripts/build-upstream-vp-cases-manifest.mjs > data/upstream-vp-cases.json
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const RAW = "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars";
const REF = process.env.UPSTREAM_REF ?? "main";
const CONCURRENCY = 10;

const PARAMETER = {
  setOxygenLevel: "oxygen",
  setTemperature: "temperature",
  setVenusScaleLevel: "venus"
};

// Lines that set nothing a score depends on. Declaring the card, running the
// deferred queue, putting the card into play -- the rig does all three anyway.
const IGNORED = [
  /^const card\s*=/,
  /^card\.play\(player\)\s*;?$/,
  /^player\.playedCards\.push\(card\)\s*;?$/,
  /^runAllActions\(\w+\)\s*;?$/
];

function readSetupLine(line) {
  const text = line.trim();
  if (!text || text.startsWith("//")) return { kind: "noop" };
  if (IGNORED.some(pattern => pattern.test(text))) return { kind: "noop" };

  // A case that starts its own game is asking about a different table.
  if (/testGame\(/.test(text)) return null;

  for (const [helper, parameter] of Object.entries(PARAMETER)) {
    const match = text.match(new RegExp(`^${helper}\\(game,\\s*(-?\\d+)\\)`));
    if (match) return { kind: "parameter", parameter, value: Number(match[1]) };
  }
  if (/^maxOutOceans\(player\)/.test(text)) return { kind: "parameter", parameter: "oceans", value: 9 };

  // "player.addResourceTo(card, 5)" and "card.resourceCount = 5" both mean the
  // same thing: this many resources sitting on the card being scored.
  const added = text.match(/^player\.addResourceTo\(card,\s*(\d+)\)/);
  if (added) return { kind: "cardResource", amount: Number(added[1]) };
  const held = text.match(/^card\.resourceCount\s*=\s*(\d+)/);
  if (held) return { kind: "cardResource", amount: Number(held[1]) };

  const tags = text.match(/^player\.tagsForTest\s*=\s*\{([^}]*)\}/);
  if (tags) {
    const entries = {};
    for (const part of tags[1].split(",")) {
      const pair = part.split(":");
      if (pair.length !== 2) continue;
      entries[pair[0].trim().replace(/['"]/g, "")] = Number(pair[1].trim());
    }
    return { kind: "tags", tags: entries };
  }

  return null;
}

const ASSERTION = /^expect\(card\.getVictoryPoints\(player\)\)\.to\.eq\((-?\d+)\)/;

function casesIn(text) {
  const cases = [];
  for (const block of text.matchAll(/\bit\((['"])(.*?)\1[^]*?\n {2}\}\)/g)) {
    const body = block[0];
    const title = block[2];
    if (!body.split("\n").some(line => ASSERTION.test(line.trim()))) continue;

    const steps = [];
    let expected = null;
    let understood = true;
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (/^it\(/.test(line) || line === "})" || line === "});") continue;

      const assertion = line.match(ASSERTION);
      if (assertion) {
        // Everything before the FIRST score assertion is its setup. A block
        // that adds more resources and counts again is a second case, and only
        // the first is kept -- carrying on would need the running total.
        expected = Number(assertion[1]);
        break;
      }
      if (/^expect\(/.test(line)) continue;

      const step = readSetupLine(line);
      if (!step) { understood = false; break; }
      if (step.kind !== "noop") steps.push(step);
    }

    if (!understood || expected === null) {
      cases.push({ title, dropped: true });
      continue;
    }
    cases.push({ title, steps, expected });
  }
  return cases;
}

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const manifest = {};
const stats = { cards: 0, kept: 0, dropped: 0, noSpec: 0 };

const readOne = async card => {
  if (!card.source) { stats.noSpec += 1; return; }
  const specPath = card.source.replace(/^src\/server\//, "tests/").replace(/\.ts$/, ".spec.ts");
  const response = await fetch(`${RAW}/${REF}/${specPath}`);
  if (!response.ok) { stats.noSpec += 1; return; }
  const found = casesIn(await response.text());
  const kept = found.filter(entry => !entry.dropped);
  const dropped = found.filter(entry => entry.dropped);
  stats.dropped += dropped.length;
  if (kept.length === 0 && dropped.length === 0) return;
  if (kept.length > 0) stats.cards += 1;
  stats.kept += kept.length;
  // Dropped blocks are recorded by name, not merely counted. A manifest that
  // reports no skips while its builder threw away half the corpus says the
  // audit is complete when it is not.
  manifest[card.id] = {
    spec: specPath,
    cases: kept,
    ...(dropped.length > 0
      ? { unread: dropped.map(entry => ({ title: entry.title, reason: entry.reason ?? "setup not understood" })) }
      : {})
  };
};

for (let index = 0; index < cards.length; index += CONCURRENCY) {
  await Promise.all(cards.slice(index, index + CONCURRENCY).map(readOne));
}

console.log(JSON.stringify({ ref: REF, cards: manifest }, null, 2));
console.error(
  `cards with usable cases: ${stats.cards}, cases kept: ${stats.kept}, ` +
  `cases dropped as not understood: ${stats.dropped}, cards with no spec: ${stats.noSpec}`
);
