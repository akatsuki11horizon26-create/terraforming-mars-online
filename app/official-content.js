import { localizeCard } from "./japanese-text.js";
import { FULL_CORPORATIONS, FULL_GLOBAL_EVENTS, FULL_PRELUDES, FULL_PROJECTS, FULL_STANDARD_ACTIONS, FULL_STANDARD_PROJECTS } from "./full-card-catalog.js";

const project = (id, name, cost, tags, type, effectText, effect, extra = {}) => ({
  id,
  name,
  cost,
  tags,
  type,
  reqText: extra.reqText ?? "なし",
  effectText,
  effect,
  victoryPoints: 0,
  ...extra,
});

const CURATED_PROJECT_OVERRIDES = [
  project("p-asteroid", "Asteroid", 14, ["Space"], "event", "気温を1段階上げ、チタン2。任意のプレイヤーの植物最大3を除去。", { temperatureSteps: 1, titanium: 2, removePlants: 3 }),
  project("p-comet", "Comet", 21, ["Space"], "event", "気温を1段階上げ、海洋1。任意のプレイヤーの植物最大3を除去。", { temperatureSteps: 1, tile: "ocean", removePlants: 3 }, { placementType: "ocean" }),
  project("p-titanium-mine", "Titanium Mine", 7, ["Building"], "automated", "チタン生産量+1。", { production: { titanium: 1 } }),
  project("p-power-plant", "Power Plant", 4, ["Power", "Building"], "automated", "エネルギー生産量+1。", { production: { energy: 1 } }),
  project("p-mine", "Mine", 4, ["Building"], "automated", "建材生産量+1。", { production: { steel: 1 } }),
  project("p-steelworks", "Steelworks", 15, ["Building"], "active", "アクション: エネルギー4を支払い、建材2と酸素1段階。", { action: { energyCost: 4, steel: 2, oxygenSteps: 1 } }),
  project("p-greenhouses", "Greenhouses", 6, ["Plant", "Building"], "automated", "場の都市1つにつき植物1。", { plantsPerCity: 1 }),
  project("p-plantation", "Plantation", 15, ["Plant"], "automated", "科学タグ2以上。緑地1枚を置き、酸素1段階。", { tile: "forest" }, { placementType: "forest", requires: { tags: { Science: 2 } }, reqText: "科学タグ2枚以上" }),
  project("p-moss", "Moss", 4, ["Plant"], "automated", "海洋3以上。植物1を失い、植物生産量+1。", { production: { plants: 1 }, plants: -1 }, { requires: { oceans: 3, plants: 1 }, reqText: "海洋3枚以上、植物1以上" }),
  project("p-lichen", "Lichen", 7, ["Plant"], "automated", "気温-24°C以上。植物生産量+1。", { production: { plants: 1 } }, { requires: { temperature: -24 }, reqText: "気温-24°C以上" }),
  project("p-search-for-life", "Search for Life", 3, ["Science"], "active", "アクション: MC1で山札1枚を公開。微生物タグならこのカードに科学資源。", { action: { mcCost: 1, revealTag: "Microbe", resource: "science" } }, { requires: { oxygenMax: 6 }, victoryPoints: 0, resourceType: "science", reqText: "酸素6%以下" }),
  project("p-mars-university", "Mars University", 8, ["Science", "Building"], "active", "科学タグを出すたび、手札1枚を捨てて1枚引いてよい。", { ongoing: "science-discard-draw" }, { victoryPoints: 1 }),
  project("p-ai-central", "AI Central", 21, ["Science", "Building"], "active", "科学タグ3以上。エネルギー生産量-1。アクション: 2枚引く。", { production: { energy: -1 }, action: { draw: 2 } }, { requires: { tags: { Science: 3 } }, victoryPoints: 1, reqText: "科学タグ3枚以上" }),
  project("p-capital", "Capital", 26, ["City", "Building"], "automated", "海洋4以上。エネルギー生産量-2、MC生産量+5。都市タイルを置く。", { production: { energy: -2, mc: 5 } }, { requires: { oceans: 4 }, placementType: "city", dynamicVictory: "adjacentOceans", reqText: "海洋4枚以上" }),
  project("p-geothermal-power", "Geothermal Power", 11, ["Power", "Building"], "automated", "エネルギー生産量+2。", { production: { energy: 2 } }),
  project("p-solar-power", "Solar Power", 11, ["Power", "Building"], "automated", "エネルギー生産量+1。", { production: { energy: 1 } }, { victoryPoints: 1 }),
  project("p-big-asteroid", "Big Asteroid", 27, ["Space"], "event", "気温を2段階上げ、チタン4。任意のプレイヤーの植物最大4を除去。", { temperatureSteps: 2, titanium: 4, removePlants: 4 }),
  project("p-ice-asteroid", "Ice Asteroid", 23, ["Space"], "event", "海洋2枚を置く。", { tile: "ocean", tileCount: 2 }, { placementType: "ocean", placementCount: 2 }),
  project("p-giant-ice-asteroid", "Giant Ice Asteroid", 36, ["Space"], "event", "気温を2段階上げ、海洋2枚。任意のプレイヤーの植物最大6を除去。", { temperatureSteps: 2, tile: "ocean", tileCount: 2, removePlants: 6 }, { placementType: "ocean", placementCount: 2 }),
  project("p-aquifer-pumping", "Aquifer Pumping", 18, ["Building"], "active", "アクション: MC8（建材可）を支払い、海洋1枚を置く。", { action: { mcCost: 8, steelCost: true, tile: "ocean" } }),
];

