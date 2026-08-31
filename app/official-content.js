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
  // "Decrease your energy production 1 step and increase your M€ production 3
  // steps." The energy cost is in the card text and missing from the generated
  // spec, so it was never taken -- and a player with no energy production could
  // play it, which the reference refuses because the reserved Noctis space
  // carries no energy bonus to cover the loss.
  project("card-base-noctis-city", "Noctis City", 18, ["City", "Building"], "automated", "エネルギー生産量-1、MC生産量+3。予約された場所に都市タイルを1枚置く。通常の設置制限は無視する。", {}, { effectSpec: { behavior: { production: { energy: -1, megacredits: 3 }, city: { space: "noctis-city" } } } }),
  // "Action: Add a microbe or animal to ANOTHER card." Upstream joins the two
  // resource lists and asks; two branches of an or say the same thing with keys
  // we already have.
  project("card-promo-mohole-lake", "Mohole Lake", 31, ["Building"], "active", "植物を3獲得。気温+1。海洋タイルを1枚置く。アクション: 他のカード1枚に微生物または動物を1個追加する。", {}, { effectSpec: { behavior: { stock: { plants: 3 }, global: { temperature: 1 }, ocean: {} }, action: { or: { autoSelect: true, behaviors: [
    { title: "Add a microbe to another card", addResourcesToAnyCard: { count: 1, type: "Microbe", excludeThis: true } },
    { title: "Add an animal to another card", addResourcesToAnyCard: { count: 1, type: "Animal", excludeThis: true } }
  ] } } } }),
  // "Spend 1 M€ to add an asteroid to ANY card, OR spend 1 asteroid here to
  // increase M€ production 1 step, OR to gain 2 titanium." Three branches, each
  // written with keys the engine already had.
  project("card-promo-asteroid-rights", "Asteroid Rights", 10, ["Earth", "Space"], "active", "このカードに小惑星資源を2個追加する。アクション: MCを1支払い任意のカードに小惑星を1個追加する、またはこのカードの小惑星1個を支払いMC生産量+1、またはチタンを2獲得する。", {}, { resourceType: "asteroid", effectSpec: { behavior: { addResources: 2 }, action: { or: { autoSelect: false, behaviors: [
    { title: "Remove an asteroid here to increase M€ production 1 step", spend: { resourcesHere: 1 }, production: { megacredits: 1 } },
    { title: "Remove an asteroid here to gain 2 titanium", spend: { resourcesHere: 1 }, stock: { titanium: 2 } },
    { title: "Pay 1 M€ to add an asteroid to any card", spend: { megacredits: 1 }, addResourcesToAnyCard: { count: 1, type: "Asteroid" } }
  ] } } } }),
  // "Spend 1 floater from here to gain 1 M€ from each floater here, INCLUDING
  // THE PAID FLOATER. Max 5." Upstream writes it as Math.min(5, resourceCount--)
  // -- the post-decrement is what makes the spent floater count, and our
  // resourcesHere counter reads the pile before the spend for the same reason.
  project("card-promo-saturn-surfing", "Saturn Surfing", 13, ["Jovian", "Earth"], "active", "地球タグ1つにつきこのカードにフローターを1個追加する。アクション: このカードのフローターを1個支払い、支払った分を含めフローター1個につきMCを1獲得する（最大5）。", {}, { victoryPoints: 1, resourceType: "floater", effectSpec: { behavior: { addResources: { tag: "earth" } }, action: { spend: { resourcesHere: 1 }, stock: { megacredits: { resourcesHere: true, max: 5 } } } } }),
  // "Spend 1 energy production to gain 1 plant production." Upstream builds the
  // action by hand, so the generated spec carried only the TR half.
  project("card-promo-teslaract", "Teslaract", 14, ["Power", "Building"], "active", "TR+1。アクション: エネルギー生産量-1と引き換えに植物生産量+1。", {}, { effectSpec: { behavior: { tr: 1 }, action: { production: { energy: -1, plants: 1 } } } }),
  // "Gain 1 M€ per empty area adjacent to your tiles." Upstream counts them in
  // bespokePlay, so the generated spec carried only the production half and the
  // money was never paid. Red Tourism Wave already declares the same count.
  project("card-promo-hermetic-order-of-mars", "Hermetic Order of Mars", 10, [], "automated", "酸素4%以下が必要。MC生産量+2。自分のタイルに隣接する空きエリア1つにつきMCを1獲得。", {}, { requires: { oxygenMax: 4 }, reqText: "酸素4%以下", effectSpec: { behavior: { production: { megacredits: 2 }, stock: { megacredits: { ownedAdjacentEmptyAreas: true } } } } }),
  // "Requires Venus 12%. Spend 1 floater from ANY card." The floater cost is in
  // the card text and was missing from the generated spec, so the card could be
  // played with no floater anywhere and none was ever taken.
  project("card-venus-stratospheric-birds", "Stratospheric Birds", 12, ["Venus", "Animal"], "active", "金星12%以上が必要。任意のカードのフローター1個を支払う。アクション: このカードに動物を1個追加する。", {}, { victoryPointSpec: { resourcesHere: {} }, requires: { venus: 12 }, reqText: "金星12%以上", resourceType: "animal", effectSpec: { behavior: { removeResourcesFromAnyCard: { type: "floater", count: 1, source: "self" } }, action: { addResources: 1 } } }),
  // "REVEAL AND DISCARD the top card of the deck. If it has a space tag, add an
  // asteroid here." The mechanism already existed for Search For Life; this
  // card simply never declared it, so its action did not exist.
  project("card-promo-asteroid-deflection-system", "Asteroid Deflection System", 13, ["Space", "Earth", "Building"], "active", "エネルギー生産量-1。アクション: 山札の一番上のカードを公開して捨てる。宇宙タグがあれば、このカードに小惑星資源を1個追加する。このカードの小惑星資源1個につき勝利点1点。", { production: { energy: -1 }, action: { revealTag: "Space" } }, { victoryPointSpec: { resourcesHere: {} }, resourceType: "asteroid" }),
  // Three more actions the generated spec never carried, because upstream builds
  // them by hand rather than declaring them. Each card could be played and then
  // never used again, and the action audit against upstream is what found them.
  project("card-colonies-jovian-lanterns", "Jovian Lanterns", 20, ["Jovian"], "active", "ジョビアンタグ1枚以上が必要。TR+1。任意のカードにフローターを2個置く。アクション: チタン1を支払い、このカードにフローターを2個追加する。", {}, { victoryPointSpec: { resourcesHere: {}, per: 2 }, requires: { tags: { Jovian: 1 } }, reqText: "ジョビアンタグ1枚以上", resourceType: "floater", effectSpec: { behavior: { tr: 1, addResourcesToAnyCard: { type: "Floater", count: 2 } }, action: { spend: { titanium: 1 }, addResources: 2 } } }),
  project("card-colonies-red-spot-observatory", "Red Spot Observatory", 17, ["Jovian", "Science"], "active", "科学タグ3枚以上が必要。カードを2枚引く。アクション: このカードにフローターを1個追加する、またはこのカードのフローター1個を支払いカードを1枚引く。", {}, { victoryPoints: 2, requires: { tags: { Science: 3 } }, reqText: "科学タグ3枚以上", resourceType: "floater", effectSpec: { behavior: { drawCard: 2 }, action: { or: { autoSelect: true, behaviors: [
    { title: "Spend a floater here to draw a card", spend: { resourcesHere: 1 }, drawCard: 1 },
    { title: "Add 1 floater to this card", addResources: 1 }
  ] } } } }),
  project("card-venus-extractor-balloons", "Extractor Balloons", 21, ["Venus"], "active", "アクション: このカードにフローターを1個追加する、またはこのカードのフローター2個を取り除き金星+1。", {}, { resourceType: "floater", effectSpec: { behavior: { addResources: 3 }, action: { or: { autoSelect: true, behaviors: [
    { title: "Remove 2 floaters here to raise Venus 1 step", spend: { resourcesHere: 2 }, global: { venus: 1 } },
    { title: "Add 1 floater to this card", addResources: 1 }
  ] } } } }),
  // Two cards whose tile has a placement rule their generated spec never
  // carried, so both could be built anywhere. Industrial Center must touch a
  // city; Urbanized Area must touch two.
  project("card-base-industrial-center", "Industrial Center", 4, ["Building"], "active", "このタイルを都市タイルに隣接させて置く。アクション: MCを7支払い、建材生産量+1。", {}, { effectSpec: { behavior: { tile: { type: 6, on: "city-adjacent" } }, action: { spend: { megacredits: 7 }, production: { steel: 1 } } } }),
  project("card-base-urbanized-area", "Urbanized Area", 10, ["City", "Building"], "automated", "エネルギー生産量-1。MC生産量+2。他の都市タイル2枚以上に隣接する場所に都市タイルを1枚置く。", {}, { effectSpec: { behavior: { production: { energy: -1, megacredits: 2 }, city: { on: "two-cities" } } } }),
  // Two cards whose cost is stated in their own text and missing from the
  // generated spec, because upstream spends the plants in bespokePlay and
  // guards the play in bespokeCanPlay. Both halves were absent: the plants were
  // never taken, and a player with none could play the card anyway.
  project("card-base-nitrophilic-moss", "Nitrophilic Moss", 8, ["Plant"], "automated", "海洋タイル3枚以上と、植物を2失うことが必要。植物生産量+2。", {}, { requires: { oceans: 3 }, reqText: "海洋3枚以上", effectSpec: { behavior: { spend: { plants: 2 }, production: { plants: 2 } } } }),
  project("card-promo-potatoes", "Potatoes", 2, ["Plant"], "automated", "植物を2失う。MC生産量+2。", {}, { effectSpec: { behavior: { spend: { plants: 2 }, production: { megacredits: 2 } } } }),
  // "Raise your TR 1 step for each Jovian tag you have, INCLUDING THIS." The
  // card carries a Jovian tag, so it always pays at least one.
  project("card-base-terraforming-ganymede", "Terraforming Ganymede", 33, ["Jovian", "Space"], "automated", "自分のジョビアンタグ1つにつきTR+1（このカードを含む）。", {}, { victoryPoints: 2, effectSpec: { behavior: { tr: { tag: "jovian" } } } }),
  // Three more of the same, found by the registry gate rather than by reading:
  // each was registered as a rule the engine holds by name, and no engine file
  // named any of them.
  project("card-promo-icy-impactors", "Icy Impactors", 15, ["Space"], "active", "アクション: MC10（チタンで支払い可）を支払いこのカードに小惑星を2個追加する、またはこのカードの小惑星1個を支払い海洋タイルを1枚置く。", {}, { resourceType: "asteroid", effectSpec: { action: { or: { autoSelect: true, behaviors: [
    { title: "Spend 1 asteroid here to place an ocean", spend: { resourcesHere: 1 }, ocean: {} },
    { title: "Pay 10 M€ to add 2 asteroids here", spend: { megacredits: 10, canUseTitanium: true }, addResources: 2 }
  ] } } } }),
  project("card-colonies-titan-shuttles", "Titan Shuttles", 23, ["Jovian", "Space"], "active", "アクション: 任意のジョビアンカードにフローターを2個追加する、またはこのカードのフローターを任意の数支払い、同じ数のチタンを獲得する。", {}, { victoryPoints: 1, resourceType: "floater", effectSpec: { action: { or: { autoSelect: true, behaviors: [
    { title: "Spend floaters here to gain the same in titanium", spend: { resourcesHere: 1 }, stock: { titanium: 1 } },
    { title: "Add 2 floaters to a Jovian card", addResourcesToAnyCard: { count: 2, type: "Floater", tag: "Jovian" } }
  ] } } } }),
  // "When you play a science tag, INCLUDING THIS, either add a science resource
  // here or spend one to draw a card." The choice is the owner's each time, so
  // it goes through the pending-choice queue rather than resolving silently.
  project("card-base-olympus-conference", "Olympus Conference", 10, ["Science", "Earth", "Building"], "active", "効果: 科学タグのカードをプレイするたび（このカードを含む）、このカードに科学資源を1個追加するか、科学資源1個を取り除いてカードを1枚引く。", {}, { victoryPoints: 1, resourceType: "science" }),
  // Four more that shipped with an empty effectSpec: their action lives in a
  // hand-written method upstream rather than in a declarative block, so the
  // generator had nothing to copy and each was a card you could buy, play, and
  // never use again. Nothing caught them, because the audits check that the
  // engine honours our text and our text promised nothing either.
  // GMO Contract and Martian Zoo watch for a later card the way Advertising
  // does, so their text has to say so: the contract audit builds its tableau
  // from cards whose text does NOT start with 効果:, and a watcher hiding
  // behind a requirement-only line lands in the rig and pays out mid-measurement.
  project("card-turmoil-gmo-contract", "GMO Contract", 3, ["Microbe", "Science"], "active", "効果: 植物・動物・微生物タグのカードをプレイするたび（このカードを含む）、MCを2獲得。グリーンズが与党であるか、そこに代表者を2人置いている必要がある。", {}, { victoryPoints: 2, requires: { party: "Greens" }, reqText: "グリーンズが与党、または代表者2人" }),
  project("card-colonies-martian-zoo", "Martian Zoo", 12, ["Animal", "Building"], "active", "効果: 地球タグのカードをプレイするたび、このカードに動物を1個追加する。アクション: このカードの動物1個につきMCを1獲得する。場に都市タイルが2枚必要。", {}, { victoryPoints: 1, requires: { cities: 2, all: true }, reqText: "都市タイル2枚", resourceType: "animal", effectSpec: { action: { stock: { megacredits: { resourcesHere: true } } } } }),
  project("card-base-extreme-cold-fungus", "Extreme-Cold Fungus", 13, ["Microbe"], "active", "気温-10°C以下であること。アクション: 植物を1獲得する、または他のカード1枚に微生物を2個追加する。", {}, { requires: { temperatureMax: -10 }, reqText: "気温-10°C以下", effectSpec: { action: { or: { autoSelect: true, behaviors: [
    { title: "Add 2 microbes to another card", addResourcesToAnyCard: { count: 2, type: "Microbe", excludeThis: true } },
    { title: "Gain 1 plant", stock: { plants: 1 } }
  ] } } } }),
  project("card-colonies-jupiter-floating-station", "Jupiter Floating Station", 9, ["Jovian"], "active", "科学タグ3枚以上が必要。アクション: ジョビアンカード1枚にフローターを1個追加する、またはこのカードのフローター1個につきMCを1獲得（最大4）。", {}, { victoryPoints: 1, requires: { tags: { Science: 3 } }, reqText: "科学タグ3枚以上", effectSpec: { action: { or: { autoSelect: true, behaviors: [
    { title: "Add 1 floater to a Jovian card", addResourcesToAnyCard: { count: 1, type: "Floater", tag: "Jovian" } },
    { title: "Gain 1 M€ per floater here, up to 4", stock: { megacredits: { resourcesHere: true, max: 4 } } }
  ] } } } }),
  project("card-venus-sulphur-eating-bacteria", "Sulphur-Eating Bacteria", 6, ["Venus", "Microbe"], "active", "金星6%以上が必要。アクション: このカードに微生物を1個追加する、またはこのカードの微生物を任意の数支払い、その3倍のMCを獲得する。", {}, { requires: { venus: 6 }, reqText: "金星6%以上", resourceType: "microbe", effectSpec: { action: { or: { autoSelect: true, behaviors: [
    { title: "Spend microbes here to gain 3 M€ each", spend: { resourcesHere: 1 }, stock: { megacredits: 3 } },
    { title: "Add 1 microbe to this card", addResources: 1 }
  ] } } } }),
  project("card-promo-red-ships", "Red Ships", 2, [], "active", "酸素4%以上が必要。アクション: 海洋タイルに隣接する都市タイルおよび特殊タイル1枚につきMCを1獲得する。", {}, { requires: { oxygen: 4 }, reqText: "酸素4%以上", effectSpec: { action: { stock: { megacredits: { citiesAndSpecialTilesNextToOcean: true } } } } }),
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
  // "Gain 1 titanium or 2 steel." The generated catalogue carries the
  // requirement but no reward, so the card cost 4 M€ and paid nothing.
  // Four cards that count something in play and pay production for it. All four
  // were empty specs, so they took the money and did nothing.
  project("card-base-media-archives", "Media Archives", 8, ["Earth"], "automated", "全プレイヤーがこれまでにプレイしたイベント1枚につきMCを1獲得。", {}, {"effectSpec": {"behavior": {"stock": {"megacredits": {"eventsPlayed": true, "all": true}}}}}),
  project("card-colonies-community-services", "Community Services", 13, [], "automated", "タグを持たないカード1枚につきMC生産量+1（このカードを含む）。", {}, {"victoryPoints": 1, "effectSpec": {"behavior": {"production": {"megacredits": {"noTags": true}}}}}),
  project("card-promo-interplanetary-trade", "Interplanetary Trade", 27, ["Space"], "automated", "このカードを含め、場に出ている異なるタグ1種類につきMC生産量+1。", {}, {"victoryPoints": 1, "effectSpec": {"behavior": {"production": {"megacredits": {"distinctTags": true, "excludeTag": "Space"}}}}}),
  project("card-colonies-quantum-communications", "Quantum Communications", 8, [], "automated", "科学タグ4つが必要。場にある植民地1つにつきMC生産量+1。", {}, {"victoryPoints": 1, "requires": {"tags": {"Science": 4}}, "reqText": "科学タグ4枚以上", "effectSpec": {"behavior": {"production": {"megacredits": {"coloniesInPlay": true}}}}}),
  // Both spend 2 M€ production and place a colony; both were empty specs.
  project("card-colonies-minority-refuge", "Minority Refuge", 5, ["Space"], "automated", "MC生産量-2。植民地を1つ置く。", {}, {"effectSpec": {"behavior": {"production": {"megacredits": -2}, "colonies": {"buildColony": {}}}}}),
  project("card-colonies-pioneer-settlement", "Pioneer Settlement", 13, ["Space"], "automated", "所持する植民地が1つ以下である必要がある。MC生産量-2。植民地を1つ置く。", {}, {"victoryPoints": 2, "reqText": "自分の植民地1つ以下", "effectSpec": {"behavior": {"production": {"megacredits": -2}, "colonies": {"buildColony": {}}}}}),
  // Both take a space that pays steel or titanium and keep paying it as
  // production; Mining Area also has to touch a tile the player already owns.
  project("card-base-mining-area", "Mining Area", 4, ["Building"], "automated", "建材またはチタンの設置ボーナスがある場所に、自分の他のタイルに隣接させてこのタイルを置く。その資源の生産量+1。", {}, {"effectSpec": {"behavior": {"tile": {"type": 8, "on": "mineral-adjacent"}}}}),
  project("card-base-mining-rights", "Mining Rights", 9, ["Building"], "automated", "建材またはチタンの設置ボーナスがある場所にこのタイルを置く。その生産量+1。", {}, {"effectSpec": {"behavior": {"tile": {"type": 9, "on": "mineral"}}}}),
  // Immigrant City pays for its city with production and then collects on every
  // city anyone places; Rover Construction is only that trigger, so it needs no
  // play effect of its own -- placeTileAt reads both from the tableau.
  project("card-base-immigrant-city", "Immigrant City", 13, ["City", "Building"], "active", "エネルギー生産量-1、MC生産量-2。都市タイルを1枚置く。効果: 都市タイルが置かれるたび（このカードを含む）、MC生産量+1。", {}, { effectSpec: { behavior: { lose: { production: { energy: 1, megacredits: 2 } }, city: {} } } }),
  // 1 M€ per empty area touching one of the player's own tiles. No tile is
  // placed; the areas are only counted.
  project("card-turmoil-red-tourism-wave", "Red Tourism Wave", 3, ["Earth"], "event", "レッズが与党であるか、そこに代表者を2人置いていることが必要。自分のタイルに隣接する空きエリア1つにつきMCを1獲得。", {}, {"requires": {"party": "Reds"}, "reqText": "レッズが与党、または代表者2人", "effectSpec": {"behavior": {"stock": {"megacredits": {"ownedAdjacentEmptyAreas": true}}}}}),
  // Energy production for a city, and the space's printed bonus three times.
  project("card-prelude2-frontier-town", "Frontier Town", 11, ["City", "Building"], "automated", "マーズ・ファーストが与党であるか、マーズ・ファーストに代表者を2人送っている必要がある。エネルギー生産量-1。都市タイルを1枚置く。配置ボーナスをさらに2回追加で獲得する。", {}, {"requires": {"party": "Mars First"}, "reqText": "マーズ・ファーストが与党、または代表者2人", "effectSpec": {"behavior": {"production": {"energy": -1}, "city": {"bonusMultiplier": 3}}}}),
  // Its tile goes beside a greenery, it collects animals from Animal/Plant tags
  // (handled by the card-played watchers), and scores 1 VP per 2 animals.
  project("card-base-ecological-zone", "Ecological Zone", 12, ["Animal", "Plant"], "active", "効果: このカードを含め、動物タグまたは植物タグを持つカードをプレイした際、このカードに動物を1つ追加する。自分が緑地タイルを持っていることが必要。このタイルは任意の緑地タイルに隣接させて置く。動物2個ごとに1勝利点。", {}, {"requires": {"greeneries": 1}, "reqText": "緑地タイル1枚以上", "resourceType": "animal", "victoryPointSpec": {"resourcesHere": true, "per": 2}, "effectSpec": {"behavior": {"tile": {"type": 5, "on": "greenery-adjacent"}}}}),
  // "Place a city tile on top of an already placed ocean tile. The tile counts
  // as a city AND an ocean." The generated catalogue types it as a plain special
  // tile, which erased the ocean it was laid on.
  project("card-promo-new-holland", "New Holland", 20, ["City", "Building"], "automated", "都市タイル4枚以上が必要。MC生産量+3。すでに置かれた海洋タイルの上に都市タイルを置く（通常の都市配置制限に従う）。このタイルは都市かつ海洋として扱う。", {}, {"requires": {"cities": 4}, "reqText": "都市タイル4枚以上", "effectSpec": {"behavior": {"production": {"megacredits": 3}, "city": {"on": "upgradeable-ocean-new-holland", "countsAsOcean": true}}}}),
  project("card-promo-crash-site-cleanup", "Crash Site Cleanup", 4, [], "event", "今世代、他のプレイヤーの植物が取り除かれている必要がある。チタンを1、または建材を2獲得。", {}, {"victoryPoints": 1, "effectSpec": {"behavior": {"or": {"behaviors": [{"title": "Gain 1 titanium", "stock": {"titanium": 1}}, {"title": "Gain 2 steel", "stock": {"steel": 2}}]}}}}),
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
  corporation("corp-point-luna", "Point Luna", ["Space", "Earth"], { mc: 38, production: { titanium: 1 } }, "チタン生産量+1。地球タグをプレイするたび1枚引く。", { earthDraw: 1 }),
  corporation("corp-robinson", "Robinson Industries", [], { mc: 47 }, "アクション: MC4で任意の生産量+1。", { productionActionCost: 4 }),
  corporation("corp-valley-trust", "Valley Trust", ["Earth"], { mc: 37 }, "最初のアクションでプレリュードを3枚見て1枚プレイする。科学タグのカードコスト-2。", { firstPrelude: true, scienceDiscount: 2 }),
  // "As your first action, place a community on a non-reserved area." Its later
  // action and the 3 M€ for building on your own marker live in the engine; the
  // flag is what starts the opening placement.
  corporation("card-promo-arcadian-communities", "Arcadian Communities", [], { mc: 40, steel: 10 }, "初期資金40MC、建材10。最初のアクションとして、予約されていないエリアにコミュニティ（自分のマーカー）を1つ置く。アクション: 自分のタイルかマーカーに隣接する予約されていないエリアにコミュニティを1つ置く。効果: マーカーのあるエリアは自分専用。そこにタイルを置いたときMC3を獲得。", { firstCommunity: true }),
  corporation("corp-vitor", "Vitor", ["Earth"], { mc: 45 }, "最初のアクションで賞を無料で設立する。VP付きカードを出すとMC3。", { firstAward: true, vpBonus: 3 }),
  // Merged by name onto the generated Venus entry, which keeps its tags, cost
  // and floater action; only the missing initial draw is added here.
  // Reveals until a microbe tag turns up, then pays 2 M€ whenever ANY player
  // plays a microbe tag (handled by the card-played watchers).
  corporation("card-promo-poldertech-dutch", "PolderTECH Dutch", ["Earth"], { mc: 35 }, "35MCを所持した状態で開始する。最初のアクションとして、隣接する海洋タイルと緑地タイルを配置する（緑地の配置制限を無視）。酸素+1。", { firstPolderTiles: true }),
  corporation("card-promo-splice", "Splice", ["Microbe"], { mc: 44 }, "44MCを所持した状態で開始する。最初のアクションとして、微生物タグのカードを1枚公開するまでカードを公開し続ける。効果: 誰かが微生物タグをプレイするたびMC2。", { firstTagDraw: "Microbe" }),
  corporation("card-venus-celestic", "Celestic", ["Venus"], { mc: 42 }, "最初のアクションでフローターのカードを2枚引く。アクション: フローターを1個置く。フローター3個ごとに1VP。", { firstFloaterDraw: 2 }),
  // "When you play an animal or plant tag, including this, add 1 animal here."
  // A card with both tags pays for both.
  corporation("card-colonies-arklight", "Arklight", ["Animal"], { mc: 45, production: { mc: 2 } }, "45MCを所持した状態で開始する。MC生産量+2。効果: 動物タグまたは植物タグをプレイするたびに、このカードに動物を1個置く。動物2個につき1勝利点。", { animalPlantResource: 1 }),
  // "When you play a building tag, add a microbe here -- or once there are
  // two, spend them for a plant production step instead."
  corporation("card-promo-recyclon", "Recyclon", ["Building", "Microbe"], { mc: 38, production: { steel: 1 } }, "38MCを所持した状態で開始する。建材生産量+1。効果: 建材タグをプレイするたびに、このカードに微生物を1個置く。微生物が2個ある場合は、代わりに2個を取り除いて植物生産量+1を選べる。", { buildingMicrobe: 1 }),
  // "During the production phase, if you did not raise your TR this
  // generation, gain 6 M€ and add a preservation resource here."
  corporation("card-turmoil-pristar", "Pristar", [], { mc: 53 }, "53MCを所持した状態で開始する。TR-2。効果: 生産フェイズに、その世代でTRを上げていなければMCを6獲得し、このカードに保護資源を1個置く。保護資源1個につき1勝利点。", { calmRebate: 6 }),
  // "When you play a bio tag, gain 1 plant or add a microbe to ANY card."
  // Asked once per tag; with no microbe card in play the plant is automatic.
  corporation("card-prelude2-ecotec", "EcoTec", ["Microbe", "Plant"], { mc: 42, production: { plants: 1 } }, "42MCを所持した状態で開始する。植物生産量+1。効果: 生物タグ（動物・植物・微生物）をプレイするたびに、植物を1獲得するか、任意のカードに微生物を1個置く。", { bioTagChoice: 1 }),
  // "When any player plays a microbe tag, add a disease here and lose up to
  // 4 M€. When YOU play a science tag: remove a disease for 1 TR if one is
  // here, otherwise turn this card face down for 3 TR." Once face down it does
  // nothing further, which is why the flag has to be stored.
  corporation("card-promo-pharmacy-union", "Pharmacy Union", ["Microbe"], { mc: 54 }, "54MCを所持した状態で開始する。科学タグのカードを1枚引く。効果: 誰かが微生物タグをプレイするたびに、このカードに疾病を1個置き、最大4MCを失う。効果: 自分が科学タグをプレイしたとき、このカードの疾病を1個取り除いてTR+1。疾病が無ければ、このカードを裏返して（以後効果なし）TR+3。", { diseaseOnMicrobe: 4, scienceDiseaseTrade: true }),
  // "When any ocean tile is placed, increase your M€ production 1 step. Your
  // bonus for placing adjacent to oceans is 3 M€ instead of 2 M€." Both halves
  // were missing: the card was 54 M€ and nothing else.
  corporation("card-turmoil-lakefront-resorts", "Lakefront Resorts", ["Building"], { mc: 54 }, "54MCを所持した状態で開始する。効果: 海洋タイルが配置されるたびにMC生産量+1。海洋タイルに隣接して配置したときのボーナスがMC2ではなくMC3になる。", { oceanProduction: 1, oceanBonus: 3 }),
  // "When you get a new type of tag in play, increase your M€ production 1
  // step." Event cards and wild tags do not count, and the tags already on the
  // tableau when Aridor is chosen seed the set rather than paying out.
  corporation("card-colonies-aridor", "Aridor", [], { mc: 40 }, "40MCを所持した状態で開始する。最初のアクションとして、任意の植民地タイルを1枚追加で配置する。効果: 場に出ていない種類のタグを新たに得るたびにMC生産量+1（イベントカードは数えない）。", { firstColonyTile: true, diverseTagProduction: 1 }),
  // "When you play a card with at least 2 tags, including this, add 1 science
  // resource here." An event counts as one extra tag on top of its own.
  corporation("card-prelude2-spire", "Spire", ["City", "Earth"], { mc: 50 }, "50MCを所持した状態で開始する。最初のアクションとして、カードを4枚引き、その後手札を3枚捨てる。効果: タグを2つ以上持つカード（このカードを含む）をプレイするたびに、このカードに科学資源を1個置く。効果: 標準プロジェクトの支払いに、このカードの科学資源を1個につきMC2として使用できる。", { firstDrawThenDiscard: { draw: 4, discard: 3 }, multiTagScience: 2 }),
  // "Each new adjacency between your tile and an opponent's tile gives you a
  // standard resource of your choice, regardless of who just placed a tile."
  corporation("card-promo-philares", "Philares", ["Building"], { mc: 47 }, "47MCを所持した状態で開始する。最初のアクションとして、緑地タイルを1枚配置し、酸素を1段階上げる。効果: 自分のタイルと相手のタイルが新たに隣接するたびに、どちらが配置した場合でも、好きな標準資源を1個獲得する。", { firstGreenery: true, adjacencyResource: true }),
];

