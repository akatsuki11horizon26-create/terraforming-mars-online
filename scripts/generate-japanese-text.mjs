// Generates Japanese card names and effect text for the catalog.
//
// The catalog is machine-generated from the reference implementation and is
// entirely in English. Effect text is highly formulaic, so rather than hand-write
// ~1000 strings this translates sentence by sentence with rules, and reports
// anything it could not handle so the gap is visible rather than silent.
//
// Usage: node scripts/generate-japanese-text.mjs
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const {
  FULL_PROJECTS,
  FULL_CORPORATIONS,
  FULL_PRELUDES,
  FULL_GLOBAL_EVENTS,
  FULL_STANDARD_PROJECTS,
  FULL_STANDARD_ACTIONS
} = await import(pathToUrl(resolve(process.cwd(), "app", "full-card-catalog.js")));

function pathToUrl(p) {
  return new URL(`file:///${p.replace(/\\/g, "/")}`).href;
}

// --- vocabulary ------------------------------------------------------------

const RESOURCE = {
  "M€": "MC",
  MC: "MC",
  steel: "建材",
  titanium: "チタン",
  plant: "植物",
  plants: "植物",
  energy: "エネルギー",
  heat: "熱",
  card: "カード",
  cards: "カード"
};

const TAG = {
  building: "建材",
  space: "宇宙",
  science: "科学",
  power: "電力",
  energy: "電力",
  earth: "地球",
  jovian: "ジョビアン",
  venus: "金星",
  plant: "植物",
  microbe: "微生物",
  animal: "動物",
  city: "都市",
  event: "イベント",
  wild: "ワイルド",
  mars: "火星"
};

const CARD_RESOURCE = {
  microbe: "微生物",
  microbes: "微生物",
  animal: "動物",
  animals: "動物",
  science: "科学",
  floater: "フローター",
  floaters: "フローター",
  asteroid: "小惑星",
  asteroids: "小惑星",
  fighter: "戦闘機",
  fighters: "戦闘機",
  data: "データ"
};

const prod = resource => `${RESOURCE[resource] ?? resource}生産量`;

// --- sentence rules --------------------------------------------------------
// Each rule is [pattern, builder]. Order matters: more specific first.

