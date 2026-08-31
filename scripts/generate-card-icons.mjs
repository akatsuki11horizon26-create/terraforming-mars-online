// Reduces the upstream render trees into the icon rows the cards draw.
//
// data/upstream-render-data.json is audit material: 987 cards, every node
// upstream builds, 614 KB. The browser wants far less than that -- which icon,
// how many, on which row, in whose production box -- so this flattens each tree
// into a short token list and writes only the cards we actually deal.
//
// A card is only emitted when every icon in its tree is one we can draw. A row
// with an unknown symbol silently missing from it reads as a different card, so
// those fall back to the Japanese text rather than showing part of themselves.
//
// Usage: node scripts/generate-card-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";

const upstream = JSON.parse(
  readFileSync(new URL("../data/upstream-render-data.json", import.meta.url), "utf8")
);

// Structure and punctuation rather than pictures. They are kept as tokens so a
// row still reads in the right order, but they never need artwork.
const SYMBOLS = new Set(["*", "->", ":", "-", "/", "OR", "+", "=", "(", ")", " ", "nbsp"]);

// Everything the sprite can draw. A type absent from here takes its whole card
// out of the icon path.
const ICONS = new Set([
  "megacredits", "steel", "titanium", "plants", "energy", "heat", "cards",
  "tr", "oceans", "oxygen", "temperature", "venus", "city", "greenery",
  "colonies", "colony_tile", "trade", "trade_fleet", "trade_discount",
  "resource", "tag", "wild", "empty_tag", "diverse_tag", "no_tags",
  "delegates", "influence", "party_leaders", "chairman", "nomads",
  "empty_tile", "city-or-special-tile", "self_replicating", "cathedral",
  "community", "prelude", "corporation", "award", "vp", "multiplier_white",
  "ignore_global_requirements", "one", "special_tile"
]);

// Rows that mean "this is the ongoing effect" or "this is the action", which is
// what tells a reader the difference between a one-off and a standing rule.
const SECTIONS = { CardRenderEffect: "effect", CardRenderAction: "action" };

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];

const reduceTree = node => {
  const unknown = new Set();

  const walkRow = row => {
    const tokens = [];
    for (const entry of row ?? []) {
      // Upstream drops the prose into the row beside the icons; the card
      // already carries that text in Japanese.
      if (typeof entry === "string") continue;
      if (!entry || typeof entry !== "object") continue;

      if (entry.is === "symbol") {
        // Vertical spacing is layout, not meaning.
        if (entry.type === "vspace") continue;
        if (SYMBOLS.has(entry.type)) tokens.push({ s: entry.type });
        else unknown.add(entry.type);
        continue;
      }
      if (entry.is === "item") {
        // `text` and `plate` are prose and labels drawn as items -- the rules
        // sentence, the VP note, the "Global requirements" plate. The card
        // already carries all of that in Japanese, so they are skipped rather
        // than counted as something we cannot draw.
        if (entry.type === "text" || entry.type === "plate") continue;
        if (!ICONS.has(entry.type)) { unknown.add(entry.type); continue; }
        const token = { i: entry.type };
        if (typeof entry.amount === "number" && entry.amount !== 1) token.n = entry.amount;
        if (entry.amount === -1) token.n = -1;
        if (entry.anyPlayer) token.all = true;
        if (entry.resource) token.r = entry.resource;
        if (entry.tag) token.t = entry.tag;
        tokens.push(token);
        continue;
      }
      // A special tile drawn as its own hex -- the mine, the lava flow, the
      // capital. The number is upstream's TileType, which the sprite maps to a
      // shape; anything unmapped keeps the generic tile.
      if (entry.is === "tile") {
        tokens.push({ i: "special_tile", n: entry.tile });
        continue;
      }
      if (entry.is === "production-box") {
        const inner = (entry.rows ?? []).flatMap(walkRow);
        if (inner.length > 0) tokens.push({ prod: inner });
        continue;
      }
      if (entry.rows) {
        // effect and action boxes carry their own rows.
        const section = SECTIONS[entry._kind];
        const inner = (entry.rows ?? []).map(walkRow).filter(row => row.length > 0);
        if (inner.length > 0) tokens.push(section ? { [section]: inner } : { group: inner });
        continue;
      }
      unknown.add(entry._kind ?? "unknown");
    }
    return tokens;
  };

  const rows = (node?.rows ?? []).map(walkRow).filter(row => row.length > 0);
  return { rows, unknown: [...unknown] };
};

const icons = {};
const skipped = [];

for (const card of cards) {
  const entry = upstream.cards[card.englishName ?? card.name];
  if (!entry) {
    skipped.push([card.id, "upstream draws no render tree for it"]);
    continue;
  }
  const { rows, unknown } = reduceTree(entry.render);
  if (unknown.length > 0) {
    skipped.push([card.id, `not drawn yet: ${unknown.join(", ")}`]);
    continue;
  }
  if (rows.length === 0) {
    skipped.push([card.id, "nothing to draw"]);
    continue;
  }
  icons[card.id] = rows;
}

const body = Object.entries(icons)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([id, rows]) => `  ${JSON.stringify(id)}: ${JSON.stringify(rows)}`)
  .join(",\n");

const output = `// GENERATED by scripts/generate-card-icons.mjs — do not edit by hand.
// The icon rows each card prints, reduced from the reference implementation's
// render tree at ${upstream.ref}.
//
// Only cards whose every icon we can draw are here. A row missing one symbol
// reads as a different card, so the rest fall back to their Japanese text.
// ${Object.keys(icons).length} of ${cards.length} cards.
export const CARD_ICON_ROWS = {
${body}
};
`;

writeFileSync(new URL("../app/card-icon-rows.js", import.meta.url), output);

console.log(`cards with icon rows: ${Object.keys(icons).length} of ${cards.length}`);
console.log(`falling back to text: ${skipped.length}`);
console.log(`file size           : ${output.length} bytes`);

const reasons = new Map();
for (const [, why] of skipped) reasons.set(why, (reasons.get(why) ?? 0) + 1);
for (const [why, count] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${String(count).padStart(3)}  ${why}`);
}
