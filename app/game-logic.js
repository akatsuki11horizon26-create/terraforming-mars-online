import { CARD_EXPANSION_DEPENDENCIES, CORPORATIONS, GLOBAL_EVENTS, OFFICIAL_PROJECTS, PRELUDES, STANDARD_ACTIONS, STANDARD_PROJECTS } from "./official-content.js";
import {
  DEFAULT_PLAYER_NAMES,
  SOLO_STARTING_TR,
  SOLO_TR_SWING_THRESHOLD,
  SOLO_COLONIES_MC_PENALTY,
  createPlayer,
  getCurrentPlayer,
  getPlayer,
  updatePlayer,
  withLegacyPlayerAccessors,
  clonePendingChoice
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
import { awardsForBoard } from "./board-milestones.js";

export { AWARDS, MILESTONES, getNextAwardCost, getMilestoneDescription, getMilestoneThreshold, scoreAward };
import {
  buildBranchChoice,
  buildProductionAttackChoice,
  buildResourceAttackChoice,
  buildResourceStealChoice,
  SOLO_NEUTRAL_TARGET_ID,
  buildLawSuitChoice,
  buildCathedralChoice,
  buildColonyChoice,
  buildResourceChoice,
  buildResourceRemovalChoice,
  buildDiscardChoice,
  buildStandardResourceChoice,
  buildAmountChoice,
  buildCorrosiveRainChoice,
  buildEventDiscardChoice,
  buildFloaterPlacementChoice,
  buildStandardResourcePickChoice,
  buildOceanRemovalChoice,
  buildTileChoice,
  buildWorldGovernmentChoice,
  collectResourceTargets,
  findOption,
  isChoiceOwnedBy
} from "./pending-choice.js";
import { getCardResourceType } from "./card-resource-types.js";
import {
  getGlobalEventEffect,
  missingGlobalEventEffects,
  playableGlobalEvents
} from "./global-events.js";
export { missingGlobalEventEffects, playableGlobalEvents };

export { STANDARD_RESOURCES } from "./pending-choice.js";
export { getCardResourceType };
import {
  DELEGATE_RESERVE_COST,
  NEUTRAL,
  PARTY_REQUIREMENT_DELEGATES,
  PARTIES,
  advanceGlobalEvents,
  cloneTurmoil,
  countDelegates,
  formNewGovernment,
  createTurmoilState,
  getInfluence,
  getInfluenceBreakdown,
  replaceDelegateInParty,
  replaceNeutralChairman,
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
  getInfluenceBreakdown,
  getParty,
  getRulingPolicy,
  totalDelegates
};
import {
  COLONY_TILES,
  activateResourceColonies,
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
  selectSoloColonies,
  getColonyTile,
  trade as tradeWithColony
} from "./colonies.js";

export { COLONY_TILES, availableFleets, canBuildColony, canTrade, countColonies, getColonyTile, selectSoloColonies };
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
// Two cards pay their owner whenever a city is placed, whoever placed it.
const IMMIGRANT_CITY_ID = "card-base-immigrant-city";
const INSULATION_ID = "card-base-insulation";
const POWER_INFRASTRUCTURE_ID = "card-base-power-infrastructure";
const FLOYD_CONTINUUM_ID = "card-promo-floyd-continuum";
const ENERGY_MARKET_ID = "card-promo-energy-market";
const HI_TECH_LAB_ID = "card-promo-hi-tech-lab";
const SPONSORED_ACADEMIES_ID = "card-venus-sponsored-academies";
const RECRUITMENT_ID = "card-turmoil-recruitment";
const VOTE_OF_NO_CONFIDENCE_ID = "card-turmoil-vote-of-no-confidence";
const ROVER_CONSTRUCTION_ID = "card-base-rover-construction";

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

// mulberry32: one multiply-xorshift round over a 32-bit counter. Small, and
// good enough for dealing cards -- the requirement here is reproducibility, not
// cryptographic quality.
function randomFromSeed(seed) {
  let a = (seed >>> 0) + 0x6d2b79f5;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

export function createSeed() {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

// A shuffle is reproducible when it is a pure function of the game's seed and
// how many shuffles have already happened, so the draw counter lives in state
// and advances with each call. Passing no state falls back to a fresh seed,
// which keeps the standalone callers (tests, tooling) working.
export function shuffle(array, state) {
  const copy = [...array];
  const seed = state?.rngSeed;
  const draws = seed === undefined ? undefined : (state.rngDraws ?? 0);
  if (draws !== undefined) state.rngDraws = draws + 1;
  let counter = seed === undefined ? createSeed() : Math.imul(seed ^ (draws + 1), 0x9e3779b1) >>> 0;
  for (let i = copy.length - 1; i > 0; i--) {
    counter = (counter + 1) >>> 0;
    const j = Math.floor(randomFromSeed(counter) * (i + 1));
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

// Advanced Alloys, Rego Plastics and Mercurian Alloys each raise what a
// resource is worth when it pays for a card. The bonus lives on the played
// card, so it is summed over the player's tableau rather than read off the
// corporation. The reference implementation misspells the titanium key as
// "titanumValue" and the generated catalogue carries the typo, so both
// spellings count.
function playedResourceValueBonus(state, keys) {
  const player = getPlayer(state, state.currentPlayerId) ?? state.players?.[0];
  const played = player?.playedProjects ?? [];
  let bonus = 0;
  for (const cardId of played) {
    const behavior = ALL_CARDS.find(card => card.id === cardId)?.effectSpec?.behavior;
    if (!behavior) continue;
    for (const key of keys) bonus += behavior[key] ?? 0;
  }
  return bonus;
}

// A ruling policy can reprice a resource too. Only the party's first policy is
// ever in force (turmoil.js sets rulingPolicyId to policies[0] when a party
// takes power), so of the six passives written down, Reds' trSurcharge and
// Unity's titaniumValue are the two a game can actually reach. Mars First's
// steelValue sits on policy 3 and stays unreachable until the policy can be
// chosen; reading it here costs nothing and is right if it ever becomes so.
function policyResourceBonus(state, passiveName) {
  return hasPolicy(state.turmoil, passiveName)?.amount ?? 0;
}

function getSteelValue(state) {
  return 2
    + playedResourceValueBonus(state, ["steelValue"])
    + policyResourceBonus(state, "steelValue");
}

function getTitaniumValue(state) {
  return (getCorporation(state)?.effects?.titaniumValue ?? 3)
    + playedResourceValueBonus(state, ["titaniumValue", "titanumValue"])
    + policyResourceBonus(state, "titaniumValue");
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
      copiedProductions: (player.copiedProductions ?? []).map(entry => ({
        sourceCardId: entry.sourceCardId,
        production: { ...(entry.production ?? {}) }
      })),
      usedCardActions: [...(player.usedCardActions ?? [])],
      usedPolicyActions: [...(player.usedPolicyActions ?? [])]
    })),
    turnOrder: [...(state.turnOrder ?? [])],
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    board: Object.fromEntries(Object.entries(state.board).map(([key, cell]) => [key, { ...cell }])),
    logs: [...state.logs],
    claimedMilestones: [...(state.claimedMilestones ?? [])],
    offBoardCities: (state.offBoardCities ?? []).map(entry => ({ ...entry })),
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
    pendingChoice: clonePendingChoice(state.pendingChoice),
    pendingChoiceQueue: (state.pendingChoiceQueue ?? []).map(clonePendingChoice)
  };
  return withLegacyPlayerAccessors(clone);
}

function addResource(state, resource, amount) {
  if (resource in state) state[resource] += amount;
}

const SOIL_ENRICHMENT_ID = "card-promo-soil-enrichment";
const LOCAL_HEAT_TRAPPING_ID = "card-base-local-heat-trapping";
const STORMCRAFT_INCORPORATED_ID = "card-colonies-stormcraft-incorporated";
const ROBOTIC_WORKFORCE_ID = "card-base-robotic-workforce";

// The whole production box, not just its flat part. Medical Lab's box is
// "1 M€ per 2 building tags" and Heat Trappers' is "-2 heat production
// anywhere, +1 energy": reading only `production` skipped the first card
// entirely and copied the second without its decrease.
function roboticWorkforceProductionBox(state, card, ownerId) {
  const effect = getCardEffect(card);
  const box = { ...(effect.production ?? {}) };
  for (const gain of effect.countedProduction ?? []) {
    const counted = gain.others
      ? evaluateCountedGain(state, { ...gain, allPlayers: true }, ownerId)
        - evaluateCountedGain(state, { ...gain, allPlayers: false }, ownerId)
      : evaluateCountedGain(state, gain, ownerId);
    if (counted > 0) box[gain.resource] = (box[gain.resource] ?? 0) + counted;
  }
  return box;
}

function roboticWorkforceBuildingCards(state) {
  const player = getCurrentPlayer(state);
  const ownerId = player?.id ?? state.currentPlayerId;
  // Preludes and corporations carry the Building tag too, and a production box
  // on one of them is as copyable as one on a project.
  const owned = [
    ...(player?.playedProjects ?? []),
    ...(player?.selectedPreludeIds ?? []),
    ...(player?.corporationId ? [player.corporationId] : [])
  ];
  return owned
    .map(id => ALL_CARDS.find(card => card.id === id))
    .filter(card => card?.tags.includes("Building"))
    .filter(card => {
      const box = roboticWorkforceProductionBox(state, card, ownerId);
      const decrease = getCardEffect(card).productionDecrease;
      return Object.keys(box).length > 0 || Boolean(decrease?.resource);
    })
    // Copying a production box is subject to the same rule as printing one: a
    // decrease you cannot pay is not a legal copy. Without this, duplicating
    // 地下都市 at one energy production drove the track below zero, and the
    // production phase assigns energy from it directly.
    .filter(card => canAffordProductionDecrease(state, roboticWorkforceProductionBox(state, card, ownerId)));
}

function canAffordProductionDecrease(state, production) {
  for (const [resource, amount] of Object.entries(production ?? {})) {
    if (typeof amount !== "number" || amount >= 0 || resource === "mc") continue;
    const key = PRODUCTION_KEYS[resource];
    if (key && (state[key] ?? 0) < Math.abs(amount)) return false;
  }
  return true;
}

function buildRoboticWorkforceChoice(state, context) {
  const options = roboticWorkforceBuildingCards(state).map(card => ({
    id: card.id,
    cardId: card.id,
    label: card.name
  }));
  if (options.length === 0) return null;
  return {
    id: `building-production:${context.sourceId}:${state.currentPlayerId}`,
    kind: "building-production",
    ownerPlayerId: state.currentPlayerId,
    prompt: "生産ボックスをコピーする建物カードを選んでください。",
    optional: false,
    options,
    continuation: {
      sourceKind: context.sourceKind,
      sourceId: context.sourceId,
      stage: "building-production",
      consumedAction: context.consumedAction ?? true,
      paid: context.paid ?? true
    }
  };
}

const PRODUCTION_KEYS = {
  mc: "mcProd",
  steel: "steelProd",
  titanium: "titaniumProd",
  plants: "plantsProd",
  energy: "energyProd",
  heat: "heatProd",
};

export function applyProduction(state, production) {
  Object.entries(production ?? {}).forEach(([resource, amount]) => {
    const key = PRODUCTION_KEYS[resource];
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
  // "1 M€ per 2 Building tags", "1 M€ per 3 floaters" -- `per` divides the count
  // and rounds down. Ignoring it paid Medical Lab per tag instead of per pair.
  const per = amount.per ?? 1;

  if (amount.colonies) return { kind: "colonies", each, per, allPlayers: amount.all === true };
  if (amount.tag) {
    // Tags count only the player's own unless `all` is set (reference Counter).
    const tags = Array.isArray(amount.tag) ? amount.tag : [amount.tag];
    return { kind: "tag", tags, each, per, allPlayers: amount.all === true };
  }
  // Board counts include every player's tiles unless `all` is explicitly false.
  if (amount.cities) return { kind: "cities", each, per, allPlayers: amount.all !== false };
  if (amount.greeneries) return { kind: "greeneries", each, per, allPlayers: amount.all !== false };
  // Floaters are always counted on the active player's own cards.
  if (amount.floaters) return { kind: "floaters", each, per, allPlayers: false };
  if (amount.eventsPlayed) return { kind: "eventsPlayed", each, per, allPlayers: amount.all === true };
  if (amount.noTags) return { kind: "noTags", each, per, allPlayers: false };
  if (amount.distinctTags) return { kind: "distinctTags", each, per, allPlayers: false };
  if (amount.coloniesInPlay) return { kind: "coloniesInPlay", each, per, allPlayers: true };
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
    case "eventsPlayed":
      for (const player of players) units += (player.playedEvents ?? []).length;
      break;
    case "noTags":
      // "1 M€ production per card with no tags, including this one" -- the card
      // being played is not in playedProjects yet, so it is counted separately.
      for (const player of players) {
        for (const cardId of player.playedProjects ?? []) {
          const card = ALL_CARDS.find(item => item.id === cardId);
          if (card && (card.tags ?? []).length === 0) units += 1;
        }
      }
      break;
    case "distinctTags": {
      // Distinct tag kinds across everything in play. Wild counts as its own in
      // the reference's 'default' mode, and events are excluded from the board.
      const kinds = new Set();
      for (const player of players) {
        for (const cardId of [...(player.playedProjects ?? []), ...(player.selectedPreludeIds ?? [])]) {
          const card = ALL_CARDS.find(item => item.id === cardId);
          for (const tag of card?.tags ?? []) kinds.add(String(tag).toLowerCase());
        }
      }
      units = kinds.size;
      break;
    }
    case "coloniesInPlay":
      // Every colony on the board, whoever built it.
      if (!state.colonies) return 0;
      for (const player of state.players) units += countColonies(state.colonies, player.id);
      break;
    default:
      return 0;
  }
  return Math.floor(units / (gain.per ?? 1)) * (gain.each ?? 1);
}

function normalizeBehavior(raw, effect = {}, unsupported = []) {
  if (!raw || typeof raw !== "object") return effect;
  if (raw.production) {
    effect.production = { ...(effect.production ?? {}) };
    Object.entries(raw.production).forEach(([source, amount]) => {
      const resource = SOURCE_RESOURCE_MAP[source];
      if (!resource) return;
      if (typeof amount === "number") {
        effect.production[resource] = (effect.production[resource] ?? 0) + amount;
        return;
      }
      // "Increase your M€ production 1 step for each Earth tag you have" and
      // its siblings. The stock side already resolved counted amounts against
      // live state; production silently dropped anything that was not a plain
      // number, which is why Cartel, Power Grid, Energy Saving and a dozen
      // others were played for their cost and did nothing.
      if (amount && typeof amount === "object") {
        const counted = normalizeCountedAmount(amount);
        if (counted) {
          effect.countedProduction = [
            ...(effect.countedProduction ?? []),
            { resource, ...counted, others: amount.others === true }
          ];
          return;
        }
      }
      unsupported.push("dynamic-production");
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
  if (raw.drawCardByTagCount) {
    effect.drawByTagCount = raw.drawCardByTagCount;
  }
  if (typeof raw.removeAnyPlants === "number") effect.removePlants = (effect.removePlants ?? 0) + raw.removeAnyPlants;
  // `on` says where the card overrides the ordinary placement rule for its tile
  // type -- Artificial Lake puts an ocean on land, Mangrove puts a greenery on
  // an ocean space, Research Outpost needs an isolated one. Only raw.tile
  // carried it through, so those four cards placed like any other tile.
  if (raw.ocean !== undefined) {
    effect.tile = "ocean";
    effect.tileCount = raw.ocean.count ?? 1;
    if (raw.ocean.on) effect.tilePlacementRule = raw.ocean.on;
  }
  if (raw.city !== undefined) {
    effect.tile = "city";
    effect.tileCount = raw.city.count ?? 1;
    if (raw.city.on) effect.tilePlacementRule = raw.city.on;
    // A named space is one of the reserved slots off the map -- Ganymede,
    // Phobos, the Venus cities, Stanford Torus. They are cities you own, but
    // they are not ON Mars, so they must not take a board space, ask the player
    // where to put them, or count for anything that reads the board.
    if (raw.city.space !== undefined) effect.offBoardCity = String(raw.city.space);
  }
  if (raw.greenery !== undefined) {
    effect.tile = "forest";
    effect.tileCount = raw.greenery.count ?? 1;
    if (raw.greenery.on) effect.tilePlacementRule = raw.greenery.on;
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
      // Both mining tiles pay production for the bonus on the space they take.
      if (mapped.specialName === "Mining Area" || mapped.specialName === "Mining Rights") {
        effect.mineralProduction = true;
      }
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
    // "Spend 8 M€ ... STEEL MAY BE USED as if you were playing a building
    // card." The flags sit beside the amount and were dropped, so four cards
    // that let you pay a megacredit cost in steel or titanium had no way to.
    if (raw.spend.canUseSteel === true) effect.payment.canUseSteel = true;
    if (raw.spend.canUseTitanium === true) effect.payment.canUseTitanium = true;
  }
  if (raw.decreaseAnyProduction?.type && typeof raw.decreaseAnyProduction.count === "number") {
    effect.productionDecrease = {
      resource: SOURCE_RESOURCE_MAP[raw.decreaseAnyProduction.type] ?? raw.decreaseAnyProduction.type,
      count: raw.decreaseAnyProduction.count,
      // "Decrease any energy production 1 step and increase your own 1 step."
      // The taking half was modelled and the gaining half was not, so four
      // cards cost their money and only hurt someone.
      stealing: raw.decreaseAnyProduction.stealing === true
    };
  }
  if (raw.standardResource) unsupported.push("standard-resource-choice");
  // Handled by queuePendingChoices, which asks which card receives them and
  // places them directly when only one card can. Not a gap.
  if (raw.addResourcesToAnyCard) effect.addResourcesToAnyCard = raw.addResourcesToAnyCard;
  // Ants eat a microbe off any card, Predators an animal. The adding direction
  // existed and the removing one did not, so those actions had nothing to spend.
  if (raw.removeResourcesFromAnyCard) effect.removeResourcesFromAnyCard = raw.removeResourcesFromAnyCard;
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
  // An empty object is truthy, so a curated card written with `{}` as its
  // effect short-circuited here and its effectSpec was never read -- the card
  // looked implemented and did nothing. Only a non-empty hand-written effect
  // takes precedence.
  if (card.effect && Object.keys(card.effect).length > 0) {
    return { ...card.effect, cardId: card.id };
  }
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

// `tag` keeps the common "draw a card with this tag" case terse; Celestic needs
// to filter on the resource a card holds instead, which no tag expresses.
export function drawCards(state, count, tag, accepts) {
  let deck = [...state.deck];
  let discard = [...state.discardPile];
  const drawn = [];
  let inspected = 0;
  const available = deck.length + discard.length;
  while (drawn.length < count && inspected < available) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      deck = shuffle(discard, state);
      discard = [];
    }
    const [cardId, ...rest] = deck;
    deck = rest;
    inspected += 1;
    const card = ALL_CARDS.find(item => item.id === cardId);
    const wanted = accepts ? accepts(card, cardId) : !tag || card?.tags.includes(tag);
    if (wanted) drawn.push(cardId);
    else discard.push(cardId);
  }
  state.deck = deck;
  state.discardPile = discard;
  state.hand.push(...drawn);
  return drawn;
}

function firstLegalSpace(state, type, placementRule) {
  return Object.values(state.board)
    .sort((a, b) => `${a.q},${a.r}`.localeCompare(`${b.q},${b.r}`))
    .find(cell => isCellPlacementValid(cell, type, state.board, undefined, placementRule, state.boardId));
}

// A card whose tile has only one legal space is laid without asking. That path
// has to respect the card's placement rule too, or the rule holds only while
// the player is being offered a choice.
function placeTile(state, type, count = 1, cardId, placementRule) {
  // Tiles belong to whoever is acting, not to a hardcoded "player": in a hotseat
  // game that credited every tile, and the TR for it, to the first seat.
  const ownerId = state.currentPlayerId ?? state.players?.[0]?.id ?? "player";
  let placed = 0;
  for (let i = 0; i < count; i++) {
    const cell = firstLegalSpace(state, type, placementRule);
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

  if (effect.countedProduction?.length) {
    for (const gain of effect.countedProduction) {
      // Toll Station counts what the OTHER players hold, not the owner's own.
      const counted = gain.others
        ? evaluateCountedGain(nextState, { ...gain, allPlayers: true }, nextState.currentPlayerId)
          - evaluateCountedGain(nextState, { ...gain, allPlayers: false }, nextState.currentPlayerId)
        : evaluateCountedGain(nextState, gain, nextState.currentPlayerId);
      if (counted > 0) {
        const field = `${gain.resource}Prod`;
        const owner = nextState.currentPlayerId;
        nextState.players = nextState.players.map(player =>
          player.id === owner ? { ...player, [field]: (player[field] ?? 0) + counted } : player
        );
        nextLogs = addLog(nextLogs, "system", `条件により ${gain.resource} 生産量が ${counted} 上がりました。`);
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
  if (effect.tr) increaseTerraformRating(nextState, nextState.currentPlayerId, effect.tr, "card");
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
    increaseTerraformRating(nextState, nextState.currentPlayerId, Math.max(0, (nextState.venus - beforeVenus) / 2), "card");
    // Aphrodite and anything else watching the scale reacts to a card's step
    // just as it does to the World Government's.
    grantParameterRaisedCardEffects(nextState, "venus", (nextState.venus - beforeVenus) / 2);
    const venusBonus = applyVenusThresholds(nextState, beforeVenus, nextLogs);
    nextState = venusBonus.state;
    nextLogs = venusBonus.logs;
  }
  // Special Design relaxes the requirements of the NEXT card only, while
  // Adaptation Technology is a permanent effect. Both wrote to the same
  // running total and nothing ever cleared it, so a single Special Design
  // loosened every global requirement for the rest of the game.
  if (effect.globalParameterRequirementBonus?.steps) {
    if (effect.globalParameterRequirementBonus.nextCardOnly) {
      nextState.oneShotRequirementBuffer = Math.max(
        nextState.oneShotRequirementBuffer ?? 0,
        effect.globalParameterRequirementBonus.steps
      );
    } else {
      nextState.globalRequirementBuffer =
        (nextState.globalRequirementBuffer ?? 0) + effect.globalParameterRequirementBonus.steps;
    }
  }
  // Four shapes reach this field: a flat discount, a tagged one, a list of
  // tagged ones (Space Lanes), and per:"card" (Mass Converter, which is still
  // just an ongoing per-card discount). Only the first two were handled, so the
  // other two cards granted nothing at all.
  for (const discount of [effect.cardDiscount].flat().filter(Boolean)) {
    if (!discount.amount) continue;
    if (discount.nextCardOnly) {
      // Indentured Workers and Conscription discount the NEXT card only, the
      // same shape as Special Design. Folding them into the running total would
      // discount every card for the rest of the game.
      nextState.oneShotCardDiscount = Math.max(
        nextState.oneShotCardDiscount ?? 0,
        discount.amount
      );
    } else if (discount.tag) {
      const tag = String(discount.tag).toLowerCase();
      nextState.cardDiscounts.tags[tag] = (nextState.cardDiscounts.tags[tag] ?? 0) + discount.amount;
    } else {
      nextState.cardDiscounts.all = (nextState.cardDiscounts.all ?? 0) + discount.amount;
    }
  }

  if (effect.payment) {
    // A megacredit cost the card lets you cover with steel or titanium: spend
    // as much of the named resource as the cost can absorb, then the rest in
    // megacredits. No change is given, so a part-unit is still a whole unit.
    let mcOwed = Number(effect.payment.mc ?? 0);
    if (mcOwed > 0 && (effect.payment.canUseSteel || effect.payment.canUseTitanium)) {
      const source = effect.payment.canUseTitanium ? "titanium" : "steel";
      const worth = source === "titanium" ? getTitaniumValue(nextState) : getSteelValue(nextState);
      const spent = Math.min(nextState[source] ?? 0, Math.ceil(mcOwed / worth));
      nextState[source] = (nextState[source] ?? 0) - spent;
      mcOwed = Math.max(0, mcOwed - spent * worth);
    }

    Object.entries(effect.payment).forEach(([resource, amount]) => {
      // The two flags describe HOW to pay, not something to pay with.
      if (resource === "canUseSteel" || resource === "canUseTitanium") return;
      if (resource === "cardResources") {
        if (effect.cardId) nextState.cardResources[effect.cardId] = Math.max(0, (nextState.cardResources[effect.cardId] ?? 0) - Number(amount));
      } else if (resource === "mc") {
        nextState.mc = Math.max(0, nextState.mc - mcOwed);
      } else if (resource === "heat" && effect.cardId === LOCAL_HEAT_TRAPPING_ID) {
        const heatSpent = Math.min(nextState.heat, Number(amount));
        const floaterSpent = Math.ceil((Number(amount) - heatSpent) / 2);
        nextState.heat -= heatSpent;
        nextState.cardResources[STORMCRAFT_INCORPORATED_ID] = Math.max(
          0,
          (nextState.cardResources[STORMCRAFT_INCORPORATED_ID] ?? 0) - floaterSpent
        );
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
    increaseTerraformRating(nextState, nextState.currentPlayerId, Math.max(0, (nextState.temperature - before) / 2), "card");
  }
  if (effect.oxygenSteps) {
    const before = nextState.oxygen;
    nextState.oxygen = Math.min(14, nextState.oxygen + effect.oxygenSteps);
    increaseTerraformRating(nextState, nextState.currentPlayerId, Math.max(0, nextState.oxygen - before), "card");
  }
  if (effect.offBoardCity) {
    // Kept off state.board on purpose: everything that counts cities, checks
    // adjacency or looks for a free space reads the board, and none of that
    // should see Ganymede or Stratopolis. Ownership is recorded so the card can
    // still be scored and counted as a city the player owns.
    const owner = nextState.currentPlayerId;
    nextState.offBoardCities = [
      ...(nextState.offBoardCities ?? []).filter(entry => entry.space !== effect.offBoardCity),
      { space: effect.offBoardCity, ownerId: owner, cardId: effect.cardId }
    ];
    nextLogs = addLog(nextLogs, "system", "盤外の都市を建設しました。");
  } else if (!skipTile && effect.tile) {
    const count = effect.tileCount ?? 1;
    const placed = placeTile(nextState, effect.tile, count, effect.cardId, effect.tilePlacementRule);
    nextLogs = addLog(nextLogs, "system", `${effect.tile}タイルを${placed}枚配置しました。`);
  }
  const drawCount = effect.drawByTagCount
    ? (countTagsFor(nextState, effect.drawByTagCount.tag, getPlayer(nextState, nextState.currentPlayerId)) >= effect.drawByTagCount.atLeast
      ? effect.drawByTagCount.highCount
      : effect.drawByTagCount.lowCount)
    : effect.draw;
  if (drawCount) {
    const drawn = drawCards(nextState, drawCount, effect.drawTag);
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
  // The generated catalogue spells megacredits out; the curated entries and the
  // engine use "mc". Four corporations were written with the long name and lost
  // their whole starting production because nothing read that key.
  const startingProduction = corporation.starting.production ?? {};
  ["mc", "steel", "titanium", "plants", "energy", "heat"].forEach(resource => {
    const printed = resource === "mc" ? startingProduction.megacredits : undefined;
    nextState[`${resource}Prod`] = startingProduction[resource] ?? printed ?? 0;
  });
  // Colonies' solo variant opens at -2 M€ production, which balances the extra
  // income the colonies themselves provide. Production is written here, so the
  // penalty has to be applied after the corporation's own starting values.
  if (nextState.mode === "solo" && nextState.colonies) {
    nextState.mcProd = (nextState.mcProd ?? 0) - SOLO_COLONIES_MC_PENALTY;
    nextState.logs = addLog(
      nextState.logs,
      "system",
      `ソロ+Coloniesのため MC生産量 -${SOLO_COLONIES_MC_PENALTY}`
    );
  }

  // The solo setup writes its two neutral cities straight onto the board before
  // anyone has a corporation, so the per-city trigger never saw them. Tharsis
  // Republic is owed that production the moment it is chosen.
  const perCity = corporation.effects?.cityProduction ?? 0;
  if (perCity > 0) {
    const standingCities = Object.values(nextState.board ?? {}).filter(
      cell => cell.tileType === "city"
    ).length;
    if (standingCities > 0) {
      nextState.mcProd = (nextState.mcProd ?? 0) + perCity * standingCities;
      nextState.logs = addLog(
        nextState.logs,
        "system",
        `${corporation.name}: 盤上の都市${standingCities}枚ぶん MC生産量 +${perCity * standingCities}`
      );
    }
  }

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

  // Corporation initial actions used to run only from finishPreludeSetup, so
  // Tharsis Republic's free city and Inventrix's draw simply never happened in a
  // game without the Prelude expansion. Everyone has a corporation and nobody
  // owes a prelude by this point, which is the same moment in both variants.
  const owedInitialAction = next.turnOrder.find(id => {
    const player = getPlayer(next, id);
    return player && player.corporationId && !player.initialActionDone;
  });
  if (owedInitialAction) {
    const seatBefore = next.currentPlayerId;
    next.currentPlayerId = owedInitialAction;
    const performed = applyCorporationInitialAction(next, next.logs);
    const advanced = performed.state;
    advanced.logs = performed.logs;
    if (advanced.pendingChoice) {
      advanced.setupContinuation = { stage: "prelude-setup", seatBefore };
      return advanced;
    }
    advanced.currentPlayerId = seatBefore;
    return advanceSetupTurn(advanced);
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

const ECCENTRIC_SPONSOR_ID = "prelude-eccentric-sponsor";
const ECCENTRIC_SPONSOR_DISCOUNT = 25;

function eccentricSponsorOptions(state) {
  const player = getCurrentPlayer(state);
  return (player?.hand ?? [])
    .map(id => ALL_CARDS.find(card => card.id === id))
    .filter(Boolean)
    .filter(card => {
      const discounted = { ...card, cost: Math.max(0, card.cost - ECCENTRIC_SPONSOR_DISCOUNT) };
      return getCardPlayableStatus(discounted, state).playable;
    })
    .map(card => ({ id: card.id, cardId: card.id, label: card.name }));
}

// Preludes resolve before the corporation's first action, so this player's is
// owed now. advanceSetupTurn performs whatever is still owed for everyone else,
// and the flag it reads is what stops this one running twice.
function finishPreludeSetup(state, logs, seatBefore) {
  const initialAction = applyCorporationInitialAction(state, logs);
  const nextState = initialAction.state;
  nextState.logs = initialAction.logs;
  // Valley Trust asks which prelude to play for free. Advancing the seat now
  // would hand the turn on with that question still unanswered.
  if (nextState.pendingChoice) {
    nextState.setupContinuation = { stage: "prelude-setup", seatBefore };
    return nextState;
  }
  nextState.currentPlayerId = seatBefore;
  return advanceSetupTurn(nextState);
}

function resolvePreludeEffects(state, selected, startIndex, logs, seatBefore) {
  let nextState = state;
  let nextLogs = logs;
  for (let index = startIndex; index < selected.length; index++) {
    const prelude = selected[index];
    const effect = getCardEffect(prelude);
    const preludeBeforeTemp = nextState.temperature;
    const preludeBeforeOxygen = nextState.oxygen;
    const result = applyEffect(nextState, effect, nextLogs);
    nextState = result.state;
    nextLogs = result.logs;
    const crossed = checkParameterThresholds(
      preludeBeforeTemp,
      nextState.temperature,
      preludeBeforeOxygen,
      nextState.oxygen,
      nextState,
      nextLogs
    );
    nextState = crossed.state;
    nextLogs = addLog(crossed.logs, "system", `Prelude効果: ${prelude.effectText}`);

    if (prelude.id === ECCENTRIC_SPONSOR_ID) {
      const options = eccentricSponsorOptions(nextState);
      if (options.length > 0) {
        const choice = {
          id: `${prelude.id}:${nextState.generation}`,
          kind: "prelude-project",
          ownerPlayerId: nextState.currentPlayerId,
          prompt: "25 MC軽減でプレイする手札カードを選んでください。",
          optional: false,
          options,
          continuation: {
            stage: "prelude-eccentric-sponsor",
            sourceKind: "prelude",
            sourceId: prelude.id,
            consumedAction: false,
            paid: true,
            preludeResume: {
              selectedIds: selected.map(item => item.id),
              nextIndex: index + 1,
              seatBefore
            }
          }
        };
        nextState.pendingChoice = choice;
        nextLogs = addLog(nextLogs, "system", choice.prompt);
        nextState.logs = nextLogs;
        return { state: nextState, logs: nextLogs, pending: true };
      }
      nextLogs = addLog(nextLogs, "system", "Prelude効果: プレイ可能な手札カードがありません。");
      continue;
    }

    if (effect.freePlayDiscount || effect.freePlayIgnoreGlobal) {
      const freePlay = applyPreludeFreePlay(nextState, effect, nextLogs);
      nextState = freePlay.state;
      nextLogs = freePlay.logs;
    }
  }
  return { state: finishPreludeSetup(nextState, nextLogs, seatBefore), logs: nextState.logs, pending: false };
}

export function resumePreludeResolution(state, continuation, logs) {
  const selected = (continuation?.selectedIds ?? [])
    .map(id => PRELUDES.find(prelude => prelude.id === id))
    .filter(Boolean);
  if (selected.length === 0) return state;
  return resolvePreludeEffects(
    state,
    selected,
    continuation.nextIndex ?? selected.length,
    logs,
    continuation.seatBefore ?? state.currentPlayerId
  ).state;
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
  let logs = addLog(
    nextState.logs,
    "player",
    `Prelude【${selected.map(prelude => prelude.name).join("】【")}】を解決しました。`,
    actor.name
  );
  const resolved = resolvePreludeEffects(nextState, selected, 0, logs, seatBefore);
  if (resolved.pending) return resolved.state;
  return resolved.state;
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
  // Both the prelude path and advanceSetupTurn reach this point for the same
  // player, so the flag is what keeps a first action from running twice.
  const ownerId = nextState.currentPlayerId;
  if (getPlayer(nextState, ownerId)?.initialActionDone) {
    return { state: nextState, logs };
  }
  nextState.players = nextState.players.map(player =>
    player.id === ownerId ? { ...player, initialActionDone: true } : player
  );
  let nextLogs = logs;
  if (corporation.effects.firstActionDraw) {
    const drawn = drawCards(nextState, corporation.effects.firstActionDraw);
    nextLogs = addLog(nextLogs, "system", `${corporation.name}: 初期アクションでカードを${drawn.length}枚引きました。`);
  }
  if (corporation.effects.firstAward) {
    // "As your first action, fund an award for free" -- it happens now, not
    // whenever the player next feels like funding one. Awards are disabled in
    // solo, where the reference returns without asking.
    const taken = new Set((nextState.fundedAwards ?? []).map(entry => entry.awardId));
    const options = nextState.mode === "solo"
      ? []
      : awardsForBoard(nextState.boardId)
          .filter(award => !taken.has(award.id))
          .map(award => ({ id: award.id, awardId: award.id, label: award.name }));
    if (options.length > 0) {
      const choice = {
        id: `vitor-award:${ownerId}`,
        kind: "vitor-award",
        ownerPlayerId: ownerId,
        prompt: "初期アクション: 無償で設立する表彰を1つ選んでください。",
        optional: false,
        options,
        continuation: {
          stage: "vitor-award",
          sourceKind: "corporation",
          sourceId: corporation.id,
          consumedAction: false,
          paid: true
        }
      };
      nextState.pendingChoice = choice;
      nextLogs = addLog(nextLogs, "system", `${corporation.name}: 表彰を1つ無償で設立します。`);
      nextState.logs = nextLogs;
      return { state: nextState, logs: nextLogs };
    }
  }
  if (corporation.effects.firstFloaterDraw) {
    const drawn = drawCards(
      nextState,
      corporation.effects.firstFloaterDraw,
      undefined,
      (card, cardId) => (card?.resourceType ?? getCardResourceType(cardId)) === "floater"
    );
    nextLogs = addLog(
      nextLogs,
      "system",
      `${corporation.name}: 初期アクションでフローターのカードを${drawn.length}枚引きました。`
    );
  }
  if (corporation.effects.firstPrelude) {
    // Three fresh preludes off the deck, one of which is played for free; the
    // other two are discarded rather than returned, so the deck shrinks by all
    // three whether or not the choice is answered later.
    const drawn = (nextState.preludeDeck ?? []).slice(0, 3);
    nextState.preludeDeck = (nextState.preludeDeck ?? []).slice(drawn.length);
    const options = drawn
      .map(id => PRELUDES.find(prelude => prelude.id === id))
      .filter(Boolean)
      .map(prelude => ({ id: prelude.id, preludeId: prelude.id, label: prelude.name }));
    if (options.length > 0) {
      const choice = {
        id: `valley-trust:${nextState.currentPlayerId}`,
        kind: "valley-trust-prelude",
        ownerPlayerId: nextState.currentPlayerId,
        prompt: "初期アクション: 無償でプレイするPreludeを1枚選んでください。",
        optional: false,
        options,
        continuation: {
          stage: "valley-trust-prelude",
          sourceKind: "corporation",
          sourceId: corporation.id,
          consumedAction: false,
          paid: true
        }
      };
      nextState.pendingChoice = choice;
      nextLogs = addLog(nextLogs, "system", `${corporation.name}: Preludeを3枚引きました。`);
      nextState.logs = nextLogs;
      return { state: nextState, logs: nextLogs };
    }
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
    !effect.offBoardCity &&
    legalCellsFor(nextState, effect.tile, undefined, effect.tilePlacementRule).length > 1;

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

  // Solo plays against a neutral opponent, so an attack has a target -- just not
  // one held in state.players. Both guards above fall through when there is only
  // one player, and the decrement then landed on the player who played the card.
  // Skipping it is the neutral opponent absorbing the hit.
  const soloAttackTarget = (nextState.players ?? []).length === 1;

  const result = applyEffect(nextState, effect, nextLogs, {
    ...options,
    skipTile: options.skipTile || willChooseTile,
    skipProductionAttack: options.skipProductionAttack || willChooseVictim || soloAttackTarget,
    skipResourceAttack: options.skipResourceAttack || willChooseResourceVictim || soloAttackTarget
  });
  nextLogs = addLog(result.logs, "system", `効果適用: ${card.effectText}`);

  // Effects that need the player to choose a target park the rest of the work in
  // state.pendingChoice; the caller must not finish the turn until it resolves.
  const pending = queuePendingChoices(result.state, card, {
    sourceKind: options.sourceKind ?? "card",
    sourceId: card.id,
    consumedAction: options.consumedAction ?? true,
    paid: true,
    preludeResume: options.preludeResume,
    afterPlay: options.afterPlay
  });
  if (pending) {
    result.state.pendingChoice = pending;
    nextLogs = addLog(nextLogs, "system", pending.prompt);
    result.state.logs = nextLogs;
    return { status: "pending", state: result.state, logs: nextLogs, pendingChoice: pending };
  }

  // Neither the party nor the delegate is chosen, so this resolves outright.
  if (card.id === VOTE_OF_NO_CONFIDENCE_ID && result.state.turmoil) {
    const actorId = result.state.currentPlayerId;
    const seated = replaceNeutralChairman(result.state.turmoil, actorId);
    if (seated.replaced) {
      result.state.turmoil = seated.turmoil;
      // The chairman's rating is not terraforming the player chose to do, so
      // the Reds levy does not reach it.
      increaseTerraformRating(result.state, actorId, 1, "chairman");
      nextLogs = addLog(
        nextLogs,
        "system",
        `中立議長を解任し、自分の代表者が議長に就任しました（TR +1）。`
      );
      result.state.logs = nextLogs;
    }
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
// A party can give up a neutral delegate when it holds one that is not its
// leader -- or two neutrals, in which case the leader's seat is covered.
function recruitmentPartyOptions(state) {
  if (!state.turmoil) return [];
  if ((state.turmoil.delegateReserve?.[state.currentPlayerId] ?? 0) <= 0) return [];
  return Object.entries(state.turmoil.parties ?? {})
    .filter(([, party]) => {
      const neutrals = (party.delegates ?? []).filter(entry => entry === NEUTRAL).length;
      return neutrals > 1 || (neutrals === 1 && party.leader !== NEUTRAL);
    })
    .map(([partyId, party]) => ({
      id: partyId,
      partyId,
      label: `${getParty(partyId)?.name ?? partyId}（中立代表者 ${(party.delegates ?? []).filter(entry => entry === NEUTRAL).length}）`
    }));
}

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

  // "Decrease your heat production any number of steps and increase your M€
  // production the same number." How many is the player's decision.
  // "Exchange a non-leader neutral delegate for one of yours from the reserve."
  // Which party is the only decision; which neutral within it does not matter.
  if (card.id === RECRUITMENT_ID && !done.includes("turmoil-recruitment")) {
    const options = recruitmentPartyOptions(state);
    if (options.length > 0) {
      return {
        id: `turmoil-recruitment:${state.currentPlayerId}`,
        kind: "turmoil-recruitment",
        ownerPlayerId: state.currentPlayerId,
        prompt: "中立代表者を自分の代表者と交換する政党を選んでください。",
        optional: false,
        options,
        continuation: {
          sourceKind: context.sourceKind,
          sourceId: card.id,
          stage: "turmoil-recruitment",
          consumedAction: context.consumedAction ?? true,
          paid: context.paid ?? true
        }
      };
    }
  }

  // "Discard 1 card, then draw 3. All opponents draw 1." Which card goes is the
  // player's decision; the draws happen once it is answered.
  if (card.id === SPONSORED_ACADEMIES_ID && !done.includes("sponsored-academies")) {
    const hand = getCurrentPlayer(state)?.hand ?? [];
    if (hand.length > 0) {
      return buildDiscardChoice(state, hand, {
        ...context,
        stage: "sponsored-academies",
        prompt: "捨てるカードを1枚選んでください（その後、あなたは3枚、他プレイヤーは1枚引きます）。",
        optional: false,
        consumedAction: context.consumedAction ?? true
      }, ALL_CARDS);
    }
  }

  if (card.id === INSULATION_ID && !done.includes("insulation")) {
    return buildAmountChoice(state, {
      ...context,
      stage: "insulation",
      max: getCurrentPlayer(state)?.heatProd ?? 0,
      prompt: "熱生産量をいくつ減らしますか（同じ数だけMC生産量が増えます）。",
      labelFor: amount => `熱生産量 -${amount} / MC生産量 +${amount}`
    });
  }

  if (card.id === ROBOTIC_WORKFORCE_ID && !done.includes("building-production")) {
    return buildRoboticWorkforceChoice(state, context);
  }

  const raw = card.effectSpec?.behavior;
  if (!raw) return null;

  if (card.id === LOCAL_HEAT_TRAPPING_ID && !done.includes("effect-branch") && localHeatTrappingAnimalTargets(state).length === 0) {
    const branch = raw.or?.behaviors?.[0];
    if (branch) {
      const applied = applyEffect(state, { ...normalizeBehavior(branch, {}, []), cardId: card.id }, state.logs);
      Object.assign(state, applied.state);
      markChoiceResolved(state, context.sourceId, "effect-branch");
    }
  }
  if (
    raw.or &&
    !raw.or.autoSelect &&
    Array.isArray(raw.or.behaviors) &&
    !done.includes("effect-branch") &&
    (card.id !== LOCAL_HEAT_TRAPPING_ID || localHeatTrappingAnimalTargets(state).length > 0)
  ) {
    return buildBranchChoice(state, raw.or.behaviors, context);
  }
  // Where a tile goes is the player's decision, not the first legal space.
  const effect = getCardEffect(card);
  if (effect.tile && !effect.offBoardCity && !done.includes("tile-placement")) {
    const legal = legalCellsFor(state, effect.tile, undefined, effect.tilePlacementRule);
    if (legal.length > 1) {
      return buildTileChoice(
        state,
        effect.tile,
        {
          ...context,
          remaining: effect.tileCount ?? 1,
          specialName: effect.specialName,
          mineralProduction: effect.mineralProduction === true
        },
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
    card.id === "card-colonies-air-raid" &&
    raw.removeResourcesFromAnyCard &&
    !done.includes("any-card-resource-removal")
  ) {
    const removal = buildResourceRemovalChoice(state, raw.removeResourcesFromAnyCard, {
      ...context,
      cards: ALL_CARDS,
      getResourceType: getCardResourceType
    });
    if (removal) {
      if (removal.autoTarget) {
        applyResourceToCard(state, removal.autoTarget, -removal.count);
        markChoiceResolved(state, context.sourceId, "any-card-resource-removal");
      } else {
        return removal;
      }
    }
  }

  if (
    raw.decreaseAnyProduction?.type &&
    !done.includes("production-attack") &&
    (state.players ?? []).length > 1
  ) {
    const spec = raw.decreaseAnyProduction;
    const resource = SOURCE_RESOURCE_MAP[spec.type] ?? spec.type;
    const built = buildProductionAttackChoice(state, resource, spec.count, {
      ...context,
      stealing: spec.stealing === true
    });
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
      // `|| spec.allowDuplicates` waved through every refusal, not just the
      // one-per-tile rule, so a card that permits a duplicate also offered
      // tiles that were already full. Pass the flag in instead.
      .filter(tile =>
        canBuildColony(state.colonies, tile.id, state.currentPlayerId, {
          allowDuplicates: Boolean(spec.allowDuplicates)
        }).ok
      )
      .map(tile => ({ id: tile.id, name: getColonyTile(tile.id)?.name }));
    const built = buildColonyChoice(state, spec, context, legal);
    if (built) return built;
  }

  if (raw.standardResource && !done.includes("standard-resource")) {
    return buildStandardResourceChoice(state, raw.standardResource, context);
  }
  if (raw.removeResourcesFromAnyCard && !done.includes("any-card-resource-removal")) {
    const spec = raw.removeResourcesFromAnyCard;
    const built = buildResourceRemovalChoice(state, spec, {
      ...context,
      cards: ALL_CARDS,
      getResourceType: getCardResourceType
    });
    if (built) {
      if (built.autoTarget) {
        applyResourceToCard(state, built.autoTarget, -built.count);
        if (card.id === SOIL_ENRICHMENT_ID) addResource(state, "plants", 5);
        markChoiceResolved(state, context.sourceId, "any-card-resource-removal");
      } else {
        return built;
      }
    }
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
    // Removal passes a negative delta; a card cannot hold fewer than none.
    cardResources[target.targetCardId] = Math.max(
      0,
      (cardResources[target.targetCardId] ?? 0) + delta
    );
    return { ...player, cardResources };
  });
  return state;
}

function markChoiceResolved(state, sourceId, stage) {
  const resolved = { ...(state.resolvedChoices ?? {}) };
  resolved[sourceId] = [...(resolved[sourceId] ?? []), stage];
  state.resolvedChoices = resolved;
}

function localHeatTrappingAnimalTargets(state) {
  return collectResourceTargets(state, "Animal", ALL_CARDS, {
    ownCardsOnly: true,
    getResourceType: getCardResourceType
  });
}

// A global event asks several players in turn, so the engine keeps a queue
// beside the single live choice. Everything here is plain data: it serialises
// with the rest of the state, so a save, a reload or a reconnect picks the
// queue up exactly where it stopped.
//
// The rule is that nothing after the queue runs until the queue is empty. The
// turmoil phase parks its remaining steps in `phaseContinuation`, and only
// draining the last question triggers them.
export function enqueuePendingChoices(state, choices) {
  const queued = (choices ?? []).filter(Boolean);
  if (queued.length === 0) return;
  state.pendingChoiceQueue = [...(state.pendingChoiceQueue ?? []), ...queued];
}

function openOrEnqueuePendingChoice(state, choice) {
  if (!choice) return;
  if (!state.pendingChoice) {
    state.pendingChoice = choice;
    return;
  }
  enqueuePendingChoices(state, [choice]);
}

// Moves the next queued question into the live slot. Returns false when the
// queue is empty, which is the caller's signal to run the continuation.
function promoteNextChoice(state) {
  const queue = state.pendingChoiceQueue ?? [];
  if (queue.length === 0) {
    state.pendingChoiceQueue = [];
    return false;
  }
  const [next, ...rest] = queue;
  state.pendingChoiceQueue = rest;
  state.pendingChoice = next;
  return true;
}

// Runs whatever the phase parked once every question has been answered.
function runPhaseContinuation(state, logs) {
  const continuation = state.phaseContinuation;
  if (!continuation) return { state, logs };
  state.phaseContinuation = null;

  if (continuation.kind === "turmoil-after-event") {
    return finishTurmoilPhase(state, logs, continuation);
  }
  if (continuation.kind === "solar-phase") {
    const resumed = finishSolarPhase(state, logs);
    return { state: resumed, logs: resumed.logs ?? logs };
  }
  return { state, logs };
}

// Called after every resolution: either the next queued question comes up, or
// the phase that was waiting on them continues.
function advanceChoiceQueue(state, logs) {
  if (promoteNextChoice(state)) {
    return { state, logs: addLog(logs, "system", state.pendingChoice.prompt), pending: true };
  }
  const continued = runPhaseContinuation(state, logs);
  return { state: continued.state, logs: continued.logs, pending: false };
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
    case "building-production": {
      const sourceId = option.cardId;
      const source = ALL_CARDS.find(item => item.id === sourceId);
      const owner = getPlayer(next, choice.ownerPlayerId);
      // Counted boxes ("1 M€ per 2 building tags") are resolved against the
      // board as it stands now, which is when the copy is made.
      const production = source ? roboticWorkforceProductionBox(next, source, choice.ownerPlayerId) : {};
      const sourceDecrease = source ? getCardEffect(source).productionDecrease : null;
      const ownsSource =
        (owner?.playedProjects ?? []).includes(sourceId) ||
        (owner?.selectedPreludeIds ?? []).includes(sourceId) ||
        owner?.corporationId === sourceId;
      // Affordability is re-checked here rather than trusted from the offered
      // options: the engine is authoritative for online play, so a submitted
      // card id has to stand on its own.
      const valid = source?.tags.includes("Building") &&
        ownsSource &&
        (Object.keys(production).length > 0 || Boolean(sourceDecrease?.resource)) &&
        canAffordProductionDecrease(owner, production);
      if (!valid) {
        next.pendingChoice = choice;
        next.logs = addLog(nextLogs, "system", "その建物カードは生産ボックスをコピーできません。");
        return { status: "pending", state: next, logs: next.logs, pendingChoice: choice };
      }
      next.players = next.players.map(player => {
        if (player.id !== choice.ownerPlayerId) return player;
        const copiedProductions = [
          ...(player.copiedProductions ?? []),
          { sourceCardId: sourceId, production: { ...production } }
        ];
        const updated = { ...player, copiedProductions };
        for (const [resource, amount] of Object.entries(production)) {
          const field = `${resource}Prod`;
          if (field in updated) updated[field] += amount;
        }
        return updated;
      });
      nextLogs = addLog(nextLogs, "system", `${source.name} の生産ボックスを恒久的にコピーしました。`);
      // Heat Trappers' box is "-2 heat production anywhere, +1 energy": the
      // decrease is part of the box and is copied with it, so the player has to
      // name a victim exactly as they would when printing the card.
      if (sourceDecrease?.resource) {
        const attack = buildProductionAttackChoice(next, sourceDecrease.resource, sourceDecrease.count, {
          sourceKind: "card",
          sourceId: ROBOTIC_WORKFORCE_ID,
          consumedAction: false,
          paid: true,
          stealing: sourceDecrease.stealing === true
        });
        if (attack) {
          next.pendingChoice = attack;
          next.logs = nextLogs;
          return { status: "pending", state: next, logs: nextLogs, pendingChoice: attack };
        }
      }
      break;
    }
    case "amount": {
      // Only Insulation uses the amount choice so far; the stage says which.
      const amount = option.amount ?? 0;
      const target = choice.ownerPlayerId ?? actorId;
      if (choice.continuation.stage === "hi-tech-lab") {
        const seat = next.currentPlayerId;
        next.currentPlayerId = target;
        next.energy = (next.energy ?? 0) - amount;
        const drawn = drawCards(next, amount);
        nextLogs = addLog(nextLogs, "system", `Hi-Tech Lab: エネルギー -${amount}、カードを${drawn.length}枚引きました。`);
        next.currentPlayerId = seat;
        next.pendingChoice = null;
        // One is kept and the rest are discarded, so the question is which to
        // keep -- with a single card there is nothing to ask.
        if (drawn.length > 1) {
          const keep = buildDiscardChoice(next, drawn, {
            sourceKind: "card-action",
            sourceId: choice.continuation.sourceId,
            stage: "hi-tech-lab-keep",
            prompt: "手札に加えるカードを1枚選んでください（残りは捨てられます）。",
            optional: false,
            consumedAction: false
          }, ALL_CARDS);
          if (keep) {
            keep.ownerPlayerId = target;
            next.pendingChoice = keep;
            next.logs = nextLogs;
            return { status: "pending", state: next, logs: nextLogs, pendingChoice: keep };
          }
        }
        return { status: "resolved", state: next, logs: nextLogs };
      }
      if (choice.continuation.stage === "power-infrastructure") {
        next.players = next.players.map(player =>
          player.id === target
            ? { ...player, energy: (player.energy ?? 0) - amount, mc: (player.mc ?? 0) + amount }
            : player
        );
        nextLogs = addLog(nextLogs, "system", `Power Infrastructure: エネルギー -${amount}、MC +${amount}`);
        next.pendingChoice = null;
        return { status: "resolved", state: next, logs: nextLogs };
      }
      if (choice.continuation.stage !== "insulation") {
        next.pendingChoice = null;
        return { status: "resolved", state: next, logs: nextLogs };
      }
      next.players = next.players.map(player =>
        player.id === (choice.ownerPlayerId ?? actorId)
          ? {
              ...player,
              heatProd: (player.heatProd ?? 0) - amount,
              mcProd: (player.mcProd ?? 0) + amount
            }
          : player
      );
      nextLogs = addLog(nextLogs, "system", `Insulation: 熱生産量 -${amount}、MC生産量 +${amount}`);
      next.pendingChoice = null;
      return { status: "resolved", state: next, logs: nextLogs };
    }

    case "turmoil-recruitment": {
      const target = choice.ownerPlayerId ?? actorId;
      const swapped = replaceDelegateInParty(next.turmoil, option.partyId, NEUTRAL, target);
      if (swapped.replaced) {
        next.turmoil = swapped.turmoil;
        nextLogs = addLog(
          nextLogs,
          "system",
          `${option.label} の中立代表者を自分の代表者と交換しました。`
        );
      } else {
        nextLogs = addLog(nextLogs, "system", swapped.reason ?? "交換できませんでした。");
      }
      break;
    }

    case "energy-market": {
      const target = choice.ownerPlayerId ?? actorId;
      next.players = next.players.map(player => {
        if (player.id !== target) return player;
        if (option.sellProduction) {
          return { ...player, energyProd: (player.energyProd ?? 0) - 1, mc: (player.mc ?? 0) + 8 };
        }
        const amount = option.energy ?? 0;
        return { ...player, mc: (player.mc ?? 0) - amount * 2, energy: (player.energy ?? 0) + amount };
      });
      nextLogs = addLog(nextLogs, "system", `Energy Market: ${option.label}`);
      next.pendingChoice = null;
      return { status: "resolved", state: next, logs: nextLogs };
    }

    case "vitor-award": {
      const seat = next.currentPlayerId;
      next.currentPlayerId = choice.ownerPlayerId;
      const funded = fundAward(next, option.awardId, nextLogs, choice.ownerPlayerId);
      const after = funded.state;
      after.currentPlayerId = seat;
      after.pendingChoice = null;
      const resume = after.setupContinuation;
      if (resume?.stage === "prelude-setup") {
        after.setupContinuation = null;
        after.currentPlayerId = resume.seatBefore;
        return { status: "resolved", state: advanceSetupTurn(after), logs: funded.logs };
      }
      return { status: "resolved", state: after, logs: funded.logs };
    }

    case "valley-trust-prelude": {
      const prelude = PRELUDES.find(item => item.id === option.preludeId);
      if (!prelude) {
        next.pendingChoice = null;
        return { status: "resolved", state: next, logs: nextLogs };
      }
      const seat = next.currentPlayerId;
      next.currentPlayerId = choice.ownerPlayerId;
      next.selectedPreludeIds = [...(next.selectedPreludeIds ?? []), prelude.id];
      nextLogs = addLog(nextLogs, "system", `初期アクションでPrelude【${prelude.name}】をプレイしました。`);
      const resolved = resolvePreludeEffects(next, [prelude], 0, nextLogs, seat);
      const after = resolved.state;
      nextLogs = resolved.logs;
      if (resolved.pending) {
        return { status: "pending", state: after, logs: nextLogs, pendingChoice: after.pendingChoice };
      }
      after.pendingChoice = null;
      const resume = after.setupContinuation;
      if (resume?.stage === "prelude-setup") {
        after.setupContinuation = null;
        after.currentPlayerId = resume.seatBefore;
        return { status: "resolved", state: advanceSetupTurn(after), logs: nextLogs };
      }
      after.currentPlayerId = seat;
      return { status: "resolved", state: after, logs: nextLogs };
    }

    case "prelude-project": {
      const project = ALL_CARDS.find(item => item.id === option.cardId);
      const owner = getPlayer(next, choice.ownerPlayerId);
      const discounted = project
        ? { ...project, cost: Math.max(0, project.cost - ECCENTRIC_SPONSOR_DISCOUNT) }
        : null;
      if (!project || !(owner?.hand ?? []).includes(project.id) || !getCardPlayableStatus(discounted, next).playable) {
        next.pendingChoice = choice;
        next.logs = addLog(nextLogs, "system", "そのカードはもうプレイできません。");
        return { status: "pending", state: next, logs: next.logs, pendingChoice: choice };
      }
      const payment = getCardPaymentCost(discounted, next);
      const destination = project.type === "event" ? "playedEvents" : "playedProjects";
      next.players = next.players.map(player =>
        player.id === choice.ownerPlayerId
          ? {
              ...player,
              mc: player.mc - payment,
              hand: player.hand.filter(id => id !== project.id),
              [destination]: [...(player[destination] ?? []), project.id]
            }
          : player
      );
      nextLogs = addLog(nextLogs, "system", `Prelude効果で【${project.name}】をプレイしました（支払MC ${payment}）。`);
      const beforeTemp = next.temperature;
      const beforeOxygen = next.oxygen;
      const played = applyCardEffect(next, project, nextLogs, {
        sourceKind: "prelude",
        consumedAction: false,
        preludeResume: choice.continuation.preludeResume,
        afterPlay: {
          cardId: project.id,
          temperature: beforeTemp,
          oxygen: beforeOxygen,
          preludeResume: choice.continuation.preludeResume
        }
      });
      if (played.status === "pending") {
        next.logs = played.logs;
        return { status: "pending", state: played.state, logs: played.logs, pendingChoice: played.pendingChoice };
      }
      const triggered = applyCorporationTriggers(played.state, project, played.logs);
      const thresholds = checkParameterThresholds(
        beforeTemp,
        triggered.state.temperature,
        beforeOxygen,
        triggered.state.oxygen,
        triggered.state,
        triggered.logs
      );
      const resumed = resumePreludeResolution(
        thresholds.state,
        choice.continuation.preludeResume,
        thresholds.logs
      );
      return { status: "resolved", state: resumed, logs: resumed.logs ?? thresholds.logs };
    }
    case "any-card-resource": {
      applyResourceToCard(next, option, choice.continuation.remaining ?? 1);
      nextLogs = addLog(nextLogs, "system", `${option.label}に資源を${choice.continuation.remaining ?? 1}個置きました。`);
      break;
    }
    case "any-card-resource-removal": {
      const taken = choice.continuation.remaining ?? 1;
      applyResourceToCard(next, option, -taken);
      if (choice.continuation.sourceId === SOIL_ENRICHMENT_ID) addResource(next, "plants", 5);
      nextLogs = addLog(nextLogs, "system", `${option.label}から資源を${taken}個取り除きました。`);
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
      if (choice.continuation.stage === "sponsored-academies") {
        const target = choice.ownerPlayerId ?? actorId;
        const discardedId = option.cardId ?? option.id;
        const seatBefore = next.currentPlayerId;
        // hand is a seated accessor, so it has to be written with the seat set
        // to its owner -- a players.map write is clobbered by the resync.
        next.currentPlayerId = target;
        next.hand = next.hand.filter(id => id !== discardedId);
        next.discardPile = [...next.discardPile, discardedId];
        const mine = drawCards(next, 3);
        nextLogs = addLog(nextLogs, "system", `Sponsored Academies: 1枚捨てて${mine.length}枚引きました。`);
        // "All opponents draw 1" -- theirs are kept, not offered.
        for (const player of next.players) {
          if (player.id === target) continue;
          next.currentPlayerId = player.id;
          const theirs = drawCards(next, 1);
          if (theirs.length > 0) {
            nextLogs = addLog(nextLogs, "system", `${player.name}がカードを1枚引きました。`);
          }
        }
        next.currentPlayerId = seatBefore;
        break;
      }

      // Hi-Tech Lab reuses the card list to ask the opposite question: the
      // picked card is the one kept, and everything else offered is discarded.
      if (choice.continuation.stage === "hi-tech-lab-keep") {
        const keptId = option.cardId ?? option.id;
        const offered = choice.options.map(entry => entry.cardId ?? entry.id);
        const discarded = offered.filter(id => id !== keptId);
        next.players = next.players.map(player =>
          player.id === (choice.ownerPlayerId ?? actorId)
            ? { ...player, hand: [...(player.hand ?? []).filter(id => !discarded.includes(id))] }
            : player
        );
        next.discardPile = [...next.discardPile, ...discarded];
        const keptCard = ALL_CARDS.find(item => item.id === keptId);
        nextLogs = addLog(
          nextLogs,
          "system",
          `Hi-Tech Lab: 【${keptCard?.name ?? keptId}】を手札に加え、${discarded.length}枚を捨てました。`
        );
        break;
      }
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

      // A steal moves the step rather than destroying it. The attacker gains
      // what the victim actually lost, which is less than `count` when the
      // victim was already near the floor.
      if (choice.payload?.stealing) {
        const moved = beforeProd - afterProd;
        if (moved > 0) {
          const thief = choice.ownerPlayerId;
          next.players = next.players.map(player =>
            player.id === thief ? { ...player, [key]: (player[key] ?? 0) + moved } : player
          );
          nextLogs = addLog(nextLogs, "system", `奪った生産量 ${moved} を獲得しました。`);
        }
      }
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

      // The neutral opponent holds nothing to take from -- what is stolen comes
      // out of the general supply, so the attacker simply gains it. Nothing is
      // recorded in the attack ledger either: there is no player to sue.
      if (option.targetPlayerId === SOLO_NEUTRAL_TARGET_ID) {
        const gained = option.count ?? 0;
        next.players = next.players.map(player =>
          player.id === attackerId
            ? { ...player, [option.resource]: (player[option.resource] ?? 0) + gained }
            : player
        );
        nextLogs = addLog(
          nextLogs,
          "system",
          `中立相手から ${option.resource} ${gained} を獲得しました。`
        );
        break;
      }

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
        // Regolith Eaters and GHG Producing Bacteria raise oxygen from inside a
        // branch. Fixing PLAY_CARD and USE_CARD_ACTION left this path behind,
        // so the same oxygen step paid its threshold bonus only when it did not
        // come from a choice.
        const branchBeforeTemp = next.temperature;
        const branchBeforeOxygen = next.oxygen;
        const applied = applyEffect(next, { ...branchEffect, cardId: card.id }, nextLogs);
        const crossed = checkParameterThresholds(
          branchBeforeTemp,
          applied.state.temperature,
          branchBeforeOxygen,
          applied.state.oxygen,
          applied.state,
          applied.logs
        );
        // `next` is const and the surrounding cases mutate it in place, so the
        // settled values are copied back rather than rebinding.
        Object.assign(next, crossed.state);
        nextLogs = addLog(crossed.logs, "system", `選択: ${option.label}`);
        if (card.id === LOCAL_HEAT_TRAPPING_ID && Number(option.id) === 1) {
          const target = buildResourceChoice(next, { type: "Animal", count: 2 }, {
            ...choice.continuation,
            cards: ALL_CARDS,
            getResourceType: getCardResourceType
          });
          if (target?.autoTarget) {
            applyResourceToCard(next, target.autoTarget, target.count);
            nextLogs = addLog(nextLogs, "system", `${target.autoTarget.label}に動物を${target.count}個置きました。`);
          } else if (target) {
            next.pendingChoice = target;
            next.logs = nextLogs;
            return { status: "pending", state: next, logs: nextLogs, pendingChoice: target };
          }
        }
        if (fromAction && !(next.usedCardActions ?? []).includes(card.id)) {
          next.usedCardActions = [...(next.usedCardActions ?? []), card.id];
        }
      }
      break;
    }
    case "ocean-placement":
    case "tile-placement": {
      const cell = next.board[option.targetCellKey];
      const tileType = choice.continuation.payload?.tileType ?? "ocean";
      // Both the World Government's ocean and a global event's are laid on
      // behalf of the board, so neither pays the placer.
      const byWorldGovernment =
        choice.continuation.stage === "world-government-ocean" ||
        choice.continuation.stage === "global-event-ocean";
      const finalGreenery = choice.continuation.stage === "final-greenery";
      if (cell) {
        placeTileAt(next, cell, tileType, actorId, choice.continuation.sourceId, {
          worldGovernment: byWorldGovernment,
          finalGreenery
        });
        // placeTileAt writes its own lines -- the ruling policy payout among
        // them -- onto next.logs. Carrying on from the snapshot taken before
        // the call silently dropped every one of them.
        nextLogs = next.logs ?? nextLogs;
        nextLogs = addLog(
          nextLogs,
          "system",
          byWorldGovernment
            ? `世界政府が ${option.label} に海洋タイルを配置しました（TRは得られません）。`
            : `${option.label} にタイルを配置しました。`
        );
      }
      // Mining Area and Mining Rights raise production for whichever bonus the
      // chosen space pays, so the amount is only known once the space is picked.
      if (cell && choice.continuation.payload?.mineralProduction) {
        const resource = cell.bonusType === "titanium" ? "titaniumProd" : "steelProd";
        next.players = next.players.map(player =>
          player.id === actorId ? { ...player, [resource]: (player[resource] ?? 0) + 1 } : player
        );
        nextLogs = addLog(
          nextLogs,
          "system",
          `${cell.bonusType === "titanium" ? "チタン" : "建材"}生産量 +1`
        );
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
    case "standard-resource-pick": {
      next.players = next.players.map(player =>
        player.id === choice.ownerPlayerId
          ? { ...player, [option.resource]: (player[option.resource] ?? 0) + 1 }
          : player
      );
      nextLogs = addLog(
        nextLogs,
        "system",
        `${getPlayer(next, choice.ownerPlayerId)?.name} が ${option.label} を1獲得しました。`
      );
      break;
    }
    case "floater-placement": {
      next.players = next.players.map(player =>
        player.id === choice.ownerPlayerId
          ? {
              ...player,
              cardResources: {
                ...player.cardResources,
                [option.cardId]: (player.cardResources?.[option.cardId] ?? 0) + 1
              }
            }
          : player
      );
      nextLogs = addLog(nextLogs, "system", `${option.label} にフローターを1個置きました。`);
      break;
    }
    case "corrosive-rain": {
      const { floaters, mc } = choice.continuation.payload ?? { floaters: 2, mc: 10 };
      const owner = getPlayer(next, choice.ownerPlayerId);
      if (option.payMc) {
        const paid = Math.min(mc, owner?.mc ?? 0);
        next.players = next.players.map(player =>
          player.id === choice.ownerPlayerId ? { ...player, mc: player.mc - paid } : player
        );
        nextLogs = addLog(nextLogs, "system", `${owner?.name} が ${paid} MC を失いました。`);
        break;
      }
      // Re-check the card still holds enough: state may have moved on.
      const held = owner?.cardResources?.[option.cardId] ?? 0;
      if (held < floaters) {
        const paid = Math.min(mc, owner?.mc ?? 0);
        next.players = next.players.map(player =>
          player.id === choice.ownerPlayerId ? { ...player, mc: player.mc - paid } : player
        );
        nextLogs = addLog(nextLogs, "system", `対象のフローターが足りないため ${paid} MC を失いました。`);
        break;
      }
      next.players = next.players.map(player =>
        player.id === choice.ownerPlayerId
          ? {
              ...player,
              cardResources: { ...player.cardResources, [option.cardId]: held - floaters }
            }
          : player
      );
      nextLogs = addLog(nextLogs, "system", `${owner?.name} が ${option.label} を失いました。`);
      break;
    }
    case "event-discard": {
      // Re-check against the hand as it stands: the option list was built when
      // the question was queued, and an earlier answer may have taken this card.
      const owner = getPlayer(next, choice.ownerPlayerId);
      const held = owner?.hand ?? [];
      if (!held.includes(option.cardId)) {
        // Put the question back rather than discarding something else.
        next.pendingChoice = {
          ...choice,
          options: held.map(cardId => ({
            id: cardId,
            label: ALL_CARDS.find(item => item.id === cardId)?.name ?? cardId,
            cardId
          }))
        };
        nextLogs = addLog(nextLogs, "system", "そのカードは手札にありません。");
        next.logs = nextLogs;
        return { status: "pending", state: next, logs: nextLogs, pendingChoice: next.pendingChoice };
      }
      next.players = next.players.map(player =>
        player.id === choice.ownerPlayerId
          ? { ...player, hand: player.hand.filter(cardId => cardId !== option.cardId) }
          : player
      );
      next.discardPile = [...(next.discardPile ?? []), option.cardId];
      nextLogs = addLog(nextLogs, "system", `${owner?.name ?? choice.ownerPlayerId} が ${option.label} を捨てました。`);
      break;
    }
    case "ocean-removal": {
      const cell = next.board[option.targetCellKey];
      if (cell) {
        next.board = { ...next.board };
        // The square goes back to being empty; the ocean count follows it down.
        next.board[option.targetCellKey] = { ...cell, tileType: "empty", placedBy: null };
        next.oceans = Math.max(0, next.oceans - 1);
        nextLogs = addLog(nextLogs, "system", `${option.label} の海洋タイルを取り除きました。`);
      }
      break;
    }
    case "world-government": {
      // An ocean needs a square, so the choice continues into a tile placement
      // that carries the worldGovernment flag through to placeTileAt.
      if (option.parameter === "ocean") {
        const followUp = buildTileChoice(
          next,
          "ocean",
          {
            sourceKind: "solar-phase",
            sourceId: "world-government-ocean",
            consumedAction: false,
            paid: true,
            remaining: 1
          },
          legalCellsFor(next, "ocean", actorId)
        );
        if (followUp) {
          // The owner is the first player, who may not be the player in turn.
          followUp.ownerPlayerId = choice.ownerPlayerId;
          followUp.continuation.stage = "world-government-ocean";
          next.pendingChoice = followUp;
          next.logs = nextLogs;
          return { status: "pending", state: next, logs: nextLogs, pendingChoice: followUp };
        }
        // Nowhere legal to put it: fall through and let the phase continue.
      } else {
        nextLogs = applyWorldGovernmentParameter(next, option.parameter, nextLogs);
      }
      // Raising the track may itself owe an ocean (0°C), which is another
      // question. The solar phase waits for it rather than finishing over it.
      if ((next.pendingChoiceQueue ?? []).length > 0) {
        promoteNextChoice(next);
        next.phaseContinuation = { kind: "solar-phase" };
        next.logs = nextLogs;
        return { status: "pending", state: next, logs: nextLogs, pendingChoice: next.pendingChoice };
      }
      const resumed = finishSolarPhase(next, nextLogs);
      return { status: "resolved", state: resumed, logs: resumed.logs ?? nextLogs };
    }
    default:
      break;
  }

  // The World Government's ocean has been placed; the Solar phase carries on.
  if (choice.continuation.stage === "world-government-ocean") {
    const resumed = finishSolarPhase(next, nextLogs);
    return { status: "resolved", state: resumed, logs: resumed.logs ?? nextLogs };
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

  // Anything else queued behind this one comes up next; when the queue is empty
  // the phase that was waiting on it resumes.
  const advanced = advanceChoiceQueue(next, nextLogs);
  advanced.state.logs = advanced.logs;
  return {
    status: advanced.pending ? "pending" : "resolved",
    state: advanced.state,
    logs: advanced.logs,
    ...(advanced.pending ? { pendingChoice: advanced.state.pendingChoice } : {})
  };
}

export function legalCellsFor(state, tileType, playerId, placementRule = null) {
  const owner = playerId ?? state.currentPlayerId;
  return Object.values(state.board).filter(cell =>
    isCellPlacementValid(cell, tileType, state.board, owner, placementRule, state.boardId)
  );
}

// `worldGovernment` marks a tile the World Government lays during the Solar
// phase. "All bonuses go to the WG, and therefore no TR or other bonuses are
// given to the first player" — so the placement bonus, the ocean adjacency
// money and the TR are all skipped.
//
// The rules do let cards trigger off this ("Other cards may be triggered by
// this though, i.e. Arctic Algae or the new corporation Aphrodite"), and the
// tile-laid hook is deliberately left outside the flag so it keeps firing.
// Note that no ocean trigger exists yet to fire: grantCityPlacementCardEffects
// returns early for anything but a city, and Arctic Algae is modelled as a
// one-off `stock: {plants: 1}` rather than an ongoing effect. Wiring those up
// is separate work; this placement will feed them once they exist.
export function placeTileAt(state, cell, tileType, ownerId, cardId, options = {}) {
  const worldGovernment = options.worldGovernment === true;
  const finalGreenery = options.finalGreenery === true;
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
    if (!worldGovernment) {
      // Hellas' south pole costs 6 M€ to build on and pays an ocean tile back.
      // The board data carried placementCost from the start and nothing ever
      // charged it, so the space was free. Affordability is checked where the
      // space is offered; this is the payment itself.
      if (cell.placementCost) {
        state.players = state.players.map(p =>
          p.id === ownerId ? { ...p, mc: Math.max(0, p.mc - cell.placementCost) } : p
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
      grantRulingPolicyTileEffects(state, tileType, ownerId, { finalGreenery });
    }
    // Cards that watch for a tile being laid fire either way.
    grantCityPlacementCardEffects(state, tileType);
  }

  // TR follows the parameter actually moving. At the cap the track is clamped,
  // so the tile still gets placed but no terraforming rating is awarded.
  if (tileType === "ocean") {
    const before = state.oceans;
    state.oceans = Math.min(MAX_OCEANS, state.oceans + 1);
    if (state.oceans > before && !worldGovernment) bumpTr(state, ownerId, 1);
  }
  if (tileType === "forest") {
    const before = state.oxygen;
    if (!finalGreenery) {
      state.oxygen = Math.min(MAX_OXYGEN, state.oxygen + 1);
      if (state.oxygen > before && !worldGovernment) bumpTr(state, ownerId, 1);
    }
  }
  return state;
}

// Corporation effects that fire on a tile being laid, wherever the tile came
// from. They lived in the UI, so a city built through a card or by the bot paid
// Tharsis nothing, and the standard project paid it only when clicked.
// The ruling party's policy pays out on every tile laid while it is in power.
// Only Unity's titanium price was ever wired up, so five of the six policies a
// game can actually reach did nothing -- and with them, most of the reason to
// care who governs.
function grantRulingPolicyTileEffects(state, tileType, ownerId, context = {}) {
  const policy = getRulingPolicy(state.turmoil);
  if (policy?.trigger !== "onTilePlaced") return;
  if (policy.tileType && policy.tileType !== tileType) return;
  // The policy rewards what a player does on their turn. The final greenery
  // conversion happens after the last generation, when no government is in
  // session to pay anyone -- and the World Government's own tile is already
  // excluded by the caller, which skips every placement reward for it.
  if (context.finalGreenery) return;

  if (policy.resource && policy.amount) {
    state.players = state.players.map(player =>
      player.id === ownerId
        ? { ...player, [policy.resource]: (player[policy.resource] ?? 0) + policy.amount }
        : player
    );
    state.logs = addLog(
      state.logs,
      "system",
      `${getParty(state.turmoil.rulingParty)?.name ?? ""}政策: ${policy.description}`
    );
  }
}

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
    // Two cards watch for cities the same way a corporation does, and both say
    // "when a city is placed", not "when you place one", so anybody's counts.
    const held = player.playedProjects ?? [];
    const cardProduction = held.includes(IMMIGRANT_CITY_ID) ? 1 : 0;
    const cardBonus = held.includes(ROVER_CONSTRUCTION_ID) ? 2 : 0;
    const production = perCity + cardProduction;
    const bonus = ownBonus + cardBonus;
    if (production === 0 && bonus === 0) continue;
    state.players = state.players.map(entry =>
      entry.id === player.id
        ? { ...entry, mcProd: (entry.mcProd ?? 0) + production, mc: entry.mc + bonus }
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
// One way in for every global parameter change, whoever is raising it.
//
// The thresholds printed on the track — oxygen 8% pushing the temperature,
// -24°C and -20°C paying heat production, 0°C laying an ocean — belong to the
// track, not to the player, so they fire no matter what moved it. What differs
// is whether the mover is *rewarded*: a card pays its player TR, the World
// Government pays nobody (`grantTr: false`).
//
// The heat production from -24°C and -20°C is a reward, so it follows grantTr.
// The ocean at 0°C is not: it is the board's ocean, and it is laid on the same
// terms as the World Government's own.
export function applyGlobalParameterChange(state, options, logs) {
  const {
    parameter,
    steps = 1,
    actorPlayerId = null,
    grantTr = true,
    sourceLabel = null
  } = options;

  const limits = {
    temperature: { max: MAX_TEMPERATURE, perStep: 2 },
    oxygen: { max: MAX_OXYGEN, perStep: 1 },
    venus: { max: MAX_VENUS, perStep: 2 },
    oceans: { max: MAX_OCEANS, perStep: 1 }
  };
  const limit = limits[parameter];
  if (!limit) return { state, logs };

  const beforeTemp = state.temperature;
  const beforeOxy = state.oxygen;
  const before = state[parameter];
  const after = Math.min(limit.max, before + limit.perStep * steps);
  state[parameter] = after;

  let nextLogs = logs;
  if (after === before) return { state, logs: nextLogs };

  const stepsTaken = Math.round((after - before) / limit.perStep);

  // TR follows the track actually moving, and only for a player who earned it.
  if (grantTr && actorPlayerId) bumpTr(state, actorPlayerId, stepsTaken);
  if (sourceLabel) nextLogs = addLog(nextLogs, "system", sourceLabel);

  // Cards that watch the track fire for any mover, including the World
  // Government: they are not a reward for terraforming, they are a reaction to
  // the parameter moving at all.
  grantParameterRaisedCardEffects(state, parameter, stepsTaken);

  // The track's own thresholds, which are nobody's reward to withhold.
  const settled = applyParameterThresholds(state, {
    beforeTemp,
    beforeOxy,
    actorPlayerId,
    grantTr,
    logs: nextLogs
  });
  return { state: settled.state, logs: settled.logs };
}

// The threshold rules, split out so they can run for a card, the World
// Government or a global event alike. `grantTr` decides only whether the mover
// is paid; the board effects happen either way.
function applyParameterThresholds(state, { beforeTemp, beforeOxy, actorPlayerId, grantTr, logs }) {
  let nextLogs = logs;
  let effectiveTemp = state.temperature;

  // Oxygen 8% pushes the temperature one step.
  if (beforeOxy < 8 && state.oxygen >= 8 && state.temperature < MAX_TEMPERATURE) {
    const tempBefore = state.temperature;
    state.temperature = Math.min(MAX_TEMPERATURE, state.temperature + 2);
    effectiveTemp = Math.max(effectiveTemp, state.temperature);
    if (state.temperature > tempBefore && grantTr && actorPlayerId) {
      bumpTr(state, actorPlayerId, 1);
      nextLogs = addLog(nextLogs, "system", "酸素濃度 8% 達成ボーナス: 気温 +2°C, TR +1");
    } else {
      nextLogs = addLog(nextLogs, "system", "酸素濃度 8% 達成ボーナス: 気温 +2°C");
    }
  }

  // -24°C and -20°C each pay the mover heat production. A reward, so it follows
  // grantTr — the World Government keeps its own.
  for (const mark of [-24, -20]) {
    if (beforeTemp < mark && effectiveTemp >= mark && grantTr && actorPlayerId) {
      state.players = state.players.map(player =>
        player.id === actorPlayerId ? { ...player, heatProd: (player.heatProd ?? 0) + 1 } : player
      );
      nextLogs = addLog(nextLogs, "system", `気温 ${mark}°C 達成ボーナス: 熱生産量 +1`);
    }
  }

  // 0°C lays an ocean. Either way it is a placement question that names its own
  // legal spaces; the two arms differ only in who owns it and who gets paid.
  // A player who crossed the mark owns it and is paid TR. When the World
  // Government or a global event crossed it, nobody is paid, so it goes to the
  // first player and skips the TR.
  if (beforeTemp < 0 && effectiveTemp >= 0 && state.oceans < MAX_OCEANS) {
    if (grantTr && actorPlayerId) {
      const choice = buildTileChoice(
        state,
        "ocean",
        {
          sourceKind: "threshold",
          sourceId: "temperature-zero-ocean",
          consumedAction: true,
          paid: true,
          remaining: 1
        },
        legalCellsFor(state, "ocean", actorPlayerId)
      );
      if (choice) {
        choice.ownerPlayerId = actorPlayerId;
        choice.continuation.stage = "temperature-zero-ocean";
        choice.prompt = "気温 0°C 達成ボーナス: 海洋タイルを配置するマスを選んでください。";
        openOrEnqueuePendingChoice(state, choice);
        nextLogs = addLog(nextLogs, "system", "気温 0°C 達成ボーナス: 海洋タイル1枚の無料配置を獲得");
      }
    } else {
      const ownerId = state.firstPlayerId ?? state.turnOrder?.[0];
      const choice = buildTileChoice(
        state,
        "ocean",
        {
          sourceKind: "threshold",
          sourceId: "temperature-zero-ocean",
          consumedAction: false,
          paid: true,
          remaining: 1
        },
        legalCellsFor(state, "ocean", ownerId)
      );
      if (choice) {
        choice.ownerPlayerId = ownerId;
        choice.continuation.stage = "global-event-ocean";
        choice.prompt = "気温 0°C 達成ボーナス: 海洋タイルを配置するマスを選んでください。";
        enqueuePendingChoices(state, [choice]);
        nextLogs = addLog(nextLogs, "system", "気温 0°C 達成ボーナス: 海洋タイル1枚を配置します。");
      }
    }
  }

  return { state, logs: nextLogs };
}

// The four things the World Government may do, minus whatever is already maxed.
// An ocean is only offered while fewer than nine are on the board.
export function worldGovernmentOptions(state) {
  const options = [];
  if (state.venus < MAX_VENUS) {
    options.push({ id: "venus", label: "金星を1段階上昇", parameter: "venus" });
  }
  if (state.temperature < MAX_TEMPERATURE) {
    options.push({ id: "temperature", label: "気温を1段階上昇", parameter: "temperature" });
  }
  if (state.oxygen < MAX_OXYGEN) {
    options.push({ id: "oxygen", label: "酸素を1段階上昇", parameter: "oxygen" });
  }
  if (state.oceans < MAX_OCEANS) {
    options.push({ id: "ocean", label: "海洋タイルを1枚配置", parameter: "ocean" });
  }
  return options;
}

// Raises the chosen track. "All bonuses go to the WG, and therefore no TR or
// other bonuses are given to the first player" — so this never calls bumpTr.
// Cards that watch the parameter still fire, which is why the thresholds are
// measured around it.
export function applyWorldGovernmentParameter(state, parameter, logs) {
  const labels = { venus: "金星", temperature: "気温", oxygen: "酸素" };
  if (!(parameter in labels)) return logs;

  // grantTr: false — the terraforming is the World Government's. The track's own
  // thresholds still fire, because those belong to the board.
  const result = applyGlobalParameterChange(state, {
    parameter,
    steps: 1,
    actorPlayerId: null,
    grantTr: false,
    sourceLabel: `世界政府のテラフォーミング: ${labels[parameter]}を1段階上昇させました（TRは得られません）。`
  }, logs);
  return result.logs;
}

// The single place a terraforming rating changes. Every path used to add to
// state.tr on its own, which is why a cross-cutting rule like the Reds levy had
// no seat to sit in: some rises would be taxed and others silently would not.
//
// `reason` says WHY the rating moved, because the levy does not apply to all of
// them -- only to terraforming a player chooses to do on their turn.
export function increaseTerraformRating(state, playerId, steps, reason = "action") {
  const amount = Math.trunc(steps);
  if (!amount) return 0;

  const targetId = playerId ?? state.currentPlayerId;
  state.players = state.players.map(player =>
    player.id === targetId ? { ...player, tr: Math.max(0, player.tr + amount) } : player
  );

  // A drop in rating is never a terraforming action, so it is never levied.
  if (amount > 0 && TAXABLE_TR_REASONS.has(reason)) {
    payRulingPolicyTrLevy(state, targetId, amount);
  }
  return amount;
}

// Terraforming the player chose to do. The chairman's rating, the World
// Government's free step and the Turmoil upkeep are not choices, so the Reds
// levy does not reach them.
const TAXABLE_TR_REASONS = new Set(["action", "card", "standard-project", "threshold"]);

function payRulingPolicyTrLevy(state, playerId, steps) {
  const owed = getTrSurcharge(state, steps);
  if (owed <= 0) return;
  const payer = getPlayer(state, playerId);
  const paid = Math.min(owed, payer?.mc ?? 0);
  if (paid <= 0) return;
  state.players = state.players.map(player =>
    player.id === playerId ? { ...player, mc: player.mc - paid } : player
  );
  state.logs = addLog(state.logs, "system", `レッズ政策: TR上昇 ${steps}段階につき ${paid} MC を支払いました。`);
}

function bumpTr(state, playerId, amount) {
  increaseTerraformRating(state, playerId, amount, "action");
}

// Placement bonuses printed on the space go to whoever covers it.
function grantPlacementBonus(state, cell, ownerId) {
  const grants = cell.bonusType === "multi" && Array.isArray(cell.bonus)
    ? cell.bonus
    : cell.bonusType && cell.bonusType !== "none"
      ? [{ type: cell.bonusType, amount: cell.bonusAmount }]
      : [];

  for (const grant of grants) {
    // Hellas' south pole pays an ocean tile, not a resource. There is no
    // player field for it, so the generic branch below silently dropped it —
    // `field in player` was false and the grant vanished. The tile goes to a
    // real ocean space, which is the player's choice; with the space already
    // paid for, the first legal one keeps the placement automatic like every
    // other bonus here.
    if (grant.type === "ocean-tile") {
      if (state.oceans < MAX_OCEANS) {
        const target = firstLegalSpace(state, "ocean");
        if (target) placeTileAt(state, target, "ocean", ownerId);
      }
      continue;
    }
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
      deck = shuffle(discard, state);
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

// Whether a player can pay for one branch of an OR action. Only resourcesHere
// was ever checked, so a branch costing plants, steel, titanium, energy or
// megacredits was offered to anyone -- Electro Catapult handed 7 M€ to a player
// holding neither a plant nor a steel.
function canAffordActionPayment(state, card, payment = {}) {
  const player = getCurrentPlayer(state);
  for (const [resource, amount] of Object.entries(payment)) {
    if (!amount) continue;
    if (resource === "canUseSteel" || resource === "canUseTitanium") continue;
    if (resource === "cardResources") {
      if ((player?.cardResources?.[card.id] ?? 0) < amount) return false;
      continue;
    }
    if (resource === "mc" && (payment.canUseSteel || payment.canUseTitanium)) {
      const source = payment.canUseTitanium ? "titanium" : "steel";
      const worth = source === "titanium" ? getTitaniumValue(state) : getSteelValue(state);
      if ((player?.mc ?? 0) + (player?.[source] ?? 0) * worth < amount) return false;
      continue;
    }
    if ((player?.[resource] ?? 0) < amount) return false;
  }
  return true;
}

function canAffordBranch(state, card, behavior) {
  const normalized = normalizeBehavior(behavior, {}, []);
  return canAffordActionPayment(state, card, normalized.payment);
}

export function getCardActionStatus(state, card) {
  if (getCurrentPlayer(state)?.passed) {
    return { playable: false, reason: "パス済みのため、この世代は行動できません。" };
  }
  const action = getCardEffect(card).action;
  // Power Infrastructure's action is an amount rather than a behaviour block, so
  // it has nothing for normalizeBehavior to produce.
  if (card.id === POWER_INFRASTRUCTURE_ID) {
    if ((getCurrentPlayer(state)?.usedCardActions ?? []).includes(card.id)) {
      return { playable: false, reason: "このカードのアクションは、この世代ではすでに使用済みです。" };
    }
    return (getCurrentPlayer(state)?.energy ?? 0) > 0
      ? { playable: true, reason: "" }
      : { playable: false, reason: "エネルギーがありません。" };
  }
  // Floyd Continuum pays nothing until a parameter is finished, but the action
  // is still legal -- the reference lets it be used for zero.
  if (card.id === FLOYD_CONTINUUM_ID) {
    return (getCurrentPlayer(state)?.usedCardActions ?? []).includes(card.id)
      ? { playable: false, reason: "このカードのアクションは、この世代ではすでに使用済みです。" }
      : { playable: true, reason: "" };
  }
  if (card.id === HI_TECH_LAB_ID) {
    const seat = getCurrentPlayer(state);
    if ((seat?.usedCardActions ?? []).includes(card.id)) {
      return { playable: false, reason: "このカードのアクションは、この世代ではすでに使用済みです。" };
    }
    return (seat?.energy ?? 0) > 0
      ? { playable: true, reason: "" }
      : { playable: false, reason: "エネルギーがありません。" };
  }
  if (card.id === ENERGY_MARKET_ID) {
    const seat = getCurrentPlayer(state);
    if ((seat?.usedCardActions ?? []).includes(card.id)) {
      return { playable: false, reason: "このカードのアクションは、この世代ではすでに使用済みです。" };
    }
    return (seat?.mc ?? 0) >= 2 || (seat?.energyProd ?? 0) >= 1
      ? { playable: true, reason: "" }
      : { playable: false, reason: "2 MCかエネルギー生産量が必要です。" };
  }
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
    const usable = branches.some(behavior => canAffordBranch(state, card, behavior));
    return usable
      ? { playable: true, reason: "" }
      : { playable: false, reason: "このカードの資源が不足しています。" };
  }
  if (action.energyCost && state.energy < action.energyCost) {
    return { playable: false, reason: "エネルギーが不足しています。" };
  }
  const steelWorth = getSteelValue(state);
  const steelCover = action.steelCost ? Math.min(state.steel, Math.floor((action.mcCost ?? 0) / steelWorth)) : 0;
  const mcCost = Math.max(0, (action.mcCost ?? 0) - steelCover * steelWorth);
  if (state.mc < mcCost) return { playable: false, reason: "MCが不足しています。" };
  if (action.tile === "ocean" && state.oceans >= 9) return { playable: false, reason: "海洋タイルが上限に達しています。" };
  if (action.revealTag && state.deck.length === 0 && state.discardPile.length === 0) {
    return { playable: false, reason: "公開できるカードがありません。" };
  }
  if (action.buildCathedral && getEligibleCathedralCells(state).length === 0) {
    return { playable: false, reason: "大聖堂を建設できる都市がありません。" };
  }
  if (action.unsupported?.length) return { playable: false, reason: "このカードの選択式アクションは準備中です。" };
  if (!canAffordActionPayment(state, card, action.payment)) return { playable: false, reason: "支払い資源が不足しています。" };
  return { playable: true, reason: "" };
}

export function applyCardAction(state, card, logs, branchIndex) {
  const status = getCardActionStatus(state, card);
  if (!status.playable) return { state, logs, playable: false };
  const nextState = cloneGameState(state);

  // "Spend any amount of energy to gain that amount of M€." How much is the
  // player's call, so the amounts are offered as the choice.
  if (card.id === POWER_INFRASTRUCTURE_ID) {
    const available = nextState.energy ?? 0;
    const choice = buildAmountChoice(nextState, {
      stage: "power-infrastructure",
      max: available,
      sourceKind: "card-action",
      sourceId: card.id,
      consumedAction: true,
      paid: false,
      prompt: "エネルギーをいくつMCに変換しますか。",
      labelFor: amount => `エネルギー -${amount} / MC +${amount}`
    });
    if (!choice) return { state, logs, playable: false };
    nextState.usedCardActions = [...(nextState.usedCardActions ?? []), card.id];
    nextState.pendingChoice = choice;
    return { state: nextState, logs, playable: true, awaitingChoice: true };
  }

  // "Spend any amount of energy to draw the same number of cards, take one into
  // hand and discard the rest." Two questions: how many, then which one to keep.
  if (card.id === HI_TECH_LAB_ID) {
    const choice = buildAmountChoice(nextState, {
      stage: "hi-tech-lab",
      max: nextState.energy ?? 0,
      sourceKind: "card-action",
      sourceId: card.id,
      consumedAction: true,
      paid: false,
      prompt: "エネルギーをいくつ支払って、同じ枚数を引きますか。",
      labelFor: amount => `エネルギー -${amount} / ${amount}枚引く`
    });
    if (!choice) return { state, logs, playable: false };
    nextState.usedCardActions = [...(nextState.usedCardActions ?? []), card.id];
    nextState.pendingChoice = choice;
    return { state: nextState, logs, playable: true, awaitingChoice: true };
  }

  // "Spend 2X M€ to gain X energy, OR decrease energy production 1 step to gain
  // 8 M€." The first half is an amount and the second is a single option, so
  // both halves live in one list rather than a branch that asks again.
  if (card.id === ENERGY_MARKET_ID) {
    const options = [];
    const affordable = Math.floor((nextState.mc ?? 0) / 2);
    for (let amount = 1; amount <= affordable; amount++) {
      options.push({ id: `energy-${amount}`, label: `MC -${amount * 2} / エネルギー +${amount}`, energy: amount });
    }
    if ((nextState.energyProd ?? 0) >= 1) {
      options.push({ id: "sell-production", label: "エネルギー生産量 -1 / MC +8", sellProduction: true });
    }
    if (options.length === 0) return { state, logs, playable: false };
    nextState.usedCardActions = [...(nextState.usedCardActions ?? []), card.id];
    nextState.pendingChoice = {
      id: `energy-market:${nextState.currentPlayerId}`,
      kind: "energy-market",
      ownerPlayerId: nextState.currentPlayerId,
      prompt: "Energy Market: どちらを行いますか。",
      optional: false,
      options,
      continuation: {
        sourceKind: "card-action",
        sourceId: card.id,
        stage: "energy-market",
        consumedAction: true,
        paid: false
      }
    };
    return { state: nextState, logs, playable: true, awaitingChoice: true };
  }

  // "3 M€ for each completed terraforming parameter." Venus counts only when the
  // expansion is in play, as it does in the reference.
  if (card.id === FLOYD_CONTINUUM_ID) {
    let completed = 0;
    if (nextState.temperature >= MAX_TEMPERATURE) completed += 1;
    if (nextState.oxygen >= MAX_OXYGEN) completed += 1;
    if (nextState.oceans >= MAX_OCEANS) completed += 1;
    if (nextState.venusEnabled && nextState.venus >= MAX_VENUS) completed += 1;
    nextState.usedCardActions = [...(nextState.usedCardActions ?? []), card.id];
    nextState.mc += completed * 3;
    return {
      state: nextState,
      logs: addLog(logs, "player", `Floyd Continuum: 完了パラメータ${completed}個で MC +${completed * 3}`),
      playable: true
    };
  }

  // "Remove N resources for X, or add one" is a choice the player makes every
  // turn. Normalising it collapsed the branch to the first entry, so the card
  // always spent resources and could never accumulate them.
  const rawOr = card.effectSpec?.action?.or;
  const branches = Array.isArray(rawOr?.behaviors) ? rawOr.behaviors : null;
  let action = getCardEffect(card).action;
  if (branches) {
    const affordable = branches
      .map((behavior, index) => ({ behavior, index }))
      .filter(({ behavior }) => canAffordBranch(state, card, behavior));
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
      // Only the affordable branches are offered; the original index travels
      // with each so resolution still selects the right behaviour.
      const choice = buildBranchChoice(nextState, affordable.map(entry => entry.behavior), {
        branchIndexes: affordable.map(entry => entry.index),
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
  const actionSteelWorth = getSteelValue(nextState);
  if (action.steelCost) {
    steelCover = Math.min(nextState.steel, Math.floor((action.mcCost ?? 0) / actionSteelWorth));
    nextState.steel -= steelCover;
  }
  if (action.mcCost) nextState.mc -= Math.max(0, action.mcCost - steelCover * actionSteelWorth);

  let nextLogs = addLog(logs, "player", `カードアクションを実行しました: 【${card.name}】`);
  if (action.revealTag) {
    let deck = [...nextState.deck];
    let discard = [...nextState.discardPile];
    if (deck.length === 0 && discard.length > 0) {
      deck = shuffle(discard, nextState);
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

  // An action that spends a card resource has to take it before it grants
  // anything. Card actions run their own chain rather than going through
  // queuePendingChoices, so the removal is asked for here.
  const removalSpec = action.removeResourcesFromAnyCard ?? card.effectSpec?.action?.removeResourcesFromAnyCard;
  if (removalSpec) {
    const removal = buildResourceRemovalChoice(nextState, removalSpec, {
      cards: ALL_CARDS,
      getResourceType: getCardResourceType,
      sourceKind: "card-action",
      sourceId: card.id,
      consumedAction: true,
      paid: true
    });
    if (!removal) {
      // Nothing holds the resource, so the action cannot be taken at all.
      return { state, logs, playable: false };
    }
    if (removal.autoTarget) {
      applyResourceToCard(nextState, removal.autoTarget, -removal.count);
      nextLogs = addLog(nextLogs, "system", `${removal.autoTarget.label}から資源を${removal.count}個取り除きました。`);
    } else {
      nextState.pendingChoice = removal;
      nextState.logs = nextLogs;
      return { state: nextState, logs: nextLogs, playable: true, awaitingChoice: true };
    }
  }

  // The same detour as the removal above, in the granting direction: Directed
  // Impactors buys an asteroid for "ANY CARD", and with the choice never asked
  // the titanium was spent and no resource ever arrived.
  const additionSpec = action.addResourcesToAnyCard ?? card.effectSpec?.action?.addResourcesToAnyCard;
  if (additionSpec) {
    const specs = Array.isArray(additionSpec) ? additionSpec : [additionSpec];
    for (const spec of specs) {
      const addition = buildResourceChoice(nextState, spec, {
        cards: ALL_CARDS,
        getResourceType: getCardResourceType,
        sourceKind: "card-action",
        sourceId: card.id,
        consumedAction: true,
        paid: true
      });
      if (!addition) continue;
      if (addition.autoTarget) {
        applyResourceToCard(nextState, addition.autoTarget, addition.count);
        nextLogs = addLog(nextLogs, "system", `${addition.autoTarget.label}に資源を${addition.count}個置きました。`);
        continue;
      }
      nextState.pendingChoice = addition;
      nextState.logs = nextLogs;
      return { state: nextState, logs: nextLogs, playable: true, awaitingChoice: true };
    }
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
  // Both read "when you play ...", so they fire on the owner's own plays only,
  // which is the card that just resolved for the seated player.
  if (card.type === "event" && nextState.playedProjects.some(id => id === "card-base-media-group")) {
    nextState.mc += 3;
    nextLogs = addLog(nextLogs, "system", "Media Group: MC +3");
  }
  if (
    card.type === "event" &&
    card.tags.includes("Space") &&
    nextState.playedProjects.some(id => id === "card-base-optimal-aerobraking")
  ) {
    nextState.mc += 3;
    nextState.heat += 3;
    nextLogs = addLog(nextLogs, "system", "Optimal Aerobraking: MC +3、熱 +3");
  }

  // "When you play a card with a basic cost of 20 M€ or more" -- the printed
  // cost, before any discount the player happens to have. Events are project
  // cards too, so they count.
  if (
    (card.cost ?? 0) >= 20 &&
    nextState.playedProjects.some(id => id === "card-promo-advertising")
  ) {
    nextState.mcProd = (nextState.mcProd ?? 0) + 1;
    nextLogs = addLog(nextLogs, "system", "Advertising: MC生産量 +1");
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
    setupContinuation: null,
    // Questions waiting behind the live one, and the phase work that resumes
    // when they are all answered.
    pendingChoiceQueue: [],
    phaseContinuation: null,
    resolvedChoices: {},
    turmoil: null,
    colonies: null,
    logs: [],
    isGameOver: false,
    gameResult: null,
    standings: null,
    lastAction: null,
    winnerPlayerIds: null,
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
  return cards.filter(card => {
    if (!allowed.has(card.expansion ?? "base")) return false;
    // A Prelude-box card can still need Venus, Colonies or Turmoil to do
    // anything; its own expansion being on is not enough.
    const needs = CARD_EXPANSION_DEPENDENCIES[card.id];
    return !needs || needs.every(expansion => allowed.has(expansion));
  });
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
  // Setup shuffles run before the state object exists, so they draw from a
  // stand-in carrying the same two fields. Passing a seed makes the whole deal
  // -- deck, corporations, preludes, events, colonies -- reproducible.
  const dealer = { rngSeed: options.seed ?? createSeed(), rngDraws: 0 };
  const allCardIds = poolFor(ALL_CARDS, allowed).map(c => c.id);
  let shuffledDeck = shuffle(allCardIds, dealer);

  // Official solo rules seed the board with two neutral cities, each with an
  // adjacent neutral greenery. The reference implementation discards a card per
  // tile and counts that many available land spaces from the top, then the bottom.
  if (mode === "solo") {
    shuffledDeck = placeNeutralTiles(board, shuffledDeck);
  }
  const corporationPool = shuffle(poolFor(CORPORATIONS, allowed).map(corporation => corporation.id), dealer);
  // Preludes are their own expansion: no prelude, no prelude options dealt.
  const preludePool = options.prelude
    ? shuffle(poolFor(PRELUDES, allowed).map(prelude => prelude.id), dealer)
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

  // Valley Trust draws three more preludes as its first action, so what the deal
  // did not hand out has to survive setup for it to draw from.
  const preludeDeck = preludePool.slice(playerCount * 4);

  const turnOrder = players.map(player => player.id);
  // Setup places neutral delegates from the two events it draws, so the starting
  // dominant party depends on the shuffle. Tests pass globalEventOrder to pin it.
  // Five of the 36 events belong to Colonies or Venus; without them the deck is
  // the 31 the Turmoil box ships with.
  const eventPool = playableGlobalEvents(GLOBAL_EVENTS, {
    venus: Boolean(options.venus),
    colonies: Boolean(options.colonies)
  });
  const turmoil = options.turmoil
    ? createTurmoilState(
        turnOrder,
        options.globalEventOrder ?? shuffle(eventPool.map(event => event.id), dealer),
        findGlobalEvent
      )
    : null;
  const colonies = options.colonies
    ? createColoniesState(turnOrder, shuffle(COLONY_TILES.map(tile => tile.id), dealer), {
        soloDraft: mode === "solo"
      })
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
    preludeDeck,
    discardPile: [],
    claimedMilestones: [],
    fundedAwards: [],
    scoreModifiers: [],
    boardMarkers: [],
    generationAttackLedger: [],
    pendingChoice: null,
    // Questions waiting behind the live one, and the phase work that resumes
    // when they are all answered.
    pendingChoiceQueue: [],
    phaseContinuation: null,
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
    standings: null,
    lastAction: null,
    winnerPlayerIds: null,
    onboarded: false,
    // Carried so a reshuffle mid-game continues the same sequence, and so a
    // saved game resumes drawing exactly where it left off.
    rngSeed: dealer.rngSeed,
    rngDraws: dealer.rngDraws
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
  // Building a colony is a standard project in the Colonies rules, so Standard
  // Technology refunds against it like any other.
  grantStandardProjectRebate(next, actorId);
  const tile = getColonyTile(tileId);
  let nextLogs = addLog(
    logs,
    "system",
    `${getPlayer(next, actorId)?.name ?? actorId} が ${tile?.name ?? tileId} に入植しました。`
  );

  const granted = grantColonyBenefit(next, result.bonus, actorId, nextLogs);
  next.logs = granted.logs;
  return { state: next, logs: granted.logs, built: true };
}

export function tradeWith(state, tileId, logs, playerId, options = {}) {
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
  // The rules let the trader choose which of the three costs to pay, and that
  // choice is real: energy is scarce for some engines and worthless to others.
  // Callers that do not care keep the old behaviour -- energy and titanium
  // before megacredits -- so the bot and existing saves are unaffected.
  const priority = ["energy", "titanium", "mc"];
  const chosen = options.payWith
    ? payable.find(entry => entry.resource === options.payWith)
    : null;
  if (options.payWith && !chosen) {
    return {
      state,
      logs: addLog(logs, "system", `${TRADE_LABELS[options.payWith] ?? options.payWith} では支払えません。`),
      traded: false
    };
  }
  const payment =
    chosen ??
    payable.slice().sort((a, b) => priority.indexOf(a.resource) - priority.indexOf(b.resource))[0];

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
    `${getPlayer(next, actorId)?.name ?? actorId} が ${tile?.name ?? tileId} と交易しました（${payment.cost}${TRADE_LABELS[payment.resource]} 支払い）。`
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
  // Influence is read off the board as it stands now, which is why this runs
  // ahead of the delegate cleanup in step 3.
  const resolvedEvent = next.turmoil.currentEvent;
  if (resolvedEvent) {
    const event = GLOBAL_EVENTS.find(item => item.id === resolvedEvent);
    if (event) nextLogs = applyGlobalEventEffect(next, event, nextLogs);
  }

  // If the event asked anyone anything, the phase stops here. New Government
  // and Changing Times must not run over an open question, so the rest of the
  // phase is parked and resumes when the last answer comes in.
  if (next.pendingChoice || (next.pendingChoiceQueue ?? []).length > 0) {
    if (!next.pendingChoice) promoteNextChoice(next);
    next.phaseContinuation = { kind: "turmoil-after-event" };
    next.logs = nextLogs;
    return { state: next, logs: nextLogs };
  }

  return finishTurmoilPhase(next, nextLogs);
}

// Turmoil steps 3 and 4, split out so a global event that has to ask something
// can suspend the phase between step 2 and step 3 without losing its place.
export function finishTurmoilPhase(state, logs) {
  const next = state;
  let nextLogs = logs;
  {
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
      // Becoming chairman is not terraforming, so it is outside the levy.
      player.id === result.newChairman ? { ...player, tr: player.tr + 1 } : player
    );
    const chairman = getPlayer(next, result.newChairman);
    nextLogs = addLog(nextLogs, "system", `${chairman?.name ?? result.newChairman} が議長に就任し TR +1。`);
  } else {
    nextLogs = addLog(nextLogs, "system", "中立の代表者が議長になりました。");
  }

  const ruling = getParty(result.rulingParty);
  nextLogs = addLog(nextLogs, "system", `与党は ${ruling?.name ?? result.rulingParty} になりました。`);

    // Step 4, Changing Times: the event queue moves up now that the event that
    // was Current has been resolved.
    next.turmoil = advanceGlobalEvents(next.turmoil, findGlobalEvent).turmoil;
  }

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

export function applyTrSwing(players, bonus) {
  // "Lowest TR" has no meaning with one player -- everyone is the lowest -- so
  // the solo rules replace the comparison with a fixed threshold: the bonus
  // lands only while TR is 20 or under.
  if (players.length === 1) {
    const [only] = players;
    if (bonus.kind === "lowestTr" && only.tr > SOLO_TR_SWING_THRESHOLD) return players;
    return [{ ...only, tr: Math.max(0, only.tr + bonus.amount) }];
  }
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
    offBoardCities: state.offBoardCities ?? [],
    cards: ALL_CARDS,
    preludes: PRELUDES,
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

  // The solo game is a mission against the planet: there is nobody to beat to a
  // milestone, and the official variant leaves them out entirely.
  if (state.mode === "solo") {
    return { claimable: false, reason: "ソロプレイではマイルストーンを使用しません。", score, threshold, description };
  }

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

// Vitor funds one award for free. The award ladder still advances -- the next
// award costs what it would have -- because only Vitor's own payment is waived.
function getAwardCostFor(state, player) {
  const corporation = CORPORATIONS.find(item => item.id === player?.corporationId);
  if (corporation?.effects?.firstAward && !player.freeAwardUsed) return 0;
  return getNextAwardCost(state);
}

export function getAwardStatus(state, awardId, playerId) {
  const award = getAward(awardId);
  if (!award) return { fundable: false, reason: "不明な表彰です。" };

  const player = getPlayer(state, playerId);
  if (!player) return { fundable: false, reason: "プレイヤーが見つかりません。" };

  const cost = getAwardCostFor(state, player);
  // Awards rank players against each other, which the solo variant has no use
  // for; the official rules leave them out along with the milestones.
  if (state.mode === "solo") {
    return { fundable: false, reason: "ソロプレイでは表彰を使用しません。", cost };
  }
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
    player.id === targetId
      ? { ...player, mc: player.mc - status.cost, freeAwardUsed: true }
      : player
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

// Counts whatever a global event spec asks to tally for one player.
function countForGlobalEvent(state, player, count) {
  if (!count) return 0;
  if (count.tag) {
    const tags = countTagsFor(state, count.tag, player);
    return tags + (count.plusInfluence ? getInfluence(state.turmoil, player.id) : 0);
  }
  if (count.tile) {
    return Object.values(state.board).filter(
      cell => cell.tileType === count.tile && cell.placedBy === player.id
    ).length;
  }
  if (count.production) return player[count.production] ?? 0;
  if (count.handSize) return (player.hand ?? []).length;
  if (count.playedEvents) return (player.playedEvents ?? []).length;
  if (count.colonies) return state.colonies ? countColonies(state.colonies, player.id) : 0;
  if (count.blueCards) {
    return (player.playedProjects ?? []).filter(id => {
      const card = ALL_CARDS.find(item => item.id === id);
      return card?.type === "active" || card?.type === "blue";
    }).length;
  }
  if (count.tilesAdjacentToOcean) {
    return Object.values(state.board).filter(cell => {
      if (cell.placedBy !== player.id || cell.tileType === "empty") return false;
      return getAdjacentCells(cell.q, cell.r).some(
        neighbour => state.board[`${neighbour.q},${neighbour.r}`]?.tileType === "ocean"
      );
    }).length;
  }
  return 0;
}

// Cloud Societies and Sponsored Projects add a resource to every qualifying card
// at once. "Every card" needs no choice, so these resolve immediately; only the
// influence share, which names specific cards, would need one.
//
// getCardResourceType has to be handed to collectResourceTargets or it matches
// nothing at all rather than raising (§2.8).
function addResourceToEveryCard(state, { resourceType, requireExisting }, logs) {
  const targets = collectResourceTargets(state, resourceType ?? null, ALL_CARDS, {
    mustHaveResources: Boolean(requireExisting),
    getResourceType: getCardResourceType
  });
  if (targets.length === 0) return logs;

  state.players = state.players.map(player => {
    const mine = targets.filter(target => target.targetPlayerId === player.id);
    if (mine.length === 0) return player;
    const cardResources = { ...(player.cardResources ?? {}) };
    for (const target of mine) {
      cardResources[target.targetCardId] = (cardResources[target.targetCardId] ?? 0) + 1;
    }
    return { ...player, cardResources };
  });

  return addLog(logs, "system", `${targets.length}枚のカードに資源を1個ずつ追加しました。`);
}

// Distinct tags the way the reference counts them for a global event: it walks
// the tableau — corporation, played projects and chosen preludes — and skips
// events, because a resolved event is no longer on the table. Wild tags are
// deliberately not expanded: "Global events occur outside the action phase.
// Stop counting here, before wild tags apply."
function countDistinctTags(state, player) {
  const distinct = new Set();
  const collect = card => {
    for (const tag of card?.tags ?? []) {
      if (String(tag).toLowerCase() !== "wild") distinct.add(tag);
    }
  };

  collect(CORPORATIONS.find(item => item.id === player.corporationId));
  for (const id of player.playedProjects ?? []) {
    const card = ALL_CARDS.find(item => item.id === id);
    if (card?.type === "event") continue;
    collect(card);
  }
  for (const id of player.selectedPreludeIds ?? []) {
    collect(PRELUDES.find(item => item.id === id));
  }
  return distinct.size;
}

// Paradigm Breakdown: every player discards two cards, and each picks their own.
// One question per card per player goes on the queue, in turn order, so nobody
// is discarded for. A player holding fewer cards discards what they have.
function queueForcedDiscards(state, count, sourceId) {
  const choices = [];
  for (const playerId of state.turnOrder) {
    const player = getPlayer(state, playerId);
    const holding = (player?.hand ?? []).length;
    for (let index = 0; index < Math.min(count, holding); index += 1) {
      choices.push(
        buildEventDiscardChoice(
          state,
          playerId,
          sourceId,
          index,
          Math.min(count, holding),
          ALL_CARDS
        )
      );
    }
  }
  enqueuePendingChoices(state, choices);
}

// Cards of a player that hold at least `count` of a card resource.
function cardsHolding(player, resourceType, count) {
  return Object.entries(player.cardResources ?? {}).filter(([cardId, held]) => {
    if (held < count) return false;
    const declared =
      ALL_CARDS.find(item => item.id === cardId)?.resourceType ?? getCardResourceType(cardId);
    return String(declared ?? "").toLowerCase() === resourceType;
  });
}

// Corrosive Rain: 2 floaters off a card, or up to 10 M€. A player with no card
// holding two floaters has nothing to decide and simply pays, which is how the
// reference resolves it. Everyone else is asked, in turn order.
function queueCorrosiveRain(state, { floaters, mc }, sourceId, logs) {
  let nextLogs = logs;
  const choices = [];

  for (const playerId of state.turnOrder) {
    const player = getPlayer(state, playerId);
    if (!player) continue;
    const cards = cardsHolding(player, "floater", floaters);

    if (cards.length === 0) {
      const paid = Math.min(mc, player.mc);
      state.players = state.players.map(entry =>
        entry.id === playerId ? { ...entry, mc: entry.mc - paid } : entry
      );
      nextLogs = addLog(nextLogs, "system", `${player.name} が ${paid} MC を失いました。`);
      continue;
    }

    choices.push(
      buildCorrosiveRainChoice(state, playerId, sourceId, {
        floaters,
        mc,
        cards: cards.map(([cardId]) => ({
          cardId,
          label: ALL_CARDS.find(item => item.id === cardId)?.name ?? cardId
        }))
      })
    );
  }

  enqueuePendingChoices(state, choices);
  return nextLogs;
}

// Election and Revolution rank the players and pay the top two places. Ties are
// friendly: everyone level with first place takes the first prize, and if first
// is shared nobody takes second (reference Election/Revolution.resolve).
// Deterministic, so no choice is involved.
function applyGlobalEventContest(state, spec, logs) {
  let nextLogs = logs;
  const scoreOf = player => {
    let score = getInfluence(state.turmoil, player.id);
    for (const source of spec.contest.influencePlus) {
      if (source === "cityTiles") {
        score += Object.values(state.board).filter(
          cell => cell.tileType === "city" && cell.placedBy === player.id
        ).length;
      } else {
        score += countTagsFor(state, source, player);
      }
    }
    return score;
  };

  const award = (playerId, amount) => {
    if (!amount) return;
    state.players = state.players.map(player =>
      player.id === playerId
        ? { ...player, tr: Math.max(0, player.tr + amount) }
        : player
    );
    const player = getPlayer(state, playerId);
    nextLogs = addLog(
      nextLogs,
      "system",
      `${player?.name ?? playerId} が TR ${amount > 0 ? "+" : ""}${amount}。`
    );
  };

  // Solo uses fixed thresholds rather than a ranking.
  if (state.players.length === 1) {
    const [only] = state.players;
    const score = scoreOf(only);
    if (spec.contest.soloThreshold !== undefined) {
      if (score >= spec.contest.soloThreshold) award(only.id, spec.contest.soloReward);
    } else if (spec.contest.soloThresholds) {
      const [first, second] = spec.contest.soloThresholds;
      if (score >= first) award(only.id, spec.contest.rewards[0]);
      else if (score >= second) award(only.id, spec.contest.rewards[1]);
    }
    return nextLogs;
  }

  const ranked = state.players
    .map(player => ({ id: player.id, score: scoreOf(player) }))
    .sort((a, b) => b.score - a.score);

  const [firstPrize, secondPrize] = spec.contest.rewards;
  const minimum = spec.contest.minimum ?? -Infinity;
  const best = ranked[0].score;
  const firstPlace = ranked.filter(entry => entry.score === best);

  for (const entry of firstPlace) {
    if (entry.score >= minimum) award(entry.id, firstPrize);
  }
  // A shared first place consumes second as well.
  if (firstPlace.length > 1) return nextLogs;

  const rest = ranked.slice(1);
  if (rest.length === 0) return nextLogs;
  const runnerUp = rest[0].score;
  for (const entry of rest.filter(entry => entry.score === runnerUp)) {
    if (entry.score >= minimum) award(entry.id, secondPrize);
  }
  return nextLogs;
}

// Applies one global event to every player. Turmoil rules put a hard cap of 5 on
// anything an event counts, and losses are reduced by influence before they land.
function applyGlobalEventEffect(state, event, logs) {
  const spec = getGlobalEventEffect(event.id);
  if (!spec) return logs;
  let nextLogs = logs;

  state.players = state.players.map(player => {
    const influence = getInfluence(state.turmoil, player.id);
    let updated = { ...player };
    const deltas = {};
    const add = (field, amount) => {
      if (!amount) return;
      deltas[field] = (deltas[field] ?? 0) + amount;
    };

    if (spec.count && spec.per) {
      let counted = countForGlobalEvent(state, player, spec.count);
      if (spec.cap !== undefined) counted = Math.min(counted, spec.cap);
      if (spec.softenedByInfluence) counted = Math.max(0, counted - influence);
      if (spec.divideBy) counted = Math.floor(counted / spec.divideBy);
      for (const [field, amount] of Object.entries(spec.per)) add(field, amount * counted);
    }

    if (spec.influencePer) {
      for (const [field, amount] of Object.entries(spec.influencePer)) {
        add(field, amount * influence);
      }
    }

    if (spec.trBrackets) {
      // Reference: floor((TR - above) / step), with no +1. Generous Funding pays
      // nothing at TR 15 and one set at TR 20 — "for every 5 TR *above* 15".
      const { above, step, cap, per } = spec.trBrackets;
      const brackets = Math.max(0, Math.min(cap, Math.floor((updated.tr - above) / step)));
      for (const [field, amount] of Object.entries(per)) add(field, amount * brackets);
    }

    if (spec.productionLoss) {
      for (const [field, amount] of Object.entries(spec.productionLoss)) {
        add(field, -Math.min(amount, updated[field] ?? 0));
      }
    }

    if (spec.also?.loseAll) add(spec.also.loseAll, -(updated[spec.also.loseAll] ?? 0));

    if (spec.keepUpTo) {
      const allowed = spec.keepUpTo.base + influence;
      const held = updated[spec.keepUpTo.resource] ?? 0;
      if (held > allowed) add(spec.keepUpTo.resource, -(held - allowed));
    }

    if (spec.flatTrLoss) add("tr", -Math.max(0, spec.flatTrLoss - influence));

    if (spec.distinctTags) {
      // Reference Diversity: distinctCount('globalEvent') + influence >= 9.
      // Influence contributes its value, not a single "counts as one tag".
      const total = countDistinctTags(state, player) + influence;
      if (total >= spec.distinctTags.threshold) {
        for (const [field, amount] of Object.entries(spec.distinctTags.reward)) add(field, amount);
      }
    }

    if (spec.influenceDraws) updated.pendingDraws = (updated.pendingDraws ?? 0) + influence;

    for (const [field, amount] of Object.entries(deltas)) {
      const floor = field === "tr" ? 0 : 0;
      updated[field] = Math.max(floor, (updated[field] ?? 0) + amount);
    }
    return updated;
  });

  // A global event moves the track like anything else, so it goes through the
  // shared path: Volcanic Eruptions crossing 0°C lays the ocean the track owes,
  // and nobody is paid TR for an event.
  if (spec.global) {
    for (const [field, amount] of Object.entries(spec.global)) {
      if (amount > 0) {
        const perStep = field === "oxygen" ? 1 : 2;
        const applied = applyGlobalParameterChange(state, {
          parameter: field,
          steps: amount / perStep,
          actorPlayerId: null,
          grantTr: false
        }, nextLogs);
        nextLogs = applied.logs;
      } else if (field === "temperature") {
        // Snow Cover pushes the temperature back down; nothing is triggered by
        // a falling track.
        state.temperature = Math.max(-30, state.temperature + amount);
      }
    }
  }

  if (spec.contest) nextLogs = applyGlobalEventContest(state, spec, nextLogs);

  // Aquifer Released by Public Council: the first player lays an ocean. It is
  // the board's ocean, not theirs, so it pays no TR or placement bonus — the
  // same terms as the World Government's.
  if (spec.firstPlayerPlacesOcean && state.oceans < MAX_OCEANS) {
    const choice = buildTileChoice(
      state,
      "ocean",
      {
        sourceKind: "global-event",
        sourceId: event.id,
        consumedAction: false,
        paid: true,
        remaining: 1
      },
      legalCellsFor(state, "ocean", state.firstPlayerId)
    );
    if (choice) {
      choice.ownerPlayerId = state.firstPlayerId;
      // A distinct stage from the World Government's: this one resolves inside
      // the turmoil phase and must NOT resume the solar phase, or the whole
      // generation end would run a second time.
      choice.continuation.stage = "global-event-ocean";
      choice.prompt = "世界的イベント: 海洋タイルを配置するマスを選んでください。";
      state.pendingChoice = choice;
    }
  }

  // Paradigm Breakdown: everyone discards two cards. Only the acting player is
  // asked — a queue of one question per player is more machinery than the one
  // pendingChoice slot supports, so the rest discard from the front of their
  // hand. That keeps the card count right for everyone.
  if (spec.discardFromHand) {
    queueForcedDiscards(state, spec.discardFromHand, event.id);
  }

  // Corrosive Rain: lose 2 floaters from a card, or 10 MC. With no card holding
  // two floaters there is nothing to choose and the MC goes automatically,
  // which is how the reference resolves it too.
  if (spec.loseFloatersOrMc) {
    nextLogs = queueCorrosiveRain(state, spec.loseFloatersOrMc, event.id, nextLogs);
  }

  // "1 standard resource per influence" — one pick per point, in turn order.
  if (spec.influenceStandardResource) {
    const picks = [];
    for (const playerId of state.turnOrder) {
      const total = getInfluence(state.turmoil, playerId) * spec.influenceStandardResource;
      for (let index = 0; index < total; index += 1) {
        picks.push(buildStandardResourcePickChoice(state, playerId, event.id, index, total));
      }
    }
    enqueuePendingChoices(state, picks);
  }

  // "1 floater on a card per influence" — the player names the card each time.
  if (spec.influenceAddsToCards) {
    const picks = [];
    for (const playerId of state.turnOrder) {
      const total = getInfluence(state.turmoil, playerId);
      if (total === 0) continue;
      const player = getPlayer(state, playerId);
      const targets = (player?.playedProjects ?? [])
        .filter(cardId => {
          const declared =
            ALL_CARDS.find(item => item.id === cardId)?.resourceType ??
            getCardResourceType(cardId);
          return String(declared ?? "").toLowerCase() === spec.influenceAddsToCards;
        })
        .map(cardId => ({
          cardId,
          label: ALL_CARDS.find(item => item.id === cardId)?.name ?? cardId
        }));
      for (let index = 0; index < total; index += 1) {
        picks.push(
          buildFloaterPlacementChoice(state, playerId, event.id, index, total, targets)
        );
      }
    }
    enqueuePendingChoices(state, picks);
  }

  // Dry Deserts: the first player takes an ocean back off the board.
  if (spec.firstPlayerRemovesOcean) {
    const oceanCells = Object.values(state.board).filter(cell => cell.tileType === "ocean");
    const choice = buildOceanRemovalChoice(state, event.id, state.firstPlayerId, oceanCells);
    if (choice) state.pendingChoice = choice;
  }

  if (spec.addResourceToAll) {
    nextLogs = addResourceToEveryCard(state, { resourceType: spec.addResourceToAll }, nextLogs);
  }
  if (spec.addResourceToCardsHoldingResources) {
    nextLogs = addResourceToEveryCard(state, { requireExisting: true }, nextLogs);
  }

  nextLogs = addLog(nextLogs, "system", `世界的イベント解決: ${event.name}`);
  return nextLogs;
}

function findGlobalEvent(eventId) {
  return eventId ? GLOBAL_EVENTS.find(event => event.id === eventId) ?? null : null;
}

export function isGameOverCheck(temp, oxy, oce) {
  return temp >= 8 && oxy >= 14 && oce >= 9;
}

// The three Mars tracks end the game in every mode. The Venus solo variant adds
// one more condition for WINNING it: 30% Venus. It is deliberately not part of
// isGameOverCheck, because in a multiplayer game Venus never ends anything.
export function isSoloMissionComplete(state) {
  if (!isGameOverCheck(state.temperature, state.oxygen, state.oceans)) return false;
  return state.venusEnabled ? (state.venus ?? 0) >= 30 : true;
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

// Standard Technology refunds 3 M€ after a standard project is paid for. It is
// summed across the tableau rather than hard-coded to one card id, so a second
// printing of the same effect would work without touching this.
// Titan, Enceladus and Miranda sit off the track until somebody plays a card
// that can hold floaters, microbes or animals. Called after anything that adds
// to a tableau, so the check is one pass over what the players now hold.
export function refreshColonyActivation(state) {
  if (!state.colonies) return state;
  const held = [];
  for (const player of state.players ?? []) {
    for (const id of player.playedProjects ?? []) {
      const type = getCardResourceType(id);
      if (type) held.push(type);
    }
  }
  const woken = activateResourceColonies(state.colonies, held);
  if (woken !== state.colonies) state.colonies = woken;
  return state;
}

export function grantStandardProjectRebate(state, playerId) {
  const player = getPlayer(state, playerId);
  const rebate = (player?.playedProjects ?? []).reduce((sum, id) => {
    const card = ALL_CARDS.find(item => item.id === id);
    return sum + (card ? getCardEffect(card).standardProjectRebate ?? 0 : 0);
  }, 0);
  if (rebate <= 0) return 0;

  state.players = state.players.map(entry =>
    entry.id === playerId ? { ...entry, mc: entry.mc + rebate } : entry
  );
  state.logs = addLog(state.logs, "system", `Standard Technology: MC +${rebate}`);
  return rebate;
}

export function getCardDiscount(card, state) {
  const corporation = getCorporation(state);
  const corporationDiscount = getCorporationDiscount(card, corporation);
  const ongoingDiscount = (state.cardDiscounts?.all ?? 0) + card.tags.reduce((sum, tag) => sum + (state.cardDiscounts?.tags?.[String(tag).toLowerCase()] ?? 0), 0) + (state.oneShotCardDiscount ?? 0);
  const totalDiscount = corporationDiscount + ongoingDiscount;
  // No change is given, so a player may overpay by one unit rather than top up
  // the last few M€ in cash. Flooring the cap forbade that entirely: with 1 M€
  // left to cover, a steel worth 2 could not be spent at all.
  const net = Math.max(0, card.cost - totalDiscount);
  const maxSteel = card.tags.includes("Building")
    ? Math.min(state.steel, Math.ceil(net / getSteelValue(state)))
    : 0;
  const maxTitanium = card.tags.includes("Space")
    ? Math.min(state.titanium, Math.ceil(net / getTitaniumValue(state)))
    : 0;
  return { maxSteel, maxTitanium };
}

export function getCardPaymentCost(card, state, steelUsed = 0, titaniumUsed = 0) {
  const corporation = getCorporation(state);
  const corporationDiscount = getCorporationDiscount(card, corporation);
  const ongoingDiscount = (state.cardDiscounts?.all ?? 0) + card.tags.reduce((sum, tag) => sum + (state.cardDiscounts?.tags?.[String(tag).toLowerCase()] ?? 0), 0) + (state.oneShotCardDiscount ?? 0);
  return Math.max(0, card.cost - corporationDiscount - ongoingDiscount - steelUsed * getSteelValue(state) - titaniumUsed * getTitaniumValue(state));
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
// Cards that watch the board rather than being played at it. Each entry names
// the card, what it is waiting for, and what its owner gains — a table rather
// than a card-id check buried in whichever function happened to notice.
//
// These fire for *anyone's* placement, including tiles laid by the World
// Government or a global event, because the card says "when anyone places" and
// says nothing about who benefits from the placement itself.
export const ARCTIC_ALGAE_ID = "card-base-arctic-algae";

const TILE_PLACED_EFFECTS = [
  {
    cardId: VERMIN_ID,
    tileType: "city",
    // Vermin collects an animal for every city, wherever it came from.
    apply: player => ({
      ...player,
      cardResources: {
        ...player.cardResources,
        [VERMIN_ID]: (player.cardResources?.[VERMIN_ID] ?? 0) + 1
      }
    })
  },
  {
    cardId: ARCTIC_ALGAE_ID,
    tileType: "ocean",
    // "When anyone places an ocean tile, gain 2 plants."
    apply: player => ({ ...player, plants: (player.plants ?? 0) + 2 })
  }
];

function grantCityPlacementCardEffects(state, tileType) {
  for (const effect of TILE_PLACED_EFFECTS) {
    if (effect.tileType !== tileType) continue;
    state.players = state.players.map(player =>
      player.playedProjects?.includes(effect.cardId) ? effect.apply(player) : player
    );
  }
}

// Cards that watch a global parameter move, whoever moved it. Aphrodite is the
// only one so far, but the shape is the same as the tile hook: a table, and one
// place that runs it.
const PARAMETER_RAISED_EFFECTS = [
  {
    cardId: "card-venus-aphrodite",
    parameter: "venus",
    // "Whenever Venus is terraformed 1 step, you gain 2 M€." Two MC per step,
    // and the venus track moves two points per step.
    perStep: player => ({ ...player, mc: player.mc + 2 })
  }
];

// `steps` is how many steps the track actually moved, after clamping.
function grantParameterRaisedCardEffects(state, parameter, steps) {
  if (steps <= 0) return;
  for (const effect of PARAMETER_RAISED_EFFECTS) {
    if (effect.parameter !== parameter) continue;
    state.players = state.players.map(player => {
      const owns =
        player.corporationId === effect.cardId ||
        player.playedProjects?.includes(effect.cardId);
      if (!owns) return player;
      let updated = player;
      for (let step = 0; step < steps; step += 1) updated = effect.perStep(updated);
      return updated;
    });
  }
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
// "This counts as passing. You get no other turns this generation."
const RED_APPEASEMENT_ID = "card-prelude2-red-appeasement";
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

// Diversity Support asks for nine different types at once. The six on the
// player board count separately, and each distinct kind held on a card --
// microbes, floaters, animals and the rest -- counts once however many cards
// carry it.
function countResourceTypes(state) {
  const player = getPlayer(state, state.currentPlayerId) ?? state.players?.[0];
  if (!player) return 0;
  const kinds = new Set();
  for (const resource of Object.keys(RESOURCE_LABELS)) {
    if ((player[resource] ?? 0) > 0) kinds.add(resource);
  }
  for (const [cardId, amount] of Object.entries(player.cardResources ?? {})) {
    if ((amount ?? 0) > 0) kinds.add(getCardResourceType(cardId) ?? cardId);
  }
  return kinds.size;
}

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
    if (requirement.oceans !== undefined) {
      // One ocean is one step, so the same relaxation that moves temperature by
      // two degrees moves this by one tile. Temperature, oxygen and Venus all
      // honour the buffer; oceans were the last raw comparison left.
      const meets = requirement.max
        ? state.oceans <= requirement.oceans + buffer
        : state.oceans >= requirement.oceans - buffer;
      if (!meets) return { playable: false, reason: `海洋が${requirement.oceans}枚以上必要です。` };
    }
    if (requirement.venus !== undefined) {
      // Inventrix, Special Design and Adaptation Technology relax the Venus
      // scale exactly as they relax temperature and oxygen; only these two got
      // the buffer, so Venus requirements ignored every relaxation card.
      const meets = requirement.max
        ? (state.venus ?? 0) <= requirement.venus + buffer * 2
        : (state.venus ?? 0) >= requirement.venus - buffer * 2;
      if (!meets) return { playable: false, reason: `金星率${requirement.venus}%条件を満たしていません。` };
    }
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
      // "Requires that X is ruling OR that you have 2 delegates there." Only
      // the first half was checked, so the alternative half of every party
      // requirement in Turmoil was unreachable.
      const ownDelegates = countDelegates(state.turmoil, wanted, state.currentPlayerId);
      if (state.turmoil.rulingParty !== wanted && ownDelegates < PARTY_REQUIREMENT_DELEGATES) {
        return {
          playable: false,
          reason: `${getParty(wanted)?.name ?? wanted}が与党であるか、そこに代表者が${PARTY_REQUIREMENT_DELEGATES}人必要です。`
        };
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
      // Pioneer Settlement is for players who are behind: "requires that you
      // have no more than 1 colony". `max` was ignored, so it read as a floor
      // and the card could never be played.
      if (requirement.max ? owned > needed : owned < needed) {
        return {
          playable: false,
          reason: requirement.max
            ? `植民地が${needed}個以下である必要があります。`
            : `植民地が${needed}個以上必要です。`
        };
      }
      continue;
    }
    // "Requires that you have 9 different types of resources." The six on the
    // player board plus each distinct kind held on a card.
    if (requirement.resourceTypes !== undefined) {
      const needed = requirement.count ?? requirement.resourceTypes;
      if (countResourceTypes(state) < needed) {
        return { playable: false, reason: `${needed}種類の異なる資源が必要です。` };
      }
      continue;
    }
    // "Requires that a player has removed plants this generation." The ledger
    // records landed attacks, so it already knows.
    if (requirement.plantsRemoved) {
      // "Requires that a player removed ANOTHER PLAYER's plants this
      // generation." Paying your own plants for a greenery is not a removal
      // anyone can point at, so the two ends have to be different players.
      const removed = (state.generationAttackLedger ?? []).some(
        entry =>
          entry.resource === "plants" &&
          entry.generation === state.generation &&
          entry.attackerPlayerId !== entry.victimPlayerId
      );
      if (!removed) {
        return { playable: false, reason: "この世代に植物が取り除かれている必要があります。" };
      }
      continue;
    }
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
  // "AND THAT NO OTHER PLAYER HAS PASSED" -- the card buys a production step in
  // exchange for the rest of your generation, which is only a real cost while
  // everyone else can still act.
  if (card.id === RED_APPEASEMENT_ID) {
    const someoneElsePassed = (state.players ?? []).some(
      player => player.id !== state.currentPlayerId && player.passed
    );
    if (someoneElsePassed) {
      return { playable: false, reason: "他のプレイヤーがすでにパスしています。" };
    }
  }

  // Law Suit answers an attack, so it cannot be played when nobody has made
  // one this generation.
  if (card.id === LAW_SUIT_ID && lawSuitTargets(state, state.currentPlayerId).length === 0) {
    return {
      playable: false,
      reason: "この世代に自分を攻撃したプレイヤーがいません。"
    };
  }

  if (
    card.id === "card-promo-soil-enrichment" &&
    !collectResourceTargets(state, "Microbe", ALL_CARDS, {
      ownCardsOnly: true,
      mustHaveResources: true,
      getResourceType: getCardResourceType
    }).length
  ) {
    return { playable: false, reason: "微生物を持つ自分のカードが必要です。" };
  }

  if (
    card.id === "card-colonies-air-raid" &&
    !collectResourceTargets(state, "floater", ALL_CARDS, {
      ownCardsOnly: true,
      mustHaveResources: true,
      getResourceType: getCardResourceType
    }).length
  ) {
    return { playable: false, reason: "フローターを持つ自分のカードが必要です。" };
  }

  // Insulation converts heat production into M€ production, so there has to be
  // at least one step of heat production to convert.
  // Vote Of No Confidence unseats a neutral chairman with one of the player's
  // own delegates, so both have to be true before it can be played.
  if (card.id === VOTE_OF_NO_CONFIDENCE_ID) {
    if (!state.turmoil) return { playable: false, reason: "Turmoilが有効ではありません。" };
    if (state.turmoil.chairman !== NEUTRAL) {
      return { playable: false, reason: "現在の議長が中立ではありません。" };
    }
    if ((state.turmoil.delegateReserve?.[state.currentPlayerId] ?? 0) <= 0) {
      return { playable: false, reason: "予備の代表者がいません。" };
    }
  }
  // Recruitment needs a delegate of its own to send and a swappable neutral.
  if (card.id === RECRUITMENT_ID && recruitmentPartyOptions(state).length === 0) {
    return { playable: false, reason: "交換できる中立代表者がいません。" };
  }
  if (card.id === INSULATION_ID && (getCurrentPlayer(state)?.heatProd ?? 0) < 1) {
    return { playable: false, reason: "熱生産量が1以上必要です。" };
  }
  if (card.id === ROBOTIC_WORKFORCE_ID && roboticWorkforceBuildingCards(state).length === 0) {
    return { playable: false, reason: "生産ボックスを持つ自分の建物カードが必要です。" };
  }

  const corporation = getCorporation(state);
  const costAfterDiscount = getCardPaymentCost(card, state, steelUsed, titaniumUsed);

  const heatAsMoney = corporation?.effects?.heatAsMoney ? state.heat : 0;
  const localHeatTrapping = card.id === LOCAL_HEAT_TRAPPING_ID;
  const stormcraftFloaters = localHeatTrapping
    ? state.cardResources?.[STORMCRAFT_INCORPORATED_ID] ?? 0
    : 0;
  const costResources = localHeatTrapping
    ? state.mc + state.heat + stormcraftFloaters
    : state.mc + heatAsMoney;
  if (costResources < costAfterDiscount) {
    return { playable: false, reason: "資源（MC）が不足しています。" };
  }
  if (localHeatTrapping) {
    let remainingCost = Math.max(0, costAfterDiscount - state.mc);
    const heatAfterCost = Math.max(0, state.heat - remainingCost);
    remainingCost = Math.max(0, remainingCost - state.heat);
    const floatersAfterCost = Math.max(0, stormcraftFloaters - remainingCost);
    if (heatAfterCost + floatersAfterCost * 2 < 5) {
      return { playable: false, reason: "カードコスト支払い後の熱相当資源が不足しています。" };
    }
  }

  // "You may not raise your TR unless you can pay." The levy is not a debt the
  // player part-pays: a card that would raise the rating beyond what they can
  // afford to be taxed for cannot be played at all. Only the rating the card
  // states is counted here -- a threshold bonus reached mid-effect is not
  // knowable before the effect runs.
  const trLevy = getTrSurcharge(state, getCardEffect(card).tr ?? 0);
  if (trLevy > 0 && state.mc + heatAsMoney - costAfterDiscount < trLevy) {
    return { playable: false, reason: `レッズ政策の課税 ${trLevy} MC を支払えません。` };
  }

  const requirements = card.requires ?? {};
  const buffer =
    (corporation?.effects?.requirementBuffer ?? 0) +
    (state.globalRequirementBuffer ?? 0) +
    (state.oneShotRequirementBuffer ?? 0);
  const generatedRequirements = getGeneratedRequirementStatus(card, state, buffer);
  if (!generatedRequirements.playable) return generatedRequirements;
  if (requirements.oceans !== undefined && state.oceans < requirements.oceans - buffer) {
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
  // "生産量を下げる場合、下げるだけの生産量がなければ、そのカードはプレイできません"
  // Only the MC track may sit below zero (to -5); every other one has to have
  // the steps available. applyProduction floors the result, so without this a
  // card like 地下都市 could be played at zero energy production and simply
  // waive its own cost.
  if (!canAffordProductionDecrease(state, effect.production)) {
    return { playable: false, reason: "生産量が不足しています。" };
  }
  for (const [resource, amount] of Object.entries(effect.payment ?? {})) {
    if (resource === "canUseSteel" || resource === "canUseTitanium") continue;
    if (resource === "mc" && (effect.payment.canUseSteel || effect.payment.canUseTitanium)) {
      // The cost may be met with a mix, so afford it against the combined worth.
      const source = effect.payment.canUseTitanium ? "titanium" : "steel";
      const worth = source === "titanium" ? getTitaniumValue(state) : getSteelValue(state);
      if ((state.mc ?? 0) + (state[source] ?? 0) * worth < amount) {
        return { playable: false, reason: "資源（MC）が不足しています。" };
      }
      continue;
    }
    if (resource !== "cardResources" && resource in state && state[resource] < amount) return { playable: false, reason: `${resource}が不足しています。` };
    if (resource === "cardResources" && (state.cardResources[card.id] ?? 0) < amount) return { playable: false, reason: "カード資源が不足しています。" };
  }

  // Deliberately NOT checked: whether the card's tile has anywhere to go. The
  // official rules place a tile "if possible" and say an impossible placement
  // does not prevent the card from being played, so refusing it here would be a
  // house rule rather than a fix.
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

// A card that names where its tile goes ("on either Tharsis Tholus...", "on a
// space reserved for ocean") parses that into effect.tilePlacementRule. The
// rule was stored and never read, so every such card offered the whole board —
// and Mohole Area, which must go ON an ocean space, was offered only the dry
// land a special tile is otherwise limited to, so it never had a legal space.
function satisfiesPlacementRule(cell, rule, board, boardId, playerId) {
  if (!rule) return true;
  // "Hellas has no volcanoes and no Noctis region, so those cards lose their
  // placement restrictions here" — the same is true of Utopia. Enforcing the
  // volcanic rule on a board with no volcanic space would leave Lava Flows
  // with nowhere legal to go, turning a playable card into a dead one.
  if (rule === "volcanic" && BOARDS[boardId]?.noVolcanicRestriction) return true;
  switch (rule) {
    case "ocean":
      return Boolean(cell.isOceanOnly);
    case "land":
      return !cell.isOceanOnly;
    case "volcanic":
      return Boolean(cell.volcanic);
    case "city":
      return hasAdjacentCity(cell.q, cell.r, board);
    case "isolated":
      return getAdjacentCells(cell.q, cell.r).every(pos => {
        const neighbour = board[`${pos.q},${pos.r}`];
        return !neighbour || neighbour.tileType === "empty";
      });
    case "away-from-cities":
      return !hasAdjacentCity(cell.q, cell.r, board);
    // The two mining cards take a space that pays steel or titanium, and keep
    // paying that resource as production for the rest of the game.
    case "mineral":
      return (cell.bonusType === "steel" || cell.bonusType === "titanium") &&
        (cell.bonusAmount ?? 0) > 0;
    case "mineral-adjacent":
      if (!((cell.bonusType === "steel" || cell.bonusType === "titanium") &&
        (cell.bonusAmount ?? 0) > 0)) return false;
      // Mining Area also has to touch something the player already owns, and an
      // ocean does not count as one of their tiles.
      return getAdjacentCells(cell.q, cell.r).some(pos => {
        const neighbour = board[`${pos.q},${pos.r}`];
        return neighbour && neighbour.tileType !== "empty" &&
          neighbour.tileType !== "ocean" && neighbour.placedBy === playerId;
      });
    // New Holland upgrades an existing ocean rather than taking a bare space;
    // that is its own placement flow, so it is not a filter over empty spaces.
    default:
      return true;
  }
}

export function isCellPlacementValid(cell, type, board, playerId = "player", placementRule = null, boardId = "tharsis") {
  if (cell.tileType !== "empty") return false;
  // Noctis City's space is reserved for that card alone.
  if (cell.reservedFor && cell.reservedFor !== type) return false;
  if (!satisfiesPlacementRule(cell, placementRule, board, boardId, playerId)) return false;

  if (type === "ocean") {
    // There are exactly nine ocean tiles. The counter saturated at 9 while the
    // board kept accepting them, so a tenth could be placed.
    const placed = Object.values(board).filter(space => space.tileType === "ocean").length;
    if (placed >= MAX_OCEANS) return false;
    // Artificial Lake says "on a non-reserved LAND area", which is exactly the
    // opposite of the default, so the card's own rule wins.
    if (placementRule === "land") return true;
    return cell.isOceanOnly;
  } else if (type === "city") {
    if (cell.isOceanOnly) return false;
    return !hasAdjacentCity(cell.q, cell.r, board);
  } else if (type === "special") {
    // Special tiles ignore the greenery adjacency rule; they only need dry land
    // — unless the card sends the tile to an ocean space, as Mohole Area does.
    if (placementRule === "ocean") return true;
    return !cell.isOceanOnly;
  } else {
    // forest (greenery)
    // Mangrove and Protected Valley place their greenery ON an ocean space, and
    // say so on the card, which also frees them from the adjacency rule -- there
    // is nothing to be adjacent to out there.
    if (placementRule === "ocean") return Boolean(cell.isOceanOnly);
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
    increaseTerraformRating(nextState, nextState.currentPlayerId, 1, "threshold");
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
        increaseTerraformRating(nextState, nextState.currentPlayerId, 1, "threshold");
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
      const ownerId = nextState.currentPlayerId ?? nextState.firstPlayerId ?? nextState.turnOrder?.[0];
      const choice = buildTileChoice(
        nextState,
        "ocean",
        {
          sourceKind: "threshold",
          sourceId: "temperature-zero-ocean",
          consumedAction: true,
          paid: true,
          remaining: 1
        },
        legalCellsFor(nextState, "ocean", ownerId)
      );
      if (choice) {
        choice.ownerPlayerId = ownerId;
        choice.continuation.stage = "temperature-zero-ocean";
        choice.prompt = "気温 0°C 達成ボーナス: 海洋タイルを配置するマスを選んでください。";
        openOrEnqueuePendingChoice(nextState, choice);
        currentLogs = addLog(currentLogs, "system", "気温 0°C 達成ボーナス: 海洋タイル1枚の無料配置を獲得");
      }
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
export function passPlayer(state, logAcc, playerId, options = {}) {
  const actorId = playerId ?? state.currentPlayerId;
  const actor = getPlayer(state, actorId);

  // The rulebook defines a pass as taking no action that turn: "１つもアクショ
  // ンを実行しなければ（パス）". Having already acted, the turn simply ends and
  // the seat moves on; the player is still in the generation.
  // Red Appeasement is the exception: it says "this counts as passing" no
  // matter what the player did first, so it asks for the pass outright.
  if (!options.forced && actor && actor.actionsRemaining < 2) {
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
      usedCardActions: [],
      // A once-a-generation policy action is refreshed with everything else.
      usedPolicyActions: [],
      // Special Design lasts "this generation" at most, so an unspent
      // relaxation must not carry into the next one. Same for the one-shot
      // discounts (Indentured Workers, Conscription).
      oneShotRequirementBuffer: 0,
      oneShotCardDiscount: 0
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
  // A Venus solo game is not finished when Mars is: 30% Venus is part of the
  // mission, so ending here would drop the player into final greenery with the
  // Venus track short and no generations left to raise it.
  const parametersComplete =
    nextState.mode === "solo"
      ? isSoloMissionComplete(nextState)
      : isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans);
  if (generationLimitReached || parametersComplete) {
    nextState.phase = "final_greenery";
    nextState.currentPlayerId = nextState.firstPlayerId ?? nextState.turnOrder[0];
    const reason = generationLimitReached ? `第${soloGenerationLimit}世代の生産` : "全パラメータ達成";
    nextState.logs = addLog(localLog, "system", `${reason}が終了しました。最後の植物緑化変換フェーズを行います。`);
  } else {
    // Solar phase step 2: World Government Terraforming. The first player picks
    // which parameter the WG raises, so the phase stops here and waits. The rest
    // of the Solar phase resumes in finishSolarPhase once the choice is answered.
    if (nextState.venusEnabled) {
      const choice = buildWorldGovernmentChoice(
        nextState,
        nextState.firstPlayerId,
        worldGovernmentOptions(nextState)
      );
      if (choice) {
        nextState.pendingChoice = choice;
        nextState.logs = addLog(
          localLog,
          "system",
          "世界政府のテラフォーミング: 第1プレイヤーがパラメータを選択します。"
        );
        return nextState;
      }
    }

    return finishSolarPhase(nextState, localLog);
  }

  nextState.logs = nextState.logs ?? localLog;
  return nextState;
}

// Everything in the Solar phase after World Government Terraforming: colony
// production, turmoil, the first player marker, and the next research phase.
// Split out so the phase can stop at the WG choice and pick up here afterwards.
export function finishSolarPhase(state, logAcc) {
  const nextState = state;
  let localLog = logAcc;
  {
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
            deck = shuffle(discard, nextState);
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
