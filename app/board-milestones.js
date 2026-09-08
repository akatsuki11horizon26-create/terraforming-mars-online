// The alternate maps replace the five milestones and five awards with their own.
// Transcribed from the printed rulebooks (TM_HE_WRAP_ENGi.pdf, TM_UA_WRAP_ENG.pdf),
// whose text was read out of the PDFs rather than recalled.
import { MILESTONES, AWARDS, countTiles, countTags, registerBoardMilestones } from "./milestones-awards.js";

const PRODUCTION_KEYS = ["mcProd", "steelProd", "titaniumProd", "plantsProd", "energyProd", "heatProd"];

// Incorporator reads the printed 10 M€, not the 19 the code first carried.
const INCORPORATOR_MAX_COST = 10;
// Celebrity reads the other end of the same scale.
const CELEBRITY_MIN_COST = 20;

// Desert Settler counts tiles south of the equator. The 9-row board is split
// 4 / 1 / 4, so the southern half is the bottom four rows -- r >= 5 once the
// rows are numbered from the top.
const SOUTHERN_FIRST_ROW = 5;

// board-milestones is imported BY game-logic, so it cannot import
// getAdjacentCells back out of it. Same six axial directions.
function adjacentPositions(q, r) {
  return [
    { q: q + 1, r },
    { q: q - 1, r },
    { q, r: r + 1 },
    { q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 }
  ];
}

function ownedTiles(context) {
  return Object.values(context.board).filter(
    cell => cell.placedBy === context.player.id && cell.tileType !== "empty"
  );
}

// "Most tiles in the southern half of the map." Ocean tiles a player placed
// belong to them for this count like any other tile.
function tilesInSouth(context) {
  const rows = Object.values(context.board).map(cell => cell.r);
  const minR = Math.min(...rows);
  return ownedTiles(context).filter(cell => cell.r - minR >= SOUTHERN_FIRST_ROW).length;
}

// "Most tiles adjacent to ocean tiles." A tile touching two oceans still
// counts once -- the award counts tiles, not adjacencies.
function tilesAdjacentToOcean(context) {
  return ownedTiles(context).filter(cell =>
    adjacentPositions(cell.q, cell.r).some(pos => context.board[`${pos.q},${pos.r}`]?.tileType === "ocean")
  ).length;
}

// Industrialist reads the steel and energy a player is HOLDING, not their
// production. Those are two different numbers on the player board.
function steelAndEnergyResources(context) {
  return (context.player.steel ?? 0) + (context.player.energy ?? 0);
}

function bioTags(context) {
  return ["Plant", "Microbe", "Animal"].reduce(
    (sum, tag) => sum + countTags(context.player, context.cards, tag, context.corporation),
    0
  );
}

function cardTypeCount(context, type) {
  // Events live in their own pile once resolved, so counting them means
  // reading both. Everything else only ever appears in playedProjects.
  const ids =
    type === "event"
      ? [...(context.player.playedEvents ?? []), ...context.player.playedProjects]
      : context.player.playedProjects;
  return ids.reduce((sum, id) => {
    const card = context.cards.find(item => item.id === id);
    return sum + (card?.type === type ? 1 : 0);
  }, 0);
}

// Several awards read "event cards do not count".
function tagsExcludingEvents(context, tag) {
  return context.player.playedProjects.reduce((sum, id) => {
    const card = context.cards.find(item => item.id === id);
    if (!card || card.type === "event") return sum;
    return sum + (card.tags?.includes(tag) ? 1 : 0);
  }, 0);
}

function tilesOnBottomRows(context) {
  return Object.values(context.board).filter(
    cell => cell.placedBy === context.player.id && cell.tileType !== "empty" && cell.r >= 3
  ).length;
}

// The outer edge: the top and bottom rows, plus the ends of every row.
function tilesOnEdge(context) {
  const cells = Object.values(context.board);
  const rows = cells.map(cell => cell.r);
  const minR = Math.min(...rows);
  const maxR = Math.max(...rows);
  return cells.filter(cell => {
    if (cell.placedBy !== context.player.id || cell.tileType === "empty") return false;
    if (cell.r === minR || cell.r === maxR) return true;
    const row = cells.filter(other => other.r === cell.r).map(other => other.q);
    return cell.q === Math.min(...row) || cell.q === Math.max(...row);
  }).length;
}

function distinctTags(context) {
  const tags = new Set();
  for (const id of context.player.playedProjects) {
    const card = context.cards.find(item => item.id === id);
    for (const tag of card?.tags ?? []) tags.add(String(tag).toLowerCase());
  }
  for (const tag of context.corporation?.tags ?? []) tags.add(String(tag).toLowerCase());
  return tags.size;
}