const corporation = (id, name, tags, starting, effectText, effects = {}) => ({ id, name, tags, starting, effectText, effects });

const CURATED_CORPORATION_OVERRIDES = [
  corporation("corp-beginner", "Beginner Corporation", [], { mc: 42 }, "初期10枚を無料で保持する。", { freeStartingCards: true }),
  corporation("corp-credicor", "CrediCor", ["Earth"], { mc: 57 }, "基本コスト20以上のカードまたは標準プロジェクトを支払うとMC4。", { expensivePaymentBonus: 4 }),
  corporation("corp-ecoline", "Ecoline", ["Plant"], { mc: 36, plants: 3, production: { plants: 2 } }, "植物3、植物生産量+2。植物7で緑地を置くアクション。", { plantGreeneryCost: 7 }),
  corporation("corp-helion", "Helion", ["Space"], { mc: 42, production: { heat: 3 } }, "熱生産量+3。熱をMCとして支払い可能。", { heatAsMoney: true }),
  corporation("corp-ic", "Interplanetary Cinematics", ["Building"], { mc: 30, steel: 20 }, "イベントをプレイするたびMC2。", { eventBonus: 2 }),
  corporation("corp-inventrix", "Inventrix", ["Science"], { mc: 45 }, "最初のアクションでカード3枚を引く。条件の数値条件を±2緩和。", { requirementBuffer: 2, firstActionDraw: 3 }),
  corporation("corp-mining-guild", "Mining Guild", ["Building", "Building"], { mc: 30, steel: 5, production: { steel: 1 } }, "建材またはチタンの配置ボーナスに置くたび建材生産量+1。", { miningBonus: true }),
  corporation("corp-phobolog", "PhoboLog", ["Space"], { mc: 23, titanium: 10 }, "チタン1個の価値がMC3。", { titaniumValue: 3 }),
  corporation("corp-saturn", "Saturn Systems", ["Jovian"], { mc: 42, production: { titanium: 1 } }, "ジョビアンタグが場に出るたびMC生産量+1。", { jovianProduction: 1 }),
  corporation("corp-teractor", "Teractor", ["Earth"], { mc: 60 }, "地球タグのカードコスト-3。", { earthDiscount: 3 }),
  corporation("corp-tharsis", "Tharsis Republic", ["Building"], { mc: 40 }, "最初のアクションで都市1枚。都市が置かれるたびMC生産量+1、自分が都市を置くとMC3。", { firstCity: true, cityProduction: 1, ownCityBonus: 3 }),
  corporation("corp-thorgate", "Thorgate", ["Power"], { mc: 48, production: { energy: 1 } }, "エネルギー生産量+1。電力タグのカードコスト-3。", { powerDiscount: 3 }),
  corporation("corp-unmi", "United Nations Mars Initiative", ["Earth"], { mc: 40 }, "アクション: この世代にTRが上がっていればMC3でTR+1。", { trActionCost: 3 }),
  corporation("corp-cheung-shing", "Cheung Shing MARS", ["Building"], { mc: 44, production: { mc: 3 } }, "MC生産量+3。建物タグのカードコスト-2。", { buildingDiscount: 2 }),
  corporation("corp-point-luna", "Point Luna", ["Earth"], { mc: 38, production: { titanium: 1 } }, "チタン生産量+1。地球タグをプレイするたび1枚引く。", { earthDraw: 1 }),
  corporation("corp-robinson", "Robinson Industries", [], { mc: 47 }, "アクション: MC4で任意の生産量+1。", { productionActionCost: 4 }),
  corporation("corp-valley-trust", "Valley Trust", ["Earth"], { mc: 37 }, "最初のアクションでプレリュードを3枚見て1枚プレイする。科学タグのカードコスト-2。", { firstPrelude: true, scienceDiscount: 2 }),
  corporation("corp-vitor", "Vitor", ["Earth"], { mc: 45 }, "最初のアクションで賞を無料で設立する。VP付きカードを出すとMC3。", { firstAward: true, vpBonus: 3 }),
];

