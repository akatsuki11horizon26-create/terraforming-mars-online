import { CORPORATIONS, GLOBAL_EVENTS, OFFICIAL_PROJECTS, PRELUDES, STANDARD_ACTIONS, STANDARD_PROJECTS } from "./official-content.js";
import {
  DEFAULT_PLAYER_NAMES,
  SOLO_STARTING_TR,
  createPlayer,
  getCurrentPlayer,
  getPlayer,
  updatePlayer,
  withLegacyPlayerAccessors
} from "./player-state.js";
import {
  buildScoreContributions,
  calculateScoreBreakdowns as buildScoreBreakdowns,
  countOwnedCities,
  countCathedrals,
  formatSignedVp,
  SCORE_CATEGORIES
} from "./scoring.js";
import { THARSIS_CELLS } from "./tharsis-board.js";
import { ALTERNATE_BOARDS } from "./alternate-boards.js";
import { createDraft, pickDraftCard, isDraftComplete, draftedHandFor, DRAFT_HAND_SIZE } from "./draft.js";
// Importing registers the alternate maps' milestones and awards so their ids
// resolve; without it a Hellas milestone cannot be claimed at all.
import "./board-milestones.js";
import {
  AWARDS,
  MAX_AWARDS,
  MAX_MILESTONES,
  MILESTONES,
  MILESTONE_COST,
  getAward,
  getMilestone,
  getMilestoneDescription,
  getMilestoneThreshold,
  getNextAwardCost,
  scoreAward
} from "./milestones-awards.js";

export { AWARDS, MILESTONES, getNextAwardCost, getMilestoneDescription, getMilestoneThreshold, scoreAward };
import {
  buildBranchChoice,
  buildProductionAttackChoice,
  buildResourceAttackChoice,
  buildResourceStealChoice,
  buildLawSuitChoice,
  buildCathedralChoice,
  buildColonyChoice,
  buildResourceChoice,
  buildDiscardChoice,
  buildStandardResourceChoice,
  buildTileChoice,
  findOption,
  isChoiceOwnedBy
} from "./pending-choice.js";
import { getCardResourceType } from "./card-resource-types.js";

export { STANDARD_RESOURCES } from "./pending-choice.js";
export { getCardResourceType };
import {
  DELEGATE_RESERVE_COST,
  NEUTRAL,
  PARTIES,
  advanceGlobalEvents,
  cloneTurmoil,
  formNewGovernment,
  createTurmoilState,
  getInfluence,
  getParty,
  getRulingPolicy,
  hasPolicy,
  normalizePartyId,
  refillLobby,
  sendDelegate,
  totalDelegates
} from "./turmoil.js";

export {
  NEUTRAL,
  PARTIES,
  getInfluence,
  getParty,
  getRulingPolicy,
  totalDelegates
};
import {
  COLONY_TILES,
  availableFleets,
  buildColony,
  canBuildColony,
  canTrade,
  increaseTrack,
  addFleet,
  cloneColonies,
  advanceColonyProduction,
  countColonies,
  createColoniesState,
  getColonyTile,
  trade as tradeWithColony
} from "./colonies.js";

export { COLONY_TILES, availableFleets, canBuildColony, canTrade, countColonies, getColonyTile };
export { buildScoreContributions, countOwnedCities, countCathedrals, formatSignedVp, SCORE_CATEGORIES };

export { createPlayer, getCurrentPlayer, getPlayer, updatePlayer, withLegacyPlayerAccessors };

const LEGACY_CARDS = [
  {
    id: "c1",
    name: "核融合炉",
    cost: 14,
    tags: ["Energy"],
    reqText: "エネルギー生産量 1以上",
    effectText: "エネルギー生産量 +3、TR +1",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c2",
    name: "デイモス落下プロジェクト",
    cost: 31,
    tags: ["Space"],
    reqText: "なし",
    effectText: "気温 +4°C、熱 +4、TR +2",
    victoryPoints: 0,
    type: "event"
  },
  {
    id: "c3",
    name: "極地風力発電所",
    cost: 7,
    tags: ["Energy"],
    reqText: "なし",
    effectText: "エネルギー生産量 +1、熱 +2",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c4",
    name: "地熱発電所",
    cost: 11,
    tags: ["Energy"],
    reqText: "なし",
    effectText: "エネルギー生産量 +2、熱 +1",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c5",
    name: "藻類培養施設",
    cost: 12,
    tags: ["Plant"],
    reqText: "海洋 2タイル以上",
    effectText: "植物生産量 +2、植物 +1 (勝利点 +1)",
    victoryPoints: 1,
    type: "automated"
  },
  {
    id: "c6",
    name: "植物研究所",
    cost: 9,
    tags: ["Plant"],
    reqText: "気温 -26°C以上",
    effectText: "植物生産量 +1、カードを1枚引く (勝利点 +1)",
    victoryPoints: 1,
    type: "automated"
  },
  {
    id: "c7",
    name: "温室効果ガスの放出",
    cost: 10,
    tags: ["Space"],
    reqText: "なし",
    effectText: "熱生産量 +1、熱 +2",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c8",
    name: "都市開発計画",
    cost: 18,
    tags: ["Building"],
    reqText: "エネルギー生産量 1以上",
    effectText: "都市タイルを配置、MC生産量 +2 (勝利点 +1)",
    placementType: "city",
    victoryPoints: 1,
    type: "automated"
  },
  {
    id: "c9",
    name: "鉄鉱山開発",
    cost: 8,
    tags: ["Building"],
    reqText: "なし",
    effectText: "建材生産量 +2",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c10",
    name: "チタン掘削場",
    cost: 10,
    tags: ["Building"],
    reqText: "なし",
    effectText: "チタン生産量 +1",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c11",
    name: "窒素ガスの輸入",
    cost: 28,
    tags: ["Space"],
    reqText: "なし",
    effectText: "TR +2、植物生産量 +2",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c12",
    name: "耐寒細菌の導入",
    cost: 6,
    tags: ["Plant"],
    reqText: "気温 -28°C以上",
    effectText: "植物生産量 +1",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c13",
    name: "巨大反射鏡の軌道投入",
    cost: 22,
    tags: ["Space"],
    reqText: "なし",
    effectText: "熱生産量 +3",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c14",
    name: "炭素採掘プロジェクト",
    cost: 12,
    tags: ["Building"],
    reqText: "なし",
    effectText: "建材生産量 +1、熱生産量 +2",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c15",
    name: "地下水汲み上げ",
    cost: 18,
    tags: ["Building"],
    reqText: "なし",
    effectText: "海洋タイルを配置",
    placementType: "ocean",
    victoryPoints: 0,
    type: "event"
  },
  {
    id: "c16",
    name: "保護ドーム都市",
    cost: 21,
    tags: ["Building"],
    reqText: "なし",
    effectText: "都市タイルを配置、建材生産量 +1 (勝利点 +1)",
    placementType: "city",
    victoryPoints: 1,
    type: "automated"
  },
  {
    id: "c17",
    name: "温室バイオームドーム",
    cost: 16,
    tags: ["Plant", "Building"],
    reqText: "気温 -24°C以上",
    effectText: "植物生産量 +2、植物 +2",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c18",
    name: "土壌微生物の散布",
    cost: 9,
    tags: ["Plant"],
    reqText: "気温 -26°C以上",
    effectText: "植物生産量 +1、MC生産量 +1",
    victoryPoints: 0,
    type: "automated"
  },
  {
    id: "c19",
    name: "耐寒家畜の放牧",
    cost: 13,
    tags: ["Plant"],
    reqText: "酸素濃度 9%以上",
    effectText: "MC生産量 +2、TR +1 (勝利点 +2)",
    victoryPoints: 2,
    type: "automated"
  },
  {
    id: "c20",
    name: "氷河の融解計画",
    cost: 16,
    tags: ["Space"],
    reqText: "気温 -20°C以上",
    effectText: "海洋タイルを配置、植物生産量 +1",
    placementType: "ocean",
    victoryPoints: 0,
    type: "automated"
  }
];

void LEGACY_CARDS;
export const ALL_CARDS = OFFICIAL_PROJECTS;
export { CORPORATIONS, GLOBAL_EVENTS, PRELUDES, STANDARD_ACTIONS, STANDARD_PROJECTS };

// TileType numbers from the reference implementation's enum (src/common/TileType.ts).
// Special tiles occupy a space like a city or greenery but keep their own name so
// the board can show what was built there.
const TILE_TYPE_BY_NUMBER = {
  0: { tile: "forest" },
  1: { tile: "ocean" },
  2: { tile: "city" },
  3: { tile: "city", specialName: "Capital" },
  4: { tile: "special", specialName: "Commercial District" },
  5: { tile: "special", specialName: "Ecological Zone" },
  6: { tile: "special", specialName: "Industrial Center" },
  7: { tile: "special", specialName: "Lava Flows" },
  8: { tile: "special", specialName: "Mining Area" },
  9: { tile: "special", specialName: "Mining Rights" },
  10: { tile: "special", specialName: "Mohole Area" },
  11: { tile: "special", specialName: "Natural Preserve" },
  12: { tile: "special", specialName: "Nuclear Zone" },
  13: { tile: "special", specialName: "Restricted Area" },
  14: { tile: "special", specialName: "Deimos Down" },
  15: { tile: "special", specialName: "Great Dam" },
  16: { tile: "special", specialName: "Magnetic Field Generators" },
  43: { tile: "special", specialName: "Special Tile" }
};

// Global parameter limits from the rulebook: nine ocean tiles, oxygen to 14%,
// temperature from -30°C to +8°C in 2° steps.
export const MAX_OCEANS = 9;
// Each ocean tile pays 2 MC to a tile placed next to it.
export const OCEAN_ADJACENCY_BONUS = 2;
export const MAX_OXYGEN = 14;
export const MAX_TEMPERATURE = 8;
export const MIN_TEMPERATURE = -30;
// Venus Next: the scale runs 0-30%, two percent per step.
// A research card costs 3 M€, in setup and in every generation after.
export const RESEARCH_CARD_COST = 3;

export const MAX_VENUS = 30;

// Reasons normalizeBehavior records that the pendingChoice flow now resolves.
const HANDLED_BY_PENDING_CHOICE = new Set([
  "any-card-resource-choice",
  "standard-resource-choice",
  "choice"
]);

// The official Tharsis map. Generated from the reference implementation by
// scripts/generate-tharsis-board.mjs, which verifies the axial conversion against
// the reference adjacency rule before writing.
export const INITIAL_CELLS = THARSIS_CELLS;

// Tharsis plus the four alternate maps. Each is the same 61 spaces in the same
// axial layout, so only the bonuses, ocean areas and named spaces differ.
export const BOARDS = {
  tharsis: {
    id: "tharsis",
    name: "タルシス",
    englishName: "Tharsis",
    noVolcanicRestriction: false,
    cells: THARSIS_CELLS
  },
  ...ALTERNATE_BOARDS
};

export function getBoardCells(boardId) {
  return (BOARDS[boardId] ?? BOARDS.tharsis).cells;
}

export function formatLogTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