function cardsWithRequirements(context, excludeEvents = false) {
  return context.player.playedProjects.reduce((sum, id) => {
    const card = context.cards.find(item => item.id === id);
    if (!card) return sum;
    const requirement = card.requirements;
    if (excludeEvents && card.type === "event") return sum;
    const hasRequirement = Array.isArray(requirement) ? requirement.length > 0 : Boolean(requirement);
    const hasText = Boolean(card.reqText) && card.reqText !== "なし";
    return sum + (hasRequirement || hasText ? 1 : 0);
  }, 0);
}

function distinctCardResources(context) {
  const kinds = new Set();
  for (const [id, count] of Object.entries(context.player.cardResources ?? {})) {
    if (!count) continue;
    const card = context.cards.find(item => item.id === id);
    kinds.add(card?.resourceType ?? id);
  }
  return kinds.size;
}


// --- Amazonis Planitia --------------------------------------------------
// Transcribed from the reference implementation the boards came from
// (src/server/milestones/amazonisPlanitia, src/server/awards/amazonisPlanitia).

// "Own 3 tiles in the middle 3 equatorial rows." Upstream reads y 3..5 of the
// nine printed rows, so this counts from the top row rather than trusting the
// axial r to start at zero.
const EQUATORIAL_ROWS = [3, 4, 5];

function tilesInEquatorialRows(context) {
  const rows = Object.values(context.board).map(cell => cell.r);
  const minR = Math.min(...rows);
  return ownedTiles(context).filter(cell => EQUATORIAL_ROWS.includes(cell.r - minR)).length;
}

