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

function cardsWithRequirements(context) {
  return context.player.playedProjects.reduce((sum, id) => {
    const card = context.cards.find(item => item.id === id);
    if (!card) return sum;
    const requirement = card.requirements;
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

export const BOARD_MILESTONES = {
  hellas: [
    { id: "diversifier", name: "多角化", description: "異なるタグ8種類以上", threshold: 8, getScore: distinctTags },
    { id: "tactician", name: "戦術家", description: "条件付きカード5枚以上", threshold: 5, getScore: cardsWithRequirements },
    { id: "polar-explorer", name: "極地探検家", description: "下2列にタイル3枚以上", threshold: 3, getScore: tilesOnBottomRows },
    { id: "energizer", name: "発電機", description: "電力生産量6以上", threshold: 6, getScore: context => context.player.energyProd ?? 0 },
    { id: "rim-settler", name: "辺境開拓者", description: "木星タグ3個以上", threshold: 3, getScore: context => countTags(context.player, context.cards, "Jovian", context.corporation) }
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

// Amazonis has its own printed milestones and awards (Terran, Landshaper,
// Merchant, Sponsor, Lobbyist / Collector and four others). Until that sheet is
// transcribed it borrows the Utopia set, which is a KNOWN divergence rather
// than the printed rule -- see docs/OFFICIAL_SCOPE.md.
BOARD_MILESTONES.amazonis = BOARD_MILESTONES.utopia;
BOARD_AWARDS.amazonis = BOARD_AWARDS.utopia;

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