const prelude = (id, name, effectText, effect, extra = {}) => ({ id, name, effectText, effect, tags: extra.tags ?? [], ...extra });

const CURATED_PRELUDE_OVERRIDES = [
  // Deals four corporations, merges one in, and charges 42 M€ for it.
  prelude("card-promo-merger", "Merger", "企業カードを4枚引く。そのうち1枚をプレイし、残り3枚を捨てる。その後、MCを42支払う。", {}, { tags: [] }),
  // The four steps resolve in the player's chosen order, which is why this has
  // no behaviour block: the order changes what the placements are worth.
  prelude("card-prelude2-project-eden", "Project Eden", "海洋タイルを1枚、都市タイルを1枚、緑地タイルを1枚置く。カードを3枚捨てる。", {}, { tags: ["City", "Plant"] }),
  // "Lose 18 M€. Increase all your productions that are lower than 1, to 1."
  prelude("card-prelude2-industrial-complex", "Industrial Complex", "MCを18失う。1未満のすべての生産量を1にする。", { payMc: 18, productionFloor: 1 }, { tags: ["Building"] }),
  // "Gain 2 steel. Gain 2 M€ for each project card in hand." Upstream declares
  // only the steel; the money comes from a hand-written method, so ours paid
  // the steel and nothing else however full the hand was.
  prelude("card-promo-head-start", "Head Start", "建材を2獲得。手札にあるプロジェクトカード1枚につきMCを2獲得。", {}, { tags: [], effectSpec: { behavior: { stock: { steel: 2 } }, bespokeStock: { megacredits: { projectCardsInHand: true, each: 2 } } } }),
  // "Add 2 floaters to ANY card, or remove any number of floaters here to gain
  // that many of one standard resource." Shipped with an empty effectSpec, so
  // the card was a Space tag and an action that never appeared.
  // "Raise your TR 5 steps" plus an ongoing half: skip the first TR you gain in
  // each generation's action phase. Upstream declares tr: {tr: 5} at the top
  // level, which is not a behavior key, so the generated spec was never read
  // and the card raised nothing at all. The ongoing half is registered as
  // unimplemented rather than silently absent.
  // "Raise 1 global parameter without getting any TR or other bonuses." Upstream
  // runs a temporary Solar Phase for it, which is the World Government's own
  // move -- the world advances and nobody is paid for it.
  prelude("card-prelude2-world-government-advisor", "World Government Advisor", "TR+2。カードを1枚引く。アクション: グローバルパラメータを1つ上げる（TRやボーナスは得られない）。", {}, { tags: ["Earth"], effectSpec: { behavior: { tr: 2, drawCard: 1 }, action: { or: { autoSelect: false, behaviors: [
    { title: "Raise the temperature 1 step, gaining nothing", global: { temperature: 1, noRating: true } },
    { title: "Raise the oxygen 1 step, gaining nothing", global: { oxygen: 1, noRating: true } },
    { title: "Raise Venus 1 step, gaining nothing", global: { venus: 1, noRating: true } }
  ] } } } }),
  prelude("card-prelude2-preservation-program", "Preservation Program", "TR+5。効果: 各世代のアクションフェイズで最初に得るTRは得られない。", { tr: 5 }, { tags: [] }),
  prelude("card-prelude2-floating-trade-hub", "Floating Trade Hub", "アクション: 任意のカードにフローターを2個追加する、またはこのカードのフローターを任意の数取り除き、同じ数の標準資源を獲得する。", {}, { tags: ["Space"], resourceType: "floater", effectSpec: { action: { or: { autoSelect: true, behaviors: [
    { title: "Remove a floater here to gain a titanium", spend: { resourcesHere: 1 }, stock: { titanium: 1 } },
    { title: "Add 2 floaters to any card", addResourcesToAnyCard: { count: 2, type: "Floater" } }
  ] } } } }),
  prelude("prelude-allied-banks", "Allied Banks", "MC生産量+4、MC3。", { production: { mc: 4 }, mc: 3 }, { tags: ["Earth"] }),
  prelude("prelude-biosphere-support", "Biosphere Support", "植物生産量+2、MC生産量-1。", { production: { plants: 2, mc: -1 } }, { tags: ["Plant"] }),
  prelude("prelude-aquifer-turbines", "Aquifer Turbines", "MC3を支払い、海洋1枚とエネルギー生産量+2。", { payMc: 3, production: { energy: 2 }, tile: "ocean" }, { tags: ["Power"] }),
  prelude("prelude-mohole-excavation", "Mohole Excavation", "建材生産量+1、熱生産量+2、熱2。", { production: { steel: 1, heat: 2 }, heat: 2 }, { tags: ["Building"] }),
  prelude("prelude-early-settlement", "Early Settlement", "植物生産量+1、都市1枚。", { production: { plants: 1 }, tile: "city" }, { tags: ["Building", "City"] }),
  prelude("prelude-biofuels", "Biofuels", "エネルギー・植物生産量+1、植物2。", { production: { energy: 1, plants: 1 }, plants: 2 }, { tags: ["Microbe"] }),
  prelude("prelude-power-generation", "Power Generation", "エネルギー生産量+3。", { production: { energy: 3 } }, { tags: ["Power"] }),
  prelude("prelude-self-sufficient-settlement", "Self-Sufficient Settlement", "MC生産量+2、都市1枚。", { production: { mc: 2 }, tile: "city" }, { tags: ["Building", "City"] }),
  prelude("prelude-mining-operations", "Mining Operations", "建材生産量+2、建材4。", { production: { steel: 2 }, steel: 4 }, { tags: ["Building"] }),
  prelude("prelude-unmi-contractor", "UNMI Contractor", "TR+3、カード1枚。", { tr: 3, draw: 1 }, { tags: ["Earth"] }),
  prelude("prelude-dome-farming", "Dome Farming", "MC生産量+2、植物生産量+1。", { production: { mc: 2, plants: 1 } }, { tags: ["Plant", "Building"] }),
  prelude("prelude-business-empire", "Business Empire", "MC6を支払い、MC生産量+6。", { payMc: 6, production: { mc: 6 } }, { tags: ["Earth"] }),
  prelude("prelude-donation", "Donation", "MC21。", { mc: 21 }, { tags: ["Earth"] }),
  prelude("prelude-nitrogen-shipment", "Nitrogen Shipment", "植物生産量+1、TR+1、MC5。", { production: { plants: 1 }, tr: 1, mc: 5 }, { tags: ["Space"] }),
  prelude("prelude-smelting-plant", "Smelting Plant", "酸素2段階、建材5。", { oxygenSteps: 2, steel: 5 }, { tags: ["Building"] }),
  prelude("prelude-supplier", "Supplier", "エネルギー生産量+2、建材4。", { production: { energy: 2 }, steel: 4 }, { tags: ["Power"] }),
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
  prelude("prelude-research-network", "Research Network", "MC生産量+1、カード3枚。ワイルドタグを持つ。", { production: { mc: 1 }, draw: 3, wildTag: true }, { tags: ["Wild"] }),
  prelude("prelude-eccentric-sponsor", "Eccentric Sponsor", "手札のカード1枚をコスト25軽減してプレイ。", { freePlayDiscount: 25 }, { tags: ["Earth"] }),
  prelude("prelude-ecology-experts", "Ecology Experts", "植物生産量+1。手札のカード1枚を地球条件無視でプレイ。", { production: { plants: 1 }, freePlayIgnoreGlobal: true }, { tags: ["Plant", "Microbe"] }),
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
  "card-promo-st-joseph-of-cupertino-mission": "st-joseph",
  // Three points if it ever found anything, none if it did not. That is not a
  // number per resource, so it cannot be a spec -- and upstream agrees,
  // declaring victoryPoints: 'special'.
  "p-search-for-life": "search-for-life"
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