const prelude = (id, name, effectText, effect, extra = {}) => ({ id, name, effectText, effect, tags: extra.tags ?? [], ...extra });

const CURATED_PRELUDE_OVERRIDES = [
  prelude("prelude-allied-banks", "Allied Banks", "MC生産量+4、MC3。", { production: { mc: 4 }, mc: 3 }, { tags: ["Earth"] }),
  prelude("prelude-biosphere-support", "Biosphere Support", "植物生産量+2、MC生産量-1。", { production: { plants: 2, mc: -1 } }, { tags: ["Plant"] }),
  prelude("prelude-aquifer-turbines", "Aquifer Turbines", "MC3を支払い、海洋1枚とエネルギー生産量+2。", { payMc: 3, production: { energy: 2 }, tile: "ocean" }, { tags: ["Building"] }),
  prelude("prelude-mohole-excavation", "Mohole Excavation", "建材生産量+1、熱生産量+2、熱2。", { production: { steel: 1, heat: 2 }, heat: 2 }, { tags: ["Building"] }),
  prelude("prelude-early-settlement", "Early Settlement", "植物生産量+1、都市1枚。", { production: { plants: 1 }, tile: "city" }, { tags: ["Building"] }),
  prelude("prelude-biofuels", "Biofuels", "エネルギー・植物生産量+1、植物2。", { production: { energy: 1, plants: 1 }, plants: 2 }, { tags: ["Plant"] }),
  prelude("prelude-power-generation", "Power Generation", "エネルギー生産量+3。", { production: { energy: 3 } }, { tags: ["Power"] }),
  prelude("prelude-self-sufficient-settlement", "Self-Sufficient Settlement", "MC生産量+2、都市1枚。", { production: { mc: 2 }, tile: "city" }, { tags: ["Building"] }),
  prelude("prelude-mining-operations", "Mining Operations", "建材生産量+2、建材4。", { production: { steel: 2 }, steel: 4 }, { tags: ["Building"] }),
  prelude("prelude-unmi-contractor", "UNMI Contractor", "TR+3、カード1枚。", { tr: 3, draw: 1 }, { tags: ["Earth"] }),
  prelude("prelude-dome-farming", "Dome Farming", "MC生産量+2、植物生産量+1。", { production: { mc: 2, plants: 1 } }, { tags: ["Building"] }),
  prelude("prelude-business-empire", "Business Empire", "MC6を支払い、MC生産量+6。", { payMc: 6, production: { mc: 6 } }, { tags: ["Earth"] }),
  prelude("prelude-donation", "Donation", "MC21。", { mc: 21 }, { tags: ["Earth"] }),
  prelude("prelude-nitrogen-shipment", "Nitrogen Shipment", "植物生産量+1、TR+1、MC5。", { production: { plants: 1 }, tr: 1, mc: 5 }, { tags: ["Space"] }),
  prelude("prelude-smelting-plant", "Smelting Plant", "酸素2段階、建材5。", { oxygenSteps: 2, steel: 5 }, { tags: ["Building"] }),
  prelude("prelude-supplier", "Supplier", "エネルギー生産量+2、建材4。", { production: { energy: 2 }, steel: 4 }, { tags: ["Building"] }),
  prelude("prelude-supply-drop", "Supply Drop", "チタン3、建材8、植物3。", { titanium: 3, steel: 8, plants: 3 }, { tags: ["Space"] }),
  prelude("prelude-great-aquifer", "Great Aquifer", "海洋2枚。", { tile: "ocean", tileCount: 2 }, { tags: ["Building"] }),
  prelude("prelude-biolab", "Biolab", "植物生産量+1、カード3枚。", { production: { plants: 1 }, draw: 3 }, { tags: ["Science"] }),
  prelude("prelude-martian-industries", "Martian Industries", "エネルギー・建材生産量+1、MC6。", { production: { energy: 1, steel: 1 }, mc: 6 }, { tags: ["Building"] }),
  prelude("prelude-io-research-outpost", "Io Research Outpost", "チタン生産量+1、カード1枚。", { production: { titanium: 1 }, draw: 1 }, { tags: ["Science", "Jovian"] }),
  prelude("prelude-polar-industries", "Polar Industries", "熱生産量+2、海洋1枚。", { production: { heat: 2 }, tile: "ocean" }, { tags: ["Building"] }),
  prelude("prelude-society-support", "Society Support", "植物・エネルギー・熱生産量+1、MC生産量-1。", { production: { plants: 1, energy: 1, heat: 1, mc: -1 } }, { tags: ["Earth"] }),
  prelude("prelude-galilean-mining", "Galilean Mining", "MC5を支払い、チタン生産量+2。", { payMc: 5, production: { titanium: 2 } }, { tags: ["Jovian"] }),
  prelude("prelude-huge-asteroid", "Huge Asteroid", "MC5を支払い、気温3段階。", { payMc: 5, temperatureSteps: 3 }, { tags: ["Space"] }),
  prelude("prelude-metals-company", "Metals Company", "MC・建材・チタン生産量+1。", { production: { mc: 1, steel: 1, titanium: 1 } }, { tags: ["Building"] }),
  prelude("prelude-loan", "Loan", "MC30、MC生産量-2。", { mc: 30, production: { mc: -2 } }, { tags: ["Earth"] }),
  prelude("prelude-mohole", "Mohole", "熱生産量+3、熱3。", { production: { heat: 3 }, heat: 3 }, { tags: ["Building"] }),
  prelude("prelude-metal-rich-asteroid", "Metal-Rich Asteroid", "気温1段階、チタン4、建材4。", { temperatureSteps: 1, titanium: 4, steel: 4 }, { tags: ["Space"] }),
  prelude("prelude-orbital-construction-yard", "Orbital Construction Yard", "チタン生産量+1、チタン4。", { production: { titanium: 1 }, titanium: 4 }, { tags: ["Space"] }),
  prelude("prelude-acquired-space-agency", "Acquired Space Agency", "チタン6、山札から宇宙タグ2枚を手札へ。", { titanium: 6, draw: 2, drawTag: "Space" }, { tags: ["Space"] }),
  prelude("prelude-research-network", "Research Network", "MC生産量+1、カード3枚。ワイルドタグを持つ。", { production: { mc: 1 }, draw: 3, wildTag: true }, { tags: ["Science"] }),
  prelude("prelude-eccentric-sponsor", "Eccentric Sponsor", "手札のカード1枚をコスト25軽減してプレイ。", { freePlayDiscount: 25 }, { tags: ["Earth"] }),
  prelude("prelude-ecology-experts", "Ecology Experts", "植物生産量+1。手札のカード1枚を地球条件無視でプレイ。", { production: { plants: 1 }, freePlayIgnoreGlobal: true }, { tags: ["Plant"] }),
  prelude("prelude-experimental-forest", "Experimental Forest", "緑地1枚。植物タグ2枚を山札から手札へ。", { tile: "forest", draw: 2, drawTag: "Plant" }, { tags: ["Plant"] }),
];

