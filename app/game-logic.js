import { CORPORATIONS, GLOBAL_EVENTS, OFFICIAL_PROJECTS, PRELUDES, STANDARD_ACTIONS, STANDARD_PROJECTS } from "./official-content.js";
import {
  DEFAULT_PLAYER_NAMES,
  createPlayer,
  getCurrentPlayer,
  getPlayer,
  updatePlayer,
  withLegacyPlayerAccessors
} from "./player-state.js";
import { THARSIS_CELLS } from "./tharsis-board.js";
import {
  AWARDS,
  MAX_AWARDS,
  MAX_MILESTONES,
  MILESTONES,
  MILESTONE_COST,
  computeAwardVp,
  computeMilestoneVp,
  getAward,
  getMilestone,
  getMilestoneThreshold,
  getNextAwardCost,
  scoreAward
} from "./milestones-awards.js";

export { AWARDS, MILESTONES, getNextAwardCost, getMilestoneThreshold, scoreAward };

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

// The official Tharsis map. Generated from the reference implementation by
// scripts/generate-tharsis-board.mjs, which verifies the axial conversion against
// the reference adjacency rule before writing.
export const INITIAL_CELLS = THARSIS_CELLS;

export function formatLogTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

export function addLog(logsList, sender, text) {
  return [
    {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: formatLogTime(),
      sender,
      text
    },
    ...logsList
  ];
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
function cloneGameState(state) {
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
      cardResources: { ...(player.cardResources ?? {}) },
      cardPlacements: { ...(player.cardPlacements ?? {}) },
      cardDiscounts: {
        all: player.cardDiscounts?.all ?? 0,
        tags: { ...(player.cardDiscounts?.tags ?? {}) }
      }
    })),
    turnOrder: [...(state.turnOrder ?? [])],
    deck: [...state.deck],
    discardPile: [...state.discardPile],
    board: Object.fromEntries(Object.entries(state.board).map(([key, cell]) => [key, { ...cell }])),
    logs: [...state.logs],
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