// playerName is optional: with several players at the table the log has to say
// who acted, and labelling every line "あなた" told the reader nothing.
export function addLog(logsList, sender, text, playerName) {
  const entry = {
    id: `${Date.now()}-${Math.random()}`,
    timestamp: formatLogTime(),
    sender,
    text
  };
  if (playerName) entry.playerName = playerName;
  return [entry, ...logsList];
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getCorporation(state) {
  return CORPORATIONS.find(corporation => corporation.id === state.corporationId);
}

function getCorporationDiscount(card, corporation) {
  return (corporation?.effects?.earthDiscount && card.tags.includes("Earth")
    ? corporation.effects.earthDiscount
    : corporation?.effects?.powerDiscount && card.tags.includes("Power")
      ? corporation.effects.powerDiscount
      : corporation?.effects?.buildingDiscount && card.tags.includes("Building")
        ? corporation.effects.buildingDiscount
        : corporation?.effects?.scienceDiscount && card.tags.includes("Science")
          ? corporation.effects.scienceDiscount
          : 0);
}

function getTitaniumValue(state) {
  return getCorporation(state)?.effects?.titaniumValue ?? 3;
}

// Deep-copies shared state and every player. The legacy single-player accessors are
// non-enumerable, so a plain spread would silently drop them and break the first
// `state.mc`-style read after any engine call; re-attaching them here keeps the
// compatibility surface alive across the whole engine.
export function cloneGameState(state) {
  const clone = {
    ...state,
    players: (state.players ?? []).map(player => ({
      ...player,
      researchCards: [...(player.researchCards ?? [])],
      corporationOptions: [...(player.corporationOptions ?? [])],
      preludeOptions: [...(player.preludeOptions ?? [])],
      selectedPreludeIds: [...(player.selectedPreludeIds ?? [])],
      hand: [...(player.hand ?? [])],
      playedProjects: [...(player.playedProjects ?? [])],
      playedEvents: [...(player.playedEvents ?? [])],
      cardResources: { ...(player.cardResources ?? {}) },
      cardPlacements: { ...(player.cardPlacements ?? {}) },
      cardDiscounts: {
        all: player.cardDiscounts?.all ?? 0,
        tags: { ...(player.cardDiscounts?.tags ?? {}) }
      },
      usedCardActions: [...(player.usedCardActions ?? [])]
    })),
    turnOrder: [...(state.turnOrder ?? [])],
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    board: Object.fromEntries(Object.entries(state.board).map(([key, cell]) => [key, { ...cell }])),
    logs: [...state.logs],
    claimedMilestones: [...(state.claimedMilestones ?? [])],
    fundedAwards: [...(state.fundedAwards ?? [])],
    // Absent from saves written before these cards existed, hence the ?? [].
    scoreModifiers: (state.scoreModifiers ?? []).map(item => ({ ...item })),
    boardMarkers: (state.boardMarkers ?? []).map(item => ({ ...item })),
    generationAttackLedger: (state.generationAttackLedger ?? []).map(item => ({ ...item })),
    resolvedChoices: Object.fromEntries(
      Object.entries(state.resolvedChoices ?? {}).map(([id, stages]) => [id, [...stages]])
    ),
    turmoil: state.turmoil ? cloneTurmoil(state.turmoil) : null,
    colonies: state.colonies ? cloneColonies(state.colonies) : null,
    pendingChoice: state.pendingChoice
      ? {
          ...state.pendingChoice,
          options: (state.pendingChoice.options ?? []).map(option => ({ ...option })),
          continuation: { ...state.pendingChoice.continuation }
        }
      : null
  };
  return withLegacyPlayerAccessors(clone);
}

function addResource(state, resource, amount) {
  if (resource in state) state[resource] += amount;
}

export function applyProduction(state, production) {
  const keys = {
    mc: "mcProd",
    steel: "steelProd",
    titanium: "titaniumProd",
    plants: "plantsProd",
    energy: "energyProd",
    heat: "heatProd",
  };
  Object.entries(production ?? {}).forEach(([resource, amount]) => {
    const key = keys[resource];
    // Only MC production may go negative, and only to -5. Every other track
    // floors at zero, so a card that reduces production can never push a player
    // into producing a negative amount.
    if (!key) return;
    const floor = resource === "mc" ? -5 : 0;
    state[key] = Math.max(floor, state[key] + amount);
  });
}

const SOURCE_RESOURCE_MAP = {
  megacredits: "mc",
  steel: "steel",
  titanium: "titanium",
  plants: "plants",
  energy: "energy",
  heat: "heat",
};

const effectCache = new WeakMap();

function addNormalizedStock(effect, stock, unsupported = []) {
  Object.entries(stock ?? {}).forEach(([source, amount]) => {
    const resource = SOURCE_RESOURCE_MAP[source];
    if (!resource) return;
    if (typeof amount === "number") {
      effect[resource] = (effect[resource] ?? 0) + amount;
      return;
    }
    // "Gain 1 MC per Building tag", "gain 1 plant per city", and similar counted
    // amounts. Resolved against live state when the effect is applied.
    if (amount && typeof amount === "object") {
      const counted = normalizeCountedAmount(amount);
      if (counted) {
        effect.countedGains = [...(effect.countedGains ?? []), { resource, ...counted }];
        return;
      }
    }
    unsupported.push("dynamic-resource-gain");
  });
}

// Recognises the counting rules the official cards actually use. Anything that
// depends on Colonies state is deferred until that expansion exists.
function normalizeCountedAmount(amount) {
  const each = amount.each ?? 1;

  if (amount.colonies) return { kind: "colonies", each, allPlayers: amount.all === true };
  if (amount.tag) {
    // Tags count only the player's own unless `all` is set (reference Counter).
    const tags = Array.isArray(amount.tag) ? amount.tag : [amount.tag];
    return { kind: "tag", tags, each, allPlayers: amount.all === true };
  }
  // Board counts include every player's tiles unless `all` is explicitly false.
  if (amount.cities) return { kind: "cities", each, allPlayers: amount.all !== false };
  if (amount.greeneries) return { kind: "greeneries", each, allPlayers: amount.all !== false };
  // Floaters are always counted on the active player's own cards.
  if (amount.floaters) return { kind: "floaters", each, allPlayers: false };
  return null;
}

function evaluateCountedGain(state, gain, ownerId) {
  const players = gain.allPlayers ? state.players : state.players.filter(p => p.id === ownerId);

  let units = 0;
  switch (gain.kind) {
    case "tag":
      for (const player of players) {
        for (const tag of gain.tags) units += countPlayedTag(state, tag, player);
      }
      break;
    case "cities":
      units = Object.values(state.board).filter(cell => {
        if (cell.tileType !== "city") return false;
        return gain.allPlayers || cell.placedBy === ownerId;
      }).length;
      break;
    case "greeneries":
      units = Object.values(state.board).filter(cell => {
        if (cell.tileType !== "forest") return false;
        return gain.allPlayers || cell.placedBy === ownerId;
      }).length;
      break;
    case "floaters":
      for (const player of players) {
        for (const [cardId, count] of Object.entries(player.cardResources ?? {})) {
          if (getCardResourceType(cardId) === "floater") units += count;
        }
      }
      break;
    case "colonies":
      if (!state.colonies) return 0;
      for (const player of players) units += countColonies(state.colonies, player.id);
      break;
    default:
      return 0;
  }
  return units * (gain.each ?? 1);
}

function normalizeBehavior(raw, effect = {}, unsupported = []) {
  if (!raw || typeof raw !== "object") return effect;
  if (raw.production) {
    effect.production = { ...(effect.production ?? {}) };
    Object.entries(raw.production).forEach(([source, amount]) => {
      const resource = SOURCE_RESOURCE_MAP[source];
      if (resource && typeof amount === "number") effect.production[resource] = (effect.production[resource] ?? 0) + amount;
    });
  }
  if (raw.stock) addNormalizedStock(effect, raw.stock, unsupported);
  if (raw.global) {
    if (typeof raw.global.temperature === "number") effect.temperatureSteps = (effect.temperatureSteps ?? 0) + raw.global.temperature;
    if (typeof raw.global.oxygen === "number") effect.oxygenSteps = (effect.oxygenSteps ?? 0) + raw.global.oxygen;
    if (typeof raw.global.venus === "number") effect.venusSteps = (effect.venusSteps ?? 0) + raw.global.venus;
  }
  if (typeof raw.tr === "number") effect.tr = (effect.tr ?? 0) + raw.tr;
  if (raw.drawCard !== undefined) {
    effect.draw = (effect.draw ?? 0) + (typeof raw.drawCard === "number" ? raw.drawCard : (raw.drawCard.count ?? 1));
    if (typeof raw.drawCard === "object" && raw.drawCard.keep !== undefined) effect.drawKeep = raw.drawCard.keep;
    if (typeof raw.drawCard === "object" && raw.drawCard.tag) {
      const tag = Array.isArray(raw.drawCard.tag) ? raw.drawCard.tag[0] : raw.drawCard.tag;
      effect.drawTag = tag[0]?.toUpperCase() + tag.slice(1);
    }
  }
  if (typeof raw.removeAnyPlants === "number") effect.removePlants = (effect.removePlants ?? 0) + raw.removeAnyPlants;
  if (raw.ocean !== undefined) {
    effect.tile = "ocean";
    effect.tileCount = raw.ocean.count ?? 1;
  }
  if (raw.city !== undefined) {
    effect.tile = "city";
    effect.tileCount = raw.city.count ?? 1;
  }
  if (raw.greenery !== undefined) {
    effect.tile = "forest";
    effect.tileCount = raw.greenery.count ?? 1;
  }
  if (raw.tile && typeof raw.tile === "object") {
    // TileType numbers come from the reference implementation's enum. Special
    // tiles behave as a marked land tile: they occupy a space, count as the
    // player's tile for Landlord and city adjacency where applicable, and carry
    // the card's own name.
    const mapped = TILE_TYPE_BY_NUMBER[raw.tile.type];
    if (mapped) {
      effect.tile = mapped.tile;
      effect.tileCount = raw.tile.count ?? 1;
      if (mapped.specialName) effect.specialName = mapped.specialName;
      if (raw.tile.on) effect.tilePlacementRule = raw.tile.on;
    } else {
      unsupported.push(`tile:${raw.tile.type}`);
    }
  }
  if (raw.addResources !== undefined) effect.cardResource = (effect.cardResource ?? 0) + (typeof raw.addResources === "number" ? raw.addResources : 1);
  if (raw.spend && typeof raw.spend === "object") {
    effect.payment = { ...(effect.payment ?? {}) };
    Object.entries(raw.spend).forEach(([source, amount]) => {
      if (source === "resourcesHere") effect.payment.cardResources = amount;
      else if (SOURCE_RESOURCE_MAP[source] && typeof amount === "number") effect.payment[SOURCE_RESOURCE_MAP[source]] = amount;
    });
  }
  if (raw.decreaseAnyProduction?.type && typeof raw.decreaseAnyProduction.count === "number") {
    effect.productionDecrease = { resource: SOURCE_RESOURCE_MAP[raw.decreaseAnyProduction.type] ?? raw.decreaseAnyProduction.type, count: raw.decreaseAnyProduction.count };
  }
  if (raw.standardResource) unsupported.push("standard-resource-choice");
  // Handled by queuePendingChoices, which asks which card receives them and
  // places them directly when only one card can. Not a gap.
  if (raw.addResourcesToAnyCard) effect.addResourcesToAnyCard = raw.addResourcesToAnyCard;
  // Recorded separately so each is only reported when its expansion is off.
  if (raw.colonies) {
    // These need no decision from the player, so they apply directly instead of
    // being parked as unsupported: an extra trade fleet, a permanent bonus to
    // the trade track, and a trade discount handled where trading is paid for.
    if (typeof raw.colonies.addTradeFleet === "number") {
      effect.addTradeFleet = (effect.addTradeFleet ?? 0) + raw.colonies.addTradeFleet;
    }
    if (typeof raw.colonies.tradeOffset === "number") {
      effect.tradeOffset = (effect.tradeOffset ?? 0) + raw.colonies.tradeOffset;
    }
    if (raw.colonies.buildColony) effect.buildColony = raw.colonies.buildColony;
    const handled =
      raw.colonies.addTradeFleet ||
      raw.colonies.tradeOffset ||
      raw.colonies.tradeDiscount ||
      raw.colonies.buildColony;
    if (!handled) unsupported.push("colonies-state-choice");
  }
  if (raw.turmoil) {
    // A permanent influence bonus needs no decision, so it applies directly
    // rather than being parked as an unsupported choice.
    if (typeof raw.turmoil.influenceBonus === "number") {
      effect.influenceBonus = (effect.influenceBonus ?? 0) + raw.turmoil.influenceBonus;
    }
    if (raw.turmoil.sendDelegates) effect.sendDelegates = raw.turmoil.sendDelegates;
    if (!raw.turmoil.influenceBonus && !raw.turmoil.sendDelegates) unsupported.push("turmoil-state-choice");
  }
  if (raw.or) {
    if (raw.or.autoSelect && Array.isArray(raw.or.behaviors) && raw.or.behaviors[0]) {
      normalizeBehavior(raw.or.behaviors[0], effect, unsupported);
    }
    // A branch without autoSelect becomes a pending choice in
    // queuePendingChoices / applyCardAction, so it is not a gap either.
  }
  return effect;
}

export function getCardEffect(card) {
  if (card.effect) return { ...card.effect, cardId: card.id };
  if (effectCache.has(card)) return { ...effectCache.get(card), cardId: card.id };
  const unsupported = [];
  const effect = normalizeBehavior(card.effectSpec?.behavior, {}, unsupported);
  if (card.effectSpec?.action) {
    const actionUnsupported = [];
    effect.action = normalizeBehavior(card.effectSpec.action, {}, actionUnsupported);
    effect.action.unsupported = actionUnsupported;
  }
  if (card.effectSpec?.cardDiscount) effect.cardDiscount = card.effectSpec.cardDiscount;
  if (card.effectSpec?.globalParameterRequirementBonus) effect.globalParameterRequirementBonus = card.effectSpec.globalParameterRequirementBonus;
  effect.unsupported = unsupported;
  effectCache.set(card, effect);
  return { ...effect, cardId: card.id };
}

function drawCards(state, count, tag) {
  let deck = [...state.deck];
  let discard = [...state.discardPile];
  const drawn = [];
  let inspected = 0;
  const available = deck.length + discard.length;
  while (drawn.length < count && inspected < available) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = shuffle(discard);
      discard = [];
    }
    const [cardId, ...rest] = deck;
    deck = rest;
    inspected += 1;
    const card = ALL_CARDS.find(item => item.id === cardId);
    if (!tag || card?.tags.includes(tag)) drawn.push(cardId);
    else discard.push(cardId);
  }
  state.deck = deck;
  state.discardPile = discard;
  state.hand.push(...drawn);
  return drawn;
}

function firstLegalSpace(state, type) {
  return Object.values(state.board)
    .sort((a, b) => `${a.q},${a.r}`.localeCompare(`${b.q},${b.r}`))
    .find(cell => isCellPlacementValid(cell, type, state.board));
}

function placeTile(state, type, count = 1, cardId) {
  // Tiles belong to whoever is acting, not to a hardcoded "player": in a hotseat
  // game that credited every tile, and the TR for it, to the first seat.
  const ownerId = state.currentPlayerId ?? state.players?.[0]?.id ?? "player";
  let placed = 0;
  for (let i = 0; i < count; i++) {
    const cell = firstLegalSpace(state, type);
    if (!cell) break;
    // Delegating keeps automatic placements — preludes, corporation openings,
    // cards that place without asking — paying the same placement bonus, ocean
    // adjacency bonus and TR as one the player positioned by hand.
    placeTileAt(state, cell, type, ownerId, cardId && i === 0 ? cardId : undefined);
    placed += 1;
  }
  return placed;
}

function applyEffect(state, effect, logs, options = {}) {
  const { skipTile = false } = options;
  let nextState = state;
  let nextLogs = logs;
  if (!effect) return { state: nextState, logs: nextLogs };

  // Choices handled by the pendingChoice flow are resolved by the player after
  // this function returns, so they are not reported as unimplemented here.
  // Expansion effects are only unimplemented when that expansion is switched off.
  const stillUnsupported = (effect.unsupported ?? []).filter(reason => {
    if (HANDLED_BY_PENDING_CHOICE.has(reason)) return false;
    if (reason === "colonies-state-choice") return !nextState.colonies;
    if (reason === "turmoil-state-choice") return !nextState.turmoil;
    return true;
  });
  if (stillUnsupported.length) {
    nextLogs = addLog(nextLogs, "system", `このカードの個別選択はオンライン版で未実装です: ${stillUnsupported.join("、")}`);
  }

  if (effect.countedGains?.length) {
    for (const gain of effect.countedGains) {
      const amount = evaluateCountedGain(nextState, gain, nextState.currentPlayerId);
      if (amount > 0) {
        addResource(nextState, gain.resource, amount);
        nextLogs = addLog(nextLogs, "system", `条件により ${gain.resource} を ${amount} 獲得しました。`);
      }
    }
  }

  if (effect.payMc) nextState.mc -= effect.payMc;
  if (effect.mc) addResource(nextState, "mc", effect.mc);
  if (effect.steel) addResource(nextState, "steel", effect.steel);
  if (effect.titanium) addResource(nextState, "titanium", effect.titanium);
  if (effect.plants) addResource(nextState, "plants", effect.plants);
  if (effect.energy) addResource(nextState, "energy", effect.energy);
  if (effect.heat) addResource(nextState, "heat", effect.heat);
  if (effect.tr) nextState.tr += effect.tr;
  // Solo play has nobody else to hit, so the removal still lands on the only
  // player present; with opponents the victim is chosen instead.
  if (effect.removePlants && !options.skipResourceAttack) {
    nextState.plants = Math.max(0, nextState.plants - effect.removePlants);
  }
  if (effect.cardResource && effect.cardId) nextState.cardResources[effect.cardId] = (nextState.cardResources[effect.cardId] ?? 0) + effect.cardResource;
  if (effect.venusSteps) {
    // Raising the Venus scale one step (2%) raises TR by 1, the same way the
    // temperature and oxygen tracks do.
    const beforeVenus = nextState.venus ?? 0;
    nextState.venus = Math.min(MAX_VENUS, beforeVenus + effect.venusSteps * 2);
    nextState.tr += Math.max(0, (nextState.venus - beforeVenus) / 2);
    const venusBonus = applyVenusThresholds(nextState, beforeVenus, nextLogs);
    nextState = venusBonus.state;
    nextLogs = venusBonus.logs;
  }
  if (effect.globalParameterRequirementBonus?.steps) nextState.globalRequirementBuffer = (nextState.globalRequirementBuffer ?? 0) + effect.globalParameterRequirementBonus.steps;
  if (effect.cardDiscount?.amount && !effect.cardDiscount.per) {
    if (effect.cardDiscount.tag) {
      const tag = String(effect.cardDiscount.tag).toLowerCase();
      nextState.cardDiscounts.tags[tag] = (nextState.cardDiscounts.tags[tag] ?? 0) + effect.cardDiscount.amount;
    } else {
      nextState.cardDiscounts.all = (nextState.cardDiscounts.all ?? 0) + effect.cardDiscount.amount;
    }
  }

  if (effect.payment) {
    Object.entries(effect.payment).forEach(([resource, amount]) => {
      if (resource === "cardResources") {
        if (effect.cardId) nextState.cardResources[effect.cardId] = Math.max(0, (nextState.cardResources[effect.cardId] ?? 0) - Number(amount));
      } else if (resource in nextState) {
        nextState[resource] = Math.max(0, nextState[resource] - Number(amount));
      }
    });
  }

  applyProduction(nextState, effect.production);
  if (effect.addTradeFleet && nextState.colonies) {
    nextState.colonies = addFleet(nextState.colonies, nextState.currentPlayerId, effect.addTradeFleet);
  }

  // Turmoil: a permanent influence bonus, and delegates sent straight to a
  // party. Neither asks the player anything, so both settle here.
  if (effect.influenceBonus && nextState.turmoil) {
    const owner = nextState.currentPlayerId;
    const bonuses = { ...(nextState.turmoil.playersInfluenceBonus ?? {}) };
    bonuses[owner] = (bonuses[owner] ?? 0) + effect.influenceBonus;
    nextState.turmoil = { ...nextState.turmoil, playersInfluenceBonus: bonuses };
  }
  if (effect.sendDelegates && nextState.turmoil) {
    const spec = effect.sendDelegates;
    const count = typeof spec.count === "number"
      ? spec.count
      : countColonies(nextState.colonies, nextState.currentPlayerId);
    const party = nextState.turmoil.dominantParty;
    for (let i = 0; i < count; i++) {
      const sent = sendDelegate(nextState.turmoil, nextState.currentPlayerId, party, {});
      if (!sent.sent) break;
      nextState.turmoil = sent.turmoil;
    }
  }

  if (effect.productionDecrease?.resource && !options.skipProductionAttack) {
    // Choosing the victim belongs to queuePendingChoices; hitting the acting
    // player here would turn every attack card into a self-inflicted one.
    const { resource, count } = effect.productionDecrease;
    const target = options.productionAttackTargetId ?? nextState.currentPlayerId;
    const key = `${resource}Prod`;
    const floor = resource === "mc" ? -5 : 0;
    nextState.players = nextState.players.map(player =>
      player.id === target ? { ...player, [key]: Math.max(floor, (player[key] ?? 0) - count) } : player
    );
  }

  if (effect.temperatureSteps) {
    const before = nextState.temperature;
    nextState.temperature = Math.min(8, nextState.temperature + effect.temperatureSteps * 2);
    nextState.tr += Math.max(0, (nextState.temperature - before) / 2);
  }
  if (effect.oxygenSteps) {
    const before = nextState.oxygen;
    nextState.oxygen = Math.min(14, nextState.oxygen + effect.oxygenSteps);
    nextState.tr += Math.max(0, nextState.oxygen - before);
  }
  if (!skipTile && effect.tile) {
    const count = effect.tileCount ?? 1;
    const placed = placeTile(nextState, effect.tile, count, effect.cardId);
    nextLogs = addLog(nextLogs, "system", `${effect.tile}タイルを${placed}枚配置しました。`);
  }
  if (effect.draw) {
    const drawn = drawCards(nextState, effect.draw, effect.drawTag);
    if (effect.drawKeep !== undefined && drawn.length > effect.drawKeep) {
      const kept = new Set(drawn.slice(0, effect.drawKeep));
      const discard = drawn.filter(cardId => !kept.has(cardId));
      nextState.hand = nextState.hand.filter(cardId => !discard.includes(cardId));
      nextState.discardPile.push(...discard);
    }
    nextLogs = addLog(nextLogs, "system", `カードを${drawn.length}枚引きました。`);
  }
  if (effect.plantsPerCity) {
    const cities = Object.values(nextState.board).filter(cell => cell.tileType === "city").length;
    nextState.plants += cities * effect.plantsPerCity;
  }
  return { state: nextState, logs: nextLogs };
}