const RULES = [
  // Requirements
  [/^Requires (\d+)% oxygen\.?$/i, m => `酸素${m[1]}%以上が必要。`],
  [/^Requires (-?\d+)\s*°?\s*C or warmer\.?$/i, m => `気温${m[1]}°C以上が必要。`],
  [/^Requires (-?\d+)\s*°?\s*C or colder\.?$/i, m => `気温${m[1]}°C以下が必要。`],
  [/^Requires (\d+) ocean tiles?\.?$/i, m => `海洋${m[1]}枚以上が必要。`],
  [/^Requires Venus (\d+)%\.?$/i, m => `金星${m[1]}%以上が必要。`],
  [/^Requires (\d+) ([a-z]+) tags?\.?$/i, m => `${TAG[m[2].toLowerCase()] ?? m[2]}タグ${m[1]}枚以上が必要。`],
  [/^Requires an? ([a-z]+) tag\.?$/i, m => `${TAG[m[1].toLowerCase()] ?? m[1]}タグが必要。`],
  [/^Oxygen must be (\d+)% or less\.?$/i, m => `酸素${m[1]}%以下であること。`],
  [/^Requires that you have (\d+) ([a-z]+)\.?$/i, m => `${CARD_RESOURCE[m[2].toLowerCase()] ?? m[2]}を${m[1]}個持っていること。`],
  [/^Requires (\d+) cities? in play\.?$/i, m => `場に都市${m[1]}個以上が必要。`],
  [/^Requires you have (\d+) ([a-z]+) tags?\.?$/i, m => `${TAG[m[2].toLowerCase()] ?? m[2]}タグ${m[1]}枚以上が必要。`],

  // Production
  [
    /^Increase your ([A-Za-z€]+) production (\d+) steps?\.?$/i,
    m => `${prod(m[1])}+${m[2]}。`
  ],
  [
    /^Decrease your ([A-Za-z€]+) production (\d+) steps?\.?$/i,
    m => `${prod(m[1])}-${m[2]}。`
  ],
  [
    /^Decrease your ([A-Za-z€]+) production (\d+) steps? and increase your ([A-Za-z€]+) production (\d+) steps?\.?$/i,
    m => `${prod(m[1])}-${m[2]}、${prod(m[3])}+${m[4]}。`
  ],
  [
    /^Increase your ([A-Za-z€]+) production (\d+) steps? and your ([A-Za-z€]+) production (\d+) steps?\.?$/i,
    m => `${prod(m[1])}+${m[2]}、${prod(m[3])}+${m[4]}。`
  ],
  [
    /^Increase your ([A-Za-z€]+) production (\d+) steps? and gain (\d+) ([A-Za-z€]+)\.?$/i,
    m => `${prod(m[1])}+${m[2]}、${RESOURCE[m[4]] ?? m[4]}${m[3]}を獲得。`
  ],
  [
    /^Decrease any ([A-Za-z€]+) production (\d+) steps?\.?$/i,
    m => `任意のプレイヤーの${prod(m[1])}-${m[2]}。`
  ],

  // Gains
  [/^Gain (\d+) ([A-Za-z€]+)\.?$/i, m => `${RESOURCE[m[2]] ?? m[2]}${m[1]}を獲得。`],
  [/^Gain (\d+) ([A-Za-z€]+) and (\d+) ([A-Za-z€]+)\.?$/i,
    m => `${RESOURCE[m[2]] ?? m[2]}${m[1]}と${RESOURCE[m[4]] ?? m[4]}${m[3]}を獲得。`],
  [/^Draw (\d+) cards?\.?$/i, m => `カードを${m[1]}枚引く。`],
  [/^Raise your TR (\d+) steps?\.?$/i, m => `TR+${m[1]}。`],
  [/^Increase your terraform rating (\d+) steps?\.?$/i, m => `TR+${m[1]}。`],

  // Global parameters
  [/^Raise the temperature (\d+) steps?\.?$/i, m => `気温を${m[1]}段階上げる。`],
  [/^Increase the temperature (\d+) steps?\.?$/i, m => `気温を${m[1]}段階上げる。`],
  [/^Raise the oxygen level (\d+) steps?\.?$/i, m => `酸素を${m[1]}段階上げる。`],
  [/^Increase the oxygen level (\d+) steps?\.?$/i, m => `酸素を${m[1]}段階上げる。`],
  [/^Raise Venus (\d+) steps?\.?$/i, m => `金星を${m[1]}段階上げる。`],
  [/^Increase Venus (\d+) steps?\.?$/i, m => `金星を${m[1]}段階上げる。`],

  // Tiles
  [/^Place an? ocean tile\.?$/i, () => "海洋タイルを1枚置く。"],
  [/^Place (\d+) ocean tiles?\.?$/i, m => `海洋タイルを${m[1]}枚置く。`],
  [/^Place a city tile\.?$/i, () => "都市タイルを1枚置く。"],
  [/^Place a greenery tile\.?$/i, () => "緑地タイルを1枚置く。"],
  [/^Place a colony\.?$/i, () => "植民地を1つ置く。"],
  [/^Place (\d+) colonies\.?$/i, m => `植民地を${m[1]}個置く。`],

  // Card resources
  [/^Add (\d+) ([a-z]+)s? to (this|ANOTHER|another) card\.?$/i, m => {
    const where = /this/i.test(m[3]) ? "このカード" : "他のカード1枚";
    return `${where}に${CARD_RESOURCE[m[2].toLowerCase()] ?? m[2]}を${m[1]}個置く。`;
  }],
  [/^Add (\d+) ([a-z]+)s? to ANY card\.?$/i,
    m => `任意のカードに${CARD_RESOURCE[m[2].toLowerCase()] ?? m[2]}を${m[1]}個置く。`],

  // Removal
  [/^Remove up to (\d+) plants? from any player\.?$/i,
    m => `任意のプレイヤーの植物を最大${m[1]}個除去。`],
  [/^Remove (\d+) plants? from any player\.?$/i,
    m => `任意のプレイヤーの植物を${m[1]}個除去。`],

  // Ongoing effects
  [/^Effect: Each titanium you have is worth 1 M€ extra\.?$/i,
    () => "効果: チタンの価値が1 MC上昇。"],
  [/^Effect: Each steel you have is worth 1 M€ extra\.?$/i,
    () => "効果: 建材の価値が1 MC上昇。"],
  [/^Effect: When you play an? ([a-z]+) tag, you pay (\d+) M€ less for it\.?$/i,
    m => `効果: ${TAG[m[1].toLowerCase()] ?? m[1]}タグのカードのコストが${m[2]} MC減少。`],
  [/^Effect: Your global requirements are \+2 or -2 steps, your choice in each case\.?$/i,
    () => "効果: グローバル条件を±2段階まで緩和できる。"],

  // Victory points
  [/^(\d+) VPs?\.?$/i, m => `勝利点${m[1]}。`],
  [/^Gain (\d+) VPs?\.?$/i, m => `勝利点${m[1]}。`],

  // Corporation openings
  [/^You start with (\d+) M€\.?$/i, m => `初期資金 ${m[1]} MC。`],
  [/^You start with (\d+) M€ and (\d+) ([A-Za-z€]+)\.?$/i,
    m => `初期資金 ${m[1]} MC と${RESOURCE[m[3]] ?? m[3]}${m[2]}。`],
  [/^As your first action, /i, () => "最初のアクションとして、"],

  // Payment and cost
  [/^Pay (\d+) M€\.?$/i, m => `${m[1]} MCを支払う。`],
  [/^Action: Pay (\d+) M€ to (.+?)\.?$/i, m => `アクション: ${m[1]} MCを支払い、${m[2]}。`],
  [/^Action: (.+?)\.?$/i, m => `アクション: ${m[1]}。`],

  // Global parameters without "the"
  [/^Increase temperature (\d+) steps?\.?$/i, m => `気温を${m[1]}段階上げる。`],
  [/^Raise temperature (\d+) steps?\.?$/i, m => `気温を${m[1]}段階上げる。`],
  [/^Increase oxygen (\d+) steps?\.?$/i, m => `酸素を${m[1]}段階上げる。`],
  [/^Increase ([A-Za-z€]+) production (\d+) steps?\.?$/i, m => `${prod(m[1])}+${m[2]}。`],
  [/^Decrease ([A-Za-z€]+) production (\d+) steps?\.?$/i, m => `${prod(m[1])}-${m[2]}。`],

  // Requirements without "tiles"
  [/^Requires (\d+) oceans?\.?$/i, m => `海洋${m[1]}枚以上が必要。`],
  [/^It must be (-?\d+)\s*°?\s*C or colder\.?$/i, m => `気温${m[1]}°C以下であること。`],
  [/^It must be (-?\d+)\s*°?\s*C or warmer\.?$/i, m => `気温${m[1]}°C以上であること。`],
  [/^Requires ([A-Za-z]+), ([A-Za-z]+) and ([A-Za-z]+) tags\.?$/i, m =>
    `${[m[1], m[2], m[3]].map(t => TAG[t.toLowerCase()] ?? t).join("・")}タグが必要。`],

  // Turmoil
  [/^Requires that you are Chairman\.?$/i, () => "議長であることが必要。"],
  [/^Place (\d+) delegates? in (?:one|1|an?) part(?:y|ies)\.?$/i,
    m => `任意の政党に代表者を${m[1]}人置く。`],
  [/^Requires that ([A-Za-z]+) are ruling or that you have (\d+) delegates? there\.?$/i,
    m => `${m[1]}が与党であるか、その政党に代表者${m[2]}人が必要。`],

  // Colonies
  [/^Gain (\d+) Trade Fleets?\.?$/i, m => `交易船を${m[1]}隻獲得。`],
  [/^Trade for free\.?$/i, () => "無料で交易を行う。"],

  // Tiles
  [/^Place this tile\.?$/i, () => "このタイルを置く。"],

  // Deck manipulation
  [/^Look at the top (\d+) cards? from the deck\.?$/i,
    m => `山札の上から${m[1]}枚を見る。`],

  // Per-tag scaling
  [
    /^Increase your ([A-Za-z€]+) production (\d+) steps? for each ([A-Za-z]+) tag you have,? including this\.?$/i,
    m => `このカードを含む${TAG[m[3].toLowerCase()] ?? m[3]}タグ1枚につき${prod(m[1])}+${m[2]}。`
  ],
  [
    /^Increase your ([A-Za-z€]+) production (\d+) steps? for each ([A-Za-z]+) tag you have\.?$/i,
    m => `${TAG[m[3].toLowerCase()] ?? m[3]}タグ1枚につき${prod(m[1])}+${m[2]}。`
  ],
  [
    /^Gain (\d+) ([A-Za-z€]+) for each ([A-Za-z]+) tag you have\.?$/i,
    m => `${TAG[m[3].toLowerCase()] ?? m[3]}タグ1枚につき${RESOURCE[m[2]] ?? m[2]}${m[1]}を獲得。`
  ],

  // Compound raise + gain
  [
    /^Raise temperature (\d+) steps? and gain (\d+) ([A-Za-z€]+)\.?$/i,
    m => `気温を${m[1]}段階上げ、${RESOURCE[m[3]] ?? m[3]}${m[2]}を獲得。`
  ],
  [
    /^Place a greenery tile and raise the oxygen level (\d+) steps?\.?$/i,
    m => `緑地タイルを1枚置き、酸素を${m[1]}段階上げる。`
  ],
  [/^Place a city tile ON THE RESERVED AREA\.?$/i, () => "予約マスに都市タイルを1枚置く。"],
  [/^Requires (\d+) cities in play\.?$/i, m => `場に都市${m[1]}個以上が必要。`],
  [
    /^Decrease any ([A-Za-z€]+) production (\d+) steps? and increase your own (\d+) steps?\.?$/i,
    m => `任意のプレイヤーの${prod(m[1])}-${m[2]}、自分の${prod(m[1])}+${m[3]}。`
  ],
  [
    /^The next card you play this generation costs (\d+) M€ less\.?$/i,
    m => `この世代に次にプレイするカードのコストが${m[1]} MC減少。`
  ],
  [
    /^Increase your ([A-Za-z€]+) production (\d+) steps? for every (\d+) ([A-Za-z]+) tags? you have,? including this\.?$/i,
    m => `このカードを含む${TAG[m[4].toLowerCase()] ?? m[4]}タグ${m[3]}枚につき${prod(m[1])}+${m[2]}。`
  ],
  [
    /^Effect: When you trade, you pay (\d+) less resource for it\.?$/i,
    m => `効果: 交易時の支払い資源が${m[1]}減少。`
  ]
];

