// Extracts the "can this card be played?" cases from the reference
// implementation's own test suite.
//
// Every audit so far compares our catalogue against the real card's printed
// values, or checks that the engine honours what our catalogue says. None asks
// whether the card BEHAVES the way the real one does -- and the thirteen dead
// cards proved a catalogue that promises nothing is honoured perfectly while
// the card does nothing.
//
// Upstream ships a spec file for 540 of the 547 cards, and the requirement
// cases in them are written in a small, regular vocabulary: set a global
// parameter, give the player some tags or production, then assert canPlay is
// true or false. That is exactly the boundary a requirement gets wrong, and it
// is stated by the people who wrote the card.
//
// Only cases whose every setup line is understood are kept. A case with one
// unrecognised line is dropped and counted, because a half-applied setup asks a
// different question than the one upstream asked, and would fail for a reason
// that has nothing to do with our engine.
//
// Usage: UPSTREAM_REF=<sha> node scripts/build-upstream-playable-manifest.mjs > data/upstream-playable.json
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

// Turns one line of an upstream test into a step our rig can carry out, or null
// when the line is not in the vocabulary -- which drops the whole case.
function readSetupLine(line) {
  const text = line.trim();
  if (!text || text.startsWith("//")) return { kind: "noop" };

  // A case that starts its own game is asking about a different table -- fourteen
  // of them are solo games, where "nobody has plant production" is not a reason
  // to refuse a card. Dropping these is what keeps the manifest from holding two
  // opposite verdicts for the same setup.
  if (/testGame\(/.test(text)) return null;

  for (const [helper, parameter] of Object.entries(PARAMETER)) {
    const match = text.match(new RegExp(`^${helper}\\(game,\\s*(-?\\d+)\\)`));
    if (match) return { kind: "parameter", parameter, value: Number(match[1]) };
  }
  if (/^maxOutOceans\(player\)/.test(text)) return { kind: "parameter", parameter: "oceans", value: 9 };
  const oceans = text.match(/^maxOutOceans\(player,\s*(\d+)\)/);
  if (oceans) return { kind: "parameter", parameter: "oceans", value: Number(oceans[1]) };

  // "player.tagsForTest = {science: 3}" -- the tags the player is treated as
  // holding, which upstream fakes rather than playing cards to earn.
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

const ASSERTION = /^expect\(card\.canPlay\(player\)\)\.(is\.not\.true|is\.true|to\.be\.false|to\.be\.true)/;

function casesIn(text) {
  const cases = [];
  for (const block of text.matchAll(/\bit\((['"])(.*?)\1[^]*?\n {2}\}\)/g)) {
    const body = block[0];
    const title = block[2];
    if (!ASSERTION.test(body.split("\n").map(line => line.trim()).find(line => ASSERTION.test(line)) ?? "")) {
      continue;
    }

    const steps = [];
    let expected = null;
    let understood = true;
    for (const raw of body.split("\n")) {
      const line = raw.trim();
      if (/^it\(/.test(line) || line === "})" || line === "});") continue;

      const assertion = line.match(ASSERTION);
      if (assertion) {
        // Everything before the FIRST canPlay assertion is its setup. A block
        // that plays the card and asserts again afterwards is asking a second
        // question, and only the first is kept.
        expected = assertion[1] === "is.true" || assertion[1] === "to.be.true";
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