// playerId matters online: the seat that sent the choice is not necessarily the
// one holding currentPlayerId, and without it one client could pick everyone
// else's corporation.
export function applyCorporation(state, corporationId, playerId) {
  const actorId = playerId ?? state.currentPlayerId;
  const actor = getPlayer(state, actorId);
  const corporation = CORPORATIONS.find(item => item.id === corporationId);
  if (!corporation || !actor || !(actor.corporationOptions ?? []).includes(corporationId)) return state;

  const seated = cloneGameState(state);
  seated.currentPlayerId = actorId;
  const nextState = seated;
  nextState.corporationId = corporationId;
  nextState.corporationOptions = [];
  nextState.setupStep = "projects";
  nextState.mc = corporation.starting.mc;
  ["steel", "titanium", "plants", "energy", "heat"].forEach(resource => {
    nextState[resource] = corporation.starting[resource] ?? 0;
  });
  ["mc", "steel", "titanium", "plants", "energy", "heat"].forEach(resource => {
    nextState[`${resource}Prod`] = corporation.starting.production?.[resource] ?? 0;
  });
  nextState.logs = addLog(nextState.logs, "player", `${actor.name} が企業【${corporation.name}】を選択しました。`);
  nextState.currentPlayerId = state.currentPlayerId;
  return advanceSetupTurn(nextState);
}

// In hotseat every player sets up in turn. Hand the seat to the next player who
// still has a corporation to pick; once everyone is done, start the game.
export function advanceSetupTurn(state) {
  const next = state;
  const pending = next.turnOrder.find(id => {
    const player = getPlayer(next, id);
    return player && !player.corporationId && player.corporationOptions.length > 0;
  });

  if (pending) {
    next.currentPlayerId = pending;
    next.phase = "setup";
    return next;
  }

  // Everyone has a corporation. Preludes come next if any were dealt.
  const withPreludes = next.turnOrder.find(id => {
    const player = getPlayer(next, id);
    return player && player.preludeOptions.length >= 2 && player.selectedPreludeIds.length === 0;
  });
  if (withPreludes) {
    next.currentPlayerId = withPreludes;
    next.phase = "setup";
    next.players = next.players.map(player =>
      player.id === withPreludes ? { ...player, setupStep: "prelude" } : player
    );
    return next;
  }

  // "配られた 10 枚のプロジェクト・カードのうち、手札として残したいものを、
  // １枚につき３Ｍ€で開始時の手札として購入します" — the starting hand is bought
  // before the first action phase, so this step cannot be skipped.
  const buying = next.turnOrder.find(id => {
    const player = getPlayer(next, id);
    return player && player.setupStep !== "complete" && (player.researchCards?.length ?? 0) > 0;
  });
  if (buying) {
    next.currentPlayerId = buying;
    next.phase = "setup";
    next.players = next.players.map(player =>
      player.id === buying ? { ...player, setupStep: "projects" } : player
    );
    return next;
  }

  next.currentPlayerId = next.firstPlayerId;
  next.phase = "action";
  next.players = next.players.map(player => ({
    ...player,
    setupStep: "complete",
    actionsRemaining: 2,
    turnStep: "start"
  }));
  return next;
}

export function getPreludeCost(prelude) {
  return getCardEffect(prelude).payMc ?? getCardEffect(prelude).payment?.mc ?? 0;
}

export function applyPreludes(state, preludeIds, playerId) {
  const actorId = playerId ?? state.currentPlayerId;
  const actor = getPlayer(state, actorId);
  if (!actor || actor.setupStep !== "prelude" || preludeIds.length !== 2) return state;
  if (preludeIds.some(id => !(actor.preludeOptions ?? []).includes(id))) return state;
  const selected = preludeIds.map(id => PRELUDES.find(prelude => prelude.id === id)).filter(Boolean);
  const totalCost = selected.reduce((sum, prelude) => sum + getPreludeCost(prelude), 0);
  if (state.mc < totalCost) return state;

  let nextState = cloneGameState(state);
  const seatBefore = nextState.currentPlayerId;
  nextState.currentPlayerId = actorId;
  nextState.selectedPreludeIds = preludeIds;
  nextState.preludeOptions = [];
  // advanceSetupTurn decides what comes next; marking the player complete here
  // would skip the starting-hand purchase.
  nextState.setupStep = "projects";
  nextState.actionsRemaining = 2;
  nextState.turnStep = "start";
  let logs = addLog(nextState.logs, "player", `Prelude【${selected.map(prelude => prelude.name).join("】【")}】を解決しました。`);
  selected.forEach(prelude => {
    const effect = getCardEffect(prelude);
    const result = applyEffect(nextState, effect, logs);
    nextState = result.state;
    logs = addLog(result.logs, "system", `Prelude効果: ${prelude.effectText}`);
    if (prelude.effect?.freePlayDiscount || prelude.effect?.freePlayIgnoreGlobal) {
      const freePlay = applyPreludeFreePlay(nextState, prelude.effect, logs);
      nextState = freePlay.state;
      logs = freePlay.logs;
    }
  });
  const initialAction = applyCorporationInitialAction(nextState, logs);
  nextState = initialAction.state;
  logs = initialAction.logs;
  nextState.logs = logs;
  nextState.currentPlayerId = seatBefore;
  // Hand the seat on; the game only starts once every player has set up.
  return advanceSetupTurn(nextState);
}

// The starting hand is bought during setup; once a player confirms, the seat
// moves to whoever still has to set up, or the first action phase begins.
// Takes one card in the draft. Once every card has been claimed the picks
// become each player's research hand, which they then buy from as usual.
export function draftPick(state, cardId, playerId) {
  if (!state.draft) return state;
  const actorId = playerId ?? state.currentPlayerId;
  const result = pickDraftCard(state.draft, state.turnOrder, actorId, cardId);
  if (!result.picked) return state;

  const next = cloneGameState(state);
  next.draft = result.draft;
  const actor = getPlayer(next, actorId);
  next.logs = addLog(next.logs, "player", "カードを1枚ドラフトしました。", actor?.name);

  if (isDraftComplete(next.draft)) {
    next.players = next.players.map(player => ({
      ...player,
      researchCards: draftedHandFor(next.draft, player.id)
    }));
    next.draft = null;
    next.logs = addLog(next.logs, "system", "ドラフトが終了しました。購入するカードを選んでください。");
  }
  return next;
}

export function completeSetupPurchase(state) {
  const next = cloneGameState(state);
  next.players = next.players.map(player =>
    player.id === next.currentPlayerId ? { ...player, setupStep: "complete", researchCards: [] } : player
  );
  return advanceSetupTurn(next);
}

export function applyCorporationInitialAction(state, logs) {
  const nextState = cloneGameState(state);
  const corporation = getCorporation(nextState);
  if (!corporation) return { state: nextState, logs };
  let nextLogs = logs;
  if (corporation.effects.firstActionDraw) {
    const drawn = drawCards(nextState, corporation.effects.firstActionDraw);
    nextLogs = addLog(nextLogs, "system", `${corporation.name}: 初期アクションでカードを${drawn.length}枚引きました。`);
  }
  if (corporation.effects.firstCity) {
    // placeTileAt pays the city effects now, so adding them here as well is
    // what made the opening city worth twice what every later one was.
    const placed = placeTile(nextState, "city");
    if (placed) {
      nextLogs = addLog(nextLogs, "system", `${corporation.name}: 初期アクションで都市を配置しました。`);
    }
  }
  return { state: nextState, logs: nextLogs };
}

export function applyCardEffect(state, card, logs, options = {}) {
  const nextState = cloneGameState(state);
  let nextLogs = logs;
  const effect = getCardEffect(card);

  // When the player will pick the space, suppress the automatic placement so the
  // tile is not laid twice.
  const willChooseTile =
    !options.skipTile &&
    Boolean(effect.tile) &&
    legalCellsFor(nextState, effect.tile).length > 1;

  // The victim is picked after the fact, so the decrement must not also run
  // here — otherwise the acting player is hit and then the chosen one is too.
  const willChooseVictim =
    !options.skipProductionAttack &&
    Boolean(card.effectSpec?.behavior?.decreaseAnyProduction?.type) &&
    (nextState.players ?? []).length > 1;

  // "Remove N plants from any player" reads state.plants without it, which is
  // the acting player's own stock: the card attacked whoever played it.
  const willChooseResourceVictim =
    !options.skipResourceAttack &&
    Boolean(effect.removePlants) &&
    (nextState.players ?? []).length > 1;

  const result = applyEffect(nextState, effect, nextLogs, {
    ...options,
    skipTile: options.skipTile || willChooseTile,
    skipProductionAttack: options.skipProductionAttack || willChooseVictim,
    skipResourceAttack: options.skipResourceAttack || willChooseResourceVictim
  });
  nextLogs = addLog(result.logs, "system", `効果適用: ${card.effectText}`);

  // Effects that need the player to choose a target park the rest of the work in
  // state.pendingChoice; the caller must not finish the turn until it resolves.
  const pending = queuePendingChoices(result.state, card, {
    sourceKind: options.sourceKind ?? "card",
    sourceId: card.id,
    consumedAction: options.consumedAction ?? true,
    paid: true
  });
  if (pending) {
    result.state.pendingChoice = pending;
    nextLogs = addLog(nextLogs, "system", pending.prompt);
    result.state.logs = nextLogs;
    return { status: "pending", state: result.state, logs: nextLogs, pendingChoice: pending };
  }

  // A single guilty party raises no question, so the suit settles here.
  if (card.id === LAW_SUIT_ID) {
    const targets = lawSuitTargets(result.state, result.state.currentPlayerId);
    if (targets.length === 1) {
      const actorId = result.state.currentPlayerId;
      const settled = applyLawSuitResolution(
        result.state,
        actorId,
        targets[0].id,
        `${LAW_SUIT_ID}:${actorId}:${result.state.generation}`
      );
      nextLogs = addLog(
        nextLogs,
        "system",
        `${targets[0].name} を訴えました（MC ${settled.stolen ?? 0}、勝利点 -1）。`
      );
    }
  }

  result.state.logs = nextLogs;
  return { status: "resolved", state: result.state, logs: nextLogs };
}

// Inspects a card's raw spec for the parts applyEffect deliberately skips and
// turns the first of them into a pending choice. Remaining choices are queued
// again after each resolution, so a card with several can walk through them.
function queuePendingChoices(state, card, context) {
  const done = state.resolvedChoices?.[card.id] ?? [];

  // Law Suit's question comes from the attack ledger rather than from a spec,
  // so it is asked before the spec-driven ones -- the card has no behaviour
  // block at all.
  if (card.id === LAW_SUIT_ID && !done.includes("law-suit")) {
    const targets = lawSuitTargets(state, state.currentPlayerId);
    if (targets.length > 1) {
      const built = buildLawSuitChoice(state, targets, context);
      if (built) return built;
    }
  }

  const raw = card.effectSpec?.behavior;
  if (!raw) return null;

  if (raw.or && !raw.or.autoSelect && Array.isArray(raw.or.behaviors) && !done.includes("effect-branch")) {
    return buildBranchChoice(state, raw.or.behaviors, context);
  }
  // Where a tile goes is the player's decision, not the first legal space.
  const effect = getCardEffect(card);
  if (effect.tile && !done.includes("tile-placement")) {
    const legal = legalCellsFor(state, effect.tile);
    if (legal.length > 1) {
      return buildTileChoice(
        state,
        effect.tile,
        { ...context, remaining: effect.tileCount ?? 1, specialName: effect.specialName },
        legal
      );
    }
  }
  // Attacks name a victim. Solo play has nobody else, and a single legal target
  // needs no prompt, so the choice only appears when it is a real decision.
  // Solo already applied the decrement directly; asking as well would take the
  // production twice. With opponents the direct path is suppressed, so a single
  // legal target must still produce a choice or the attack silently does
  // nothing -- which is what `options.length > 1` used to cause.
  if (
    raw.decreaseAnyProduction?.type &&
    !done.includes("production-attack") &&
    (state.players ?? []).length > 1
  ) {
    const spec = raw.decreaseAnyProduction;
    const resource = SOURCE_RESOURCE_MAP[spec.type] ?? spec.type;
    const built = buildProductionAttackChoice(state, resource, spec.count, context);
    if (built) return built;
  }

  // Solo play already applied the removal directly, so asking would be a
  // one-option prompt that takes the plants a second time.
  if (raw.stealFromPlayer && !done.includes("resource-steal")) {
    const spec = raw.stealFromPlayer;
    const built = buildResourceStealChoice(
      state,
      {
        ...spec,
        eligible: (player, current) => {
          if (spec.eligibleTag) return countPlayedTag(current, spec.eligibleTag, player) > 0;
          if (spec.eligibleAdjacentToLastTile) {
            const key = current.lastPlacedCellKey;
            const cell = key ? current.board[key] : null;
            if (!cell) return false;
            return getAdjacentCells(cell.q, cell.r).some(
              pos => current.board[`${pos.q},${pos.r}`]?.placedBy === player.id
            );
          }
          return true;
        }
      },
      // Virus's animal half reads played cards, so the catalogue and the
      // resource-type map travel with the context.
      { ...context, cards: ALL_CARDS, getResourceType: getCardResourceType }
    );
    if (built) return built;
  }

  if (
    typeof raw.removeAnyPlants === "number" &&
    !done.includes("resource-attack") &&
    (state.players ?? []).length > 1
  ) {
    const built = buildResourceAttackChoice(state, "plants", raw.removeAnyPlants, context);
    if (built) return built;
  }

  // A card that places a colony lets the player pick the moon; the card has
  // already paid, so the usual 17 M€ is not charged again.
  if (raw.colonies?.buildColony && !done.includes("colony-placement")) {
    const spec = raw.colonies.buildColony;
    const legal = Object.values(state.colonies?.tiles ?? {})
      .filter(tile => canBuildColony(state.colonies, tile.id, state.currentPlayerId).ok || spec.allowDuplicates)
      .map(tile => ({ id: tile.id, name: getColonyTile(tile.id)?.name }));
    const built = buildColonyChoice(state, spec, context, legal);
    if (built) return built;
  }

  if (raw.standardResource && !done.includes("standard-resource")) {
    return buildStandardResourceChoice(state, raw.standardResource, context);
  }
  if (raw.addResourcesToAnyCard && !done.includes("any-card-resource")) {
    const specs = Array.isArray(raw.addResourcesToAnyCard)
      ? raw.addResourcesToAnyCard
      : [raw.addResourcesToAnyCard];
    for (const spec of specs) {
      const built = buildResourceChoice(state, spec, {
        ...context,
        cards: ALL_CARDS,
        getResourceType: getCardResourceType,
        // A few cards count the amount from the table ("1 per science tag").
        evaluateCount: rule => {
          const counted = normalizeCountedAmount(rule);
          return counted ? evaluateCountedGain(state, counted, state.currentPlayerId) : 1;
        }
      });
      if (!built) continue;
      // A single legal target needs no decision.
      if (built.autoTarget) {
        applyResourceToCard(state, built.autoTarget, built.count);
        continue;
      }
      return built;
    }
  }
  return null;
}

function applyResourceToCard(state, target, amount) {
  // Guard the arithmetic: a non-numeric amount would concatenate into the total
  // and silently turn a resource count into a string.
  const delta = Number.isFinite(Number(amount)) ? Number(amount) : 1;
  state.players = state.players.map(player => {
    if (player.id !== target.targetPlayerId) return player;
    const cardResources = { ...player.cardResources };
    cardResources[target.targetCardId] = (cardResources[target.targetCardId] ?? 0) + delta;
    return { ...player, cardResources };
  });
  return state;
}

function markChoiceResolved(state, sourceId, stage) {
  const resolved = { ...(state.resolvedChoices ?? {}) };
  resolved[sourceId] = [...(resolved[sourceId] ?? []), stage];
  state.resolvedChoices = resolved;
}

// Applies the player's selection and either finishes the effect or produces the
// next choice the same card still needs.
export const DECLINE_CHOICE = "__decline__";