// Translations for the long tail the rules cannot reach. Card effects are mostly
// formulaic, but a few hundred are one-off wordings where a rule per card buys
// nothing over writing the sentence out.
let CURATED_EFFECTS = {};
try {
  const { CURATED_JAPANESE_EFFECTS } = await import(
    pathToUrl(resolve(process.cwd(), "scripts", "japanese-effects.data.js"))
  );
  CURATED_EFFECTS = CURATED_JAPANESE_EFFECTS;
} catch {
  // Optional: the rule-based output still generates without it.
}

// The catalog captured only the text run of this card, dropping the icons that
// complete the sentence. The printed card reads "Opponents may not remove your
// plants, animals or microbes."
const SOURCE_TEXT_FIXES = {
  "card-base-protected-habitats": "相手はあなたの植物・動物・微生物を除去できない。"
};

const stats = { translated: 0, untouched: 0 };
const unknownShapes = new Map();

// The catalog spells the same rule several ways ("two cards" vs "2 cards",
// "-30 C°" vs "-30 C"). Normalising first lets one rule cover all of them.
const NUMBER_WORDS = {
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10"
};

function normalize(sentence) {
  let text = sentence.trim();
  text = text.replace(/(-?\d+)\s*C°/g, "$1 C");
  text = text.replace(/\+(\d+)\s*C\b/g, "$1 C");
  text = text.replace(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi,
    match => NUMBER_WORDS[match.toLowerCase()] ?? match
  );
  text = text.replace(/\bor lower\b/gi, "or less");
  text = text.replace(/\bRaise oxygen\b/gi, "Raise the oxygen level");
  text = text.replace(/\bIncrease your TR\b/gi, "Raise your TR");
  return text;
}

