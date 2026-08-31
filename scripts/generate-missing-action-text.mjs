// Writes the sentence for an action or discount the card never mentions.
//
// The render-parity audit found cards drawing an amount their Japanese text
// never states; chasing those down showed a wider class. 57 cards carry an
// `action` or `cardDiscount` the engine runs and the text says nothing about,
// so the player is shown "place this tile" for a card that also has an action,
// or a bare requirement for a card that discounts everything they buy.
//
// The sentence is built from the same spec the engine executes rather than
// written by hand, so the two cannot drift apart. Anything whose shape this
// does not cover is printed and left alone rather than guessed at.
//
// Usage: node scripts/generate-missing-action-text.mjs [--write]
import { readFileSync, writeFileSync } from "node:fs";
import { CORPORATIONS, OFFICIAL_PROJECTS, PRELUDES } from "../app/official-content.js";
import { JAPANESE_TEXT } from "../app/japanese-text.js";
import { getCardResourceType } from "../app/card-resource-types.js";

const RESOURCE = {
  megacredits: "MC", mc: "MC", steel: "建材", titanium: "チタン",
  plants: "植物", energy: "エネルギー", heat: "熱"
};

const CARD_RESOURCE = {
  Animal: "動物", Microbe: "微生物", Floater: "フローター", Science: "科学資源",
  Asteroid: "小惑星", Camp: "キャンプ", Fighter: "戦闘機", Data: "データ",
  Preservation: "保護", Resource: "資源", Agenda: "議題", Orbital: "軌道",
  Graphene: "グラフェン", Hydroelectric: "水力発電", Clone: "クローン",
  Venusian: "金星生物", Specialized: "特殊", Seed: "種子", Health: "健康",
  Supply: "備品", Disease: "疾病", Tool: "道具", Weather: "気象"
};

const TAG = {
  space: "宇宙", earth: "地球", jovian: "ジョビアン", venus: "金星",
  building: "建材", science: "科学", power: "電力", plant: "植物",
  microbe: "微生物", animal: "動物", city: "都市", event: "イベント"
};

const GLOBAL = { temperature: "気温", oxygen: "酸素", venus: "金星", oceans: "海洋" };

const amountOf = value => (typeof value === "number" ? value : 1);

// "Spend 8 heat", "spend 2 M€ (steel may be used)", "remove a floater from here".
const costPhrase = spend => {
  if (!spend) return null;
  const parts = [];
  for (const [key, value] of Object.entries(spend)) {
    if (key === "canUseSteel" || key === "canUseTitanium") continue;
    if (key === "resourcesHere") { parts.push(`このカードの資源を${amountOf(value)}個`); continue; }
    if (key === "cardResources") { parts.push(`このカードの資源を${amountOf(value)}個`); continue; }
    const name = RESOURCE[key];
    if (!name) return undefined;
    parts.push(`${name}を${amountOf(value)}`);
  }
  if (parts.length === 0) return null;
  const steel = spend.canUseSteel ? "（建材で支払い可）" : spend.canUseTitanium ? "（チタンで支払い可）" : "";
  return `${parts.join("、")}支払い${steel}`;
};

// What the action gives back.
const gainPhrase = (action, cardId) => {
  const parts = [];
  if (action.stock) {
    for (const [key, value] of Object.entries(action.stock)) {
      const name = RESOURCE[key];
      if (!name) return undefined;
      parts.push(`${name}を${amountOf(value)}獲得`);
    }
  }
  if (action.production) {
    for (const [key, value] of Object.entries(action.production)) {
      const name = RESOURCE[key];
      if (!name) return undefined;
      parts.push(`${name}生産量+${amountOf(value)}`);
    }
  }
  if (action.global) {
    for (const [key, value] of Object.entries(action.global)) {
      const name = GLOBAL[key];
      if (!name) return undefined;
      parts.push(`${name}を${amountOf(value)}段階上げる`);
    }
  }
  if (action.tr) parts.push(`TR+${amountOf(action.tr)}`);
  if (action.ocean) parts.push("海洋タイルを1枚置く");
  if (action.drawCard) {
    const spec = action.drawCard;
    const count = typeof spec === "number" ? spec : amountOf(spec.count);
    // "pay: true" means the card is bought at the usual price, not drawn free.
    parts.push(spec?.pay ? `カードを${count}枚購入する` : `カードを${count}枚引く`);
  }
  if (action.addResources !== undefined) {
    const count = amountOf(action.addResources);
    // The card knows what it holds, so name it: "add an animal", not the
    // meaningless "add a resource".
    const held = RESOURCE_TYPE_NAME[getCardResourceType(cardId)] ?? "資源";
    parts.push(`このカードに${held}を${count}個置く`);
  }
  if (action.addResourcesToAnyCard) {
    const spec = action.addResourcesToAnyCard;
    const kind = CARD_RESOURCE[spec.type] ?? spec.type;
    parts.push(`任意のカードに${kind}を${amountOf(spec.count)}個置く`);
  }
  return parts.length > 0 ? parts.join("、") : undefined;
};