export function resolvePendingChoice(state, optionId, logs, playerId) {
  const choice = state.pendingChoice;
  if (!choice) {
    return { status: "resolved", state, logs: addLog(logs, "system", "解決すべき選択がありません。") };
  }
  const actorId = playerId ?? state.currentPlayerId;
  if (!isChoiceOwnedBy(choice, actorId)) {
    return {
      status: "pending",
      state,
      logs: addLog(logs, "system", "この選択は別のプレイヤーのものです。"),
      pendingChoice: choice
    };
  }
  // An optional choice can be waived; the effect simply does not happen.
  if (optionId === DECLINE_CHOICE && choice.optional) {
    const declined = cloneGameState(state);
    declined.pendingChoice = null;
    markChoiceResolved(declined, choice.continuation.sourceId, choice.continuation.stage);
    const declinedLogs = addLog(logs, "system", "任意の効果を使用しませんでした。");
    declined.logs = declinedLogs;
    return { status: "resolved", state: declined, logs: declinedLogs };
  }

  const option = findOption(choice, optionId);
  if (!option) {
    return {
      status: "pending",
      state,
      logs: addLog(logs, "system", "選択肢が不正です。"),
      pendingChoice: choice
    };
  }

  const next = cloneGameState(state);
  let nextLogs = logs;
  next.pendingChoice = null;
  markChoiceResolved(next, choice.continuation.sourceId, choice.continuation.stage);

  const card = ALL_CARDS.find(item => item.id === choice.continuation.sourceId);

  switch (choice.kind) {
    case "any-card-resource": {
      applyResourceToCard(next, option, choice.continuation.remaining ?? 1);
      nextLogs = addLog(nextLogs, "system", `${option.label}に資源を${choice.continuation.remaining ?? 1}個置きました。`);
      break;
    }
    case "standard-resource": {
      const amount = option.amount ?? 1;
      next.players = next.players.map(player =>
        player.id === actorId ? { ...player, [option.resource]: player[option.resource] + amount } : player
      );
      nextLogs = addLog(nextLogs, "system", `${option.label}を${amount}獲得しました。`);
      break;
    }
    case "discard-card": {
      const discardedId = option.cardId ?? option.id;
      next.hand = next.hand.filter(id => id !== discardedId);
      next.discardPile = [...next.discardPile, discardedId];
      const discardedCard = ALL_CARDS.find(item => item.id === discardedId);
      const drawn = drawCards(next, 1);
      const drawnCard = ALL_CARDS.find(item => item.id === drawn[0]);
      nextLogs = addLog(
        nextLogs,
        "system",
        `【${discardedCard?.name ?? discardedId}】を捨て、【${drawnCard?.name ?? drawn[0] ?? "―"}】を引きました。`
      );
      break;
    }
    case "colony-placement": {
      const allowDuplicates = Boolean(choice.continuation.payload?.allowDuplicates);
      const placed = buildColony(next.colonies, option.targetTileId, actorId, { allowDuplicates });
      if (placed.built) {
        next.colonies = placed.colonies;
        const granted = grantColonyBenefit(next, placed.bonus, actorId, nextLogs);
        nextLogs = addLog(granted.logs, "system", `${option.label} に入植しました。`);
      }
      break;
    }
    case "production-attack": {
      const { resource, count } = choice.continuation.payload ?? {};
      const key = `${resource}Prod`;
      const floor = resource === "mc" ? -5 : 0;
      const victim = getPlayer(next, option.targetPlayerId);
      next.players = next.players.map(player =>
        player.id === option.targetPlayerId
          ? { ...player, [key]: Math.max(floor, (player[key] ?? 0) - count) }
          : player
      );
      const beforeProd = victim?.[key] ?? 0;
      const afterProd = Math.max(floor, beforeProd - count);
      if (beforeProd > afterProd) {
        recordAttack(next, {
          attackerPlayerId: choice.ownerPlayerId,
          victimPlayerId: option.targetPlayerId,
          sourceCardId: choice.continuation.sourceId,
          kind: "production-decrease",
          resource,
          amount: beforeProd - afterProd
        });
      }
      nextLogs = addLog(nextLogs, "system", `${victim?.name ?? option.targetPlayerId} の生産量を ${count} 下げました。`);
      break;
    }
    case "cathedral-placement": {
      const built = placeCathedral(next, choice.ownerPlayerId, option.targetCellKey);
      if (built.ok) {
        const cell = next.board[option.targetCellKey];
        nextLogs = addLog(
          nextLogs,
          "system",
          `(${cell?.q}, ${cell?.r}) の都市に大聖堂を建設しました。`
        );
      }
      break;
    }
    case "law-suit": {
      const settled = applyLawSuitResolution(
        next,
        choice.ownerPlayerId,
        option.targetPlayerId,
        choice.id
      );
      const victim = getPlayer(next, option.targetPlayerId);
      nextLogs = addLog(
        nextLogs,
        "system",
        `${victim?.name ?? option.targetPlayerId} を訴えました（MC ${settled.stolen ?? 0}、勝利点 -1）。`
      );
      break;
    }
    case "resource-steal": {
      const attackerId = choice.ownerPlayerId;
      const victim = getPlayer(next, option.targetPlayerId);

      // Virus's animal half takes the resource off a card rather than out of a
      // stock, so it settles on cardResources and never moves to the attacker.
      if (option.targetCardId) {
        const held = victim?.cardResources?.[option.targetCardId] ?? 0;
        const taken = Math.min(held, option.count ?? 0);
        next.players = next.players.map(player =>
          player.id === option.targetPlayerId
            ? {
                ...player,
                cardResources: {
                  ...player.cardResources,
                  [option.targetCardId]: held - taken
                }
              }
            : player
        );
        if (taken > 0) {
          recordAttack(next, {
            attackerPlayerId: attackerId,
            victimPlayerId: option.targetPlayerId,
            sourceCardId: choice.continuation.sourceId,
            kind: "resource-removal",
            resource: option.cardResourceType,
            amount: taken
          });
        }
        const cardName = ALL_CARDS.find(item => item.id === option.targetCardId)?.name
          ?? option.targetCardId;
        nextLogs = addLog(
          nextLogs,
          "system",
          `${victim?.name ?? option.targetPlayerId} の ${cardName} から ${taken} 個取り除きました。`
        );
        break;
      }

      const resource = option.resource;
      const before = victim?.[resource] ?? 0;
      const taken = Math.min(before, option.count ?? 0);
      const steal = Boolean(choice.continuation.payload?.steal);

      next.players = next.players.map(player => {
        if (player.id === option.targetPlayerId) {
          return { ...player, [resource]: before - taken };
        }
        if (steal && player.id === attackerId) {
          return { ...player, [resource]: (player[resource] ?? 0) + taken };
        }
        return player;
      });

      if (taken > 0) {
        recordAttack(next, {
          attackerPlayerId: attackerId,
          victimPlayerId: option.targetPlayerId,
          sourceCardId: choice.continuation.sourceId,
          kind: "resource-removal",
          resource,
          amount: taken
        });
      }
      const label = RESOURCE_LABELS[resource] ?? resource;
      nextLogs = addLog(
        nextLogs,
        "system",
        `${victim?.name ?? option.targetPlayerId} から ${label} ${taken} を${steal ? "奪いました" : "取り除きました"}。`
      );
      break;
    }
    case "resource-attack": {
      const { resource, count } = choice.continuation.payload ?? {};
      const victim = getPlayer(next, option.targetPlayerId);
      const before = victim?.[resource] ?? 0;
      const after = Math.max(0, before - count);
      next.players = next.players.map(player =>
        player.id === option.targetPlayerId ? { ...player, [resource]: after } : player
      );
      if (before > after) {
        recordAttack(next, {
          attackerPlayerId: choice.ownerPlayerId,
          victimPlayerId: option.targetPlayerId,
          sourceCardId: choice.continuation.sourceId,
          kind: "resource-removal",
          resource,
          amount: before - after
        });
      }
      nextLogs = addLog(
        nextLogs,
        "system",
        `${victim?.name ?? option.targetPlayerId} から ${before - after} 個取り除きました。`
      );
      break;
    }
    case "effect-branch": {
      // A branch raised by a card action lives under effectSpec.action, not
      // .behavior, and using the action also spends it for the generation.
      const fromAction = choice.continuation.sourceKind === "card-action";
      const branches = fromAction
        ? card?.effectSpec?.action?.or?.behaviors
        : card?.effectSpec?.behavior?.or?.behaviors;
      const branch = branches?.[Number(option.id)];
      if (branch) {
        const branchEffect = normalizeBehavior(branch, {}, []);
        const applied = applyEffect(next, { ...branchEffect, cardId: card.id }, nextLogs);
        nextLogs = addLog(applied.logs, "system", `選択: ${option.label}`);
        if (fromAction && !(applied.state.usedCardActions ?? []).includes(card.id)) {
          applied.state.usedCardActions = [...(applied.state.usedCardActions ?? []), card.id];
        }
      }
      break;
    }
    case "ocean-placement":
    case "tile-placement": {
      const cell = next.board[option.targetCellKey];
      const tileType = choice.continuation.payload?.tileType ?? "ocean";
      if (cell) {
        placeTileAt(next, cell, tileType, actorId, choice.continuation.sourceId);
        nextLogs = addLog(nextLogs, "system", `${option.label} にタイルを配置しました。`);
      }
      const remaining = (choice.continuation.remaining ?? 1) - 1;
      if (remaining > 0) {
        const followUp = buildTileChoice(next, tileType, { ...choice.continuation, remaining }, legalCellsFor(next, tileType));
        if (followUp) {
          next.pendingChoice = followUp;
          next.logs = nextLogs;
          return { status: "pending", state: next, logs: nextLogs, pendingChoice: followUp };
        }
      }
      break;
    }
    default:
      break;
  }

  // The same card may still owe another decision.
  if (card) {
    const followUp = queuePendingChoices(next, card, choice.continuation);
    if (followUp) {
      next.pendingChoice = followUp;
      nextLogs = addLog(nextLogs, "system", followUp.prompt);
      next.logs = nextLogs;
      return { status: "pending", state: next, logs: nextLogs, pendingChoice: followUp };
    }
  }

  next.logs = nextLogs;
  return { status: "resolved", state: next, logs: nextLogs };
}

export function legalCellsFor(state, tileType, playerId) {
  const owner = playerId ?? state.currentPlayerId;
  return Object.values(state.board).filter(cell =>
    isCellPlacementValid(cell, tileType, state.board, owner)
  );
}

export function placeTileAt(state, cell, tileType, ownerId, cardId) {
  state.board = { ...state.board };
  state.board[`${cell.q},${cell.r}`] = {
    ...cell,
    tileType,
    placedBy: tileType === "ocean" ? null : ownerId
  };
  // Flooding hits the owner of a tile beside the ocean it just laid, so the
  // attack needs to know which square that was.
  state.lastPlacedCellKey = `${cell.q},${cell.r}`;

  const player = getPlayer(state, ownerId);
  if (player) {
    if (cardId) {
      state.players = state.players.map(p =>
        p.id === ownerId
          ? { ...p, cardPlacements: { ...p.cardPlacements, [cardId]: `${cell.q},${cell.r}` } }
          : p
      );
    }
    grantPlacementBonus(state, cell, ownerId);

    // "各海洋タイルは、隣接するように配置された他のタイルに対し、それぞれ
    // ２Ｍ€の配置ボーナスをもたらします" — 2 MC for every ocean already
    // adjacent to the space just covered.
    const adjacentOceans = countAdjacentOceans(cell.q, cell.r, state.board);
    if (adjacentOceans > 0) {
      const bonus = adjacentOceans * OCEAN_ADJACENCY_BONUS;
      state.players = state.players.map(p =>
        p.id === ownerId ? { ...p, mc: p.mc + bonus } : p
      );
    }

    grantPlacementCorporationEffects(state, cell, tileType, ownerId);
    grantCityPlacementCardEffects(state, tileType);
  }

  // TR follows the parameter actually moving. At the cap the track is clamped,
  // so the tile still gets placed but no terraforming rating is awarded.
  if (tileType === "ocean") {
    const before = state.oceans;
    state.oceans = Math.min(MAX_OCEANS, state.oceans + 1);
    if (state.oceans > before) bumpTr(state, ownerId, 1);
  }
  if (tileType === "forest") {
    const before = state.oxygen;
    state.oxygen = Math.min(MAX_OXYGEN, state.oxygen + 1);
    if (state.oxygen > before) bumpTr(state, ownerId, 1);
  }
  return state;
}

// Corporation effects that fire on a tile being laid, wherever the tile came
// from. They lived in the UI, so a city built through a card or by the bot paid
// Tharsis nothing, and the standard project paid it only when clicked.
function grantPlacementCorporationEffects(state, cell, tileType, ownerId) {
  const owner = getPlayer(state, ownerId);
  const ownerCorp = CORPORATIONS.find(item => item.id === owner?.corporationId);

  if (ownerCorp?.effects?.miningBonus && (cell.bonusType === "steel" || cell.bonusType === "titanium")) {
    state.players = state.players.map(player =>
      player.id === ownerId ? { ...player, steelProd: (player.steelProd ?? 0) + 1 } : player
    );
  }

  if (tileType !== "city") return;

  // "都市が置かれるたびMC生産量+1" reads every city, not only one's own; the
  // extra 3 MC is the part that asks whose it is.
  for (const player of state.players) {
    const corporation = CORPORATIONS.find(item => item.id === player.corporationId);
    const perCity = corporation?.effects?.cityProduction ?? 0;
    const ownBonus = player.id === ownerId ? corporation?.effects?.ownCityBonus ?? 0 : 0;
    if (perCity === 0 && ownBonus === 0) continue;
    state.players = state.players.map(entry =>
      entry.id === player.id
        ? { ...entry, mcProd: (entry.mcProd ?? 0) + perCity, mc: entry.mc + ownBonus }
        : entry
    );
  }
}

// Solar phase step 2 (Venus Next rules): "The first player [...] now acts as the
// WG, and chooses a non-maxed global parameter and increases that track one step,
// or places an ocean tile. All bonuses go to the WG, and therefore no TR or other
// bonuses are given to the first player."
//
// The parameter is picked for the first player rather than prompted for: the
// choice belongs to a human, but the phase runs inside triggerProduction, which
// has no way to stop and ask. Venus is preferred because it is the track the WG
// exists to help with, then the others in board order. The ocean option is not
// offered here because placing one needs a board target, which needs a prompt.
export function applyWorldGovernmentTerraforming(state, logs) {
  const options = [
    { key: "venus", label: "金星", value: state.venus, max: MAX_VENUS, step: 2 },
    { key: "temperature", label: "気温", value: state.temperature, max: MAX_TEMPERATURE, step: 2 },
    { key: "oxygen", label: "酸素", value: state.oxygen, max: MAX_OXYGEN, step: 1 }
  ];
  const target = options.find(option => option.value < option.max);
  if (!target) return logs;

  // No bumpTr here: the terraforming is the World Government's, not the player's.
  state[target.key] = Math.min(target.max, target.value + target.step);
  return addLog(
    logs,
    "system",
    `世界政府のテラフォーミング: ${target.label}を1段階上昇させました（TRは得られません）。`
  );
}

function bumpTr(state, playerId, amount) {
  state.players = state.players.map(player =>
    player.id === playerId ? { ...player, tr: player.tr + amount } : player
  );
}

// Placement bonuses printed on the space go to whoever covers it.
function grantPlacementBonus(state, cell, ownerId) {
  const grants = cell.bonusType === "multi" && Array.isArray(cell.bonus)
    ? cell.bonus
    : cell.bonusType && cell.bonusType !== "none"
      ? [{ type: cell.bonusType, amount: cell.bonusAmount }]
      : [];

  for (const grant of grants) {
    if (grant.type === "card") {
      const drawn = drawFromDeck(state, grant.amount);
      state.players = state.players.map(player =>
        player.id === ownerId ? { ...player, hand: [...player.hand, ...drawn] } : player
      );
      continue;
    }
    const field = grant.type === "plant" ? "plants" : grant.type;
    state.players = state.players.map(player =>
      player.id === ownerId && field in player
        ? { ...player, [field]: player[field] + grant.amount }
        : player
    );
  }
}

function drawFromDeck(state, count) {
  let deck = [...state.deck];
  let discard = [...state.discardPile];
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = shuffle(discard);
      discard = [];
    }
    const [id, ...rest] = deck;
    deck = rest;
    if (id) drawn.push(id);
  }
  state.deck = deck;
  state.discardPile = discard;
  return drawn;
}

function applyPreludeFreePlay(state, effect, logs) {
  const nextState = cloneGameState(state);
  const card = nextState.hand
    .map(id => ALL_CARDS.find(item => item.id === id))
    .find(item => item && nextState.mc >= Math.max(0, item.cost - (effect.freePlayDiscount ?? 0)));
  if (!card) return { state: nextState, logs: addLog(logs, "system", "Prelude効果: 手札にプレイ可能なカードがありません。") };
  const payment = Math.max(0, card.cost - (effect.freePlayDiscount ?? 0));
  nextState.mc -= payment;
  nextState.hand = nextState.hand.filter(id => id !== card.id);
  if (card.type === "event") {
    nextState.playedEvents = [...(nextState.playedEvents ?? []), card.id];
  } else {
    nextState.playedProjects.push(card.id);
  }
  let nextLogs = addLog(logs, "system", `Prelude効果で【${card.name}】をプレイしました（支払MC ${payment}）。`);
  const effectResult = applyCardEffect(nextState, card, nextLogs);
  const triggerResult = applyCorporationTriggers(effectResult.state, card, effectResult.logs);
  return { state: triggerResult.state, logs: triggerResult.logs };
}

