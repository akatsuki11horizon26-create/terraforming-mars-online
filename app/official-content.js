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
  // Both ship with an empty effectSpec in the generated catalog, so they did
  // nothing at all. The discount applies to the next card played only, which
  // the engine models with oneShotCardDiscount.
  project("card-base-indentured-workers", "Indentured Workers", 0, [], "event", "この世代に次にプレイするカードのコストが8 MC減少。", { cardDiscount: { amount: 8, nextCardOnly: true } }, { victoryPoints: -1 }),
  project("card-colonies-conscription", "Conscription", 5, ["Earth"], "event", "地球タグ2枚以上が必要。この世代に次にプレイするカードのコストが16 MC減少。", { cardDiscount: { amount: 16, nextCardOnly: true } }, { victoryPoints: -1, requires: { tags: { Earth: 2 } }, reqText: "地球タグ2枚以上" }),
  project("card-promo-soil-enrichment", "Soil Enrichment", 6, ["Microbe", "Plant"], "event", "自分の任意のカードから微生物1個を支払い、植物を5獲得。", {}, { effectSpec: { behavior: { removeResourcesFromAnyCard: { type: "Microbe" } } } }),
  // The generated catalog ships this with an empty effectSpec, so the card was
  // a 6 M€ science tag and nothing else.
  project("card-base-standard-technology", "Standard Technology", 6, ["Science"], "active", "標準プロジェクトの代金を支払った後、MC3を得る（特許の売却を除く）。", { standardProjectRebate: 3 }, { victoryPoints: 0 }),
  // "Decrease any X production 1 step and increase your own 1 step." The
  // generated catalog carries no spec for these four, and the taking half was
  // the only half the engine modelled, so they cost their money and only hurt
  // someone. `stealing` moves the step to the player instead of destroying it.
  // Recovered from the reference implementation's declarative blocks. These
  // eight are the ones the engine can already run; the other six extracted
  // cards need capabilities it does not have yet and are deliberately absent.
  project("card-base-ants", "Ants", 9, ["Microbe"], "active", "酸素4%以上が必要。アクション: 任意のカードから微生物を1個取り除き、このカードに微生物を1個追加する。", {}, {"requires": {"oxygen": 4}, "reqText": "酸素4%以上", "effectSpec": {"action": {"removeResourcesFromAnyCard": {"type": "Microbe", "source": "all"}, "addResources": 1}}}),
  project("card-base-predators", "Predators", 14, ["Animal"], "active", "酸素11%以上が必要。アクション: 任意のカードから動物を1個取り除き、このカードに動物を1個追加する。", {}, {"requires": {"oxygen": 11}, "reqText": "酸素11%以上", "effectSpec": {"action": {"removeResourcesFromAnyCard": {"type": "Animal", "source": "all"}, "addResources": 1}}}),
  project("card-base-aquifer-pumping", "Aquifer Pumping", 18, ["Building"], "active", "アクション: 8MCを支払い、海洋タイルを1枚置く。建物カードをプレイする場合と同様に建材を使用できる。", {}, {"effectSpec": {"action": {"spend": {"megacredits": 8, "canUseSteel": true}, "ocean": {}}}}),
  project("card-base-water-import-from-europa", "Water Import From Europa", 25, ["Jovian", "Space"], "active", "アクション: 12MCを支払い、海洋タイルを1枚置く。宇宙カードをプレイする場合と同様にチタンを使用できる。", {}, {"victoryPointSpec": {"tag": "jovian"}, "effectSpec": {"action": {"spend": {"megacredits": 12, "canUseTitanium": true}, "ocean": {}}}}),
  project("card-promo-directed-impactors", "Directed Impactors", 8, ["Space"], "active", "アクション: MCを6消費して任意のカードに小惑星を1個追加する（この支払いにチタンを使用してもよい）、またはこのカードの小惑星を1個取り除いて気温+1。", {}, {"effectSpec": {"action": {"or": {"autoSelect": true, "behaviors": [{"title": "Remove 1 asteroid to raise temperature 1 step", "spend": {"resourcesHere": 1}, "global": {"temperature": 1}}, {"title": "Pay 6 M€ to add 1 asteroid to a card", "spend": {"megacredits": 6, "canUseTitanium": true}, "addResourcesToAnyCard": {"count": 1, "type": "Asteroid"}}]}}}}),
  project("card-venus-rotator-impacts", "Rotator Impacts", 6, ["Space"], "active", "金星14%以下が必要。アクション: MCを6支払いこのカードに小惑星資源を1個追加する（チタンで支払い可）、またはこのカードの小惑星資源1個を支払い金星+1。", {}, {"reqText": "金星14%以下", "effectSpec": {"action": {"or": {"autoSelect": true, "behaviors": [{"title": "Remove 1 asteroid to raise Venus 1 step", "spend": {"resourcesHere": 1}, "global": {"venus": 1}}, {"title": "Pay 6 M€ to add 1 asteroid to this card", "spend": {"megacredits": 6, "canUseTitanium": true}, "addResources": 1}]}}}}),
  project("card-colonies-titan-air-scrapping", "Titan Air-scrapping", 21, ["Jovian"], "active", "アクション: チタン1でこのカードにフローター2個、またはフローター2個を消費してTR+1。", {}, {"victoryPoints": 2, "effectSpec": {"action": {"or": {"autoSelect": true, "behaviors": [{"spend": {"resourcesHere": 2}, "tr": 1, "title": "Remove 2 floaters here to increase your TR 1 step"}, {"spend": {"titanium": 1}, "addResources": 2, "title": "Spend 1 titanium to add 2 floaters here"}]}}}}),
  project("card-prelude2-microgravity-nutrition", "Microgravity Nutrition", 11, ["Microbe", "Plant"], "automated", "所有する植民地1つにつきMC生産量+1。", {}, {"victoryPoints": 1, "effectSpec": {"behavior": {"production": {"megacredits": {"colonies": {}}}}}}),
  project("card-promo-bio-printing-facility", "Bio Printing Facility", 7, ["Building"], "active", "アクション: エネルギー2で植物2獲得、または他のカードに動物1個を追加する。", {}, {"effectSpec": {"action": {"or": {"autoSelect": true, "behaviors": [{"spend": {"energy": 2}, "addResourcesToAnyCard": {"type": "Animal", "count": 1, "mustHaveCard": true}, "title": "Spend 2 energy to add 1 animal to another card"}, {"spend": {"energy": 2}, "stock": {"plants": 2}, "title": "Spend 2 energy to gain 2 plants"}]}}}}),
  project("card-promo-comet-aiming", "Comet Aiming", 17, ["Space"], "active", "アクション: チタン1で任意のカードに小惑星1個、またはこのカードの小惑星1個で海洋1枚を置く。", {}, {"effectSpec": {"action": {"or": {"autoSelect": true, "behaviors": [{"spend": {"resourcesHere": 1}, "ocean": {}, "title": "Remove 1 asteroid here to place an ocean"}, {"spend": {"titanium": 1}, "addResourcesToAnyCard": {"type": "Asteroid", "count": 1, "mustHaveCard": true}, "title": "Spend 1 titanium to add 1 asteroid to any card"}]}}}}),
  project("card-venus-forced-precipitation", "Forced Precipitation", 8, ["Venus"], "active", "アクション: MC2でこのカードにフローター1個、またはフローター2個を消費して金星+1。", {}, {"effectSpec": {"action": {"or": {"autoSelect": true, "behaviors": [{"title": "Remove 2 floaters here to raise Venus 1 step", "spend": {"resourcesHere": 2}, "global": {"venus": 1}}, {"title": "Pay 2 M€ to add 1 floater to this card", "spend": {"megacredits": 2}, "addResources": 1}]}}}}),
  project("card-venus-jet-stream-microscrappers", "Jet Stream Microscrappers", 12, ["Venus"], "active", "アクション: チタン1でこのカードにフローター2個、またはフローター2個を消費して金星+1。", {}, {"effectSpec": {"action": {"or": {"autoSelect": true, "behaviors": [{"spend": {"resourcesHere": 2}, "global": {"venus": 1}, "title": "Remove 2 floaters to raise Venus 1 step"}, {"spend": {"titanium": 1}, "addResources": 2, "title": "Spend 1 titanium to add 2 floaters to this card"}]}}}}),
  project("card-base-energy-tapping", "Energy Tapping", 3, ["Power"], "automated", "任意のプレイヤーの電力生産量-1、自分の電力生産量+1。", {}, { victoryPoints: -1, effectSpec: { behavior: { decreaseAnyProduction: { type: "energy", count: 1, stealing: true } } } }),
  project("card-base-power-supply-consortium", "Power Supply Consortium", 5, ["Power"], "automated", "電力タグ2枚以上。任意のプレイヤーの電力生産量-1、自分の電力生産量+1。", {}, { requires: { tags: { Power: 2 } }, reqText: "電力タグ2枚以上", effectSpec: { behavior: { decreaseAnyProduction: { type: "energy", count: 1, stealing: true } } } }),
  project("card-base-great-escarpment-consortium", "Great Escarpment Consortium", 6, [], "automated", "自分の建材生産量が必要。任意のプレイヤーの建材生産量-1、自分の建材生産量+1。", {}, { requires: { production: "steel" }, reqText: "自分の建材生産量1以上", effectSpec: { behavior: { decreaseAnyProduction: { type: "steel", count: 1, stealing: true } } } }),
  project("card-base-asteroid-mining-consortium", "Asteroid Mining Consortium", 13, ["Jovian"], "automated", "自分のチタン生産量が必要。任意のプレイヤーのチタン生産量-1、自分のチタン生産量+1。", {}, { requires: { production: "titanium" }, victoryPoints: 1, reqText: "自分のチタン生産量1以上", effectSpec: { behavior: { decreaseAnyProduction: { type: "titanium", count: 1, stealing: true } } } }),
  project("card-base-local-heat-trapping", "Local Heat Trapping", 1, [], "event", "熱5を支払い、植物4、または別のカードに動物2個を追加する。", {}, { effectSpec: { behavior: { or: { autoSelect: false, behaviors: [ { title: "Gain 4 plants", spend: { heat: 5 }, stock: { plants: 4 } }, { title: "Add 2 animals to another card", spend: { heat: 5 }, addResourcesToAnyCard: { type: "Animal", count: 2 } } ] } } } }),
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
  project("p-capital", "Capital", 26, ["City", "Building"], "automated", "海洋4以上。エネルギー生産量-2、MC生産量+5。都市タイルを置く。", { production: { energy: -2, mc: 5 }, tile: "city" }, { requires: { oceans: 4 }, placementType: "city", dynamicVictory: "adjacentOceans", reqText: "海洋4枚以上" }),
  project("p-geothermal-power", "Geothermal Power", 11, ["Power", "Building"], "automated", "エネルギー生産量+2。", { production: { energy: 2 } }),
  project("p-solar-power", "Solar Power", 11, ["Power", "Building"], "automated", "エネルギー生産量+1。", { production: { energy: 1 } }, { victoryPoints: 1 }),
  project("p-big-asteroid", "Big Asteroid", 27, ["Space"], "event", "気温を2段階上げ、チタン4。任意のプレイヤーの植物最大4を除去。", { temperatureSteps: 2, titanium: 4, removePlants: 4 }),
  project("p-ice-asteroid", "Ice Asteroid", 23, ["Space"], "event", "海洋2枚を置く。", { tile: "ocean", tileCount: 2 }, { placementType: "ocean", placementCount: 2 }),
  project("p-giant-ice-asteroid", "Giant Ice Asteroid", 36, ["Space"], "event", "気温を2段階上げ、海洋2枚。任意のプレイヤーの植物最大6を除去。", { temperatureSteps: 2, tile: "ocean", tileCount: 2, removePlants: 6 }, { placementType: "ocean", placementCount: 2 }),
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
  corporation("corp-phobolog", "PhoboLog", ["Space"], { mc: 23, titanium: 10 }, "チタン1個の価値がMC4。", { titaniumValue: 4 }),
  corporation("corp-saturn", "Saturn Systems", ["Jovian"], { mc: 42, production: { titanium: 1 } }, "ジョビアンタグが場に出るたびMC生産量+1。", { jovianProduction: 1 }),
  corporation("corp-teractor", "Teractor", ["Earth"], { mc: 60 }, "地球タグのカードコスト-3。", { earthDiscount: 3 }),
  corporation("corp-tharsis", "Tharsis Republic", ["Building"], { mc: 40 }, "最初のアクションで都市1枚。都市が置かれるたびMC生産量+1、自分が都市を置くとMC3。", { firstCity: true, cityProduction: 1, ownCityBonus: 3 }),
  corporation("corp-thorgate", "Thorgate", ["Power"], { mc: 48, production: { energy: 1 } }, "エネルギー生産量+1。電力タグのカードと発電所の建設コスト-3。", { powerDiscount: 3 }),
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
    // "Remove up to 3 titanium, 4 steel or 7 M€ from any player." Removing is
    // not taking: the resources go back to the supply and the player who
    // sabotaged gains nothing.
    steal: false,
    resources: [
      { resource: "titanium", count: 3 },
      { resource: "steel", count: 4 },
      { resource: "mc", count: 7 }
    ],
    prompt: "チタン3、建材4、またはMC7を取り除く対象を選んでください。"
  },
  "card-base-virus": {
    // "任意のカードから動物2個、または任意のプレイヤーから植物5個を取り除く".
    // Virus removes rather than steals. The animal half targets a *card* rather
    // than a player's stock, so it is listed separately and offered in the same
    // question as the plant half. Which cards can hold an animal comes from
    // `card-resource-types.js`, the same metadata the adding direction uses.
    steal: false,
    resources: [{ resource: "plants", count: 5 }],
    cardResources: [{ resourceType: "animal", count: 2 }],
    prompt: "動物2または植物5を取り除く対象を選んでください。"
  },
  "card-colonies-air-raid": {
    steal: true,
    resources: [{ resource: "mc", count: 5 }],
    prompt: "MC5を奪う対象を選んでください。",
    removeResourcesFromAnyCard: { type: "floater", count: 1, source: "self" }
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
              stealFromPlayer: (() => {
                const { removeResourcesFromAnyCard, ...steal } = STEAL_SPECS[card.id];
                return steal;
              })(),
              ...(STEAL_SPECS[card.id].removeResourcesFromAnyCard
                ? { removeResourcesFromAnyCard: STEAL_SPECS[card.id].removeResourcesFromAnyCard }
                : {})
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

// None of the three carries a victoryPointSpec, so the card face had nothing
// to draw and showed no badge at all.
const SPECIAL_VICTORY_DISPLAY = Object.freeze({
  "card-promo-law-suit": {
    label: "-1",
    description: "訴えられたプレイヤーが1勝利点を失う"
  },
  "card-promo-vermin": {
    label: "特殊",
    description: "動物10個以上なら、各プレイヤーは自分の都市1枚につき1勝利点を失う"
  },
  "card-promo-st-joseph-of-cupertino-mission": {
    label: "1",
    description: "大聖堂のある都市1枚につき1勝利点"
  }
});

const withSpecialVictory = cards =>
  cards.map(card => ({
    ...card,
    specialVictoryKind: SPECIAL_VICTORY_KIND[card.id] ?? null,
    specialVictoryDisplay: SPECIAL_VICTORY_DISPLAY[card.id] ?? null
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
// Prelude, Prelude 2 and Promo cards ship in their own boxes but some of them
// only function inside another expansion: they place a colony, raise the Venus
// track, carry floaters, or gate on a Turmoil party. Filtering by `expansion`
// alone let those into a Prelude-only game, where they are unplayable or do
// nothing. Cards that merely SCALE with another expansion ("gain 1 M€ per
// colony you have") are absent on purpose — they are legal at zero.
export const CARD_EXPANSION_DEPENDENCIES = Object.freeze({
  // --- Preludes ---
  "card-prelude2-atmospheric-enhancers": ["venus"],
  "card-prelude2-floating-trade-hub": ["venus"],
  "card-prelude2-planetary-alliance": ["venus"],
  "card-prelude2-venus-contract": ["venus"],
  "card-prelude2-venus-l1-shade": ["venus"],
  "card-promo-giant-solar-collector": ["venus"],
  "card-prelude2-early-colonization": ["colonies"],
  "card-prelude2-old-mining-colony": ["colonies"],
  "card-promo-strategic-base-planning": ["colonies"],
  "card-prelude2-corridors-of-power": ["turmoil"],
  "card-prelude2-high-circles": ["turmoil"],
  "card-prelude2-rise-to-power": ["turmoil"],
  // --- Projects ---
  "card-prelude2-cloud-tourism": ["venus"],
  "card-prelude2-floating-refinery": ["venus"],
  "card-prelude2-ishtar-expedition": ["venus"],
  "card-prelude2-stratospheric-expedition": ["venus"],
  "card-prelude2-unexpected-application": ["venus"],
  "card-prelude2-venus-orbital-survey": ["venus"],
  "card-prelude2-venus-shuttles": ["venus"],
  "card-prelude2-venus-trade-hub": ["venus"],
  "card-prelude2-venus-allies": ["venus"],
  "card-promo-saturn-surfing": ["venus"],
  "card-promo-weather-balloons": ["venus"],
  "card-prelude2-l1-trade-terminal": ["colonies"],
  "card-prelude2-envoys-from-venus": ["venus", "turmoil"],
  "card-prelude2-ghg-shipment": ["venus", "turmoil"],
  "card-prelude2-colonial-envoys": ["colonies", "turmoil"],
  "card-prelude2-colonial-representation": ["colonies", "turmoil"],
  "card-prelude2-frontier-town": ["turmoil"],
  "card-prelude2-jovian-envoys": ["turmoil"],
  "card-prelude2-red-appeasement": ["turmoil"],
  "card-prelude2-special-permit": ["turmoil"],
  "card-prelude2-sponsoring-nation": ["turmoil"],
  "card-prelude2-summit-logistics": ["turmoil"],
  "card-prelude2-wg-project": ["turmoil"]
});
export const OFFICIAL_CONTENT_VERSION = 2;