const mergeCatalog = (catalog, overrides) => {
  const canonicalName = (name) => ({ "allied banks": "allied bank" }[String(name).toLowerCase()] ?? String(name).toLowerCase());
  const byName = new Map(overrides.map(item => [canonicalName(item.name), item]));
  const merged = catalog.map(item => ({ ...item, ...(byName.get(canonicalName(item.name)) ?? {}) }));
  const catalogNames = new Set(catalog.map(item => canonicalName(item.name)));
  return [...merged, ...overrides.filter(item => !catalogNames.has(canonicalName(item.name)))];
};

// Japanese names and effect text, applied after the curated overrides so a
// hand-written Japanese entry always wins over the generated one.
const localize = cards => cards.map(card => localizeCard(card));

// Three promos score in ways no victoryPointSpec can describe: one pays a
// player other than its owner, one charges everyone, one counts markers on the
// board. They are tagged here rather than in the generated catalogue, which is
// rewritten by a script.
// Seven cards take resources from another player and carried no behaviour at
// all, so the attack half of each simply never happened. The generated
// catalogue is rewritten by a script, so the specs are attached here.
//
// `steal` moves the resource to the attacker; without it the resource is just
// removed. `resources` lists the alternatives the attacker chooses between,
// each capped at what the victim actually holds.
const STEAL_SPECS = Object.freeze({
  "card-base-hired-raiders": {
    steal: true,
    resources: [
      { resource: "steel", count: 2 },
      { resource: "mc", count: 3 }
    ],
    prompt: "建材2またはMC3を奪う対象を選んでください。"
  },
  "card-base-sabotage": {
    steal: true,
    resources: [
      { resource: "titanium", count: 3 },
      { resource: "steel", count: 4 },
      { resource: "mc", count: 7 }
    ],
    prompt: "チタン3、建材4、またはMC7を奪う対象を選んでください。"
  },
  "card-base-virus": {
    // Virus removes rather than steals. Only the plant half is modelled: cards
    // carry no resource-type metadata in this catalogue, so "two animals from
    // any card" cannot be targeted mechanically. Removing five plants is the
    // branch a player takes when there are no animals to hit anyway.
    steal: false,
    resources: [{ resource: "plants", count: 5 }],
    prompt: "植物5を取り除く対象を選んでください。"
  },
  "card-colonies-air-raid": {
    steal: true,
    resources: [{ resource: "mc", count: 5 }],
    prompt: "MC5を奪う対象を選んでください。"
  },
  "card-prelude2-special-permit": {
    steal: true,
    resources: [{ resource: "plants", count: 4 }],
    prompt: "植物4を奪う対象を選んでください。"
  },
  "card-venus-comet-for-venus": {
    steal: true,
    resources: [{ resource: "mc", count: 4 }],
    prompt: "MC4を奪う対象を選んでください（金星タグを持つプレイヤーのみ）。",
    eligibleTag: "venus"
  },
  "card-base-flooding": {
    // "取り除いてもよい" -- the attacker may decline, and declining leaves no
    // grievance for Law Suit to answer.
    steal: false,
    optional: true,
    resources: [{ resource: "mc", count: 4 }],
    prompt: "隣接タイルの所有者からMC4を取り除きますか？",
    eligibleAdjacentToLastTile: true,
    // Flooding's ocean was described as {tr:{oceans:1}}, which is not a shape
    // the effect reader understands, so the card placed nothing at all.
    alsoPlacesTile: "ocean"
  }
});