function addProduction(state, production) {
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
    if (key) state[key] += amount;
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
    if (resource && typeof amount === "number") effect[resource] = (effect[resource] ?? 0) + amount;
    else if (resource) unsupported.push("dynamic-resource-gain");
  });
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
    const typeMap = { 0: "forest", 1: "ocean", 2: "city", 3: "city" };
    const mapped = typeMap[raw.tile.type];
    if (mapped) {
      effect.tile = mapped;
      effect.tileCount = raw.tile.count ?? 1;
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
  if (raw.addResourcesToAnyCard) unsupported.push("any-card-resource-choice");
  if (raw.colonies || raw.turmoil) unsupported.push("expansion-state-choice");
  if (raw.or) {
    if (raw.or.autoSelect && Array.isArray(raw.or.behaviors) && raw.or.behaviors[0]) {
      normalizeBehavior(raw.or.behaviors[0], effect, unsupported);
    } else {
      unsupported.push("choice");
    }
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
  let placed = 0;
  for (let i = 0; i < count; i++) {
    const cell = firstLegalSpace(state, type);
    if (!cell) break;
    state.board[`${cell.q},${cell.r}`] = {
      ...cell,
      tileType: type,
      placedBy: type === "ocean" ? null : "player",
    };
    if (cardId && i === 0) state.cardPlacements[cardId] = `${cell.q},${cell.r}`;
    if (type === "ocean") {
      state.oceans = Math.min(9, state.oceans + 1);
      state.tr += 1;
    }
    if (type === "forest") {
      state.oxygen = Math.min(14, state.oxygen + 1);
      state.tr += 1;
    }
    placed += 1;
  }
  return placed;
}

function applyEffect(state, effect, logs, { skipTile = false } = {}) {
  let nextState = state;
  let nextLogs = logs;
  if (!effect) return { state: nextState, logs: nextLogs };

  if (effect.unsupported?.length) {
    nextLogs = addLog(nextLogs, "system", `このカードの個別選択はオンライン版で未実装です: ${effect.unsupported.join("、")}`);
  }

  if (effect.payMc) nextState.mc -= effect.payMc;
  if (effect.mc) addResource(nextState, "mc", effect.mc);
  if (effect.steel) addResource(nextState, "steel", effect.steel);
  if (effect.titanium) addResource(nextState, "titanium", effect.titanium);
  if (effect.plants) addResource(nextState, "plants", effect.plants);
  if (effect.energy) addResource(nextState, "energy", effect.energy);
  if (effect.heat) addResource(nextState, "heat", effect.heat);
  if (effect.tr) nextState.tr += effect.tr;
  if (effect.removePlants) nextState.plants = Math.max(0, nextState.plants - effect.removePlants);
  if (effect.cardResource && effect.cardId) nextState.cardResources[effect.cardId] = (nextState.cardResources[effect.cardId] ?? 0) + effect.cardResource;
  if (effect.venusSteps) nextState.venus = Math.min(30, (nextState.venus ?? 0) + effect.venusSteps * 2);
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

  addProduction(nextState, effect.production);
  if (effect.productionDecrease?.resource) {
    const productionKey = `${effect.productionDecrease.resource}Prod`;
    if (productionKey in nextState) nextState[productionKey] = Math.max(0, nextState[productionKey] - effect.productionDecrease.count);
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

export function applyCorporation(state, corporationId) {
  const corporation = CORPORATIONS.find(item => item.id === corporationId);
  if (!corporation || !state.corporationOptions.includes(corporationId)) return state;
  const nextState = cloneGameState(state);
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
  nextState.logs = addLog(nextState.logs, "player", `企業【${corporation.name}】を選択しました。`);
  return nextState;
}

export function getPreludeCost(prelude) {
  return getCardEffect(prelude).payMc ?? getCardEffect(prelude).payment?.mc ?? 0;
}

export function applyPreludes(state, preludeIds) {
  if (state.setupStep !== "prelude" || preludeIds.length !== 2) return state;
  if (preludeIds.some(id => !state.preludeOptions.includes(id))) return state;
  const selected = preludeIds.map(id => PRELUDES.find(prelude => prelude.id === id)).filter(Boolean);
  const totalCost = selected.reduce((sum, prelude) => sum + getPreludeCost(prelude), 0);
  if (state.mc < totalCost) return state;

  let nextState = cloneGameState(state);
  nextState.selectedPreludeIds = preludeIds;
  nextState.preludeOptions = [];
  nextState.phase = "action";
  nextState.setupStep = "complete";
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
  return nextState;
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
    const placed = placeTile(nextState, "city");
    if (placed) {
      nextState.mcProd += corporation.effects.cityProduction ?? 0;
      nextState.mc += corporation.effects.ownCityBonus ?? 0;
      nextLogs = addLog(nextLogs, "system", `${corporation.name}: 初期アクションで都市を配置しました。`);
    }
  }
  return { state: nextState, logs: nextLogs };
}

export function applyCardEffect(state, card, logs, options = {}) {
  const nextState = cloneGameState(state);
  let nextLogs = logs;
  const effect = getCardEffect(card);
  const result = applyEffect(nextState, effect, nextLogs, options);
  nextLogs = addLog(result.logs, "system", `効果適用: ${card.effectText}`);
  return { state: result.state, logs: nextLogs };
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
  nextState.playedProjects.push(card.id);
  let nextLogs = addLog(logs, "system", `Prelude効果で【${card.name}】をプレイしました（支払MC ${payment}）。`);
  const effectResult = applyCardEffect(nextState, card, nextLogs);
  const triggerResult = applyCorporationTriggers(effectResult.state, card, effectResult.logs);
  return { state: triggerResult.state, logs: triggerResult.logs };
}

export function getCardActionStatus(state, card) {
  const action = getCardEffect(card).action;
  if (!action) return { playable: false, reason: "このカードには実行可能なアクションがありません。" };
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

export function applyCardAction(state, card, logs) {
  const status = getCardActionStatus(state, card);
  if (!status.playable) return { state, logs, playable: false };
  const nextState = cloneGameState(state);
  const action = getCardEffect(card).action;
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

  const effect = { ...action };
  delete effect.energyCost;
  delete effect.mcCost;
  delete effect.steelCost;
  delete effect.revealTag;
  delete effect.resource;
  const result = applyEffect(nextState, effect, nextLogs);
  nextLogs = addLog(result.logs, "system", `アクション効果: ${card.effectText}`);
  return { state: result.state, logs: nextLogs, playable: true };
}

export function applyCorporationTriggers(state, card, logs) {
  const nextState = cloneGameState(state);
  let nextLogs = logs;
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
  if (corporation.effects.vpBonus && (card.victoryPoints ?? 0) > 0) {
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
  if (card.tags.includes("Science") && nextState.playedProjects.some(id => id === "p-mars-university")) {
    if (nextState.hand.length > 0 && nextState.deck.length > 0) {
      const discarded = nextState.hand.shift();
      const [drawn, ...rest] = nextState.deck;
      nextState.deck = rest;
      nextState.discardPile.push(discarded);
      nextState.hand.push(drawn);
      const discardedCard = ALL_CARDS.find(item => item.id === discarded);
      const drawnCard = ALL_CARDS.find(item => item.id === drawn);
      nextLogs = addLog(nextLogs, "system", `Mars University: 手札の【${discardedCard?.name ?? discarded}】を捨て、【${drawnCard?.name ?? drawn}】を引きました。`);
    } else {
      nextLogs = addLog(nextLogs, "system", "Mars University: 科学タグ効果を使用できますが、交換できる手札または山札がありません。");
    }
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

export function getInitialState(options = {}) {
  const playerCount = Math.max(1, Math.min(5, options.playerCount ?? 1));
  const mode = options.mode ?? (playerCount > 1 ? "hotseat" : "solo");
  const names = options.playerNames ?? [];
  const board = {};
  INITIAL_CELLS.forEach(cell => {
    board[`${cell.q},${cell.r}`] = {
      ...cell,
      tileType: "empty",
      placedBy: null
    };
  });

  const allCardIds = ALL_CARDS.map(c => c.id);
  let shuffledDeck = shuffle(allCardIds);

  // Official solo rules seed the board with two neutral cities, each with an
  // adjacent neutral greenery. The reference implementation discards a card per
  // tile and counts that many available land spaces from the top, then the bottom.
  if (mode === "solo") {
    shuffledDeck = placeNeutralTiles(board, shuffledDeck);
  }
  const corporationPool = shuffle(CORPORATIONS.map(corporation => corporation.id));
  const preludePool = shuffle(PRELUDES.map(prelude => prelude.id));

  const players = [];
  for (let i = 0; i < playerCount; i++) {
    // "player" keeps the solo id stable so existing board ownership and saves line up.
    const id = i === 0 ? "player" : `player${i + 1}`;
    const researchCards = shuffledDeck.slice(0, 10);
    shuffledDeck = shuffledDeck.slice(10);
    players.push(
      createPlayer(id, names[i] ?? DEFAULT_PLAYER_NAMES[i], {
        researchCards,
        corporationOptions: corporationPool.slice(i * 2, i * 2 + 2),
        preludeOptions: preludePool.slice(i * 4, i * 4 + 4)
      })
    );
  }

  const turnOrder = players.map(player => player.id);
  const introText =
    mode === "solo"
      ? "公式ソロルール準拠ミッション開始。目標: 14世代以内に全グローバルパラメータの最大化。"
      : `${playerCount}人対戦を開始しました。全グローバルパラメータの達成でゲーム終了です。`;

  return withLegacyPlayerAccessors({
    rulesVersion: 4,
    mode,
    generation: 1,
    phase: "setup", // setup, research, action, production, final_greenery, game_over
    players,
    turnOrder,
    currentPlayerId: turnOrder[0],
    firstPlayerId: turnOrder[0],
    temperature: -30,
    oxygen: 0,
    venus: 0,
    oceans: 0,
    board,
    deck: shuffledDeck,
    discardPile: [],
    claimedMilestones: [],
    fundedAwards: [],
    pendingChoice: null,
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
}

function milestoneContext(state, player) {
  return {
    player,
    board: state.board,
    cards: ALL_CARDS,
    corporation: CORPORATIONS.find(c => c.id === player.corporationId)
  };
}

export function getMilestoneStatus(state, milestoneId, playerId) {
  const milestone = getMilestone(milestoneId);
  if (!milestone) return { claimable: false, reason: "不明なマイルストーンです。", score: 0, threshold: 0 };

  const player = getPlayer(state, playerId);
  if (!player) return { claimable: false, reason: "プレイヤーが見つかりません。", score: 0, threshold: 0 };

  const threshold = getMilestoneThreshold(milestone, state);
  const score = milestone.getScore(milestoneContext(state, player));
  const claimed = (state.claimedMilestones ?? []).find(entry => entry.milestoneId === milestoneId);

  if (claimed) {
    const owner = getPlayer(state, claimed.playerId);
    return { claimable: false, reason: `${owner?.name ?? claimed.playerId}が獲得済みです。`, score, threshold };
  }
  if ((state.claimedMilestones ?? []).length >= MAX_MILESTONES) {
    return { claimable: false, reason: "マイルストーンは3つまでしか獲得できません。", score, threshold };
  }
  if (score < threshold) {
    return { claimable: false, reason: `条件を満たしていません (${score}/${threshold})。`, score, threshold };
  }
  if (player.mc < MILESTONE_COST) {
    return { claimable: false, reason: `${MILESTONE_COST} MC必要です。`, score, threshold };
  }
  return { claimable: true, reason: "", score, threshold };
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

export function isGameOverCheck(temp, oxy, oce) {
  return temp >= 8 && oxy >= 14 && oce >= 9;
}

export function computeScore(state, playerId) {
  const targetId = playerId ?? state.currentPlayerId;
  const player = getPlayer(state, targetId) ?? state.players[0];
  let score = player.tr;
  
  // Count player greeneries (1 VP each)
  let playerGreeneriesCount = 0;
  Object.values(state.board).forEach(cell => {
    if (cell.placedBy === targetId && cell.tileType === "forest") {
      playerGreeneriesCount += 1;
    }
  });
  score += playerGreeneriesCount;

  // Count adjacent greeneries for each player city (1 VP each greenery, regardless of ownership)
  let cityVp = 0;
  Object.values(state.board).forEach(cell => {
    if (cell.placedBy === targetId && cell.tileType === "city") {
      const adj = getAdjacentCells(cell.q, cell.r);
      adj.forEach(pos => {
        const key = `${pos.q},${pos.r}`;
        const adjCell = state.board[key];
        if (adjCell && adjCell.tileType === "forest") {
          cityVp += 1;
        }
      });
    }
  });
  score += cityVp;

  // Add card VPs
  player.playedProjects.forEach(cardId => {
    const card = ALL_CARDS.find(c => c.id === cardId);
    if (card && card.victoryPoints) {
      score += card.victoryPoints;
    }
    if (card?.victoryPointSpec && !card.dynamicVictory) {
      const spec = card.victoryPointSpec;
      const resources = player.cardResources?.[cardId] ?? 0;
      if (spec.resourcesHere !== undefined) score += spec.per ? Math.floor(resources / spec.per) : resources * (spec.each ?? 1);
      if (spec.tag) score += countPlayedTag(state, spec.tag, player);
      const placementKey = player.cardPlacements?.[cardId];
      const placement = placementKey ? state.board[placementKey] : undefined;
      if (placement && spec.oceans !== undefined) score += countAdjacentOceans(placement.q, placement.r, state.board);
      if (placement && spec.cities !== undefined) {
        score += getAdjacentCells(placement.q, placement.r).filter(pos => state.board[`${pos.q},${pos.r}`]?.tileType === "city").length;
      }
    }
    if (cardId === "p-search-for-life" && (player.cardResources?.[cardId] ?? 0) > 0) score += 3;
    if (cardId === "p-capital") {
      const key = player.cardPlacements?.[cardId];
      const capital = key ? state.board[key] : undefined;
      if (capital) score += countAdjacentOceans(capital.q, capital.r, state.board);
    }
  });

  // Milestones and awards are scored from shared state, so each player's own
  // corporation is resolved inside the scorer rather than passed in here.
  const milestoneVp = computeMilestoneVp(state)[targetId] ?? 0;
  const awardVp = computeAwardVp(state, { cards: ALL_CARDS, corporations: CORPORATIONS })[targetId] ?? 0;
  score += milestoneVp + awardVp;

  return score;
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

function countPlayedTag(state, tag, player) {
  const owner = player ?? getCurrentPlayer(state) ?? state.players?.[0];
  const normalized = String(tag).toLowerCase();
  const corporation = CORPORATIONS.find(c => c.id === owner?.corporationId);
  return (owner?.playedProjects ?? []).reduce((sum, id) => {
    const projectCard = ALL_CARDS.find(item => item.id === id);
    return sum + (projectCard?.tags.some(cardTag => String(cardTag).toLowerCase() === normalized) ? 1 : 0);
  }, 0) + (corporation?.tags.some(cardTag => String(cardTag).toLowerCase() === normalized) ? 1 : 0);
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
    if (requirement.party || requirement.chairman || requirement.partyLeader || requirement.colonies || requirement.resourceTypes || requirement.plantsRemoved) return { playable: false, reason: "拡張ボード条件はこのゲームモードでは選択できません。" };
  }
  return { playable: true, reason: "" };
}

export function getCardPlayableStatus(card, state, steelUsed = 0, titaniumUsed = 0) {
  const { maxSteel, maxTitanium } = getCardDiscount(card, state);
  if (steelUsed > maxSteel || titaniumUsed > maxTitanium) {
    return { playable: false, reason: "資源割引の上限を超えています。" };
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

export function getPlayerOwnedTiles(board) {
  return Object.values(board).filter(c => c.placedBy === "player");
}

export function getLegalOwnedAdjacentSpaces(board) {
  const playerTiles = getPlayerOwnedTiles(board);
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

export function isCellPlacementValid(cell, type, board) {
  if (cell.tileType !== "empty") return false;

  if (type === "ocean") {
    return cell.isOceanOnly;
  } else if (type === "city") {
    if (cell.isOceanOnly) return false;
    return !hasAdjacentCity(cell.q, cell.r, board);
  } else {
    // forest (greenery)
    if (cell.isOceanOnly) return false;
    
    // Greenery adjacency rule: must be adjacent to player's owned tiles if valid adjacent space exists
    const legalAdjacentSpaces = getLegalOwnedAdjacentSpaces(board);
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

export function handleActionSpend(state, logAcc) {
  const nextState = cloneGameState(state);
  nextState.actionsRemaining -= 1;
  nextState.logs = logAcc;

  // Turn ending logic
  if (nextState.actionsRemaining <= 0) {
    nextState.actionsRemaining = 2;
    nextState.turnStep = "start";
    nextState.logs = addLog(nextState.logs, "system", "あなたのターンが終了しました。新しいターンを開始します。");
  } else {
    nextState.turnStep = "one_action_taken";
  }

  return nextState;
}

export function triggerProduction(state, logAcc) {
  const nextState = cloneGameState(state);
  let localLog = logAcc;

  // Production resolves for every player, not just the active one.
  nextState.players = nextState.players.map(player => {
    const energyToHeat = player.energy;
    const mcProdClamped = Math.max(-5, player.mcProd);
    const addedMc = mcProdClamped + player.tr;
    const produced = {
      ...player,
      mc: player.mc + addedMc,
      steel: player.steel + player.steelProd,
      titanium: player.titanium + player.titaniumProd,
      plants: player.plants + player.plantsProd,
      energy: player.energyProd,
      heat: player.heat + energyToHeat + player.heatProd,
      passed: false
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

  const generationLimitReached = nextState.mode === "solo" && nextState.generation >= 14;
  if (generationLimitReached || isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans)) {
    nextState.phase = "final_greenery";
    const reason = generationLimitReached ? "第14世代の生産" : "全パラメータ達成";
    nextState.logs = addLog(localLog, "system", `${reason}が終了しました。最後の植物緑化変換フェーズを行います。`);
  } else {
    nextState.generation += 1;
    nextState.phase = "research";

    let deck = [...nextState.deck];
    let discard = [...nextState.discardPile];

    // Each player draws their own research hand.
    nextState.players = nextState.players.map(player => {
      const researchCards = [];
      for (let i = 0; i < 4; i++) {
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