export function getCardActionStatus(state, card) {
  if (getCurrentPlayer(state)?.passed) {
    return { playable: false, reason: "パス済みのため、この世代は行動できません。" };
  }
  const action = getCardEffect(card).action;
  if (!action) return { playable: false, reason: "このカードには実行可能なアクションがありません。" };
  // "これら各アクションのあるカードは、各世代につき１回ずつしか使用できません"
  if ((getCurrentPlayer(state)?.usedCardActions ?? []).includes(card.id)) {
    return { playable: false, reason: "このカードのアクションは、この世代ではすでに使用済みです。" };
  }

  // A card offering "remove N resources for X, or add one" is usable whenever
  // any branch is, so it must not be judged by the collapsed first branch —
  // that made every such card unusable until it already held the resources it
  // could only gain by using it.
  const branches = card.effectSpec?.action?.or?.behaviors;
  if (Array.isArray(branches) && branches.length > 0) {
    const held = getCurrentPlayer(state)?.cardResources?.[card.id] ?? 0;
    const usable = branches.some(behavior => {
      const need = behavior.spend?.resourcesHere;
      return !need || held >= need;
    });
    return usable
      ? { playable: true, reason: "" }
      : { playable: false, reason: "このカードの資源が不足しています。" };
  }
  if (action.energyCost && state.energy < action.energyCost) {
    return { playable: false, reason: "エネルギーが不足しています。" };
  }
  const steelCover = action.steelCost ? Math.min(state.steel, Math.floor((action.mcCost ?? 0) / 2)) : 0;
  const mcCost = Math.max(0, (action.mcCost ?? 0) - steelCover * 2);
  if (state.mc < mcCost) return { playable: false, reason: "MCが不足しています。" };
  if (action.tile === "ocean" && state.oceans >= 9) return { playable: false, reason: "海洋タイルが上限に達しています。" };
  if (action.revealTag && state.deck.length === 0 && state.discardPile.length === 0) {
    return { playable: false, reason: "公開できるカードがありません。" };
  }
  if (action.buildCathedral && getEligibleCathedralCells(state).length === 0) {
    return { playable: false, reason: "大聖堂を建設できる都市がありません。" };
  }
  if (action.unsupported?.length) return { playable: false, reason: "このカードの選択式アクションは準備中です。" };
  for (const [resource, amount] of Object.entries(action.payment ?? {})) {
    if (resource === "cardResources") continue;
    if (resource in state && state[resource] < amount) return { playable: false, reason: `${resource}が不足しています。` };
  }
  if (action.payment?.cardResources && (state.cardResources[card.id] ?? 0) < action.payment.cardResources) {
    return { playable: false, reason: "このカードの資源が不足しています。" };
  }
  return { playable: true, reason: "" };
}

export function applyCardAction(state, card, logs, branchIndex) {
  const status = getCardActionStatus(state, card);
  if (!status.playable) return { state, logs, playable: false };
  const nextState = cloneGameState(state);

  // "Remove N resources for X, or add one" is a choice the player makes every
  // turn. Normalising it collapsed the branch to the first entry, so the card
  // always spent resources and could never accumulate them.
  const rawOr = card.effectSpec?.action?.or;
  const branches = Array.isArray(rawOr?.behaviors) ? rawOr.behaviors : null;
  let action = getCardEffect(card).action;
  if (branches) {
    const affordable = branches
      .map((behavior, index) => ({ behavior, index }))
      .filter(({ behavior }) => {
        const need = behavior.spend?.resourcesHere;
        return !need || (state.cardResources?.[card.id] ?? 0) >= need;
      });
    if (affordable.length === 0) return { state, logs, playable: false };
    const chosen =
      branchIndex !== undefined
        ? affordable.find(entry => entry.index === Number(branchIndex))
        : affordable.length === 1
          ? affordable[0]
          : null;
    if (!chosen) {
      // Choosing which half of the action to take is part of taking it, so
      // answering spends the turn. Marked false, the action was free: Vermin
      // could add an animal every turn without ever using an action.
      const choice = buildBranchChoice(nextState, branches, {
        sourceKind: "card-action",
        sourceId: card.id,
        consumedAction: true,
        paid: false
      });
      nextState.pendingChoice = choice;
      return { state: nextState, logs, playable: true, awaitingChoice: true };
    }
    action = normalizeBehavior(chosen.behavior, {}, []);
  }
  // Mark the card spent for this generation before anything else can fail; the
  // rulebook's player marker stays until the production phase clears it.
  nextState.usedCardActions = [...(nextState.usedCardActions ?? []), card.id];
  if (action.energyCost) nextState.energy -= action.energyCost;
  let steelCover = 0;
  if (action.steelCost) {
    steelCover = Math.min(nextState.steel, Math.floor((action.mcCost ?? 0) / 2));
    nextState.steel -= steelCover;
  }
  if (action.mcCost) nextState.mc -= Math.max(0, action.mcCost - steelCover * 2);

  let nextLogs = addLog(logs, "player", `カードアクションを実行しました: 【${card.name}】`);
  if (action.revealTag) {
    let deck = [...nextState.deck];
    let discard = [...nextState.discardPile];
    if (deck.length === 0 && discard.length > 0) {
      deck = shuffle(discard);
      discard = [];
    }
    const [revealed, ...rest] = deck;
    nextState.deck = rest;
    if (revealed) {
      const revealedCard = ALL_CARDS.find(item => item.id === revealed);
      if (revealedCard?.tags.includes(action.revealTag)) {
        nextState.cardResources[card.id] = (nextState.cardResources[card.id] ?? 0) + 1;
        nextLogs = addLog(nextLogs, "system", `公開カード【${revealedCard.name}】に${action.revealTag}タグがあり、科学資源を1個置きました。`);
      } else {
        nextLogs = addLog(nextLogs, "system", `公開カード【${revealedCard?.name ?? revealed}】を捨て札にしました。`);
      }
      discard.push(revealed);
    }
    nextState.discardPile = discard;
  }

  // "このカードに資源を1つ置く" resolves against whichever card the action came
  // from, so the id has to travel with the effect; without it applyEffect
  // silently drops the resource and the card never scores.
  const effect = { cardId: card.id, ...action };
  delete effect.energyCost;
  delete effect.mcCost;
  delete effect.steelCost;
  delete effect.revealTag;
  delete effect.resource;
  delete effect.buildCathedral;

  // Where the cathedral goes is the player's choice; the cost has already been
  // paid above, so answering only places the marker.
  if (action.buildCathedral) {
    const cells = getEligibleCathedralCells(nextState);
    if (cells.length === 1) {
      placeCathedral(nextState, nextState.currentPlayerId, cells[0]);
      const cell = nextState.board[cells[0]];
      nextLogs = addLog(
        nextLogs,
        "system",
        `(${cell?.q}, ${cell?.r}) の都市に大聖堂を建設しました。`
      );
      return { state: nextState, logs: nextLogs, playable: true };
    }
    const choice = buildCathedralChoice(nextState, cells, {
      sourceKind: "card-action",
      sourceId: card.id,
      consumedAction: true,
      paid: true
    });
    nextState.pendingChoice = choice;
    nextState.logs = nextLogs;
    return { state: nextState, logs: nextLogs, playable: true, awaitingChoice: true };
  }

  const result = applyEffect(nextState, effect, nextLogs);
  nextLogs = addLog(result.logs, "system", `アクション効果: ${card.effectText}`);
  return { state: result.state, logs: nextLogs, playable: true };
}

export function applyCorporationTriggers(state, card, logs) {
  const nextState = cloneGameState(state);
  let nextLogs = logs;
  if (card.tags.includes("Science") && nextState.playedProjects.some(id => id === "p-mars-university")) {
    if (nextState.hand.length > 0 && nextState.deck.length > 0) {
      // The card reads "捨ててよい": the player chooses which card goes, and may
      // decline. Discarding hand[0] for them threw away cards they meant to keep.
      const choice = buildDiscardChoice(nextState, nextState.hand, {
        sourceKind: "card",
        sourceId: "p-mars-university",
        stage: "mars-university",
        prompt: "Mars University: 手札1枚を捨てて1枚引けます。捨てるカードを選んでください。",
        optional: true,
        consumedAction: false
      }, ALL_CARDS);
      if (choice) {
        nextState.pendingChoice = choice;
        nextLogs = addLog(nextLogs, "system", "Mars University: 手札1枚を捨てて1枚引けます。");
      }
    } else {
      nextLogs = addLog(nextLogs, "system", "Mars University: 科学タグ効果を使用できますが、交換できる手札または山札がありません。");
    }
  }
  const corporation = getCorporation(nextState);
  if (!corporation) return { state: nextState, logs: nextLogs };
  if (corporation.effects.eventBonus && card.type === "event") {
    nextState.mc += corporation.effects.eventBonus;
    nextLogs = addLog(nextLogs, "system", `企業効果: MC +${corporation.effects.eventBonus}`);
  }
  if (corporation.effects.expensivePaymentBonus && card.cost >= 20) {
    nextState.mc += corporation.effects.expensivePaymentBonus;
    nextLogs = addLog(nextLogs, "system", `CrediCor: MC +${corporation.effects.expensivePaymentBonus}`);
  }
  if (corporation.effects.vpBonus && hasPositiveVpIcon(card)) {
    nextState.mc += corporation.effects.vpBonus;
    nextLogs = addLog(nextLogs, "system", `Vitor: MC +${corporation.effects.vpBonus}`);
  }
  if (corporation.effects.jovianProduction && card.tags.includes("Jovian")) {
    nextState.mcProd += corporation.effects.jovianProduction;
    nextLogs = addLog(nextLogs, "system", "Saturn Systems: MC生産量 +1");
  }
  if (corporation.effects.earthDraw && card.tags.includes("Earth")) {
    drawCards(nextState, corporation.effects.earthDraw);
    nextLogs = addLog(nextLogs, "system", "Point Luna: Earthタグ効果でカードを1枚引きました。");
  }
  return { state: nextState, logs: nextLogs };
}

// Mirrors GameSetup.setupNeutralPlayer: for each of two neutral cities, discard a
// card and use its cost to pick the nth available land space (scanning from the top
// for the first city, from the bottom for the second), skipping spaces that already
// neighbour a city, then place a greenery on an adjacent free space.
function placeNeutralTiles(board, deck) {
  let remainingDeck = [...deck];

  const drawCost = () => {
    const [drawn, ...rest] = remainingDeck;
    remainingDeck = rest;
    const card = drawn ? ALL_CARDS.find(c => c.id === drawn) : undefined;
    return card?.cost ?? 0;
  };

  const isFree = cell => cell && cell.tileType === "empty" && !cell.isOceanOnly && !cell.reservedFor;

  const placeCityAndForest = direction => {
    const cost = drawCost();
    const distance = Math.max(cost - 1, 0);

    const ordered = Object.values(board)
      .filter(isFree)
      .sort((a, b) => (a.r - b.r) || (a.q - b.q));
    if (direction === "bottom") ordered.reverse();

    const candidates = ordered.filter(cell => {
      const adjacent = getAdjacentCells(cell.q, cell.r)
        .map(pos => board[`${pos.q},${pos.r}`])
        .filter(Boolean);
      return (
        adjacent.every(neighbour => neighbour.tileType !== "city") &&
        adjacent.some(isFree)
      );
    });
    if (candidates.length === 0) return;

    const citySpace = candidates[distance % candidates.length];
    citySpace.tileType = "city";
    citySpace.placedBy = "neutral";

    const adjacentFree = getAdjacentCells(citySpace.q, citySpace.r)
      .map(pos => board[`${pos.q},${pos.r}`])
      .filter(isFree);
    if (adjacentFree.length === 0) return;

    const greeneryIndex = Math.max(drawCost() - 1, 0);
    const greenerySpace = adjacentFree[greeneryIndex % adjacentFree.length];
    greenerySpace.tileType = "forest";
    greenerySpace.placedBy = "neutral";
  };

  placeCityAndForest("top");
  placeCityAndForest("bottom");
  return remainingDeck;
}

// A deterministic, unshuffled starting state. The server and the client both
// render this, so hydration sees identical markup; the client then deals a real
// game. It must not call shuffle() or place neutral tiles.
export function getPlaceholderState() {
  const board = {};
  INITIAL_CELLS.forEach(cell => {
    board[`${cell.q},${cell.r}`] = { ...cell, tileType: "empty", placedBy: null };
  });

  return withLegacyPlayerAccessors({
    rulesVersion: 5,
    mode: "solo",
    generation: 1,
    phase: "setup",
    players: [createPlayer("player", DEFAULT_PLAYER_NAMES[0])],
    turnOrder: ["player"],
    currentPlayerId: "player",
    firstPlayerId: "player",
    temperature: -30,
    oxygen: 0,
    venus: 0,
    oceans: 0,
    board,
    deck: [],
    discardPile: [],
    claimedMilestones: [],
    fundedAwards: [],
    scoreModifiers: [],
    boardMarkers: [],
    generationAttackLedger: [],
    pendingChoice: null,
    resolvedChoices: {},
    turmoil: null,
    colonies: null,
    logs: [],
    isGameOver: false,
    gameResult: null,
    onboarded: false
  });

  // The opening ten cards are drafted too when the option is on.
  if (draftEnabled) {
    const hands = Object.fromEntries(
      state.players.map(player => [player.id, player.researchCards ?? []])
    );
    state.draft = createDraft(state.turnOrder, hands, 1);
    state.players = state.players.map(player => ({ ...player, researchCards: [] }));
  }

  return state;
}

// Only the expansions the player actually enabled belong in the pools. Without
// this every game shuffled all 428 projects together, so more than half the deck
// was content the player had switched off.
const ALWAYS_ON_EXPANSIONS = ["base"];

export function enabledExpansions(options = {}) {
  const on = new Set(ALWAYS_ON_EXPANSIONS);
  if (options.prelude) {
    on.add("prelude");
    on.add("prelude2");
  }
  if (options.venus) on.add("venus");
  if (options.colonies) on.add("colonies");
  if (options.turmoil) on.add("turmoil");
  if (options.promo) on.add("promo");
  return on;
}

function poolFor(cards, allowed) {
  return cards.filter(card => allowed.has(card.expansion ?? "base"));
}

