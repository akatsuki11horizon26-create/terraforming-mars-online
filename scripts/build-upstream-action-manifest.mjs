// Extracts the "can this card's action be used?" cases from the reference
// implementation's own test suite.
//
// The playability manifest asks whether a card can be played. This asks the
// other half: a blue card's action happens later, through its own command, and
// a card whose action can never be taken is the exact shape of the thirteen
// dead cards -- playable, paid for, and inert forever.
//
// Only cases whose every setup line is understood are kept. A case with one
// unrecognised line is dropped and counted: a half-applied setup asks a
// different question than the one upstream asked.
//
// Usage: UPSTREAM_REF=<sha> node scripts/build-upstream-action-manifest.mjs > data/upstream-actions.json
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const RAW = "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars";
const REF = process.env.UPSTREAM_REF ?? "main";
const CONCURRENCY = 10;

const PARAMETER = {
  setOxygenLevel: "oxygen",
  setTemperature: "temperature",
  setVenusScaleLevel: "venus"
};

const RESOURCE = {
  MEGACREDITS: "megacredits",
  STEEL: "steel",
  TITANIUM: "titanium",
  PLANTS: "plants",
  ENERGY: "energy",
  HEAT: "heat"
};

function readSetupLine(line) {
  const text = line.trim();
  if (!text || text.startsWith("//")) return { kind: "noop" };

  // A case that starts its own game is asking about a different table, and a
  // solo game answers questions a two-player one does not.
  if (/testGame\(/.test(text)) return null;

  // "player.playedCards.push(card)" puts the card under test into play, which
  // the rig does anyway. Any OTHER card being pushed changes what the answer
  // depends on, so those cases are dropped rather than half-applied.
  if (/^player\.playedCards\.push\(card\)\s*;?$/.test(text)) return { kind: "noop" };

  for (const [helper, parameter] of Object.entries(PARAMETER)) {
    const match = text.match(new RegExp(`^${helper}\\(game,\\s*(-?\\d+)\\)`));
    if (match) return { kind: "parameter", parameter, value: Number(match[1]) };
  }
  if (/^maxOutOceans\(player\)/.test(text)) return { kind: "parameter", parameter: "oceans", value: 9 };

  // "card.resourceCount = 3" is the resource sitting on the card under test.
  const held = text.match(/^card\.resourceCount\s*=\s*(\d+)/);
  if (held) return { kind: "cardResource", amount: Number(held[1]) };

  const production = text.match(/^player\.production\.(?:add|override)\(Resource\.(\w+),\s*(-?\d+)\)/);
  if (production) {
    const resource = RESOURCE[production[1]];
    if (!resource) return null;
    return { kind: "production", resource, amount: Number(production[2]) };
  }

  const stock = text.match(/^player\.(megaCredits|steel|titanium|plants|energy|heat)\s*=\s*(-?\d+)/);
  if (stock) {
    return {
      kind: "stock",
      resource: stock[1] === "megaCredits" ? "megacredits" : stock[1],
      amount: Number(stock[2])
    };
  }

  return null;
}

const ASSERTION = /^expect\(card\.canAct\(player\)\)\.(is\.not\.true|is\.true|to\.be\.false|to\.be\.true)/;

function casesIn(text) {
  const cases = [];
  for (const block of text.matchAll(/\bit\((['"])(.*?)\1[^]*?\n {2}\}\)/g)) {
    const body = block[0];
    const title = block[2];
    if (!body.split("\n").some(line => ASSERTION.test(line.trim()))) continue;

    // EVERY canAct assertion in the block is a checkpoint, not just the first.
    // A block usually asks twice -- once with nothing, once after being handed
    // what the action needs -- and keeping only the first drops the half that
    // says the action becomes available. Each checkpoint carries the setup that
    // had accumulated by the time it was reached.
    const steps = [];
    const checkpoints = [];
    let understood = true;
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (/^it\(/.test(line) || line === "})" || line === "});") continue;

      const assertion = line.match(ASSERTION);
      if (assertion) {
        checkpoints.push({
          steps: steps.map(step => ({ ...step })),
          expected: assertion[1] === "is.true" || assertion[1] === "to.be.true"
        });
        continue;
      }
      if (/^expect\(/.test(line)) continue;

      // A line this cannot read changes what every LATER checkpoint means, so
      // the block stops here and keeps only the ones already reached.
      const step = readSetupLine(line);
      if (!step) { understood = false; break; }
      if (step.kind !== "noop") steps.push(step);
    }

    if (checkpoints.length === 0) {
      cases.push({ title, dropped: true, reason: "no readable checkpoint" });
      continue;
    }
    for (const [index, checkpoint] of checkpoints.entries()) {
      cases.push({
        title: checkpoints.length > 1 ? `${title} [${index + 1}]` : title,
        steps: checkpoint.steps,
        expected: checkpoint.expected
      });
    }
    if (!understood) {
      cases.push({ title, dropped: true, reason: "setup became unreadable mid-block" });
    }
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
  // Dropped blocks are recorded by name and reason, not merely counted. A
  // manifest that reports "skipped: 0" while its builder threw away half the
  // corpus says the audit is complete when it is not.
  manifest[card.id] = {
    spec: specPath,
    cases: kept,
    ...(dropped.length > 0
      ? { unread: dropped.map(entry => ({ title: entry.title, reason: entry.reason })) }
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
