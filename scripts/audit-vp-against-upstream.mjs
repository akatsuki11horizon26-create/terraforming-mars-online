// Checks that our victory point spec says the same thing the real card says.
//
// Every other audit asks whether the engine honours the catalogue. This asks
// whether the catalogue is right, which no amount of internal consistency can
// establish: a card whose spec says two points per resource where the real one
// says three is honoured perfectly, passes every contract, and loses the game
// for whoever plays it.
//
// The comparison is against a manifest pinned to one upstream commit rather
// than against the network, so a run fails for the code's reasons only. Rebuild
// it with scripts/build-upstream-manifest.mjs when deliberately moving to a newer
// upstream.
//
// Usage: node scripts/audit-vp-against-upstream.mjs [--list]
import { readFileSync } from "node:fs";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const manifest = JSON.parse(readFileSync(new URL("../data/upstream-cards.json", import.meta.url)));

// The upstream declaration is TypeScript, not JSON: keys are bare, `all` is a
// shorthand for `all: true`, and a plain number means a fixed value. Reading it
// into the same shape our spec uses is the whole comparison.
const parseUpstream = declaration => {
  const body = declaration.replace(/^victoryPoints:\s*/, "").trim();
  if (/^-?\d+$/.test(body)) return { fixed: Number(body) };
  if (body === "'special'" || body === '"special"') return { special: true };
  if (!body.startsWith("{")) return null;

  const shape = {};
  // Only the top level matters: the nested {} are placeholders upstream uses to
  // name what is counted, and our spec keeps them the same way.
  const inner = body.slice(1, -1);
  let depth = 0;
  let token = "";
  const parts = [];
  for (const character of inner) {
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (character === "," && depth === 0) { parts.push(token); token = ""; continue; }
    token += character;
  }
  if (token.trim()) parts.push(token);

  for (const part of parts) {
    const text = part.trim();
    if (!text) continue;
    const colon = text.indexOf(":");
    if (colon === -1) { shape[text] = true; continue; }
    const key = text.slice(0, colon).trim();
    const value = text.slice(colon + 1).trim();
    shape[key] = /^-?\d+$/.test(value) ? Number(value) : value;
  }
  return shape;
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const checked = [];
const skipped = [];
const wrong = [];

for (const [cardId, entry] of Object.entries(manifest.cards)) {
  const card = cards.find(item => item.id === cardId);
  if (!card) { skipped.push([cardId, "not in our catalogue"]); continue; }
  // The manifest covers every card; only the ones that print points are this
  // audit's business.
  if (entry.victoryPoints === undefined) {
    if (card.victoryPointSpec || card.dynamicVictory || card.specialVictoryKind) {
      skipped.push([cardId, "we score it, upstream declares no victoryPoints"]);
    }
    continue;
  }

  const upstream = parseUpstream(entry.victoryPoints);
  if (!upstream) { skipped.push([cardId, `cannot read ${entry.victoryPoints}`]); continue; }

  // A card upstream scores by its own code carries no readable declaration, and
  // ours says so with specialVictoryKind or dynamicVictory.
  if (upstream.special) {
    if (card.specialVictoryKind || card.dynamicVictory) checked.push(card);
    else wrong.push([card, [`upstream scores this by its own rule, our spec does not say so`]]);
    continue;
  }
  if (upstream.fixed !== undefined) {
    if ((card.victoryPoints ?? 0) === upstream.fixed) checked.push(card);
    else wrong.push([card, [`upstream prints ${upstream.fixed} points, ours prints ${card.victoryPoints ?? 0}`]]);
    continue;
  }

  const ours = card.victoryPointSpec;
  if (!ours) {
    wrong.push([card, [`upstream declares ${entry.upstream}, ours declares nothing`]]);
    continue;
  }

  const problems = [];
  // The numbers are what a wrong catalogue gets wrong: per, each, and the flag
  // that decides whose pieces count.
  for (const key of ["per", "each"]) {
    const theirs = upstream[key];
    const mine = ours[key];
    if ((theirs ?? null) !== (mine ?? null)) {
      problems.push(`${key}: upstream ${theirs ?? "none"}, ours ${mine ?? "none"}`);
    }
  }
  if (Boolean(upstream.all) !== Boolean(ours.all)) {
    problems.push(`all: upstream ${Boolean(upstream.all)}, ours ${Boolean(ours.all)}`);
  }
  // What is being counted: the key names must line up, or the two are counting
  // different things however well the numbers agree.
  const countedKeys = shape =>
    Object.keys(shape).filter(key => !["per", "each", "all"].includes(key)).sort().join("+");
  if (countedKeys(upstream) !== countedKeys(ours)) {
    problems.push(`counts: upstream ${countedKeys(upstream)}, ours ${countedKeys(ours)}`);
  }

  if (problems.length > 0) wrong.push([card, problems]);
  else checked.push(card);
}

console.log(`victory point specs compared with upstream ${manifest.ref.slice(0, 7)}: ${checked.length + wrong.length}`);
console.log(`  agree    : ${checked.length}`);
console.log(`  differ   : ${wrong.length}`);
console.log(`skipped    : ${skipped.length}`);

for (const [card, problems] of wrong) {
  console.log(`\nDIFFERS ${card.id}  ${card.name}`);
  console.log(`   upstream: ${manifest.cards[card.id].victoryPoints}`);
  console.log(`   ours    : ${JSON.stringify(card.victoryPointSpec ?? card.victoryPoints)}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [id, why] of skipped) console.log(`skip ${id}: ${why}`);
}

process.exitCode = wrong.length > 0 ? 1 : 0;
