// Checks that our catalogue prints what the real cards print.
//
// Every other audit asks whether the engine honours our catalogue. None of them
// can ask whether the catalogue is right: a card whose cost says 9 where the
// real one says 11 is honoured perfectly by every contract, passes coverage,
// and is wrong in every game anyone plays.
//
// Only the printed values are compared -- cost, tags, requirements, type and
// resource type. Behaviour is deliberately left out: upstream expresses it as
// `behavior` objects, bespoke play() methods and class inheritance all at once,
// so comparing it field by field would report differences of expression rather
// than differences of rules, and a wall of false positives is worse than no
// check at all.
//
// The comparison is against a manifest pinned to one upstream commit rather
// than the network, so a run fails for the code's reasons only. Rebuild it with
// scripts/build-upstream-manifest.mjs when deliberately moving upstream.
//
// Usage: node scripts/audit-cards-against-upstream.mjs [--list]
import { readFileSync } from "node:fs";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";
import { getCardResourceType } from "../app/card-resource-types.js";

const manifest = JSON.parse(readFileSync(new URL("../data/upstream-cards.json", import.meta.url)));

const valueOf = declaration => declaration.slice(declaration.indexOf(":") + 1).trim();

// `Tag.MICROBE` is our "Microbe", `CardType.ACTIVE` our "active". Comparing the
// leaf of the enum lowercased is the whole translation.
const enumLeaf = token => {
  const text = String(token).trim();
  const dot = text.lastIndexOf(".");
  return (dot === -1 ? text : text.slice(dot + 1)).toLowerCase().replace(/[_\s]/g, "");
};

const upstreamTags = declaration => {
  const inner = valueOf(declaration).replace(/^\[/, "").replace(/\]$/, "");
  return inner
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .map(enumLeaf)
    .sort();
};

// Upstream writes `requirements: {oxygen: 4}` or `{tag: Tag.SCIENCE, count: 3}`
// or a `CardRequirements.builder(...)` chain. The first two are readable as an
// object; the builder form is not, and is reported rather than assumed to agree.
const splitTopLevel = inner => {
  const parts = [];
  let depth = 0;
  let token = "";
  for (const character of inner) {
    if (character === "{" || character === "[") depth += 1;
    if (character === "}" || character === "]") depth -= 1;
    if (character === "," && depth === 0) { parts.push(token); token = ""; continue; }
    token += character;
  }
  if (token.trim()) parts.push(token);
  return parts;
};

const upstreamRequirements = declaration => {
  const body = valueOf(declaration);
  // Several cards state a list of requirements rather than one -- Luxury Foods
  // wants a Venus, an Earth and a Jovian tag -- which is the shape ours already
  // uses. Merging them into one object matches how ourRequirements reads them.
  if (body.startsWith("[") && body.includes("]")) {
    const merged = {};
    for (const part of splitTopLevel(body.slice(1, body.lastIndexOf("]")))) {
      const one = upstreamRequirements(`x: ${part.trim()}`);
      if (one === null) return null;
      for (const [key, value] of Object.entries(one)) {
        // Three separate {tag: ...} entries are three requirements, not one
        // overwriting the last, so the tags are collected rather than replaced.
        if (key === "tag") merged.tag = [...(merged.tag ?? []), value].sort();
        else merged[key] = value;
      }
    }
    if (Array.isArray(merged.tag) && merged.tag.length === 1) merged.tag = merged.tag[0];
    return merged;
  }
  // A requirement written across several lines reaches the manifest as the
  // opening brace alone. Reading that as an empty object would say the card
  // requires nothing, and would report every requirement we correctly carry as
  // one we invented.
  if (!body.startsWith("{") || !body.includes("}")) return null;
  const inner = body.slice(1, body.lastIndexOf("}"));
  const parts = [];
  let depth = 0;
  let token = "";
  for (const character of inner) {
    if (character === "{" || character === "[") depth += 1;
    if (character === "}" || character === "]") depth -= 1;
    if (character === "," && depth === 0) { parts.push(token); token = ""; continue; }
    token += character;
  }
  if (token.trim()) parts.push(token);

  const shape = {};
  for (const part of parts) {
    const text = part.trim();
    if (!text) continue;
    const colon = text.indexOf(":");
    // A bare token is a shorthand flag -- upstream writes `nextTo` and `all`
    // without a value. It is a key, so its spelling is kept: lowercasing it
    // through enumLeaf would look for `nextto` and never find our `nextTo`.
    if (colon === -1) { shape[text] = true; continue; }
    const key = text.slice(0, colon).trim();
    const value = text.slice(colon + 1).trim();
    if (/^-?\d+$/.test(value)) shape[key] = Number(value);
    else if (value === "true" || value === "false") shape[key] = value === "true";
    else shape[key] = enumLeaf(value);
  }
  return shape;
};

// The two catalogues name the same party differently: upstream's enum leaf is
// MARS where ours spells out "Mars First". Same party, so the audit would only
// be reporting a difference of vocabulary.
const PARTY_ALIASES = { mars: "marsfirst", scientists: "scientists", reds: "reds" };
const sameParty = (theirs, ours) => (PARTY_ALIASES[theirs] ?? theirs) === ours;