function translateSentence(sentence) {
  const trimmed = normalize(sentence);
  if (!trimmed) return null;
  for (const [pattern, build] of RULES) {
    const match = trimmed.match(pattern);
    if (match) {
      stats.translated += 1;
      return build(match);
    }
  }
  stats.untouched += 1;
  const shape = trimmed.replace(/\d+/g, "N");
  unknownShapes.set(shape, (unknownShapes.get(shape) ?? 0) + 1);
  return trimmed;
}

// Party and tag names survive inside otherwise-Japanese sentences, because the
// curated text and the reference wording both use the English proper nouns.
const RESIDUAL_TERMS = [
  [/\bMars First\b/g, "マーズ・ファースト"],
  [/\bScientists\b/g, "サイエンティスト"],
  [/\bUnity\b/g, "ユニティ"],
  [/\bGreens\b/g, "グリーン"],
  [/\bReds\b/g, "レッズ"],
  [/\bKelvinists\b/g, "ケルヴィニスト"],
  [/\bJovian\b/g, "ジョビアン"],
  [/\bEarth\b/g, "地球"],
  [/\bVenus\b/g, "金星"],
  [/\bPower\b/g, "電力"],
  [/\bBuilding\b/g, "建材"],
  [/\bScience\b/g, "科学"],
  [/\bSpace\b/g, "宇宙"],
  [/\bMicrobe\b/g, "微生物"],
  [/\bAnimal\b/g, "動物"],
  [/\bPlant\b/g, "植物"],
  [/\bCity\b/g, "都市"],
  [/\bEvent\b/g, "イベント"],
  [/\bPrelude\b/g, "プレリュード"],
  [/\bcorporation cards?\b/gi, "企業カード"]
];