const withStealSpecs = cards =>
  cards.map(card =>
    STEAL_SPECS[card.id]
      ? {
          ...card,
          ...(STEAL_SPECS[card.id].alsoPlacesTile
            ? { placementType: STEAL_SPECS[card.id].alsoPlacesTile }
            : {}),
          effectSpec: {
            ...(card.effectSpec ?? {}),
            behavior: {
              ...(card.effectSpec?.behavior ?? {}),
              ...(STEAL_SPECS[card.id].alsoPlacesTile === "ocean" ? { ocean: {} } : {}),
              stealFromPlayer: STEAL_SPECS[card.id]
            }
          }
        }
      : card
  );

// St. Joseph builds cathedrals. The catalogue gives it no action at all, so
// the card sat in play doing nothing and could never score.
// `effect` short-circuits spec normalisation, which is a key whitelist and
// would drop buildCathedral as an unknown field.
const ST_JOSEPH_ACTION = Object.freeze({
  "card-promo-st-joseph-of-cupertino-mission": {
    action: { mcCost: 5, steelCost: true, buildCathedral: true }
  }
});

const withCardActions = cards =>
  cards.map(card =>
    ST_JOSEPH_ACTION[card.id] ? { ...card, effect: ST_JOSEPH_ACTION[card.id] } : card
  );

const SPECIAL_VICTORY_KIND = Object.freeze({
  "card-promo-law-suit": "law-suit",
  "card-promo-vermin": "vermin",
  "card-promo-st-joseph-of-cupertino-mission": "st-joseph"
});

const withSpecialVictory = cards =>
  cards.map(card => ({
    ...card,
    specialVictoryKind: SPECIAL_VICTORY_KIND[card.id] ?? null
  }));

// Only the curated corporations declare `effects`; the generated ones do not, and
// the engine reads corporation.effects.* in 22 places. Guarantee the object so
// choosing an unmodelled corporation cannot crash setup.
const withEffects = cards => cards.map(card => ({ ...card, effects: card.effects ?? {} }));

export const OFFICIAL_PROJECTS = withCardActions(
  withStealSpecs(
    withSpecialVictory(localize(mergeCatalog(FULL_PROJECTS, CURATED_PROJECT_OVERRIDES)))
  )
);
export const CORPORATIONS = withEffects(localize(mergeCatalog(FULL_CORPORATIONS, CURATED_CORPORATION_OVERRIDES)));
export const PRELUDES = localize(mergeCatalog(FULL_PRELUDES, CURATED_PRELUDE_OVERRIDES));
export const GLOBAL_EVENTS = localize(FULL_GLOBAL_EVENTS);
export const STANDARD_PROJECTS = localize(FULL_STANDARD_PROJECTS);
export const STANDARD_ACTIONS = localize(FULL_STANDARD_ACTIONS);
export const OFFICIAL_CONTENT_VERSION = 2;