// Our requirements are a list of one-key objects; upstream's is one object.
// Reducing ours to the same shape is what makes them comparable.
//
// `count` is kept, not stripped: upstream writes `{tag: Tag.SCIENCE, count: 7}`
// and so do we, and it is the number that says how many science tags Anti-
// Gravity Technology needs. Dropping it reduces the requirement to "some
// science", which every card with a science requirement satisfies.
//
// Where a parameter is its own key -- `{oxygen: 4}` -- both sides repeat the
// value in `count`, so it carries no information there and matches either way.
const ourRequirements = card => {
  const shape = {};
  for (const requirement of card.requirements ?? []) {
    for (const [key, value] of Object.entries(requirement)) {
      const normalised = typeof value === "string" ? enumLeaf(value) : value;
      // A card wanting three different tags carries three entries, and each is
      // its own requirement rather than the last one winning.
      if (key === "tag") shape.tag = [...(shape.tag ?? []), normalised].sort();
      else shape[key] = normalised;
    }
  }
  if (Array.isArray(shape.tag) && shape.tag.length === 1) shape.tag = shape.tag[0];
  return shape;
};

const sameValue = (theirs, ours) =>
  Array.isArray(theirs) || Array.isArray(ours)
    ? [theirs].flat().sort().join("|") === [ours].flat().sort().join("|")
    : theirs === ours;

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];
const checked = [];
const skipped = [];
const wrong = [];

for (const card of cards) {
  const entry = manifest.cards[card.id];
  if (!entry) { skipped.push([card.id, "not in the manifest"]); continue; }
  if (entry.unreadable) { skipped.push([card.id, entry.unreadable]); continue; }

  const problems = [];
  let compared = 0;

  if (entry.cost !== undefined) {
    compared += 1;
    const theirs = Number(valueOf(entry.cost));
    if (theirs !== card.cost) problems.push(`cost: upstream ${theirs}, ours ${card.cost}`);
  }

  if (entry.tags !== undefined) {
    compared += 1;
    const theirs = upstreamTags(entry.tags);
    const ours = (card.tags ?? []).map(enumLeaf).sort();
    // Tags are compared as a multiset, not a set: Luna Governor prints Earth
    // twice and counts twice, which is the bug countTagsFor had.
    if (theirs.join("|") !== ours.join("|")) {
      problems.push(`tags: upstream [${theirs}], ours [${ours}]`);
    }
  }

  if (entry.type !== undefined) {
    compared += 1;
    const theirs = enumLeaf(valueOf(entry.type));
    const ours = enumLeaf(card.type ?? "");
    if (theirs !== ours) problems.push(`type: upstream ${theirs}, ours ${ours}`);
  }

  if (entry.resourceType !== undefined) {
    compared += 1;
    const theirs = enumLeaf(valueOf(entry.resourceType));
    const ours = enumLeaf(card.resourceType ?? getCardResourceType(card.id) ?? "");
    if (theirs !== ours) problems.push(`resourceType: upstream ${theirs}, ours ${ours}`);
  }

  if (entry.requirements !== undefined) {
    const theirs = upstreamRequirements(entry.requirements);
    if (theirs === null) {
      skipped.push([card.id, `requirements not readable: ${valueOf(entry.requirements)}`]);
    } else {
      compared += 1;
      const ours = ourRequirements(card);
      for (const [key, value] of Object.entries(theirs)) {
        const agrees = key === "party" ? sameParty(value, ours[key]) : sameValue(value, ours[key]);
        if (!agrees) {
          problems.push(`requires ${key}: upstream ${value}, ours ${ours[key] ?? "none"}`);
        }
      }
      for (const key of Object.keys(ours)) {
        // Keys we carry that upstream words differently are not a mismatch in
        // the printed card; only a requirement upstream states and we drop is.
        if (theirs[key] === undefined && ["oxygen", "temperature", "oceans", "venus"].includes(key)) {
          problems.push(`requires ${key}: ours ${ours[key]}, upstream states none`);
        }
      }
    }
  } else if ((card.requirements ?? []).length > 0) {
    // A requirement we invented is as wrong as one we dropped.
    const ours = ourRequirements(card);
    const printed = Object.keys(ours).filter(key =>
      ["oxygen", "temperature", "oceans", "venus"].includes(key)
    );
    if (printed.length > 0) {
      compared += 1;
      problems.push(`requires ${printed.join(", ")}, upstream declares no requirements`);
    }
  }

  if (compared === 0) { skipped.push([card.id, "nothing comparable"]); continue; }
  if (problems.length > 0) wrong.push([card, problems]);
  else checked.push(card);
}

console.log(`cards compared with upstream ${manifest.ref.slice(0, 7)}: ${checked.length + wrong.length}`);
console.log(`  agree    : ${checked.length}`);
console.log(`  differ   : ${wrong.length}`);
console.log(`skipped    : ${skipped.length}`);

for (const [card, problems] of wrong) {
  console.log(`\nDIFFERS ${card.id}  ${card.name}`);
  for (const problem of problems) console.log(`   ${problem}`);
}

if (process.argv.includes("--list")) {
  for (const [id, why] of skipped) console.log(`skip ${id}: ${why}`);
}

process.exitCode = wrong.length > 0 ? 1 : 0;