const RESOURCE_TYPE_NAME = {
  microbe: "微生物", animal: "動物", floater: "フローター", science: "科学資源",
  asteroid: "小惑星", camp: "キャンプ", fighter: "戦闘機", data: "データ",
  preservation: "保護", resource: "資源", agenda: "議題", orbital: "軌道",
  graphene: "グラフェン", hydroelectricResource: "水力発電資源", clone: "クローン",
  venusian: "金星生物", specializedRobot: "特殊ロボット", seed: "種子",
  health: "健康", supply: "備品", disease: "疾病", tool: "道具", weather: "気象"
};

const actionSentence = (action, cardId) => {
  // A branching action is a choice between behaviours; describing it from the
  // spec alone would flatten the choice, so those are left for a human.
  if (action.or) return undefined;
  const cost = costPhrase(action.spend);
  if (cost === undefined) return undefined;
  const gain = gainPhrase(action, cardId);
  if (gain === undefined) return undefined;
  return cost ? `アクション: ${cost}、${gain}。` : `アクション: ${gain}。`;
};

const discountSentence = discount => {
  const amount = discount.amount ?? 0;
  if (!amount) return undefined;
  const tag = discount.tag ? TAG[String(discount.tag).toLowerCase()] : null;
  if (discount.tag && !tag) return undefined;
  if (discount.per === "card") {
    return `効果: ${tag}タグ1つにつき、カードのコストがMC${amount}下がる。`;
  }
  return tag
    ? `効果: ${tag}タグを持つカードのコストがMC${amount}下がる。`
    : `効果: カードのコストがMC${amount}下がる。`;
};

const cards = [...OFFICIAL_PROJECTS, ...PRELUDES, ...CORPORATIONS];

const written = [];
const unhandled = [];

for (const card of cards) {
  const text = JAPANESE_TEXT[card.id]?.effectText ?? "";
  const action = card.effectSpec?.action;
  const discount = card.effectSpec?.cardDiscount;
  const saysAction = /アクション|効果:/.test(text);
  const saysDiscount = /コスト|割引|軽減/.test(text);

  let addition;
  if (action && !saysAction) addition = actionSentence(action, card.id);
  else if (discount && !saysDiscount) addition = discountSentence(discount);
  else continue;

  if (addition === undefined) {
    unhandled.push([card.id, JSON.stringify(action ?? discount).slice(0, 90)]);
    continue;
  }
  written.push([card.id, `${text}${addition}`]);
}

console.log(`cards whose text omits an implemented action or discount: ${written.length + unhandled.length}`);
console.log(`  sentence generated from the spec : ${written.length}`);
console.log(`  shape not covered, left alone    : ${unhandled.length}`);

for (const [id, spec] of unhandled) console.log(`  UNHANDLED ${id}: ${spec}`);

if (process.argv.includes("--write")) {
  const path = new URL("../scripts/japanese-effects.data.js", import.meta.url);
  const source = readFileSync(path, "utf8");
  // The file is checked out with CRLF endings, so a marker ending in \n never
  // matches and replace() quietly returns its input -- the first run of this
  // reported writing 32 entries and wrote none.
  const eol = source.includes("\r\n") ? "\r\n" : "\n";
  const marker = `export const CURATED_JAPANESE_EFFECTS = {${eol}`;
  if (!source.includes(marker)) throw new Error("could not find the start of CURATED_JAPANESE_EFFECTS");

  // A curated entry already present wins, so anything hand-written stays.
  const fresh = written.filter(([id]) => !source.includes(`"${id}":`));
  const freshLines = fresh
    .map(([id, text]) => `  ${JSON.stringify(id)}: ${JSON.stringify(text)},${eol}`)
    .join("");
  const updated = source.replace(marker, marker + freshLines);
  if (updated === source) throw new Error("nothing was written");
  writeFileSync(path, updated);
  console.log(`\nwritten to japanese-effects.data.js: ${fresh.length} new, ${written.length - fresh.length} already curated`);
} else {
  for (const [id, text] of written.slice(0, 12)) console.log(`\n${id}\n  ${text}`);
}