// "Have the most tags of any one type in play." Events are skipped, and the
// score is the largest single tag count rather than the total.
function largestSingleTagCount(context) {
  const counts = new Map();
  for (const id of context.player.playedProjects ?? []) {
    const card = context.cards.find(item => item.id === id);
    if (!card || card.type === "event") continue;
    for (const tag of card.tags ?? []) {
      const key = String(tag).toLowerCase();
      if (key === "event") continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const held = Array.isArray(context.corporation) ? context.corporation : [context.corporation];
  for (const entry of held) {
    for (const tag of entry?.tags ?? []) {
      const key = String(tag).toLowerCase();
      if (key === "event") continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts.size === 0 ? 0 : Math.max(...counts.values());
}

// "Own the most animal and microbe resources."
const ZOOLOGIST_RESOURCES = new Set(["animal", "microbe"]);

function animalAndMicrobeResources(context) {
  let total = 0;
  for (const [id, count] of Object.entries(context.player.cardResources ?? {})) {
    if (!count) continue;
    const card = context.cards.find(item => item.id === id);
    const kind = String(card?.resourceType ?? "").toLowerCase();
    if (ZOOLOGIST_RESOURCES.has(kind)) total += count;
  }
  return total;
}

// "Have the most empty spaces adjacent to your tiles." A space touching two of
// the player's tiles counts once -- the award counts spaces, not adjacencies.
function emptySpacesAdjacentToOwnTiles(context) {
  const own = ownedTiles(context);
  const seen = new Set();
  for (const cell of own) {
    for (const pos of adjacentPositions(cell.q, cell.r)) {
      const key = `${pos.q},${pos.r}`;
      const neighbour = context.board[key];
      if (neighbour && neighbour.tileType === "empty") seen.add(key);
    }
  }
  return seen.size;
}

// "Have the most cards in play that directly alter your own production."
// Upstream keeps a hand-written list plus a rule reading the card's own
// definition; we have the definition for every card, so the rule is enough.
function altersOwnProduction(card) {
  const spec = card?.effectSpec ?? card?.effect;
  if (!spec) return false;
  const production = spec.production;
  if (production && Object.keys(production).length > 0) return true;
  // Some cards spell production out as their own keys rather than nesting it.
  return ["mcProd", "steelProd", "titaniumProd", "plantsProd", "energyProd", "heatProd"].some(
    key => Boolean(spec[key])
  );
}

function productionAlteringCards(context) {
  return (context.player.playedProjects ?? []).reduce((sum, id) => {
    const card = context.cards.find(item => item.id === id);
    return sum + (card && card.type !== "event" && altersOwnProduction(card) ? 1 : 0);
  }, 0);
}


// --- Terra Cimmeria -----------------------------------------------------
// Transcribed from src/server/milestones/terraCimmeria and
// src/server/awards/terraCimmeria in the reference implementation.

// "Own 5 tiles on Mars." An ocean the player placed is a tile they own, but it
// is not one of theirs on Mars for this milestone -- upstream excludes it by
// tile type, and excludes colonies by space type.
function tilesOnMars(context) {
  return ownedTiles(context).filter(cell => cell.tileType !== "ocean").length;
}

// "Have 3 sets of automated, active and event cards in play." A set needs one
// of each, so the score is the smallest of the three counts.
function completeCardTypeSets(context) {
  return Math.min(
    cardTypeCount(context, "automated"),
    cardTypeCount(context, "active"),
    (context.player.playedEvents ?? []).length
  );
}

function awardsFundedBy(context) {
  return (context.fundedAwards ?? []).filter(entry => entry.playerId === context.player.id).length;
}

// "Have the most VP from city tile adjacencies on Mars" -- the same sum
// scoring.js pays for a city, counted here for the award.
function cityAdjacencyVp(context) {
  let total = 0;
  for (const cell of Object.values(context.board)) {
    if (cell.placedBy !== context.player.id || cell.tileType !== "city") continue;
    total += adjacentPositions(cell.q, cell.r).filter(
      pos => context.board[`${pos.q},${pos.r}`]?.tileType === "forest"
    ).length;
  }
  return total;
}

// "Play the most cards that reduce other players' resources or production,
// INCLUDING EVENTS." Read from each card's own declaration rather than a list.
const ATTACK_KEYS = [
  "removeAnyPlants",
  "removePlants",
  "removeAnyMc",
  "stealMc",
  "removeAnySteel",
  "removeAnyTitanium",
  "decreaseAnyProduction"
];

function attacksOtherPlayers(card) {
  const spec = card?.effectSpec ?? card?.effect;
  if (!spec) return false;
  return ATTACK_KEYS.some(key => Boolean(spec[key]));
}

function attackCards(context) {
  const ids = [...(context.player.playedProjects ?? []), ...(context.player.playedEvents ?? [])];
  return ids.reduce((sum, id) => {
    const card = context.cards.find(item => item.id === id);
    return sum + (attacksOtherPlayers(card) ? 1 : 0);
  }, 0);
}

// Incorporator is printed on both the Utopia and the Terra Cimmeria sheets with
// the same 10 M€ threshold, but the Terra Cimmeria wording excludes events.
function cheapProjectsExcludingEvents(context) {
  return (context.player.playedProjects ?? []).reduce((sum, id) => {
    const card = context.cards.find(item => item.id === id);
    if (!card || card.type === "event") return sum;
    return sum + ((card.cost ?? 99) <= INCORPORATOR_MAX_COST ? 1 : 0);
  }, 0);
}

export const BOARD_MILESTONES = {
  hellas: [
    { id: "diversifier", name: "多角化", description: "異なるタグ8種類以上", threshold: 8, getScore: distinctTags },
    { id: "tactician", name: "戦術家", description: "条件付きカード5枚以上", threshold: 5, getScore: cardsWithRequirements },
    { id: "polar-explorer", name: "極地探検家", description: "下2列にタイル3枚以上", threshold: 3, getScore: tilesOnBottomRows },
    { id: "energizer", name: "発電機", description: "電力生産量6以上", threshold: 6, getScore: context => context.player.energyProd ?? 0 },
    { id: "rim-settler", name: "辺境開拓者", description: "ジョビアンタグ3個以上", threshold: 3, getScore: context => countTags(context.player, context.cards, "Jovian", context.corporation) }
  ],
  elysium: [
    { id: "generalist", name: "ゼネラリスト", description: "全6種の生産量を1以上に", threshold: 6, getScore: context => PRODUCTION_KEYS.filter(key => (context.player[key] ?? 0) >= 1).length },
    { id: "specialist", name: "スペシャリスト", description: "いずれかの生産量が10以上", threshold: 10, getScore: context => Math.max(...PRODUCTION_KEYS.map(key => context.player[key] ?? 0)) },
    { id: "ecologist", name: "エコロジスト", description: "生物タグ4個以上（植物・微生物・動物）", threshold: 4, getScore: bioTags },
    { id: "tycoon", name: "大物", description: "青と緑のカード15枚以上", threshold: 15, getScore: context => cardTypeCount(context, "automated") + cardTypeCount(context, "active") },
    { id: "legend", name: "伝説", description: "イベントカード5枚以上", threshold: 5, getScore: context => cardTypeCount(context, "event") }
  ],
  utopia: [
    {
      id: "manager",
      name: "マネージャー",
      description: "特殊タイル3枚以上",
      threshold: 3,
      getScore: context => Object.values(context.board).filter(
        cell => cell.placedBy === context.player.id &&
          !["empty", "city", "forest", "ocean"].includes(cell.tileType)
      ).length
    },
    { id: "pioneer", name: "開拓者", description: "植民地3つ以上", threshold: 3, getScore: context => context.colonyCount ?? 0 },
    { id: "trader", name: "商人", description: "カード上の資源が3種類以上", threshold: 3, getScore: distinctCardResources },
    { id: "metallurgist", name: "冶金家", description: "建材とチタンの生産量の合計6以上", threshold: 6, getScore: context => (context.player.steelProd ?? 0) + (context.player.titaniumProd ?? 0) },
    { id: "researcher", name: "研究者", description: "科学タグ4個以上", threshold: 4, getScore: context => countTags(context.player, context.cards, "Science", context.corporation) }
  ]
};

export const BOARD_AWARDS = {
  hellas: [
    { id: "cultivator", name: "耕作者", description: "緑地タイル数が最多", getScore: context => countTiles(context.board, context.player.id, "forest") },
    { id: "magnate", name: "大立者", description: "自動カード（緑）が最多", getScore: context => cardTypeCount(context, "automated") },
    { id: "space-baron", name: "宇宙男爵", description: "宇宙タグが最多（イベントを除く）", getScore: context => tagsExcludingEvents(context, "Space") },
    { id: "excentric", name: "変人", description: "カード上の資源が最多", getScore: context => Object.values(context.player.cardResources ?? {}).reduce((sum, value) => sum + value, 0) },
    { id: "contractor", name: "請負人", description: "建材タグが最多（イベントを除く）", getScore: context => tagsExcludingEvents(context, "Building") }
  ],
  utopia: [
    { id: "suburbian", name: "郊外居住者", description: "盤面の縁にあるタイルが最多", getScore: tilesOnEdge },
    { id: "sponsor", name: "後援者", description: "地球タグが最多", getScore: context => countTags(context.player, context.cards, "Earth", context.corporation) },
    { id: "botanist", name: "植物学者", description: "植物生産量が最多", getScore: context => context.player.plantsProd ?? 0 },
    {
      id: "entrepreneur",
      name: "起業家",
      description: "コスト10MC以下のカードが最多",
      getScore: context => context.player.playedProjects.reduce((sum, id) => {
        const card = context.cards.find(item => item.id === id);
        return sum + ((card?.cost ?? 99) <= INCORPORATOR_MAX_COST ? 1 : 0);
      }, 0)
    },
    { id: "metropolist", name: "都市計画家", description: "都市タイル数が最多", getScore: context => countTiles(context.board, context.player.id, "city") }
  ]
};

BOARD_AWARDS.elysium = [
  {
    id: "celebrity",
    name: "セレブリティ",
    description: "コスト20MC以上のカードが最多",
    getScore: context => context.player.playedProjects.reduce((sum, id) => {
      const card = context.cards.find(item => item.id === id);
      return sum + ((card?.cost ?? 0) >= CELEBRITY_MIN_COST ? 1 : 0);
    }, 0)
  },
  { id: "industrialist", name: "工業主", description: "建材と電力の保有資源の合計が最多", getScore: steelAndEnergyResources },
  { id: "desert-settler", name: "砂漠開拓者", description: "赤道より南のタイルが最多", getScore: tilesInSouth },
  { id: "estate-dealer", name: "不動産業者", description: "海洋に隣接するタイルが最多", getScore: tilesAdjacentToOcean },
  { id: "benefactor", name: "篤志家", description: "TRが最多", getScore: context => context.player.tr ?? 0 }
];

BOARD_MILESTONES["terra-cimmeria"] = [
  { id: "t-collector", name: "収集家", description: "緑・青・赤の3種そろいが3組以上", threshold: 3, getScore: completeCardTypeSets },
  { id: "firestarter", name: "火付け役", description: "熱を20以上保有", threshold: 20, getScore: context => context.player.heat ?? 0 },
  { id: "terra-pioneer", name: "開拓の先駆者", description: "火星上のタイル5枚以上（海洋を除く）", threshold: 5, getScore: tilesOnMars },
  { id: "spacefarer", name: "宇宙旅行者", description: "宇宙タグ6個以上", threshold: 6, getScore: context => countTags(context.player, context.cards, "Space", context.corporation) },
  { id: "gambler", name: "勝負師", description: "自分で2つ以上の表彰を出資", threshold: 2, getScore: awardsFundedBy }
];

BOARD_AWARDS["terra-cimmeria"] = [
  { id: "biologist", name: "生物学者", description: "動物・植物・微生物タグの合計が最多", getScore: bioTags },
  { id: "incorporator", name: "法人設立者", description: "コスト10MC以下のカードが最多（イベントを除く）", getScore: cheapProjectsExcludingEvents },
  { id: "t-politician", name: "政治家", description: "送り込んだ代表者の累計が最多", getScore: context => context.player.delegatesPlaced ?? 0 },
  { id: "urbanist", name: "都市計画者", description: "都市の隣接による得点が最多", getScore: cityAdjacencyVp },
  { id: "warmonger", name: "戦争屋", description: "他プレイヤーの資源・生産量を減らすカードが最多（イベントを含む）", getScore: attackCards }
];

BOARD_MILESTONES.amazonis = [
  { id: "colonizer", name: "入植者", description: "植民地4つ以上", threshold: 4, getScore: context => context.colonyCount ?? 0 },
  { id: "forester", name: "森林管理者", description: "植物生産量4以上", threshold: 4, getScore: context => context.player.plantsProd ?? 0 },
  {
    // The only milestone claimed by staying BELOW its threshold, which is why
    // getMilestoneStatus has to know which way to compare.
    id: "minimalist",
    name: "ミニマリスト",
    description: "手札2枚以下",
    threshold: 2,
    atMost: true,
    getScore: context => (context.player.hand ?? []).length
  },
  { id: "terran", name: "地球人", description: "地球タグ6個以上", threshold: 6, getScore: context => countTags(context.player, context.cards, "Earth", context.corporation) },
  { id: "tropicalist", name: "熱帯育ち", description: "赤道付近3列にタイル3枚以上", threshold: 3, getScore: tilesInEquatorialRows }
];

BOARD_AWARDS.amazonis = [
  { id: "curator", name: "学芸員", description: "同一種のタグが最多（イベントを除く）", getScore: largestSingleTagCount },
  { id: "amazonis-engineer", name: "技師", description: "自分の生産量を変えるカードが最多", getScore: productionAlteringCards },
  { id: "promoter", name: "興行主", description: "イベントカードが最多", getScore: context => (context.player.playedEvents ?? []).length },
  { id: "tourist", name: "旅行者", description: "自分のタイルに隣接する空きマスが最多", getScore: emptySpacesAdjacentToOwnTiles },
  { id: "amazonis-zoologist", name: "動物学者", description: "動物・微生物資源の合計が最多", getScore: animalAndMicrobeResources }
];

BOARD_MILESTONES["vastitas-borealis"] = [
  { id: "v-electrician", name: "電気技師", description: "電力タグ4個以上", threshold: 4, getScore: context => countTags(context.player, context.cards, "Power", context.corporation, context.preludes) },
  { id: "smith", name: "鍛冶屋", description: "建材とチタンの生産量の合計6以上", threshold: 6, getScore: context => (context.player.steelProd ?? 0) + (context.player.titaniumProd ?? 0) },
  { id: "tradesman", name: "商人", description: "カード上の資源が3種類以上", threshold: 3, getScore: distinctCardResources },
  { id: "irrigator", name: "灌漑者", description: "海洋に隣接する自分のタイル4枚以上", threshold: 4, getScore: tilesAdjacentToOcean },
  { id: "capitalist", name: "資本家", description: "64 MC以上保有", threshold: 64, getScore: context => context.player.mc ?? 0 }
];

BOARD_AWARDS["vastitas-borealis"] = [
  { id: "forecaster", name: "予報士", description: "条件付きカードが最多（イベントを除く）", getScore: context => cardsWithRequirements(context, true) },
  { id: "edgedancer", name: "縁の舞踏者", description: "盤面の縁にあるタイルが最多", getScore: tilesOnEdge },
  { id: "visionary", name: "幻視者", description: "手札が最多", getScore: context => (context.player.hand ?? []).length },
  { id: "naturalist", name: "博物学者", description: "植物と熱の生産量の合計が最多", getScore: context => (context.player.plantsProd ?? 0) + (context.player.heatProd ?? 0) },
  { id: "voyager", name: "航海者", description: "ジョビアンタグが最多", getScore: context => countTags(context.player, context.cards, "Jovian", context.corporation, context.preludes) }
];

export function milestonesForBoard(boardId) {
  return BOARD_MILESTONES[boardId] ?? MILESTONES;
}

export function awardsForBoard(boardId) {
  return BOARD_AWARDS[boardId] ?? AWARDS;
}

// Make every alternate id resolvable by getMilestone/getAward.
for (const boardId of Object.keys(BOARD_MILESTONES)) {
  registerBoardMilestones(BOARD_MILESTONES[boardId], BOARD_AWARDS[boardId] ?? []);
}
