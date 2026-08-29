// Fetches the victory point declaration for every variable-VP card from the
// reference implementation and writes it to a manifest checked into the repo.
//
// Every other audit asks whether the engine honours our catalogue. None of them
// can ask whether our catalogue matches the real card -- a spec that says `per:
// 2` where the card says `per: 3` is honoured perfectly and still wrong. This
// is the only check that reads the other side.
//
// The manifest is committed rather than fetched during a test run: a check that
// depends on the network is a check that fails for reasons that have nothing to
// do with the code, and one that follows `main` silently changes what "correct"
// means when upstream edits a card.
//
// Usage: node scripts/build-vp-manifest.mjs > data/upstream-vp.json
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const RAW = "https://raw.githubusercontent.com/terraforming-mars/terraforming-mars";
const REF = process.env.UPSTREAM_REF ?? "main";

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS].filter(
  card => card.victoryPointSpec || card.dynamicVictory || card.specialVictoryKind
);

const manifest = {};
const missing = [];

for (const card of cards) {
  if (!card.source) { missing.push([card.id, "no source path"]); continue; }
  const response = await fetch(`${RAW}/${REF}/${card.source}`);
  if (!response.ok) { missing.push([card.id, `HTTP ${response.status}`]); continue; }
  const text = await response.text();
  // A card may declare victoryPoints twice: once as a render helper for the
  // card face, once as the object the scorer reads. It is the second that says
  // what the card is worth, so the object form wins wherever both appear.
  const lines = text.split("\n").filter(entry => /^\s*victoryPoints:/.test(entry));
  if (lines.length === 0) { missing.push([card.id, "no victoryPoints line"]); continue; }
  const line = lines.find(entry => /victoryPoints:\s*[{'"\-\d]/.test(entry)) ?? lines[0];
  manifest[card.id] = {
    source: card.source,
    upstream: line.trim().replace(/,$/, "")
  };
}

console.log(JSON.stringify({ ref: REF, cards: manifest }, null, 2));
for (const [id, why] of missing) console.error(`missing ${id}: ${why}`);
