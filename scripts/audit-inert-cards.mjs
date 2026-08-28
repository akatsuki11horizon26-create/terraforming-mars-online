// Finds cards whose text promises an effect that the engine has no way to
// perform.
//
// This is the check card-coverage.mjs cannot make. Coverage plays a card and
// asks whether the state moved; a card whose whole text is a trigger ("when you
// play an event, gain 3 M€") correctly moves nothing when played, and a card
// that only takes your money moves the state by taking it. Both pass.
//
// Here the question is different: does anything in app/ know this card exists?
// A card with no normalised effect, no action, no curated `effects`, and no
// mention of its id anywhere is inert -- the player pays for it and gets a
// requirement and a victory point at best.
//
// Cards that are genuinely just a requirement plus victory points are fine, and
// are excluded: their text promises nothing else.
//
// Usage: node scripts/audit-inert-cards.mjs [--list]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { OFFICIAL_PROJECTS, PRELUDES, CORPORATIONS } from "../app/official-content.js";
import { getCardEffect } from "../app/game-logic.js";

const APP = fileURLToPath(new URL("../app/", import.meta.url));
const code = readdirSync(APP)
  .filter(name => /\.(js|tsx?)$/.test(name) &&
    name !== "official-content.js" && name !== "full-card-catalog.js" &&
    name !== "japanese-text.js" && name !== "card-art.data.js")
  .map(name => readFileSync(join(APP, name), "utf8"))
  .join("\n");

const BOOKKEEPING = new Set(["cardId", "unsupported"]);
const live = value => {
  if (value === undefined || value === null || value === false || value === 0) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

// Text that only states a requirement promises nothing to perform.
const PROMISES = /獲得|置く|生産|引く|除去|追加|複製|減ら|消費|支払|交換|移動|効果:|アクション:|コスト|VP|勝利点|上げ|下げ|奪|捨て/;

const inert = [];
for (const [kind, list] of [["project", OFFICIAL_PROJECTS], ["prelude", PRELUDES], ["corp", CORPORATIONS]]) {
  for (const card of list) {
    const text = card.effectText ?? "";
    if (!PROMISES.test(text)) continue;
    // "勝利点1" and nothing else is a scoring card; scoring reads victoryPoints
    // directly, so there is nothing for the effect pipeline to perform.
    if (/^勝利点\s*\d+。?$/.test(text.trim())) continue;

    const spec = card.effectSpec ?? {};
    const effect = getCardEffect(card);
    const hasEffect = Object.keys(effect ?? {}).some(k => !BOOKKEEPING.has(k) && live(effect[k]));
    const hasAction = Boolean(spec.action && Object.keys(spec.action).length);
    const hasEffects = Boolean(card.effects && Object.keys(card.effects).length);
    // A bespoke handler keyed on the card id counts as an implementation.
    const named = code.includes(card.id);
    // Several behaviours never reach getCardEffect because the engine reads
    // effectSpec directly -- stealFromPlayer and steelValue among them. A top
    // level behaviour key with a reader in app/ is implemented too.
    const behaviourRead = Object.keys(spec.behavior ?? {}).some(key => code.includes(key));

    if (!hasEffect && !hasAction && !hasEffects && !named && !behaviourRead) inert.push([kind, card]);
  }
}

// A ratchet, not a gate: 18 cards are known inert and fixing them is a body of
// work, but the number must never grow. Lower this as they are implemented.
const BASELINE = 18;

console.log(`inert cards (text promises an effect, engine has none): ${inert.length} (baseline ${BASELINE})`);
for (const [kind, card] of inert) {
  console.log(`  ${kind}  ${card.id}`);
  console.log(`      ${(card.effectText ?? "").slice(0, 100)}`);
}

if (inert.length > BASELINE) {
  console.error(`
${inert.length - BASELINE} more inert card(s) than the baseline.`);
  process.exit(1);
}
if (inert.length < BASELINE) {
  console.error(`
${BASELINE - inert.length} fewer than baseline -- lower BASELINE to ${inert.length}.`);
  process.exit(1);
}