export function getInitialState(options = {}) {
  const playerCount = Math.max(1, Math.min(5, options.playerCount ?? 1));
  const mode = options.mode ?? (playerCount > 1 ? "hotseat" : "solo");
  const botDifficulty = options.botDifficulty ?? null;
  // Drafting only makes sense with more than one player at the table.
  const draftEnabled = Boolean(options.draft) && playerCount > 1;
  const names = options.playerNames ?? [];
  const boardId = BOARDS[options.board] ? options.board : "tharsis";
  const board = {};
  getBoardCells(boardId).forEach(cell => {
    board[`${cell.q},${cell.r}`] = {
      ...cell,
      tileType: "empty",
      placedBy: null
    };
  });

  const allowed = enabledExpansions(options);
  const allCardIds = poolFor(ALL_CARDS, allowed).map(c => c.id);
  let shuffledDeck = shuffle(allCardIds);

  // Official solo rules seed the board with two neutral cities, each with an
  // adjacent neutral greenery. The reference implementation discards a card per
  // tile and counts that many available land spaces from the top, then the bottom.
  if (mode === "solo") {
    shuffledDeck = placeNeutralTiles(board, shuffledDeck);
  }
  const corporationPool = shuffle(poolFor(CORPORATIONS, allowed).map(corporation => corporation.id));
  // Preludes are their own expansion: no prelude, no prelude options dealt.
  const preludePool = options.prelude
    ? shuffle(poolFor(PRELUDES, allowed).map(prelude => prelude.id))
    : [];

  const players = [];
  for (let i = 0; i < playerCount; i++) {
    // "player" keeps the solo id stable so existing board ownership and saves line up.
    const id = i === 0 ? "player" : `player${i + 1}`;
    const researchCards = shuffledDeck.slice(0, 10);
    shuffledDeck = shuffledDeck.slice(10);
    players.push(
      // `??` would accept an empty string, leaving a nameless player.
      createPlayer(id, String(names[i] ?? "").trim() || DEFAULT_PLAYER_NAMES[i], {
        // The solo variant opens at 14 TR instead of 20.
        ...(mode === "solo" ? { tr: SOLO_STARTING_TR, generationStartTr: SOLO_STARTING_TR } : {}),
        researchCards,
        corporationOptions: corporationPool.slice(i * 2, i * 2 + 2),
        preludeOptions: options.prelude ? preludePool.slice(i * 4, i * 4 + 4) : []
      })
    );
  }

  const turnOrder = players.map(player => player.id);
  // Setup places neutral delegates from the two events it draws, so the starting
  // dominant party depends on the shuffle. Tests pass globalEventOrder to pin it.
  const turmoil = options.turmoil
    ? createTurmoilState(
        turnOrder,
        options.globalEventOrder ?? shuffle(GLOBAL_EVENTS.map(event => event.id)),
        findGlobalEvent
      )
    : null;
  const colonies = options.colonies
    ? createColoniesState(turnOrder, shuffle(COLONY_TILES.map(tile => tile.id)))
    : null;
  const introText =
    mode === "solo"
      ? "公式ソロルール準拠ミッション開始。目標: 14世代以内に全グローバルパラメータの最大化。"
      : `${playerCount}人対戦を開始しました。全グローバルパラメータの達成でゲーム終了です。`;

  const state = withLegacyPlayerAccessors({
    rulesVersion: 5,
    mode,
    botDifficulty,
    boardId,
    draftEnabled,
    draft: null,
    generation: 1,
    phase: "setup", // setup, research, action, production, final_greenery, game_over
    players,
    turnOrder,
    currentPlayerId: turnOrder[0],
    firstPlayerId: turnOrder[0],
    temperature: -30,
    oxygen: 0,
    venus: 0,
    // The Venus track has to be visible from 0%, so the panel cannot infer the
    // expansion from a non-zero reading. Prelude is recorded for the same
    // reason: once the preludes are chosen the pool is empty, and the setup
    // panel could no longer tell whether the expansion had been on.
    venusEnabled: Boolean(options.venus),
    preludeEnabled: Boolean(options.prelude),
    promoEnabled: Boolean(options.promo),
    oceans: 0,
    board,
    deck: shuffledDeck,
    discardPile: [],
    claimedMilestones: [],
    fundedAwards: [],
    scoreModifiers: [],
    boardMarkers: [],
    generationAttackLedger: [],
    pendingChoice: null,
    resolvedChoices: {},
    turmoil,
    colonies,
    logs: [
      {
        id: "init",
        timestamp: "12:00:00",
        sender: "system",
        text: introText
      }
    ],
    isGameOver: false,
    gameResult: null,
    onboarded: false
  });

  // The opening ten cards are drafted too when the option is on.
  if (draftEnabled) {
    const hands = Object.fromEntries(
      state.players.map(player => [player.id, player.researchCards ?? []])
    );
    state.draft = createDraft(state.turnOrder, hands, 1);
    state.players = state.players.map(player => ({ ...player, researchCards: [] }));
  }

  return state;
}

// Applies a colony build/trade/colony benefit to one player.
function grantColonyBenefit(state, benefit, playerId, logs) {
  if (!benefit) return { state, logs };
  let nextLogs = logs;
  const amount = benefit.amount ?? benefit.quantity ?? 1;
  const player = getPlayer(state, playerId);
  if (!player) return { state, logs };

  switch (benefit.type) {
    case "GAIN_RESOURCES": {
      if (!benefit.resource) break;
      state.players = state.players.map(p =>
        p.id === playerId ? { ...p, [benefit.resource]: p[benefit.resource] + amount } : p
      );
      nextLogs = addLog(nextLogs, "system", `${player.name}: ${benefit.resource} +${amount}`);
      break;
    }
    case "GAIN_PRODUCTION": {
      if (!benefit.resource) break;
      const field = `${benefit.resource === "mc" ? "mc" : benefit.resource}Prod`;
      state.players = state.players.map(p =>
        p.id === playerId && field in p ? { ...p, [field]: p[field] + amount } : p
      );
      nextLogs = addLog(nextLogs, "system", `${player.name}: ${field} +${amount}`);
      break;
    }
    case "DRAW_CARDS": {
      const drawn = drawFromDeck(state, amount);
      state.players = state.players.map(p =>
        p.id === playerId ? { ...p, hand: [...p.hand, ...drawn] } : p
      );
      nextLogs = addLog(nextLogs, "system", `${player.name}: カードを${drawn.length}枚引きました。`);
      break;
    }
    case "GAIN_TR": {
      state.players = state.players.map(p =>
        p.id === playerId ? { ...p, tr: p.tr + amount } : p
      );
      nextLogs = addLog(nextLogs, "system", `${player.name}: TR +${amount}`);
      break;
    }
    case "PLACE_OCEAN_TILE": {
      const legal = legalCellsFor(state, "ocean", playerId);
      if (legal.length > 0) {
        placeTileAt(state, legal[0], "ocean", playerId);
        nextLogs = addLog(nextLogs, "system", `${player.name}: 海洋タイルを配置しました。`);
      }
      break;
    }
    default:
      // Benefits tied to card resources or other expansions are reported rather
      // than silently dropped.
      nextLogs = addLog(
        nextLogs,
        "system",
        `植民地ボーナス「${benefit.description}」は未対応のため適用されませんでした。`
      );
      break;
  }
  return { state, logs: nextLogs };
}

// Colonies rulebook: "Pay the cost: 9 M€, or 3 energy, or 3 titanium" to trade,
// and 17 M€ to build a colony. Cards such as Cryo-Sleep and Rim Freighters
// reduce the trade cost by one resource of whichever kind is paid.
export const COLONY_BUILD_COST = 17;
export const TRADE_COST = { mc: 9, energy: 3, titanium: 3 };
const TRADE_LABELS = { mc: "MC", energy: "電力", titanium: "チタン" };