function localizeResidualTerms(text) {
  let result = text;
  for (const [pattern, replacement] of RESIDUAL_TERMS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function translateEffectText(text) {
  if (!text) return text;
  // Already Japanese: keep the wording, but still localise any proper nouns
  // left standing inside it.
  if (/[ぁ-んァ-ヶ一-龠]/.test(text)) return localizeResidualTerms(text);
  return localizeResidualTerms(
    text
      .split(/(?<=\.)\s+/)
      .map(translateSentence)
      .filter(Boolean)
      .join("")
  );
}

// --- names -----------------------------------------------------------------
// Card names are proper nouns. Transliterating them mechanically produces
// nonsense, so they are kept in English and only the terms that carry rules
// meaning are localised. A curated map covers the most-seen cards.

const NAME_OVERRIDES = {
  "Power Plant": "発電所",
  Mine: "鉱山",
  "Titanium Mine": "チタン鉱山",
  Asteroid: "小惑星",
  Comet: "彗星",
  Greenhouses: "温室",
  Plantation: "植林地",
  Moss: "コケ",
  Lichen: "地衣類",
  Ants: "アリ",
  Birds: "鳥類",
  Fish: "魚類",
  "Search For Life": "生命の探索",
  "Mars University": "火星大学",
  "AI Central": "AI中央司令部",
  Capital: "首都",
  Steelworks: "製鋼所",
  "Ice Asteroid": "氷小惑星",
  "Big Asteroid": "巨大小惑星",
  "Deimos Down": "デイモス落下",
  "Giant Ice Asteroid": "巨大氷小惑星",
  "Nitrogen-Rich Asteroid": "窒素豊富小惑星",
  "Local Heat Trapping": "局所熱捕捉",
  "Convoy From Europa": "エウロパからの輸送船",
  "Imported Hydrogen": "水素輸入",
  "Imported Nitrogen": "窒素輸入",
  "Space Elevator": "軌道エレベーター",
  "Solar Wind Power": "太陽風発電",
  "Nuclear Zone": "核実験区域",
  "Industrial Center": "工業地帯",
  "Commercial District": "商業地区",
  "Ecological Zone": "生態保護区",
  "Natural Preserve": "自然保護区",
  "Mohole Area": "モホール地帯",
  "Restricted Area": "制限区域",
  "Mining Area": "採掘地帯",
  "Mining Rights": "採掘権",
  "Lava Flows": "溶岩流",
  "Magnetic Field Generators": "磁場発生装置",
  "Great Dam": "巨大ダム",
  "Protected Habitats": "保護生息地",
  "Trees": "樹木",
  "Grass": "草",
  "Heather": "ヒース",
  "Kelp Farming": "コンブ養殖",
  "Algae": "藻類",
  "Bushes": "低木",
  "Tundra Farming": "ツンドラ農業",
  "Farming": "農業",
  "Livestock": "家畜",
  "Fusion Power": "核融合発電",
  "Geothermal Power": "地熱発電",
  "Nuclear Power": "原子力発電",
  "Wind Turbines": "風力タービン",
  "Solar Power": "太陽光発電",
  "Water Import From Europa": "エウロパからの水輸入",
  "Space Station": "宇宙ステーション",
  "Terraforming Ganymede": "ガニメデのテラフォーミング",
  "Immigrant City": "移民都市",
  "Underground City": "地下都市",
  "Dome Farming": "ドーム農場",
  "Noctis City": "ノクティス・シティ",
  "Research Outpost": "研究前哨基地",
  "Medical Lab": "医療研究所",
  "Aquifer Pumping": "帯水層汲み上げ",
  "Artificial Lake": "人工湖",
  "Flooding": "洪水",
  "Permafrost Extraction": "永久凍土掘削",
  "Subterranean Reservoir": "地下貯水池"
};

function translateName(name) {
  return NAME_OVERRIDES[name] ?? null;
}

// --- build -----------------------------------------------------------------

const groups = [
  ["projects", FULL_PROJECTS],
  ["corporations", FULL_CORPORATIONS],
  ["preludes", FULL_PRELUDES],
  ["globalEvents", FULL_GLOBAL_EVENTS],
  ["standardProjects", FULL_STANDARD_PROJECTS],
  ["standardActions", FULL_STANDARD_ACTIONS]
];

const entries = {};
let named = 0;
for (const [, cards] of groups) {
  for (const card of cards) {
    const name = translateName(card.name);
    // Curated wording wins over the rule output, which is a fallback for the
    // formulaic majority.
    const curated = SOURCE_TEXT_FIXES[card.id] ?? CURATED_EFFECTS[card.id];
    const effectText = curated
      ? localizeResidualTerms(curated)
      : translateEffectText(card.effectText);
    const record = {};
    if (name) {
      record.name = name;
      named += 1;
    }
    if (effectText && effectText !== card.effectText) record.effectText = effectText;
    if (Object.keys(record).length > 0) entries[card.id] = record;
  }
}

const body = Object.entries(entries)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([id, record]) => `  ${JSON.stringify(id)}: ${JSON.stringify(record)}`)
  .join(",\n");

const out = `// GENERATED by scripts/generate-japanese-text.mjs — do not edit by hand.
// Japanese names and effect text for the catalog. Names are only translated where
// a curated reading exists; the rest keep their printed English name, which is how
// the physical Japanese edition prints many of them too.
// ${Object.keys(entries).length} entries, ${named} with a translated name.

export const JAPANESE_TEXT = {
${body}
};

const HAS_JAPANESE = /[ぁ-んァ-ヶ一-龠]/;

// Applies the generated Japanese, but never overwrites text that is already
// Japanese — hand-written wording in official-content.js wins.
export function localizeCard(card) {
  const text = JAPANESE_TEXT[card.id];
  if (!text) return card;

  const next = { ...card, englishName: card.name };
  if (text.name && !HAS_JAPANESE.test(card.name)) next.name = text.name;
  if (text.effectText && !HAS_JAPANESE.test(card.effectText ?? "")) {
    next.effectText = text.effectText;
  }
  return next;
}
`;

await writeFile(resolve(process.cwd(), "app", "japanese-text.js"), out, "utf8");

const totalSentences = stats.translated + stats.untouched;
console.log(`Wrote ${Object.keys(entries).length} entries (${named} names).`);
console.log(
  `Sentences translated: ${stats.translated}/${totalSentences} ` +
    `(${Math.round((stats.translated / totalSentences) * 100)}%)`
);
if (unknownShapes.size > 0) {
  console.log(`\nUntranslated shapes (${unknownShapes.size} distinct), most common:`);
  for (const [shape, count] of [...unknownShapes].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${String(count).padStart(3)}  ${shape.slice(0, 90)}`);
  }
}