function tradeOffsetFor(state, playerId) {
  const player = getPlayer(state, playerId);
  return (player?.playedProjects ?? []).reduce((sum, id) => {
    const card = ALL_CARDS.find(item => item.id === id);
    const value = card?.effectSpec?.behavior?.colonies?.tradeOffset;
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}

function tradeDiscountFor(state, playerId) {
  const player = getPlayer(state, playerId);
  return (player?.playedProjects ?? []).reduce((sum, id) => {
    const card = ALL_CARDS.find(item => item.id === id);
    const value = card?.effectSpec?.behavior?.colonies?.tradeDiscount;
    return sum + (typeof value === "number" ? value : 0);
  }, 0);
}

// The cheapest way the player can actually pay, or null when none is affordable.
export function tradePaymentOptions(state, playerId) {
  const player = getPlayer(state, playerId);
  if (!player) return [];
  const discount = tradeDiscountFor(state, playerId);
  return Object.entries(TRADE_COST)
    .map(([resource, base]) => ({ resource, cost: Math.max(0, base - discount) }))
    .filter(entry => (player[entry.resource] ?? 0) >= entry.cost);
}

export function buildColonyOn(state, tileId, logs, playerId) {
  if (!state.colonies) {
    return { state, logs: addLog(logs, "system", "Coloniesは有効ではありません。"), built: false };
  }
  const actorId = playerId ?? state.currentPlayerId;
  const builder = getPlayer(state, actorId);
  if ((builder?.mc ?? 0) < COLONY_BUILD_COST) {
    return { state, logs: addLog(logs, "system", `入植には ${COLONY_BUILD_COST} MC が必要です。`), built: false };
  }
  const result = buildColony(state.colonies, tileId, actorId);
  if (!result.built) {
    return { state, logs: addLog(logs, "system", result.reason), built: false };
  }

  const next = cloneGameState(state);
  next.colonies = result.colonies;
  next.players = next.players.map(player =>
    player.id === actorId ? { ...player, mc: player.mc - COLONY_BUILD_COST } : player
  );
  const tile = getColonyTile(tileId);
  let nextLogs = addLog(logs, "system", `${tile?.name ?? tileId} に入植しました。`);

  const granted = grantColonyBenefit(next, result.bonus, actorId, nextLogs);
  next.logs = granted.logs;
  return { state: next, logs: granted.logs, built: true };
}

export function tradeWith(state, tileId, logs, playerId) {
  if (!state.colonies) {
    return { state, logs: addLog(logs, "system", "Coloniesは有効ではありません。"), traded: false };
  }
  const actorId = playerId ?? state.currentPlayerId;
  const payable = tradePaymentOptions(state, actorId);
  if (payable.length === 0) {
    const discount = tradeDiscountFor(state, actorId);
    const shown = Object.entries(TRADE_COST)
      .map(([resource, base]) => `${Math.max(0, base - discount)}${TRADE_LABELS[resource]}`)
      .join(" / ");
    return { state, logs: addLog(logs, "system", `交易には ${shown} のいずれかが必要です。`), traded: false };
  }
  // Pay with whichever resource is least useful elsewhere: energy and titanium
  // before megacredits, matching how the cost is normally settled at the table.
  const priority = ["energy", "titanium", "mc"];
  const payment = payable.slice().sort((a, b) => priority.indexOf(a.resource) - priority.indexOf(b.resource))[0];

  // Cards such as Trade Envoys read the track this many steps further along.
  const offset = tradeOffsetFor(state, actorId);
  const boosted = offset > 0 ? increaseTrack(state.colonies, tileId, offset) : state.colonies;
  const result = tradeWithColony(boosted, tileId, actorId);
  if (!result.traded) {
    return { state, logs: addLog(logs, "system", result.reason), traded: false };
  }

  const next = cloneGameState(state);
  next.colonies = result.colonies;
  next.players = next.players.map(player =>
    player.id === actorId
      ? { ...player, [payment.resource]: (player[payment.resource] ?? 0) - payment.cost }
      : player
  );
  const tile = getColonyTile(tileId);
  let nextLogs = addLog(
    logs,
    "system",
    `${tile?.name ?? tileId} と交易しました（${payment.cost}${TRADE_LABELS[payment.resource]} 支払い）。`
  );

  const traded = grantColonyBenefit(next, result.tradeBenefit, actorId, nextLogs);
  nextLogs = traded.logs;

  // Every colony owner on the tile collects the colony bonus, including the trader.
  for (const owner of result.colonyOwners) {
    const granted = grantColonyBenefit(next, result.colonyBonus, owner, nextLogs);
    nextLogs = granted.logs;
  }

  next.logs = nextLogs;
  return { state: next, logs: nextLogs, traded: true };
}

// Pays a ruling party's bonus to every player, then swaps in the new ruling
// party and advances the global event queue.
export function runTurmoilPhase(state, logs) {
  if (!state.turmoil) return { state, logs };
  const next = cloneGameState(state);
  let nextLogs = logs;

  // Step 1, TR revision: the turmoil phase opens with every player losing 1 TR.
  next.players = next.players.map(player => ({ ...player, tr: Math.max(0, player.tr - 1) }));
  nextLogs = addLog(nextLogs, "system", "動乱フェーズ: 全プレイヤーが TR -1。");

  // Step 2: resolve the Current Global Event, before the government changes.
  const resolvedEvent = next.turmoil.currentEvent;
  if (resolvedEvent) {
    const event = GLOBAL_EVENTS.find(item => item.id === resolvedEvent);
    nextLogs = addLog(nextLogs, "system", `世界的イベント解決: ${event?.name ?? resolvedEvent}`);
  }

  // Step 3a: the dominant party takes power. The bonus that pays out is the new
  // ruling party's, so the government has to form before it is evaluated.
  const government = formNewGovernment(next.turmoil);
  next.turmoil = government.turmoil;

  // Step 3b: resolve the Ruling Bonus of the party that just took power.
  const incoming = getParty(government.rulingParty);
  if (incoming) {
    // The first bonus of the ruling party is the one that pays out.
    const bonus = incoming.bonuses[0];
    next.players = next.players.map(player => {
      const amount = evaluatePartyBonus(next, bonus, player);
      if (amount <= 0) return player;
      const field = bonus.resource;
      nextLogs = addLog(
        nextLogs,
        "system",
        `${incoming.name}の支持ボーナス: ${player.name} が ${field} を ${amount} 獲得。`
      );
      return { ...player, [field]: player[field] + amount };
    });

    if (bonus.kind === "lowestTr" || bonus.kind === "highestTr") {
      next.players = applyTrSwing(next.players, bonus);
    }
  }

  const result = government;
  // Step 3f: refill the lobby, then step 4, Changing Times.
  next.turmoil = refillLobby(next.turmoil, next.turnOrder);

  // The chairman gains 1 TR on taking office.
  if (result.newChairman && result.newChairman !== NEUTRAL) {
    next.players = next.players.map(player =>
      player.id === result.newChairman ? { ...player, tr: player.tr + 1 } : player
    );
    const chairman = getPlayer(next, result.newChairman);
    nextLogs = addLog(nextLogs, "system", `${chairman?.name ?? result.newChairman} が議長に就任し TR +1。`);
  } else {
    nextLogs = addLog(nextLogs, "system", "中立の代表者が議長になりました。");
  }

  const ruling = getParty(result.rulingParty);
  nextLogs = addLog(nextLogs, "system", `与党は ${ruling?.name ?? result.rulingParty} になりました。`);

  // Step 4, Changing Times: the event queue moves up now that the event that was
  // Current has been resolved.
  next.turmoil = advanceGlobalEvents(next.turmoil, findGlobalEvent).turmoil;

  next.logs = nextLogs;
  return { state: next, logs: nextLogs };
}

function evaluatePartyBonus(state, bonus, player) {
  if (!bonus) return 0;
  switch (bonus.kind) {
    case "tag": {
      const tags = Array.isArray(bonus.tag) ? bonus.tag : [bonus.tag];
      return tags.reduce((sum, tag) => sum + countPlayedTag(state, tag, player), 0);
    }
    case "ownTiles":
      return Object.values(state.board).filter(
        cell =>
          cell.placedBy === player.id &&
          cell.tileType !== "empty" &&
          (!bonus.tileType || cell.tileType === bonus.tileType)
      ).length * (bonus.each ?? 1);
    case "handSize":
      return Math.floor(player.hand.length / (bonus.per ?? 1));
    case "production":
      return player[bonus.production] ?? 0;
    default:
      return 0;
  }
}

function applyTrSwing(players, bonus) {
  const values = players.map(player => player.tr);
  const target = bonus.kind === "lowestTr" ? Math.min(...values) : Math.max(...values);
  return players.map(player =>
    player.tr === target ? { ...player, tr: Math.max(0, player.tr + bonus.amount) } : player
  );
}

// Reds make terraforming cost money; the surcharge is paid when TR rises.
export function getTrSurcharge(state, steps) {
  const policy = hasPolicy(state.turmoil, "trSurcharge");
  if (!policy) return 0;
  return policy.amount * Math.max(0, steps);
}

export function sendDelegateToParty(state, partyId, logs, playerId) {
  if (!state.turmoil) {
    return { state, logs: addLog(logs, "system", "Turmoilは有効ではありません。"), sent: false };
  }
  const actorId = playerId ?? state.currentPlayerId;
  const fromLobby = state.turmoil.lobby.includes(actorId);

  // Lobbying: free from the Lobby, 5 M€ from the Delegate Reserve (Turmoil rules).
  // The charge is checked before the delegate moves, so a player who cannot pay
  // does not lose the delegate.
  const cost = fromLobby ? 0 : DELEGATE_RESERVE_COST;
  const actor = getPlayer(state, actorId);
  if (cost > 0 && (actor?.mc ?? 0) < cost) {
    return {
      state,
      logs: addLog(logs, "system", `予備から代表者を送るには ${cost} MC が必要です。`),
      sent: false
    };
  }

  const result = sendDelegate(state.turmoil, actorId, partyId, { fromLobby });
  if (!result.sent) {
    return { state, logs: addLog(logs, "system", result.reason), sent: false };
  }

  const next = cloneGameState(state);
  next.turmoil = result.turmoil;
  if (cost > 0) {
    next.players = next.players.map(player =>
      player.id === actorId ? { ...player, mc: player.mc - cost } : player
    );
  }
  const party = getParty(partyId);
  const player = getPlayer(next, actorId);
  const paid = cost > 0 ? `${cost} MC を支払って ` : "";
  const nextLogs = addLog(
    logs,
    "system",
    `${player?.name ?? actorId} が ${paid}${party?.name ?? partyId} に代表者を送りました。`
  );
  next.logs = nextLogs;
  return { state: next, logs: nextLogs, sent: true };
}

function milestoneContext(state, player) {
  return {
    player,
    board: state.board,
    cards: ALL_CARDS,
    corporation: CORPORATIONS.find(c => c.id === player.corporationId),
    // Utopia's Pioneer milestone counts colonies, which live outside the player.
    colonyCount: state.colonies ? countColonies(state.colonies, player.id) : 0
  };
}

export function getMilestoneStatus(state, milestoneId, playerId) {
  const milestone = getMilestone(milestoneId);
  if (!milestone) return { claimable: false, reason: "不明なマイルストーンです。", score: 0, threshold: 0, description: "" };

  const player = getPlayer(state, playerId);
  if (!player) return { claimable: false, reason: "プレイヤーが見つかりません。", score: 0, threshold: 0, description: "" };

  const threshold = getMilestoneThreshold(milestone, state);
  const description = getMilestoneDescription(milestone, state);
  const score = milestone.getScore(milestoneContext(state, player));
  const claimed = (state.claimedMilestones ?? []).find(entry => entry.milestoneId === milestoneId);

  if (claimed) {
    const owner = getPlayer(state, claimed.playerId);
    return { claimable: false, reason: `${owner?.name ?? claimed.playerId}が獲得済みです。`, score, threshold, description };
  }
  if ((state.claimedMilestones ?? []).length >= MAX_MILESTONES) {
    return { claimable: false, reason: "マイルストーンは3つまでしか獲得できません。", score, threshold, description };
  }
  if (score < threshold) {
    return { claimable: false, reason: `条件を満たしていません (${score}/${threshold})。`, score, threshold, description };
  }
  if (player.mc < MILESTONE_COST) {
    return { claimable: false, reason: `${MILESTONE_COST} MC必要です。`, score, threshold, description };
  }
  return { claimable: true, reason: "", score, threshold, description };
}

export function claimMilestone(state, milestoneId, logs, playerId) {
  const targetId = playerId ?? state.currentPlayerId;
  const status = getMilestoneStatus(state, milestoneId, targetId);
  if (!status.claimable) {
    return { state, logs: addLog(logs, "system", status.reason), claimed: false };
  }

  const milestone = getMilestone(milestoneId);
  const next = cloneGameState(state);
  next.players = next.players.map(player =>
    player.id === targetId ? { ...player, mc: player.mc - MILESTONE_COST } : player
  );
  next.claimedMilestones = [...(next.claimedMilestones ?? []), { milestoneId, playerId: targetId }];

  const player = getPlayer(next, targetId);
  const nextLogs = addLog(
    logs,
    "system",
    `${player?.name ?? targetId}がマイルストーン「${milestone.name}」を獲得しました (${MILESTONE_COST} MC)。`
  );
  next.logs = nextLogs;
  return { state: next, logs: nextLogs, claimed: true };
}

export function getAwardStatus(state, awardId, playerId) {
  const award = getAward(awardId);
  if (!award) return { fundable: false, reason: "不明な表彰です。" };

  const player = getPlayer(state, playerId);
  if (!player) return { fundable: false, reason: "プレイヤーが見つかりません。" };

  const cost = getNextAwardCost(state);
  if ((state.fundedAwards ?? []).some(entry => entry.awardId === awardId)) {
    return { fundable: false, reason: "この表彰はすでに設立されています。", cost };
  }
  if ((state.fundedAwards ?? []).length >= MAX_AWARDS) {
    return { fundable: false, reason: "表彰は3つまでしか設立できません。", cost };
  }
  if (player.mc < cost) {
    return { fundable: false, reason: `${cost} MC必要です。`, cost };
  }
  return { fundable: true, reason: "", cost };
}

export function fundAward(state, awardId, logs, playerId) {
  const targetId = playerId ?? state.currentPlayerId;
  const status = getAwardStatus(state, awardId, targetId);
  if (!status.fundable) {
    return { state, logs: addLog(logs, "system", status.reason), funded: false };
  }

  const award = getAward(awardId);
  const next = cloneGameState(state);
  next.players = next.players.map(player =>
    player.id === targetId ? { ...player, mc: player.mc - status.cost } : player
  );
  next.fundedAwards = [...(next.fundedAwards ?? []), { awardId, playerId: targetId }];

  const player = getPlayer(next, targetId);
  const nextLogs = addLog(
    logs,
    "system",
    `${player?.name ?? targetId}が表彰「${award.name}」を設立しました (${status.cost} MC)。`
  );
  next.logs = nextLogs;
  return { state: next, logs: nextLogs, funded: true };
}

function findGlobalEvent(eventId) {
  return eventId ? GLOBAL_EVENTS.find(event => event.id === eventId) ?? null : null;
}

export function isGameOverCheck(temp, oxy, oce) {
  return temp >= 8 && oxy >= 14 && oce >= 9;
}

// Scoring lives in scoring.js so that a card paying someone other than its
// owner can be expressed. This keeps the single-player entry point every
// caller already uses.
function scoringOptions() {
  return {
    cards: ALL_CARDS,
    preludes: PRELUDES,
    helpers: { countAdjacentOceans, getAdjacentCells, countPlayedTag, countColonies }
  };
}

export function calculateScoreBreakdowns(state) {
  return buildScoreBreakdowns(state, scoringOptions());
}

export function computeScore(state, playerId) {
  const targetId = playerId ?? state.currentPlayerId;
  return calculateScoreBreakdowns(state)[targetId]?.total ?? 0;
}

export function getCardDiscount(card, state) {
  const corporation = getCorporation(state);
  const corporationDiscount = getCorporationDiscount(card, corporation);
  const ongoingDiscount = (state.cardDiscounts?.all ?? 0) + card.tags.reduce((sum, tag) => sum + (state.cardDiscounts?.tags?.[String(tag).toLowerCase()] ?? 0), 0);
  const totalDiscount = corporationDiscount + ongoingDiscount;
  const maxSteel = card.tags.includes("Building") ? Math.min(state.steel, Math.floor(Math.max(0, card.cost - totalDiscount) / 2)) : 0;
  const maxTitanium = card.tags.includes("Space") ? Math.min(state.titanium, Math.floor(Math.max(0, card.cost - totalDiscount) / getTitaniumValue(state))) : 0;
  return { maxSteel, maxTitanium };
}

export function getCardPaymentCost(card, state, steelUsed = 0, titaniumUsed = 0) {
  const corporation = getCorporation(state);
  const corporationDiscount = getCorporationDiscount(card, corporation);
  const ongoingDiscount = (state.cardDiscounts?.all ?? 0) + card.tags.reduce((sum, tag) => sum + (state.cardDiscounts?.tags?.[String(tag).toLowerCase()] ?? 0), 0);
  return Math.max(0, card.cost - corporationDiscount - ongoingDiscount - steelUsed * 2 - titaniumUsed * getTitaniumValue(state));
}

// Law Suit may only be aimed at someone who attacked you this generation, so
// the ledger records attacks that actually landed. Hitting yourself is not an
// attack, and neither is an attack that removed nothing.
// Vitor pays for the victory point icon printed on the card, not for what the
// card turns out to be worth at the end. A card scoring one point per animal
// prints an icon and has victoryPoints 0, so reading that number alone missed
// 34 cards. Law Suit and Vermin print negative icons and do not qualify.
export function hasPositiveVpIcon(card) {
  if (typeof card?.victoryPoints === "number" && card.victoryPoints > 0) return true;
  if (card?.victoryPointSpec) return true;
  return card?.specialVictoryKind === "st-joseph";
}

export function recordAttack(state, entry) {
  if (!entry.attackerPlayerId || !entry.victimPlayerId) return state;
  if (entry.attackerPlayerId === entry.victimPlayerId) return state;
  // Nothing was actually taken, so nobody was attacked: a declined optional
  // effect or a victim holding none of the resource leaves no grievance.
  if (entry.amount !== undefined && entry.amount <= 0) return state;
  state.generationAttackLedger = [
    ...(state.generationAttackLedger ?? []),
    { ...entry, generation: state.generation }
  ];
  return state;
}

export const VERMIN_ID = "card-promo-vermin";

// "都市が置かれるたび" -- every city, from any source and any player, feeds
// every Vermin in play. Living in placeTileAt means a city built by a card, a
// standard project, a corporation or the bot all count the same.
function grantCityPlacementCardEffects(state, tileType) {
  if (tileType !== "city") return;
  state.players = state.players.map(player =>
    player.playedProjects?.includes(VERMIN_ID)
      ? {
          ...player,
          cardResources: {
            ...player.cardResources,
            [VERMIN_ID]: (player.cardResources?.[VERMIN_ID] ?? 0) + 1
          }
        }
      : player
  );
}

export const ST_JOSEPH_ID = "card-promo-st-joseph-of-cupertino-mission";
export const CATHEDRAL_COST = 5;

// Any city may take a cathedral, whoever built it, but only one each.
export function getEligibleCathedralCells(state) {
  const taken = new Set(
    (state.boardMarkers ?? [])
      .filter(marker => marker.kind === "cathedral")
      .map(marker => marker.cellKey)
  );
  return Object.entries(state.board ?? {})
    .filter(([cellKey, cell]) => cell.tileType === "city" && !taken.has(cellKey))
    .map(([cellKey]) => cellKey);
}

// The marker is added rather than the tile replaced, so the city keeps its
// type and its owner.
export function placeCathedral(state, actorId, cellKey) {
  if (!getEligibleCathedralCells(state).includes(cellKey)) {
    return { ok: false, reason: "この都市には大聖堂を建設できません。" };
  }
  state.boardMarkers = [
    ...(state.boardMarkers ?? []),
    {
      id: `cathedral:${cellKey}`,
      kind: "cathedral",
      cellKey,
      sourceCardId: ST_JOSEPH_ID,
      sourcePlayerId: actorId
    }
  ];
  return { ok: true, state };
}

export const LAW_SUIT_ID = "card-promo-law-suit";
export const LAW_SUIT_STEAL = 3;

// Only someone who actually took something from you this generation may be
// sued. The ledger holds landed attacks, so a declined optional effect or a
// victim who held nothing leaves nobody to name.
export function lawSuitTargets(state, actorId) {
  const guilty = new Set(
    (state.generationAttackLedger ?? [])
      .filter(
        entry =>
          entry.victimPlayerId === actorId &&
          entry.attackerPlayerId !== actorId &&
          entry.generation === state.generation
      )
      .map(entry => entry.attackerPlayerId)
  );
  return (state.players ?? []).filter(player => guilty.has(player.id));
}

// Settles the suit: up to three megacredits move, the target loses a victory
// point, and the card is placed in front of them. Keyed by the choice id so a
// resent resolution cannot charge twice.
export function applyLawSuitResolution(state, actorId, targetId, choiceId) {
  const modifierId = `law-suit:${choiceId}`;
  // Resending the same resolution must not charge again.
  if ((state.scoreModifiers ?? []).some(item => item.id === modifierId)) {
    return { state, stolen: 0 };
  }

  const target = getPlayer(state, targetId);
  const stolen = Math.min(LAW_SUIT_STEAL, Math.max(0, target?.mc ?? 0));

  state.players = state.players.map(player => {
    if (player.id === targetId) {
      return {
        ...player,
        mc: player.mc - stolen,
        // The card sits with the player who was sued, not the one who sued.
        playedEvents: [...(player.playedEvents ?? []), LAW_SUIT_ID]
      };
    }
    if (player.id === actorId) return { ...player, mc: player.mc + stolen };
    return player;
  });

  state.scoreModifiers = [
    ...(state.scoreModifiers ?? []),
    {
      id: modifierId,
      kind: "card-vp",
      sourceCardId: LAW_SUIT_ID,
      sourcePlayerId: actorId,
      targetPlayerId: targetId,
      points: -1,
      label: "Law Suit"
    }
  ];

  return { state, stolen };
}

const RESOURCE_LABELS = {
  mc: "MC",
  steel: "建材",
  titanium: "チタン",
  plants: "植物",
  energy: "電力",
  heat: "熱"
};

// Tags that are still on the table: the corporation, the green and blue cards
// in front of the player, and the preludes they opened with. Red events are
// resolved and gone, so their tags are not counted -- they used to be, because
// events were kept in playedProjects. Preludes were missed for the opposite
// reason: they live in their own field and were never looked at.
export function countActiveTags(state, playerId, tag) {
  const owner = getPlayer(state, playerId) ?? state.players?.[0];
  return countTagsFor(state, tag, owner);
}

function countTagsFor(state, tag, owner) {
  const normalized = String(tag).toLowerCase();
  const has = card =>
    (card?.tags ?? []).some(cardTag => String(cardTag).toLowerCase() === normalized);

  const corporation = CORPORATIONS.find(item => item.id === owner?.corporationId);
  let count = has(corporation) ? 1 : 0;

  for (const id of owner?.playedProjects ?? []) {
    if (has(ALL_CARDS.find(item => item.id === id))) count += 1;
  }
  for (const id of owner?.selectedPreludeIds ?? []) {
    if (has(PRELUDES.find(item => item.id === id))) count += 1;
  }

  return count;
}

function countPlayedTag(state, tag, player) {
  const owner = player ?? getCurrentPlayer(state) ?? state.players?.[0];
  return countTagsFor(state, tag, owner);
}

function getGeneratedRequirementStatus(card, state, buffer) {
  for (const requirement of card.requirements ?? []) {
    const count = requirement.count ?? 1;
    if (requirement.tag && countPlayedTag(state, requirement.tag) < count) return { playable: false, reason: `${requirement.tag}タグが${count}枚以上必要です。` };
    if (requirement.temperature !== undefined) {
      const meets = requirement.max ? state.temperature <= requirement.temperature + buffer * 2 : state.temperature >= requirement.temperature - buffer * 2;
      if (!meets) return { playable: false, reason: `気温${requirement.temperature}°C条件を満たしていません。` };
    }
    if (requirement.oxygen !== undefined) {
      const meets = requirement.max ? state.oxygen <= requirement.oxygen + buffer : state.oxygen >= requirement.oxygen - buffer;
      if (!meets) return { playable: false, reason: `酸素${requirement.oxygen}%条件を満たしていません。` };
    }
    if (requirement.oceans !== undefined && state.oceans < requirement.oceans) return { playable: false, reason: `海洋が${requirement.oceans}枚以上必要です。` };
    if (requirement.venus !== undefined && (state.venus ?? 0) < requirement.venus) return { playable: false, reason: `金星率${requirement.venus}%条件を満たしていません。` };
    if (requirement.production) {
      const value = state[`${SOURCE_RESOURCE_MAP[requirement.production] ?? requirement.production}Prod`] ?? 0;
      if (value < count) return { playable: false, reason: `${requirement.production}生産量が不足しています。` };
    }
    if (requirement.greeneries !== undefined && Object.values(state.board).filter(cell => cell.tileType === "forest").length < requirement.greeneries) return { playable: false, reason: "緑地数の条件を満たしていません。" };
    if (requirement.cities !== undefined && Object.values(state.board).filter(cell => cell.tileType === "city").length < requirement.cities) return { playable: false, reason: "都市数の条件を満たしていません。" };
    if (requirement.floaters !== undefined && Object.values(state.cardResources ?? {}).reduce((sum, value) => sum + value, 0) < requirement.floaters) return { playable: false, reason: "フローター数の条件を満たしていません。" };
    if (requirement.party !== undefined) {
      if (!state.turmoil) return { playable: false, reason: "Turmoilが有効ではありません。" };
      const wanted = normalizePartyId(requirement.party);
      if (state.turmoil.rulingParty !== wanted) {
        return { playable: false, reason: `${getParty(wanted)?.name ?? wanted}が与党である必要があります。` };
      }
      continue;
    }
    if (requirement.chairman !== undefined) {
      if (!state.turmoil) return { playable: false, reason: "Turmoilが有効ではありません。" };
      if (state.turmoil.chairman !== state.currentPlayerId) {
        return { playable: false, reason: "あなたが議長である必要があります。" };
      }
      continue;
    }
    if (requirement.partyLeader !== undefined) {
      if (!state.turmoil) return { playable: false, reason: "Turmoilが有効ではありません。" };
      const isLeader = PARTIES.some(
        party => state.turmoil.parties[party.id]?.leader === state.currentPlayerId
      );
      if (!isLeader) return { playable: false, reason: "いずれかの政党の党首である必要があります。" };
      continue;
    }
    if (requirement.colonies !== undefined) {
      if (!state.colonies) return { playable: false, reason: "Coloniesが有効ではありません。" };
      const owned = countColonies(state.colonies, state.currentPlayerId);
      const needed = requirement.count ?? 1;
      if (owned < needed) {
        return { playable: false, reason: `植民地が${needed}個以上必要です。` };
      }
      continue;
    }
    if (requirement.resourceTypes || requirement.plantsRemoved) return { playable: false, reason: "拡張ボード条件はこのゲームモードでは選択できません。" };
  }
  return { playable: true, reason: "" };
}

export function getCardPlayableStatus(card, state, steelUsed = 0, titaniumUsed = 0) {
  // A pass is final for the generation: no further actions until the next one.
  if (getCurrentPlayer(state)?.passed) {
    return { playable: false, reason: "パス済みのため、この世代は行動できません。" };
  }
  const { maxSteel, maxTitanium } = getCardDiscount(card, state);
  if (steelUsed > maxSteel || titaniumUsed > maxTitanium) {
    return { playable: false, reason: "資源割引の上限を超えています。" };
  }
  // Law Suit answers an attack, so it cannot be played when nobody has made
  // one this generation.
  if (card.id === LAW_SUIT_ID && lawSuitTargets(state, state.currentPlayerId).length === 0) {
    return {
      playable: false,
      reason: "この世代に自分を攻撃したプレイヤーがいません。"
    };
  }

  const corporation = getCorporation(state);
  const costAfterDiscount = getCardPaymentCost(card, state, steelUsed, titaniumUsed);

  const heatAsMoney = corporation?.effects?.heatAsMoney ? state.heat : 0;
  if (state.mc + heatAsMoney < costAfterDiscount) {
    return { playable: false, reason: "資源（MC）が不足しています。" };
  }

  const requirements = card.requires ?? {};
  const buffer = (corporation?.effects?.requirementBuffer ?? 0) + (state.globalRequirementBuffer ?? 0);
  const generatedRequirements = getGeneratedRequirementStatus(card, state, buffer);
  if (!generatedRequirements.playable) return generatedRequirements;
  if (requirements.oceans !== undefined && state.oceans < requirements.oceans) {
    return { playable: false, reason: `海洋が${requirements.oceans}枚以上必要です。` };
  }
  if (requirements.plants !== undefined && state.plants < requirements.plants) {
    return { playable: false, reason: `植物が${requirements.plants}個以上必要です。` };
  }
  if (requirements.temperature !== undefined && state.temperature < requirements.temperature - buffer * 2) {
    return { playable: false, reason: `気温${requirements.temperature}°C以上が必要です。` };
  }
  if (requirements.oxygenMax !== undefined && state.oxygen > requirements.oxygenMax + buffer) {
    return { playable: false, reason: `酸素濃度${requirements.oxygenMax}%以下が必要です。` };
  }
  if (requirements.tags) {
    for (const [tag, count] of Object.entries(requirements.tags)) {
      if (countPlayedTag(state, tag) < count) return { playable: false, reason: `${tag}タグが${count}枚以上必要です。` };
    }
  }
  const effect = getCardEffect(card);
  if (effect.plants < 0 && state.plants < Math.abs(effect.plants)) {
    return { playable: false, reason: "植物が不足しています。" };
  }
  for (const [resource, amount] of Object.entries(effect.payment ?? {})) {
    if (resource !== "cardResources" && resource in state && state[resource] < amount) return { playable: false, reason: `${resource}が不足しています。` };
    if (resource === "cardResources" && (state.cardResources[card.id] ?? 0) < amount) return { playable: false, reason: "カード資源が不足しています。" };
  }

  return { playable: true, reason: "" };
}

export function getAdjacentCells(q, r) {
  return [
    { q: q + 1, r: r },
    { q: q - 1, r: r },
    { q: q, r: r + 1 },
    { q: q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 }
  ];
}

export function hasAdjacentCity(q, r, board) {
  const adj = getAdjacentCells(q, r);
  return adj.some(pos => {
    const key = `${pos.q},${pos.r}`;
    return board[key] && board[key].tileType === "city";
  });
}

export function getPlayerOwnedTiles(board, playerId = "player") {
  return Object.values(board).filter(c => c.placedBy === playerId);
}

export function getLegalOwnedAdjacentSpaces(board, playerId = "player") {
  const playerTiles = getPlayerOwnedTiles(board, playerId);
  const adjacentKeys = new Set();
  playerTiles.forEach(tile => {
    const adj = getAdjacentCells(tile.q, tile.r);
    adj.forEach(pos => {
      const key = `${pos.q},${pos.r}`;
      const cell = board[key];
      if (cell && cell.tileType === "empty" && !cell.isOceanOnly) {
        adjacentKeys.add(key);
      }
    });
  });
  return Array.from(adjacentKeys);
}

export function isCellPlacementValid(cell, type, board, playerId = "player") {
  if (cell.tileType !== "empty") return false;
  // Noctis City's space is reserved for that card alone.
  if (cell.reservedFor && cell.reservedFor !== type) return false;

  if (type === "ocean") {
    // There are exactly nine ocean tiles. The counter saturated at 9 while the
    // board kept accepting them, so a tenth could be placed.
    const placed = Object.values(board).filter(space => space.tileType === "ocean").length;
    if (placed >= MAX_OCEANS) return false;
    return cell.isOceanOnly;
  } else if (type === "city") {
    if (cell.isOceanOnly) return false;
    return !hasAdjacentCity(cell.q, cell.r, board);
  } else if (type === "special") {
    // Special tiles ignore the greenery adjacency rule; they only need dry land.
    return !cell.isOceanOnly;
  } else {
    // forest (greenery)
    if (cell.isOceanOnly) return false;
    
    // Greenery adjacency rule: must be adjacent to player's owned tiles if valid adjacent space exists
    const legalAdjacentSpaces = getLegalOwnedAdjacentSpaces(board, playerId);
    if (legalAdjacentSpaces.length > 0) {
      const key = `${cell.q},${cell.r}`;
      return legalAdjacentSpaces.includes(key);
    }
    return true;
  }
}

export function countAdjacentOceans(q, r, board) {
  const adj = getAdjacentCells(q, r);
  let count = 0;
  adj.forEach(pos => {
    const key = `${pos.q},${pos.r}`;
    if (board[key] && board[key].tileType === "ocean") {
      count++;
    }
  });
  return count;
}

// Venus Next: crossing 8% draws a card, crossing 16% raises TR. Both fire once.
export function applyVenusThresholds(state, oldVenus, logs) {
  let nextState = state;
  let currentLogs = logs;
  const newVenus = nextState.venus ?? 0;

  if (oldVenus < 8 && newVenus >= 8) {
    drawCards(nextState, 1);
    currentLogs = addLog(currentLogs, "system", "金星 8% 達成ボーナス: カードを1枚ドロー");
  }
  if (oldVenus < 16 && newVenus >= 16) {
    nextState.tr += 1;
    currentLogs = addLog(currentLogs, "system", "金星 16% 達成ボーナス: TR +1");
  }
  return { state: nextState, logs: currentLogs };
}

export function checkParameterThresholds(oldTemp, newTemp, oldOxy, newOxy, state, logs) {
  let nextState = cloneGameState(state);
  let currentLogs = logs;
  let effectiveTemp = newTemp;

  // 1. Oxygen at 8% gives Temperature +1 step (+2°C)
  if (oldOxy < 8 && newOxy >= 8) {
    if (nextState.temperature < 8) {
      const tempBefore = nextState.temperature;
      nextState.temperature = Math.min(8, nextState.temperature + 2);
      effectiveTemp = Math.max(effectiveTemp, nextState.temperature);
      if (tempBefore < 8) {
        nextState.tr += 1;
        currentLogs = addLog(currentLogs, "system", "酸素濃度 8% 達成ボーナス: 気温 +2°C, TR +1");
      } else {
        currentLogs = addLog(currentLogs, "system", "酸素濃度 8% 達成ボーナス: 気温 +2°C (気温上限のためTR増加なし)");
      }
    }
  }

  // 2. Temperature -24°C gives heat production +1
  if (oldTemp < -24 && effectiveTemp >= -24) {
    nextState.heatProd += 1;
    currentLogs = addLog(currentLogs, "system", "気温 -24°C 達成ボーナス: 熱生産量 +1");
  }

  // 3. Temperature -20°C gives heat production +1
  if (oldTemp < -20 && effectiveTemp >= -20) {
    nextState.heatProd += 1;
    currentLogs = addLog(currentLogs, "system", "気温 -20°C 達成ボーナス: 熱生産量 +1");
  }

  // 4. Temperature 0°C places one ocean tile (if an ocean remains)
  if (oldTemp < 0 && effectiveTemp >= 0) {
    if (nextState.oceans < 9) {
      nextState.pendingOceans = (nextState.pendingOceans || 0) + 1;
      currentLogs = addLog(currentLogs, "system", "気温 0°C 達成ボーナス: 海洋タイル1枚の無料配置を獲得");
    }
  }

  return { state: nextState, logs: currentLogs };
}

// Finds the next player who has not passed, starting after `fromId`. Returns
// null when everyone has passed and the generation is over.
function nextActivePlayer(state, fromId) {
  const order = state.turnOrder;
  if (order.length === 0) return null;
  const start = Math.max(0, order.indexOf(fromId));

  for (let step = 1; step <= order.length; step++) {
    const candidate = order[(start + step) % order.length];
    const player = getPlayer(state, candidate);
    if (player && !player.passed) return candidate;
  }
  return null;
}

export function allPlayersPassed(state) {
  return state.players.every(player => player.passed);
}

// Ends the current turn without passing. A turn may be one action or two, and
// stopping after one is a real choice: "１回だけのアクションにも利点はあります".
export function endTurn(state, logAcc, playerId) {
  const actorId = playerId ?? state.currentPlayerId;
  const next = cloneGameState(state);
  next.actionsRemaining = 2;
  next.turnStep = "start";

  let logs = logAcc;
  const following = nextActivePlayer(next, actorId);
  if (following && following !== actorId) {
    next.currentPlayerId = following;
    const upcoming = getPlayer(next, following);
    logs = addLog(logs, "system", `${upcoming?.name ?? following} の手番です。`);
  } else {
    logs = addLog(logs, "system", "ターンが終了しました。新しいターンを開始します。");
  }

  next.logs = logs;
  return { state: next, logs };
}

export function handleActionSpend(state, logAcc) {
  const nextState = cloneGameState(state);
  const actorId = nextState.currentPlayerId;
  nextState.actionsRemaining -= 1;
  nextState.logs = logAcc;

  if (nextState.actionsRemaining > 0) {
    nextState.turnStep = "one_action_taken";
    return nextState;
  }

  // A turn is two actions, then the seat passes on. Solo has nobody to pass to,
  // so the same player simply starts a new turn.
  nextState.actionsRemaining = 2;
  nextState.turnStep = "start";

  const next = nextActivePlayer(nextState, actorId);
  if (next && next !== actorId) {
    nextState.currentPlayerId = next;
    const player = getPlayer(nextState, next);
    nextState.logs = addLog(nextState.logs, "system", `${player?.name ?? next} の手番です。`);
  } else {
    nextState.logs = addLog(nextState.logs, "system", "ターンが終了しました。新しいターンを開始します。");
  }

  return nextState;
}

// A player passing leaves the action phase for this generation only. Production
// runs once everyone has passed, not when the first player does.
export function passPlayer(state, logAcc, playerId) {
  const actorId = playerId ?? state.currentPlayerId;
  const actor = getPlayer(state, actorId);

  // The rulebook defines a pass as taking no action that turn: "１つもアクショ
  // ンを実行しなければ（パス）". Having already acted, the turn simply ends and
  // the seat moves on; the player is still in the generation.
  if (actor && actor.actionsRemaining < 2) {
    const ended = endTurn(state, logAcc, actorId);
    return { state: ended.state, logs: ended.logs, generationEnded: false, endedTurnOnly: true };
  }

  const next = cloneGameState(state);
  next.players = next.players.map(player =>
    player.id === actorId ? { ...player, passed: true } : player
  );

  const player = getPlayer(next, actorId);
  let logs = addLog(logAcc, "player", `${player?.name ?? actorId} はパスしました。`);

  if (allPlayersPassed(next)) {
    logs = addLog(logs, "system", "全員がパスしました。生産フェーズに移行します。");
    next.logs = logs;
    const produced = triggerProduction(next, logs);
    return { state: produced, logs: produced.logs, generationEnded: true };
  }

  const following = nextActivePlayer(next, actorId);
  if (following) {
    next.currentPlayerId = following;
    next.actionsRemaining = 2;
    next.turnStep = "start";
    const upcoming = getPlayer(next, following);
    logs = addLog(logs, "system", `${upcoming?.name ?? following} の手番です。`);
  }

  next.logs = logs;
  return { state: next, logs, generationEnded: false };
}

export function triggerProduction(state, logAcc) {
  const nextState = cloneGameState(state);
  let localLog = logAcc;

  // Production resolves for every player, not just the active one.
  nextState.players = nextState.players.map(player => {
    const energyToHeat = player.energy;
    const mcProdClamped = Math.max(-5, player.mcProd);
    // "各世代でのＭ€収入がマイナスになることがありません" — TR is the base, so a
    // generation's income floors at zero however negative MC production is.
    const addedMc = Math.max(0, mcProdClamped + player.tr);
    const produced = {
      ...player,
      mc: player.mc + addedMc,
      steel: player.steel + player.steelProd,
      titanium: player.titanium + player.titaniumProd,
      plants: player.plants + player.plantsProd,
      energy: player.energyProd,
      heat: player.heat + energyToHeat + player.heatProd,
      passed: false,
      // "このプレイヤー・マーカーは、産出フェイズに除去します"
      usedCardActions: []
    };
    const who = nextState.players.length > 1 ? `${player.name}: ` : "生産フェーズ完了: ";
    localLog = addLog(
      localLog,
      "system",
      `${who}MC +${addedMc} (TR ${player.tr} + 生産 ${mcProdClamped}), 建材 +${player.steelProd}, チタン +${player.titaniumProd}, 植物 +${player.plantsProd}, エネルギー +${player.energyProd}, 熱 +${player.heatProd}。エネルギー ${energyToHeat} を熱に変換。`
    );
    return produced;
  });

  nextState.logs = localLog;

  // Prelude shortens the solo game (プレリュード ルール説明書 第5刷 p.3).
  const soloGenerationLimit = nextState.preludeEnabled ? 12 : 14;
  const generationLimitReached =
    nextState.mode === "solo" && nextState.generation >= soloGenerationLimit;
  if (generationLimitReached || isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans)) {
    nextState.phase = "final_greenery";
    const reason = generationLimitReached ? `第${soloGenerationLimit}世代の生産` : "全パラメータ達成";
    nextState.logs = addLog(localLog, "system", `${reason}が終了しました。最後の植物緑化変換フェーズを行います。`);
  } else {
    // Solar phase step 2: World Government Terraforming. The first player raises
    // a non-maxed global parameter, but the bonuses go to the WG, so no TR is
    // awarded (Venus Next rules). Runs before the generation turns over, since
    // the first player marker has not moved yet.
    if (nextState.venusEnabled) {
      localLog = applyWorldGovernmentTerraforming(nextState, localLog);
    }

    nextState.generation += 1;
    nextState.phase = "research";
    // Law Suit may only answer an attack from the generation it is played in.
    nextState.generationAttackLedger = [];

    let deck = [...nextState.deck];
    let discard = [...nextState.discardPile];

    // Each player draws their own research hand.
    const drawCount = nextState.draftEnabled ? DRAFT_HAND_SIZE : 4;
    nextState.players = nextState.players.map(player => {
      const researchCards = [];
      for (let i = 0; i < drawCount; i++) {
        if (deck.length === 0) {
          if (discard.length > 0) {
            deck = shuffle(discard);
            discard = [];
            localLog = addLog(localLog, "system", "山札が空になったため、捨て札をシャッフルして再構成しました。");
          } else {
            break;
          }
        }
        const [drawn, ...rest] = deck;
        if (drawn) {
          researchCards.push(drawn);
          deck = rest;
        }
      }
      return {
        ...player,
        researchCards,
        generationStartTr: player.tr,
        actionsRemaining: 2,
        turnStep: "start",
        passed: false
      };
    });

    nextState.deck = deck;
    nextState.discardPile = discard;

    // With drafting on, those cards are passed around before anyone may buy.
    if (nextState.draftEnabled && nextState.turnOrder.length > 1) {
      const hands = Object.fromEntries(
        nextState.players.map(player => [player.id, player.researchCards ?? []])
      );
      nextState.draft = createDraft(nextState.turnOrder, hands, nextState.generation);
      nextState.players = nextState.players.map(player => ({ ...player, researchCards: [] }));
    }

    // Solar phase step 3: fleets return and every colony track climbs a step.
    if (nextState.colonies) {
      nextState.colonies = advanceColonyProduction(nextState.colonies);
    }

    // Turmoil resolves between production and the next research phase.
    if (nextState.turmoil) {
      const turmoilResult = runTurmoilPhase(nextState, localLog);
      Object.assign(nextState, turmoilResult.state);
      localLog = turmoilResult.logs;
    }

    // First player marker passes clockwise each generation.
    if (nextState.turnOrder.length > 1) {
      const firstIndex = nextState.turnOrder.indexOf(nextState.firstPlayerId);
      const nextFirst = nextState.turnOrder[(firstIndex + 1) % nextState.turnOrder.length];
      nextState.firstPlayerId = nextFirst;
      nextState.currentPlayerId = nextFirst;
    } else {
      nextState.currentPlayerId = nextState.turnOrder[0];
    }
    nextState.logs = addLog(localLog, "system", `第 ${nextState.generation} 世代の研究フェーズが開始されました。カードを4枚引きました。購入するカードを選択してください。`);
  }

  return nextState;
}
