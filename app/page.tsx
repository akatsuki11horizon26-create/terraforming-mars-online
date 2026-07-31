"use client";

import React, { useState, useEffect, useMemo } from "react";

interface CellState {
  q: number;
  r: number;
  isOceanOnly: boolean;
  bonusType: "none" | "plant" | "steel" | "titanium" | "mc" | "card";
  bonusAmount: number;
  tileType: "empty" | "forest" | "city" | "ocean";
  placedBy: "player" | "cpu" | null;
}

interface Card {
  id: string;
  name: string;
  cost: number;
  tags: ("Building" | "Space" | "Plant" | "Energy")[];
  reqText: string;
  effectText: string;
  placementType?: "forest" | "city" | "ocean";
  victoryPoints?: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  sender: "player" | "cpu" | "system";
  text: string;
}

interface GameState {
  generation: number;
  actionsRemaining: number;
  temperature: number;
  oxygen: number;
  oceans: number;
  tr: number;
  mc: number;
  mcProd: number;
  steel: number;
  steelProd: number;
  titanium: number;
  titaniumProd: number;
  plants: number;
  plantsProd: number;
  energy: number;
  energyProd: number;
  heat: number;
  heatProd: number;
  hand: string[];
  deck: string[];
  playedProjects: string[];
  board: Record<string, CellState>;
  logs: LogEntry[];
  isGameOver: boolean;
  gameResult: "win" | "loss" | null;
  onboarded: boolean;
}

const ALL_CARDS: Card[] = [
  {
    id: "c1",
    name: "核融合炉",
    cost: 14,
    tags: ["Energy"],
    reqText: "エネルギー生産量 1以上",
    effectText: "エネルギー生産量 +3、TR +1",
    victoryPoints: 0
  },
  {
    id: "c2",
    name: "デイモス落下プロジェクト",
    cost: 31,
    tags: ["Space"],
    reqText: "なし",
    effectText: "気温 +4°C、熱 +4",
    victoryPoints: 0
  },
  {
    id: "c3",
    name: "極地風力発電所",
    cost: 7,
    tags: ["Energy"],
    reqText: "なし",
    effectText: "エネルギー生産量 +1、熱 +2",
    victoryPoints: 0
  },
  {
    id: "c4",
    name: "地熱発電所",
    cost: 11,
    tags: ["Energy"],
    reqText: "なし",
    effectText: "エネルギー生産量 +2、熱 +1",
    victoryPoints: 0
  },
  {
    id: "c5",
    name: "藻類培養施設",
    cost: 12,
    tags: ["Plant"],
    reqText: "海洋 2タイル以上",
    effectText: "植物生産量 +2、植物 +1",
    victoryPoints: 1
  },
  {
    id: "c6",
    name: "植物研究所",
    cost: 9,
    tags: ["Plant"],
    reqText: "気温 -26°C以上",
    effectText: "植物生産量 +1、カードを1枚引く",
    victoryPoints: 1
  },
  {
    id: "c7",
    name: "温室効果ガスの放出",
    cost: 10,
    tags: ["Space"],
    reqText: "なし",
    effectText: "熱生産量 +1、熱 +2",
    victoryPoints: 0
  },
  {
    id: "c8",
    name: "都市開発計画",
    cost: 18,
    tags: ["Building"],
    reqText: "エネルギー生産量 1以上",
    effectText: "都市タイルを配置、MC生産量 +2",
    placementType: "city",
    victoryPoints: 1
  },
  {
    id: "c9",
    name: "鉄鉱山開発",
    cost: 8,
    tags: ["Building"],
    reqText: "なし",
    effectText: "建材生産量 +2",
    victoryPoints: 0
  },
  {
    id: "c10",
    name: "チタン掘削場",
    cost: 10,
    tags: ["Building"],
    reqText: "なし",
    effectText: "チタン生産量 +1",
    victoryPoints: 0
  },
  {
    id: "c11",
    name: "窒素ガスの輸入",
    cost: 28,
    tags: ["Space"],
    reqText: "なし",
    effectText: "TR +2、植物生産量 +2",
    victoryPoints: 0
  },
  {
    id: "c12",
    name: "耐寒細菌の導入",
    cost: 6,
    tags: ["Plant"],
    reqText: "気温 -28°C以上",
    effectText: "植物生産量 +1",
    victoryPoints: 0
  },
  {
    id: "c13",
    name: "巨大反射鏡の軌道投入",
    cost: 22,
    tags: ["Space"],
    reqText: "なし",
    effectText: "熱生産量 +3",
    victoryPoints: 0
  },
  {
    id: "c14",
    name: "炭素採掘プロジェクト",
    cost: 12,
    tags: ["Building"],
    reqText: "なし",
    effectText: "建材生産量 +1、熱生産量 +2",
    victoryPoints: 0
  },
  {
    id: "c15",
    name: "地下水汲み上げ",
    cost: 18,
    tags: ["Building"],
    reqText: "なし",
    effectText: "海洋タイルを配置",
    placementType: "ocean",
    victoryPoints: 0
  },
  {
    id: "c16",
    name: "保護ドームドール都市",
    cost: 21,
    tags: ["Building"],
    reqText: "なし",
    effectText: "都市タイルを配置、建材生産量 +1",
    placementType: "city",
    victoryPoints: 1
  },
  {
    id: "c17",
    name: "温室バイオームドーム",
    cost: 16,
    tags: ["Plant", "Building"],
    reqText: "気温 -24°C以上",
    effectText: "植物生産量 +2、植物 +2",
    victoryPoints: 0
  },
  {
    id: "c18",
    name: "土壌微生物の散布",
    cost: 9,
    tags: ["Plant"],
    reqText: "気温 -26°C以上",
    effectText: "植物生産量 +1、MC生産量 +1",
    victoryPoints: 0
  },
  {
    id: "c19",
    name: "耐寒家畜の放牧",
    cost: 13,
    tags: ["Plant"],
    reqText: "酸素濃度 9%以上",
    effectText: "MC生産量 +2、TR +1",
    victoryPoints: 2
  },
  {
    id: "c20",
    name: "氷河の融解計画",
    cost: 16,
    tags: ["Space"],
    reqText: "気温 -20°C以上",
    effectText: "海洋タイルを配置、植物生産量 +1",
    placementType: "ocean",
    victoryPoints: 0
  }
];

const INITIAL_CELLS: Omit<CellState, "tileType" | "placedBy">[] = [
  { q: 0, r: -3, isOceanOnly: true, bonusType: "none", bonusAmount: 0 },
  { q: 1, r: -3, isOceanOnly: true, bonusType: "steel", bonusAmount: 1 },
  { q: 2, r: -3, isOceanOnly: true, bonusType: "none", bonusAmount: 0 },
  { q: 3, r: -3, isOceanOnly: true, bonusType: "titanium", bonusAmount: 1 },
  { q: -1, r: -2, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: 0, r: -2, isOceanOnly: false, bonusType: "plant", bonusAmount: 1 },
  { q: 1, r: -2, isOceanOnly: true, bonusType: "none", bonusAmount: 0 },
  { q: 2, r: -2, isOceanOnly: false, bonusType: "steel", bonusAmount: 2 },
  { q: 3, r: -2, isOceanOnly: true, bonusType: "none", bonusAmount: 0 },
  { q: -2, r: -1, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -1, r: -1, isOceanOnly: false, bonusType: "plant", bonusAmount: 1 },
  { q: 0, r: -1, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: 1, r: -1, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: 2, r: -1, isOceanOnly: true, bonusType: "none", bonusAmount: 0 },
  { q: 3, r: -1, isOceanOnly: true, bonusType: "none", bonusAmount: 0 },
  { q: -3, r: 0, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -2, r: 0, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -1, r: 0, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: 0, r: 0, isOceanOnly: false, bonusType: "mc", bonusAmount: 2 },
  { q: 1, r: 0, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: 2, r: 0, isOceanOnly: false, bonusType: "titanium", bonusAmount: 1 },
  { q: 3, r: 0, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -3, r: 1, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -2, r: 1, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -1, r: 1, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: 0, r: 1, isOceanOnly: false, bonusType: "plant", bonusAmount: 1 },
  { q: 1, r: 1, isOceanOnly: true, bonusType: "none", bonusAmount: 0 },
  { q: 2, r: 1, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -3, r: 2, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -2, r: 2, isOceanOnly: false, bonusType: "titanium", bonusAmount: 1 },
  { q: -1, r: 2, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: 0, r: 2, isOceanOnly: false, bonusType: "card", bonusAmount: 1 },
  { q: 1, r: 2, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -3, r: 3, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -2, r: 3, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: -1, r: 3, isOceanOnly: false, bonusType: "none", bonusAmount: 0 },
  { q: 0, r: 3, isOceanOnly: false, bonusType: "none", bonusAmount: 0 }
];

function formatLogTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
}

function addLog(logsList: LogEntry[], sender: "player" | "cpu" | "system", text: string): LogEntry[] {
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

function shuffle(array: string[]): string[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getInitialState(): GameState {
  const board: Record<string, CellState> = {};
  INITIAL_CELLS.forEach(cell => {
    board[`${cell.q},${cell.r}`] = {
      ...cell,
      tileType: "empty",
      placedBy: null
    };
  });

  return {
    generation: 1,
    actionsRemaining: 2,
    temperature: -30,
    oxygen: 0,
    oceans: 0,
    tr: 20,
    mc: 20,
    mcProd: 10,
    steel: 0,
    steelProd: 1,
    titanium: 0,
    titaniumProd: 0,
    plants: 0,
    plantsProd: 1,
    energy: 0,
    energyProd: 1,
    heat: 0,
    heatProd: 1,
    hand: ["c3", "c4", "c7", "c9", "c10"],
    deck: ["c1", "c2", "c5", "c6", "c8", "c11", "c12", "c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20"],
    playedProjects: [],
    board,
    logs: [
      {
        id: "init",
        timestamp: "12:00:00",
        sender: "system",
        text: "ミッション開始: 火星テラフォーミング指令室へようこそ。目標: 気温 +8°C, 酸素 14%, 海洋 9"
      }
    ],
    isGameOver: false,
    gameResult: null,
    onboarded: false
  };
}

function isGameOverCheck(temp: number, oxy: number, oce: number): boolean {
  return temp >= 8 && oxy >= 14 && oce >= 9;
}

function computeScore(state: GameState): number {
  let score = state.tr;
  Object.values(state.board).forEach(cell => {
    if (cell.placedBy === "player") {
      if (cell.tileType === "forest" || cell.tileType === "city") {
        score += 1;
      }
    }
  });
  state.playedProjects.forEach(cardId => {
    const card = ALL_CARDS.find(c => c.id === cardId);
    if (card && card.victoryPoints) {
      score += card.victoryPoints;
    }
  });
  return score;
}

function getCardDiscount(card: Card, state: GameState) {
  const maxSteel = card.tags.includes("Building") ? Math.min(state.steel, Math.ceil(card.cost / 2)) : 0;
  const maxTitanium = card.tags.includes("Space") ? Math.min(state.titanium, Math.ceil(card.cost / 3)) : 0;
  return { maxSteel, maxTitanium };
}

function getCardPlayableStatus(card: Card, state: GameState, steelUsed: number, titaniumUsed: number) {
  const costAfterDiscount = Math.max(0, card.cost - (steelUsed * 2) - (titaniumUsed * 3));

  if (state.mc < costAfterDiscount) {
    return { playable: false, reason: "資源（MC）が不足しています。" };
  }

  if (card.id === "c1" && state.energyProd < 1) {
    return { playable: false, reason: "エネルギー生産量が1以上必要です。" };
  }
  if (card.id === "c5" && state.oceans < 2) {
    return { playable: false, reason: "海洋が2枚以上配置されている必要があります。" };
  }
  if (card.id === "c6" && state.temperature < -26) {
    return { playable: false, reason: "気温が -26°C 以上である必要があります。" };
  }
  if (card.id === "c8" && state.energyProd < 1) {
    return { playable: false, reason: "エネルギー生産量が1以上必要です。" };
  }
  if (card.id === "c12" && state.temperature < -28) {
    return { playable: false, reason: "気温が -28°C 以上である必要があります。" };
  }
  if (card.id === "c17" && state.temperature < -24) {
    return { playable: false, reason: "気温が -24°C 以上である必要があります。" };
  }
  if (card.id === "c18" && state.temperature < -26) {
    return { playable: false, reason: "気温が -26°C 以上である必要があります。" };
  }
  if (card.id === "c19" && state.oxygen < 9) {
    return { playable: false, reason: "酸素濃度が 9% 以上である必要があります。" };
  }
  if (card.id === "c20" && state.temperature < -20) {
    return { playable: false, reason: "気温が -20°C 以上である必要があります。" };
  }

  return { playable: true, reason: "" };
}

function getAdjacentCells(q: number, r: number) {
  return [
    { q: q + 1, r: r },
    { q: q - 1, r: r },
    { q: q, r: r + 1 },
    { q: q, r: r - 1 },
    { q: q + 1, r: r - 1 },
    { q: q - 1, r: r + 1 }
  ];
}

function hasAdjacentCity(q: number, r: number, board: Record<string, CellState>): boolean {
  const adj = getAdjacentCells(q, r);
  return adj.some(pos => {
    const key = `${pos.q},${pos.r}`;
    return board[key] && board[key].tileType === "city";
  });
}

function isCellPlacementValid(cell: CellState, type: "forest" | "city" | "ocean", board: Record<string, CellState>): boolean {
  if (cell.tileType !== "empty") return false;

  if (type === "ocean") {
    return cell.isOceanOnly;
  } else if (type === "city") {
    if (cell.isOceanOnly) return false;
    return !hasAdjacentCity(cell.q, cell.r, board);
  } else {
    return !cell.isOceanOnly;
  }
}

function triggerProduction(state: GameState, logAcc: LogEntry[]): GameState {
  const nextState = { ...state };
  const energyToHeat = nextState.energy;
  nextState.heat += energyToHeat;
  nextState.energy = 0;

  const addedMc = Math.max(0, nextState.mcProd + nextState.tr);
  nextState.mc += addedMc;
  nextState.steel += nextState.steelProd;
  nextState.titanium += nextState.titaniumProd;
  nextState.plants += nextState.plantsProd;
  nextState.energy += nextState.energyProd;
  nextState.heat += nextState.heatProd;

  let localLog = addLog(
    logAcc,
    "system",
    `生産フェーズ完了: MC +${addedMc} (TR ${nextState.tr} + 生産 ${nextState.mcProd}), 建材 +${nextState.steelProd}, チタン +${nextState.titaniumProd}, 植物 +${nextState.plantsProd}, エネルギー +${nextState.energyProd}, 熱 +${nextState.heatProd}。エネルギー ${energyToHeat} を熱に変換。`
  );

  let deck = [...nextState.deck];
  const hand = [...nextState.hand];

  for (let i = 0; i < 2; i++) {
    if (deck.length === 0) {
      const played = nextState.playedProjects.filter(id => !hand.includes(id));
      if (played.length > 0) {
        deck = shuffle(played);
        localLog = addLog(localLog, "system", "デッキが空になったため、使用済みのプロジェクトカードをシャッフルして再構成しました。");
      } else {
        break;
      }
    }
    const [drawn, ...rest] = deck;
    if (drawn) {
      hand.push(drawn);
      deck = rest;
      const cardObj = ALL_CARDS.find(c => c.id === drawn);
      localLog = addLog(localLog, "system", `カードを引きました: 【${cardObj?.name || drawn}】`);
    }
  }

  nextState.deck = deck;
  nextState.hand = hand;

  if (nextState.generation >= 12) {
    nextState.isGameOver = true;
    const isWin = isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans);
    nextState.gameResult = isWin ? "win" : "loss";
    nextState.logs = addLog(localLog, "system", `ゲーム終了 (第12世代終了): ${isWin ? "ミッション成功！" : "テラフォーミング未完了、ミッション失敗。"}`);
  } else {
    nextState.generation += 1;
    nextState.actionsRemaining = 2;
    nextState.logs = addLog(localLog, "system", `第 ${nextState.generation} 世代が開始されました。残りアクション: 2`);
  }

  return nextState;
}

function executeCpuTurn(state: GameState, logAcc: LogEntry[]): GameState {
  const nextState = {
    ...state,
    board: { ...state.board }
  };
  if (isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans)) {
    nextState.isGameOver = true;
    nextState.gameResult = "win";
    nextState.logs = addLog(logAcc, "system", "ゲーム終了: 全てのグローバルパラメータが目標値に達しました！");
    return nextState;
  }

  const tempProgress = (nextState.temperature - (-30)) / 38;
  const oxyProgress = nextState.oxygen / 14;
  const oceProgress = nextState.oceans / 9;

  let actionType: "temp" | "oxy" | "oce" = "temp";
  const minProgress = tempProgress;

  if (oxyProgress < minProgress) {
    actionType = "oxy";
  }
  if (oceProgress < minProgress && oceProgress < oxyProgress) {
    actionType = "oce";
  }

  let localLog = logAcc;

  if (actionType === "temp") {
    if (nextState.temperature < 8) {
      nextState.temperature = Math.min(8, nextState.temperature + 2);
      localLog = addLog(localLog, "cpu", "CPUのアクション: 大型温室施設の増設により、気温が 2°C 上昇しました。");
    } else {
      actionType = "oxy";
    }
  }

  if (actionType === "oxy") {
    if (nextState.oxygen < 14) {
      nextState.oxygen = Math.min(14, nextState.oxygen + 1);
      const forestCoords = Object.keys(nextState.board).filter(
        k => !nextState.board[k].isOceanOnly && nextState.board[k].tileType === "empty"
      );
      if (forestCoords.length > 0) {
        const randomKey = forestCoords[Math.floor(Math.random() * forestCoords.length)];
        const cell = nextState.board[randomKey];
        nextState.board[randomKey] = {
          ...cell,
          tileType: "forest",
          placedBy: "cpu"
        };
        localLog = addLog(localLog, "cpu", `CPUのアクション: 緑化推進により酸素濃度が 1% 上昇し、緑地を (${cell.q}, ${cell.r}) に配置しました。`);
      } else {
        localLog = addLog(localLog, "cpu", "CPUのアクション: 緑化推進により酸素濃度が 1% 上昇しました。");
      }
    } else {
      actionType = "oce";
    }
  }

  if (actionType === "oce") {
    if (nextState.oceans < 9) {
      nextState.oceans = Math.min(9, nextState.oceans + 1);
      const oceanCoords = Object.keys(nextState.board).filter(
        k => nextState.board[k].isOceanOnly && nextState.board[k].tileType === "empty"
      );
      if (oceanCoords.length > 0) {
        const randomKey = oceanCoords[Math.floor(Math.random() * oceanCoords.length)];
        const cell = nextState.board[randomKey];
        nextState.board[randomKey] = {
          ...cell,
          tileType: "ocean",
          placedBy: "cpu"
        };
        localLog = addLog(localLog, "cpu", `CPUのアクション: 氷河融解誘導により海洋が 1 上昇し、海洋を (${cell.q}, ${cell.r}) に配置しました。`);
      } else {
        localLog = addLog(localLog, "cpu", "CPUのアクション: 海洋が 1 上昇しました。");
      }
    }
  }

  if (isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans)) {
    nextState.isGameOver = true;
    nextState.gameResult = "win";
    nextState.logs = addLog(localLog, "system", "ゲーム終了: 全てのグローバルパラメータが目標値に達しました！");
    return nextState;
  }

  return triggerProduction(nextState, localLog);
}

function handleActionSpend(state: GameState, logAcc: LogEntry[]): GameState {
  const nextState = { ...state };
  nextState.actionsRemaining -= 1;
  nextState.logs = logAcc;

  if (nextState.actionsRemaining <= 0) {
    if (isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans)) {
      nextState.isGameOver = true;
      nextState.gameResult = "win";
      nextState.logs = addLog(nextState.logs, "system", "ゲーム終了: 全てのグローバルパラメータが目標値に達しました！");
      return nextState;
    }
    return executeCpuTurn(nextState, nextState.logs);
  }
  return nextState;
}

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(getInitialState);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [steelUsed, setSteelUsed] = useState<number>(0);
  const [titaniumUsed, setTitaniumUsed] = useState<number>(0);
  const [placementMode, setPlacementMode] = useState<{
    active: boolean;
    type: "forest" | "city" | "ocean";
    sourceCardId?: string;
    sourceProject?: "greenery" | "plants" | "ocean";
  } | null>(null);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("mars_frontier_game");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && "generation" in parsed) {
          setTimeout(() => {
            setGameState(parsed);
          }, 0);
        }
      } catch (e) {
        console.error("Failed to parse saved game state", e);
      }
    }
  }, []);

  const saveState = (newState: GameState) => {
    setGameState(newState);
    localStorage.setItem("mars_frontier_game", JSON.stringify(newState));
  };

  const initGame = () => {
    const cardIds = ALL_CARDS.map(c => c.id);
    let shuffled = shuffle(cardIds);
    let hand: string[] = [];
    let deck = [...shuffled];

    const isAffordableStartCard = (id: string) => {
      const card = ALL_CARDS.find(c => c.id === id);
      if (!card) return false;
      if (card.cost > 20) return false;
      if (card.id === "c1") return false;
      if (card.id === "c5") return false;
      if (card.id === "c6") return false;
      if (card.id === "c8") return false;
      if (card.id === "c12") return false;
      if (card.id === "c17") return false;
      if (card.id === "c18") return false;
      if (card.id === "c19") return false;
      if (card.id === "c20") return false;
      return true;
    };

    let hasPlayable = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      shuffled = shuffle(cardIds);
      const testHand = shuffled.slice(0, 5);
      if (testHand.some(isAffordableStartCard)) {
        hand = testHand;
        deck = shuffled.slice(5);
        hasPlayable = true;
        break;
      }
    }

    if (!hasPlayable) {
      const cheapCard = ALL_CARDS.find(isAffordableStartCard);
      const cheapId = cheapCard ? cheapCard.id : "c3";
      hand = [cheapId, ...shuffled.filter(id => id !== cheapId).slice(0, 4)];
      deck = shuffled.filter(id => !hand.includes(id));
    }

    const board: Record<string, CellState> = {};
    INITIAL_CELLS.forEach(cell => {
      board[`${cell.q},${cell.r}`] = {
        ...cell,
        tileType: "empty",
        placedBy: null
      };
    });

    const initialLogs: LogEntry[] = [];
    const logs = addLog(initialLogs, "system", "ミッション開始: 火星テラフォーミング指令室へようこそ。目標: 気温 +8°C, 酸素 14%, 海洋 9");

    const state: GameState = {
      generation: 1,
      actionsRemaining: 2,
      temperature: -30,
      oxygen: 0,
      oceans: 0,
      tr: 20,
      mc: 20,
      mcProd: 10,
      steel: 0,
      steelProd: 1,
      titanium: 0,
      titaniumProd: 0,
      plants: 0,
      plantsProd: 1,
      energy: 0,
      energyProd: 1,
      heat: 0,
      heatProd: 1,
      hand,
      deck,
      playedProjects: [],
      board,
      logs,
      isGameOver: false,
      gameResult: null,
      onboarded: false
    };

    saveState(state);
    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);
    setPlacementMode(null);
  };

  const handlePass = () => {
    const nextState = { ...gameState };
    const localLogs = addLog(nextState.logs, "player", `パスを選択しました。残りのアクションを放棄します。`);
    nextState.actionsRemaining = 0;
    const resolved = executeCpuTurn(nextState, localLogs);
    saveState(resolved);
    setSelectedCardId(null);
    setPlacementMode(null);
  };

  const handleCardClick = (cardId: string) => {
    if (placementMode) return;
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
      setSteelUsed(0);
      setTitaniumUsed(0);
    } else {
      setSelectedCardId(cardId);
      setSteelUsed(0);
      setTitaniumUsed(0);
    }
  };

  const handlePlayCardInit = () => {
    if (!selectedCardId) return;
    const card = ALL_CARDS.find(c => c.id === selectedCardId);
    if (!card) return;

    const { playable } = getCardPlayableStatus(card, gameState, steelUsed, titaniumUsed);
    if (!playable) return;

    if (card.placementType) {
      setPlacementMode({
        active: true,
        type: card.placementType,
        sourceCardId: card.id
      });
    } else {
      executePlayCardNoPlacement(card);
    }
  };

  const executePlayCardNoPlacement = (card: Card) => {
    const nextState = {
      ...gameState,
      hand: [...gameState.hand],
      deck: [...gameState.deck],
      playedProjects: [...gameState.playedProjects],
      board: { ...gameState.board }
    };
    const costAfterDiscount = Math.max(0, card.cost - (steelUsed * 2) - (titaniumUsed * 3));

    nextState.mc -= costAfterDiscount;
    nextState.steel -= steelUsed;
    nextState.titanium -= titaniumUsed;
    nextState.hand = nextState.hand.filter(id => id !== card.id);
    nextState.playedProjects.push(card.id);

    let localLogs = addLog(
      nextState.logs,
      "player",
      `カードをプレイしました: 【${card.name}】 (支払: MC ${costAfterDiscount}${steelUsed ? `, 建材 ${steelUsed}` : ""}${titaniumUsed ? `, チタン ${titaniumUsed}` : ""})`
    );

    if (card.id === "c1") {
      nextState.energyProd += 3;
      nextState.tr += 1;
      localLogs = addLog(localLogs, "system", "効果適用: エネルギー生産量 +3, TR +1");
    } else if (card.id === "c2") {
      nextState.temperature = Math.min(8, nextState.temperature + 4);
      nextState.heat += 4;
      nextState.tr += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 気温 +4°C, 熱 +4, TR +2");
    } else if (card.id === "c3") {
      nextState.energyProd += 1;
      nextState.heat += 2;
      localLogs = addLog(localLogs, "system", "効果適用: エネルギー生産量 +1, 熱 +2");
    } else if (card.id === "c4") {
      nextState.energyProd += 2;
      nextState.heat += 1;
      localLogs = addLog(localLogs, "system", "効果適用: エネルギー生産量 +2, 熱 +1");
    } else if (card.id === "c5") {
      nextState.plantsProd += 2;
      nextState.plants += 1;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +2, 植物 +1 (勝利点 +1)");
    } else if (card.id === "c6") {
      nextState.plantsProd += 1;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +1");
      if (nextState.deck.length > 0) {
        const [drawn, ...rest] = nextState.deck;
        nextState.hand.push(drawn);
        nextState.deck = rest;
        const drawnObj = ALL_CARDS.find(c => c.id === drawn);
        localLogs = addLog(localLogs, "system", `追加カードドロー: 【${drawnObj?.name || drawn}】`);
      }
    } else if (card.id === "c7") {
      nextState.heatProd += 1;
      nextState.heat += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 熱生産量 +1, 熱 +2");
    } else if (card.id === "c9") {
      nextState.steelProd += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 建材生産量 +2");
    } else if (card.id === "c10") {
      nextState.titaniumProd += 1;
      localLogs = addLog(localLogs, "system", "効果適用: チタン生産量 +1");
    } else if (card.id === "c11") {
      nextState.tr += 2;
      nextState.plantsProd += 2;
      localLogs = addLog(localLogs, "system", "効果適用: TR +2, 植物生産量 +2");
    } else if (card.id === "c12") {
      nextState.plantsProd += 1;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +1");
    } else if (card.id === "c13") {
      nextState.heatProd += 3;
      localLogs = addLog(localLogs, "system", "効果適用: 熱生産量 +3");
    } else if (card.id === "c14") {
      nextState.steelProd += 1;
      nextState.heatProd += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 建材生産量 +1, 熱生産量 +2");
    } else if (card.id === "c17") {
      nextState.plantsProd += 2;
      nextState.plants += 2;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +2, 植物 +2");
    } else if (card.id === "c18") {
      nextState.plantsProd += 1;
      nextState.mcProd += 1;
      localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +1, MC生産量 +1");
    } else if (card.id === "c19") {
      nextState.mcProd += 2;
      nextState.tr += 1;
      localLogs = addLog(localLogs, "system", "効果適用: MC生産量 +2, TR +1 (勝利点 +2)");
    }

    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);

    const afterAction = handleActionSpend(nextState, localLogs);
    saveState(afterAction);
  };

  const handleCellClick = (cell: CellState) => {
    if (!placementMode) return;
    if (!isCellPlacementValid(cell, placementMode.type, gameState.board)) return;

    const nextState = {
      ...gameState,
      hand: [...gameState.hand],
      deck: [...gameState.deck],
      playedProjects: [...gameState.playedProjects],
      board: { ...gameState.board }
    };
    let localLogs = nextState.logs;

    if (placementMode.sourceCardId) {
      const card = ALL_CARDS.find(c => c.id === placementMode.sourceCardId);
      if (!card) return;

      const costAfterDiscount = Math.max(0, card.cost - (steelUsed * 2) - (titaniumUsed * 3));
      nextState.mc -= costAfterDiscount;
      nextState.steel -= steelUsed;
      nextState.titanium -= titaniumUsed;
      nextState.hand = nextState.hand.filter(id => id !== card.id);
      nextState.playedProjects.push(card.id);

      localLogs = addLog(
        localLogs,
        "player",
        `カードをプレイしました: 【${card.name}】 (支払: MC ${costAfterDiscount}${steelUsed ? `, 建材 ${steelUsed}` : ""}${titaniumUsed ? `, チタン ${titaniumUsed}` : ""})`
      );

      nextState.board[`${cell.q},${cell.r}`] = {
        ...cell,
        tileType: placementMode.type,
        placedBy: "player"
      };

      localLogs = addLog(localLogs, "player", `タイルを配置しました: 【${placementMode.type === "ocean" ? "海洋" : placementMode.type === "city" ? "都市" : "緑地"}】 (${cell.q}, ${cell.r})`);

      if (placementMode.type === "forest") {
        nextState.oxygen = Math.min(14, nextState.oxygen + 1);
        nextState.tr += 1;
        localLogs = addLog(localLogs, "system", "緑化タイル配置により、酸素濃度 +1%, TR +1");
      } else if (placementMode.type === "ocean") {
        nextState.oceans = Math.min(9, nextState.oceans + 1);
        nextState.tr += 1;
        localLogs = addLog(localLogs, "system", "海洋タイル配置により、海洋面積 +1, TR +1");
      }

      if (card.id === "c8") {
        nextState.mcProd += 2;
        localLogs = addLog(localLogs, "system", "効果適用: MC生産量 +2 (勝利点 +1)");
      } else if (card.id === "c15") {
        localLogs = addLog(localLogs, "system", "効果適用: 海洋の配置");
      } else if (card.id === "c16") {
        nextState.steelProd += 1;
        localLogs = addLog(localLogs, "system", "効果適用: 建材生産量 +1 (勝利点 +1)");
      } else if (card.id === "c20") {
        nextState.plantsProd += 1;
        localLogs = addLog(localLogs, "system", "効果適用: 植物生産量 +1");
      }
    } else if (placementMode.sourceProject) {
      if (placementMode.sourceProject === "greenery" || placementMode.sourceProject === "plants") {
        const payInPlants = placementMode.sourceProject === "plants";
        if (payInPlants) {
          nextState.plants -= 8;
          localLogs = addLog(localLogs, "player", "標準プロジェクト【緑化】を実行しました (支払: 植物 8)");
        } else {
          nextState.mc -= 23;
          localLogs = addLog(localLogs, "player", "標準プロジェクト【緑化】を実行しました (支払: MC 23)");
        }

        nextState.board[`${cell.q},${cell.r}`] = {
          ...cell,
          tileType: "forest",
          placedBy: "player"
        };
        nextState.oxygen = Math.min(14, nextState.oxygen + 1);
        nextState.tr += 1;
        localLogs = addLog(localLogs, "player", `緑地を (${cell.q}, ${cell.r}) に配置しました。`);
        localLogs = addLog(localLogs, "system", "酸素濃度 +1%, TR +1");
      } else if (placementMode.sourceProject === "ocean") {
        nextState.mc -= 18;
        localLogs = addLog(localLogs, "player", "標準プロジェクト【海洋配置】を実行しました (支払: MC 18)");

        nextState.board[`${cell.q},${cell.r}`] = {
          ...cell,
          tileType: "ocean",
          placedBy: "player"
        };
        nextState.oceans = Math.min(9, nextState.oceans + 1);
        nextState.tr += 1;
        localLogs = addLog(localLogs, "player", `海洋を (${cell.q}, ${cell.r}) に配置しました。`);
        localLogs = addLog(localLogs, "system", "海洋面積 +1, TR +1");
      }
    }

    if (cell.bonusType !== "none") {
      if (cell.bonusType === "plant") {
        nextState.plants += cell.bonusAmount;
        localLogs = addLog(localLogs, "system", `配置ボーナス獲得: 植物 +${cell.bonusAmount}`);
      } else if (cell.bonusType === "steel") {
        nextState.steel += cell.bonusAmount;
        localLogs = addLog(localLogs, "system", `配置ボーナス獲得: 建材 +${cell.bonusAmount}`);
      } else if (cell.bonusType === "titanium") {
        nextState.titanium += cell.bonusAmount;
        localLogs = addLog(localLogs, "system", `配置ボーナス獲得: チタン +${cell.bonusAmount}`);
      } else if (cell.bonusType === "mc") {
        nextState.mc += cell.bonusAmount;
        localLogs = addLog(localLogs, "system", `配置ボーナス獲得: MC +${cell.bonusAmount}`);
      } else if (cell.bonusType === "card") {
        if (nextState.deck.length > 0) {
          const [drawn, ...rest] = nextState.deck;
          nextState.hand.push(drawn);
          nextState.deck = rest;
          const cardObj = ALL_CARDS.find(c => c.id === drawn);
          localLogs = addLog(localLogs, "system", `配置ボーナス獲得: カードを引きました 【${cardObj?.name || drawn}】`);
        }
      }
    }

    setSelectedCardId(null);
    setSteelUsed(0);
    setTitaniumUsed(0);
    setPlacementMode(null);

    const afterAction = handleActionSpend(nextState, localLogs);
    saveState(afterAction);
  };

  const handleStandardProjectPlay = (type: "asteroid" | "greenery" | "ocean" | "plants_convert" | "heat_convert") => {
    if (placementMode) return;
    const nextState = { ...gameState };

    if (type === "asteroid") {
      nextState.mc -= 14;
      nextState.temperature = Math.min(8, nextState.temperature + 2);
      nextState.tr += 1;
      let logs = addLog(nextState.logs, "player", "標準プロジェクト【小惑星の衝突】を実行しました (支払: MC 14)");
      logs = addLog(logs, "system", "気温 +2°C, TR +1");
      const afterAction = handleActionSpend(nextState, logs);
      saveState(afterAction);
    } else if (type === "heat_convert") {
      nextState.heat -= 8;
      nextState.temperature = Math.min(8, nextState.temperature + 2);
      nextState.tr += 1;
      let logs = addLog(nextState.logs, "player", "熱の変換を実行しました (支払: 熱 8)");
      logs = addLog(logs, "system", "気温 +2°C, TR +1");
      const afterAction = handleActionSpend(nextState, logs);
      saveState(afterAction);
    } else if (type === "greenery") {
      setPlacementMode({
        active: true,
        type: "forest",
        sourceProject: "greenery"
      });
    } else if (type === "plants_convert") {
      setPlacementMode({
        active: true,
        type: "forest",
        sourceProject: "plants"
      });
    } else if (type === "ocean") {
      setPlacementMode({
        active: true,
        type: "ocean",
        sourceProject: "ocean"
      });
    }
  };

  const handleConfirmRestart = () => {
    initGame();
    setShowRestartConfirm(false);
  };

  const handleCloseOnboard = () => {
    const nextState = { ...gameState, onboarded: true };
    saveState(nextState);
  };

  const selectedCard = useMemo(() => {
    if (!selectedCardId) return null;
    return ALL_CARDS.find(c => c.id === selectedCardId) || null;
  }, [selectedCardId]);

  const { playable: canPlaySelected, reason: playDisableReason } = selectedCard
    ? getCardPlayableStatus(selectedCard, gameState, steelUsed, titaniumUsed)
    : { playable: false, reason: "" };

  const { maxSteel, maxTitanium } = selectedCard
    ? getCardDiscount(selectedCard, gameState)
    : { maxSteel: 0, maxTitanium: 0 };

  const isPlantsConvertAffordable = gameState.plants >= 8;
  const isHeatConvertAffordable = gameState.heat >= 8;

  const scoreValue = computeScore(gameState);

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="header-title-container">
          <h1 className="header-title">MARS FRONTIER</h1>
          <span className="header-subtitle">火星開拓戦略制御システム — VERSION 2.0</span>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button className="btn-secondary" style={{ padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => setShowHelp(true)}>
            マニュアル表示
          </button>
          <button className="btn-primary" style={{ padding: "4px 12px", fontSize: "0.8rem" }} onClick={() => setShowRestartConfirm(true)}>
            指令リセット
          </button>
          <span className="header-version">UNOFFICIAL FAN-MADE PROTOTYPE</span>
        </div>
      </header>

      <main className="main-content">
        <div className="cyber-panel">
          <div className="cyber-panel-header">
            <h2 className="cyber-panel-title">GLOBAL TELEMETRY</h2>
          </div>
          <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-ink)" }}>現在の世代:</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--color-ember)" }}>G-{gameState.generation} / 12</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-ink)" }}>残りアクション:</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--color-gold)" }}>{gameState.actionsRemaining} / 2</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-ink)" }}>TR (開拓評価):</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--color-cyan)" }}>{gameState.tr}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(168, 50, 32, 0.2)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--color-ink)" }}>現在スコア:</span>
              <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "var(--color-ink)" }}>{scoreValue} 点</span>
            </div>

            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "2px" }}>
                  <span>気温 (目標: +8°C)</span>
                  <span style={{ color: "var(--color-ember)" }}>{gameState.temperature}°C</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#080908", border: "1px solid var(--color-rust)", borderRadius: "4px" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "var(--color-ember)",
                      width: `${Math.min(100, Math.max(0, ((gameState.temperature - (-30)) / 38) * 100))}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "2px" }}>
                  <span>酸素濃度 (目標: 14%)</span>
                  <span style={{ color: "var(--color-cyan)" }}>{gameState.oxygen}%</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#080908", border: "1px solid var(--color-rust)", borderRadius: "4px" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "var(--color-cyan)",
                      width: `${Math.min(100, Math.max(0, (gameState.oxygen / 14) * 100))}%`
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "2px" }}>
                  <span>海洋数 (目標: 9)</span>
                  <span style={{ color: "var(--color-gold)" }}>{gameState.oceans} / 9</span>
                </div>
                <div style={{ width: "100%", height: "8px", backgroundColor: "#080908", border: "1px solid var(--color-rust)", borderRadius: "4px" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: "var(--color-gold)",
                      width: `${Math.min(100, Math.max(0, (gameState.oceans / 9) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: "14px", padding: "10px", backgroundColor: "rgba(114, 217, 208, 0.05)", border: "1px solid rgba(114, 217, 208, 0.2)", borderRadius: "4px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--color-cyan)", fontWeight: "bold", marginBottom: "4px" }}>CPUステータス</div>
              <p style={{ fontSize: "0.7rem", color: "#c9bfae", lineHeight: "1.3" }}>
                CPUは毎世代の終了時に、目標値に最も遠いグローバルパラメータを自動的に進行させます。
              </p>
            </div>
          </div>
        </div>

        <div className="board-panel">
          {placementMode && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                zIndex: 20,
                backgroundColor: "var(--color-panel)",
                border: "2px solid var(--color-cyan)",
                borderRadius: "4px",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: "0 0 15px rgba(114, 217, 208, 0.4)"
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "var(--color-cyan)", fontWeight: "bold" }}>
                【{placementMode.type === "ocean" ? "海洋" : placementMode.type === "city" ? "都市" : "緑地"}】の配置場所を選択してください
              </span>
              <button
                className="btn-secondary"
                style={{ padding: "2px 8px", fontSize: "0.75rem", color: "var(--color-rust)", borderColor: "var(--color-rust)" }}
                onClick={() => {
                  setPlacementMode(null);
                  setSelectedCardId(null);
                  setSteelUsed(0);
                  setTitaniumUsed(0);
                }}
              >
                キャンセル
              </button>
            </div>
          )}

          <div className="mars-sphere">
            <div className="hex-grid">
              {Object.values(gameState.board).map(cell => {
                const isValid = placementMode?.active ? isCellPlacementValid(cell, placementMode.type, gameState.board) : false;
                const left = 230 + 52 * (cell.q + cell.r / 2) - 27;
                const top = 230 + 45 * cell.r - 23.4;

                let classes = "hex-cell ";
                let content = "";
                let label = "";

                if (cell.tileType === "forest") {
                  classes += "hex-forest";
                  content = "🌲";
                  label = "緑地";
                } else if (cell.tileType === "city") {
                  classes += "hex-city";
                  content = "🏙️";
                  label = "都市";
                } else if (cell.tileType === "ocean") {
                  classes += "hex-ocean";
                  content = "🌊";
                  label = "海洋";
                } else {
                  classes += cell.isOceanOnly ? "hex-ocean-reserved" : "hex-empty";
                  if (cell.bonusType !== "none") {
                    if (cell.bonusType === "plant") content = `🌱${cell.bonusAmount}`;
                    else if (cell.bonusType === "steel") content = `🤖${cell.bonusAmount}`;
                    else if (cell.bonusType === "titanium") content = `🚀${cell.bonusAmount}`;
                    else if (cell.bonusType === "mc") content = `💳${cell.bonusAmount}`;
                    else if (cell.bonusType === "card") content = `🃏${cell.bonusAmount}`;
                  }
                  if (cell.isOceanOnly && cell.tileType === "empty") {
                    label = "海洋専用";
                  }
                }

                if (isValid) {
                  classes += " hex-placement-valid";
                }

                return (
                  <button
                    key={`${cell.q},${cell.r}`}
                    className={classes}
                    style={{ left: `${left}px`, top: `${top}px` }}
                    onClick={() => handleCellClick(cell)}
                    disabled={placementMode?.active ? !isValid : true}
                    title={`座標: (${cell.q}, ${cell.r})`}
                    aria-label={`マス (${cell.q}, ${cell.r}) ${label} ${content}`}
                  >
                    <span className="hex-bonus" style={{ pointerEvents: "none" }}>{content}</span>
                    <span className="hex-label" style={{ pointerEvents: "none", color: "var(--color-ink)", fontSize: "0.5rem" }}>
                      {cell.tileType === "empty" && cell.isOceanOnly ? "🌊" : label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="cyber-panel" style={{ flex: 1 }}>
            <div className="cyber-panel-header">
              <h2 className="cyber-panel-title">RESOURCES</h2>
            </div>
            <div className="cyber-panel-content">
              <div className="resources-grid">
                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>💳 MegaCredits</span>
                  </div>
                  <span className="resource-value">{gameState.mc}</span>
                  <span className="resource-prod">生産: {gameState.mcProd} (+{gameState.tr} TR)</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>🤖 建材 (Steel)</span>
                  </div>
                  <span className="resource-value">{gameState.steel}</span>
                  <span className="resource-prod">生産: {gameState.steelProd}</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>🚀 チタン (Titanium)</span>
                  </div>
                  <span className="resource-value">{gameState.titanium}</span>
                  <span className="resource-prod">生産: {gameState.titaniumProd}</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>🌱 植物 (Plants)</span>
                  </div>
                  <span className="resource-value">{gameState.plants}</span>
                  <span className="resource-prod">生産: {gameState.plantsProd}</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>⚡ エネルギー (Energy)</span>
                  </div>
                  <span className="resource-value">{gameState.energy}</span>
                  <span className="resource-prod">生産: {gameState.energyProd}</span>
                </div>

                <div className="resource-box">
                  <div className="resource-name-container">
                    <span>🔥 熱 (Heat)</span>
                  </div>
                  <span className="resource-value">{gameState.heat}</span>
                  <span className="resource-prod">生産: {gameState.heatProd}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="cyber-panel">
            <div className="cyber-panel-header">
              <h2 className="cyber-panel-title">STANDARD PROJECTS</h2>
            </div>
            <div className="cyber-panel-content" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>小惑星の衝突</div>
                  <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>MC 14 | 気温 +2°C, TR +1</div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  disabled={gameState.mc < 14 || placementMode !== null || gameState.temperature >= 8}
                  onClick={() => handleStandardProjectPlay("asteroid")}
                >
                  実行
                </button>
              </div>

              {isHeatConvertAffordable && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--color-gold)" }}>熱のリリース</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>熱 8 | 気温 +2°C, TR +1</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem", borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
                    disabled={gameState.heat < 8 || placementMode !== null || gameState.temperature >= 8}
                    onClick={() => handleStandardProjectPlay("heat_convert")}
                  >
                    変換
                  </button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>海洋の沈降</div>
                  <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>MC 18 | 海洋 +1, TR +1</div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  disabled={gameState.mc < 18 || placementMode !== null || gameState.oceans >= 9}
                  onClick={() => handleStandardProjectPlay("ocean")}
                >
                  配置
                </button>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: "bold" }}>緑化プロジェクト</div>
                  <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>MC 23 | 酸素 +1%, TR +1</div>
                </div>
                <button
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                  disabled={gameState.mc < 23 || placementMode !== null || gameState.oxygen >= 14}
                  onClick={() => handleStandardProjectPlay("greenery")}
                >
                  配置
                </button>
              </div>

              {isPlantsConvertAffordable && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(242, 232, 220, 0.1)", paddingTop: "6px" }}>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: "bold", color: "var(--color-gold)" }}>植物の緑化</div>
                    <div style={{ fontSize: "0.65rem", color: "#c9bfae" }}>植物 8 | 酸素 +1%, TR +1</div>
                  </div>
                  <button
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: "0.75rem", borderColor: "var(--color-gold)", color: "var(--color-gold)" }}
                    disabled={gameState.plants < 8 || placementMode !== null || gameState.oxygen >= 14}
                    onClick={() => handleStandardProjectPlay("plants_convert")}
                  >
                    変換
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="hand-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "0.85rem", color: "var(--color-ember)", fontWeight: 700, letterSpacing: "0.1em" }}>
            PROJECT CARDS (手札: {gameState.hand.length}枚)
          </h2>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn-secondary"
              style={{ padding: "4px 14px", fontSize: "0.75rem", borderColor: "var(--color-rust)", color: "var(--color-rust)" }}
              onClick={handlePass}
              disabled={placementMode !== null}
            >
              パス (世代終了)
            </button>
          </div>
        </div>

        <div className="hand-cards">
          {gameState.hand.map(cardId => {
            const cardObj = ALL_CARDS.find(c => c.id === cardId);
            if (!cardObj) return null;
            const isSelected = selectedCardId === cardId;
            const cardReqMet = cardObj.id === "c1" ? gameState.energyProd >= 1 :
                              cardObj.id === "c5" ? gameState.oceans >= 2 :
                              cardObj.id === "c6" ? gameState.temperature >= -26 :
                              cardObj.id === "c8" ? gameState.energyProd >= 1 :
                              cardObj.id === "c12" ? gameState.temperature >= -28 :
                              cardObj.id === "c17" ? gameState.temperature >= -24 :
                              cardObj.id === "c18" ? gameState.temperature >= -26 :
                              cardObj.id === "c19" ? gameState.oxygen >= 9 :
                              cardObj.id === "c20" ? gameState.temperature >= -20 : true;

            return (
              <button
                key={cardId}
                className={`project-card ${isSelected ? "selected" : ""}`}
                onClick={() => handleCardClick(cardId)}
                aria-pressed={isSelected}
                style={{ textAlign: "left", display: "flex", flexDirection: "column" }}
              >
                <div className="card-tags">
                  {cardObj.tags.map(t => (
                    <span key={t} className="card-tag">
                      {t === "Building" ? "建" : t === "Space" ? "宇" : t === "Plant" ? "植" : "電"}
                    </span>
                  ))}
                </div>
                <div className="card-title">{cardObj.name}</div>
                {cardObj.reqText !== "なし" && (
                  <div className={`card-req ${cardReqMet ? "met" : ""}`}>
                    要件: {cardObj.reqText}
                  </div>
                )}
                <div className="card-effect">{cardObj.effectText}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                  <span className="card-cost">{cardObj.cost} MC</span>
                  {cardObj.victoryPoints ? (
                    <span style={{ fontSize: "0.65rem", color: "var(--color-gold)" }}>⭐+{cardObj.victoryPoints}</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {selectedCard && (
          <div
            className="selected-card-panel"
            style={{
              padding: "10px",
              backgroundColor: "rgba(8, 9, 8, 0.7)",
              border: "1px solid rgba(114, 217, 208, 0.2)",
              borderRadius: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <span style={{ fontSize: "0.85rem", color: "var(--color-gold)", fontWeight: "bold" }}>【{selectedCard.name}】を選択中</span>
              {!canPlaySelected && (
                <span style={{ color: "var(--color-rust)", fontSize: "0.8rem", marginLeft: "10px" }}>
                  ※ {playDisableReason}
                </span>
              )}
              {canPlaySelected && (
                <div style={{ display: "flex", gap: "16px", marginTop: "4px", alignItems: "center" }}>
                  {selectedCard.tags.includes("Building") && maxSteel > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                      <span>建材を使用 (1建材=2MC値引き):</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0 6px", fontSize: "0.7rem" }}
                        disabled={steelUsed <= 0}
                        onClick={() => setSteelUsed(v => v - 1)}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: "bold", color: "var(--color-gold)" }}>{steelUsed} / {maxSteel}</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0 6px", fontSize: "0.7rem" }}
                        disabled={steelUsed >= maxSteel}
                        onClick={() => setSteelUsed(v => v + 1)}
                      >
                        +
                      </button>
                    </div>
                  )}

                  {selectedCard.tags.includes("Space") && maxTitanium > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem" }}>
                      <span>チタンを使用 (1チタン=3MC値引き):</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0 6px", fontSize: "0.7rem" }}
                        disabled={titaniumUsed <= 0}
                        onClick={() => setTitaniumUsed(v => v - 1)}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: "bold", color: "var(--color-gold)" }}>{titaniumUsed} / {maxTitanium}</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0 6px", fontSize: "0.7rem" }}
                        disabled={titaniumUsed >= maxTitanium}
                        onClick={() => setTitaniumUsed(v => v + 1)}
                      >
                        +
                      </button>
                    </div>
                  )}

                  <span style={{ fontSize: "0.75rem" }}>
                    実質コスト: <strong style={{ color: "var(--color-ember)" }}>{Math.max(0, selectedCard.cost - (steelUsed * 2) - (titaniumUsed * 3))}</strong> MC
                  </span>
                </div>
              )}
            </div>

            <button
              className="btn-primary"
              disabled={!canPlaySelected}
              onClick={handlePlayCardInit}
            >
              {selectedCard.placementType ? "配置フェーズへ進む" : "プレイを実行"}
            </button>
          </div>
        )}
      </div>

      <div className="cyber-panel" style={{ margin: "16px", flex: "none" }}>
        <div className="cyber-panel-header">
          <h2 className="cyber-panel-title">MISSION LOGS</h2>
        </div>
        <div className="cyber-panel-content" style={{ padding: "8px" }}>
          <div className="log-container">
            {gameState.logs.map(log => {
              let senderClass = "log-entry ";
              if (log.sender === "player") senderClass += "player";
              else if (log.sender === "cpu") senderClass += "cpu";
              else senderClass += "system";

              return (
                <div key={log.id} className={senderClass}>
                  <span>[{log.timestamp}]</span> <span style={{ fontWeight: "bold" }}>{log.sender === "player" ? "あなた" : log.sender === "cpu" ? "CPU" : "システム"}:</span> {log.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {(!gameState.onboarded || showHelp) && (
        <div className="overlay-container">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">MARS FRONTIER — 指令マニュアル</h3>
            </div>
            <div className="modal-body">
              <p style={{ fontWeight: "bold", color: "var(--color-ember)", marginBottom: "10px" }}>火星を呼吸可能な緑の惑星へ作り変えよ！</p>
              <p style={{ marginBottom: "8px" }}>
                あなたはCPUと対競合しながら、12世代の制限時間内に火星のテラフォーミング完了を目指す戦略プロトタイプです。
              </p>
              <h4 style={{ color: "var(--color-gold)", marginTop: "14px", marginBottom: "6px" }}>■ 勝利条件</h4>
              <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                <li><strong>気温:</strong> -30°C から <strong>+8°C</strong> まで上昇させる</li>
                <li><strong>酸素濃度:</strong> 0% から <strong>14%</strong> まで上昇させる</li>
                <li><strong>海洋数:</strong> 0 から <strong>9タイル</strong> 配置する</li>
              </ul>
              <p style={{ marginBottom: "10px" }}>
                ※ 第12世代の終了までに上記3つの条件をすべてクリアすれば<strong>ミッション成功 (WIN)</strong>、達成できなければ<strong>失敗 (LOSS)</strong>となります。
              </p>

              <h4 style={{ color: "var(--color-gold)", marginTop: "14px", marginBottom: "6px" }}>■ 基本ルール</h4>
              <ul style={{ paddingLeft: "18px", marginBottom: "12px" }}>
                <li>毎世代、プレイヤーは2回のアクションを実行できます。その後、CPUが自動アクションを1回実行し、次の世代へと進みます。</li>
                <li>手札のプロジェクトカードは、必要なMC（メガクレジット）や前提パラメータ条件を満たすことでプレイできます。</li>
                <li>カードに<strong>「建」 (Building)</strong>タグがある場合は手持ちの建材を（1枚あたり2MC）、<strong>「宇」 (Space)</strong>タグがある場合は手持ちのチタンを（1枚あたり3MC）値引きとして支払いに充当できます。</li>
                <li>標準プロジェクトは手札に関係なくいつでも実行できるアクションです。</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => {
                  setShowHelp(false);
                  handleCloseOnboard();
                }}
              >
                了解、ミッション開始
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestartConfirm && (
        <div className="overlay-container">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "var(--color-rust)" }}>システム再起動確認</h3>
            </div>
            <div className="modal-body">
              <p>現在の進行状況はすべて消去され、初期化されます。本当によろしいですか？</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRestartConfirm(false)}>
                キャンセル
              </button>
              <button className="btn-primary" style={{ backgroundColor: "var(--color-rust)" }} onClick={handleConfirmRestart}>
                再起動実行
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState.isGameOver && (
        <div className="overlay-container">
          <div className="modal-content" style={{ maxWidth: "450px", border: `2px solid ${gameState.gameResult === "win" ? "var(--color-cyan)" : "var(--color-rust)"}` }}>
            <div className="modal-header" style={{ backgroundColor: gameState.gameResult === "win" ? "rgba(114, 217, 208, 0.1)" : "rgba(168, 50, 32, 0.1)" }}>
              <h3 className="modal-title" style={{ color: gameState.gameResult === "win" ? "var(--color-cyan)" : "var(--color-rust)" }}>
                {gameState.gameResult === "win" ? "MISSION SUCCESS" : "MISSION FAILED"}
              </h3>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1.4rem", fontWeight: "bold", margin: "14px 0", color: "var(--color-ink)" }}>
                {gameState.gameResult === "win" ? "🎉 テラフォーミング完了！" : "💀 世代限界値に達しました"}
              </p>
              <div style={{ padding: "16px", backgroundColor: "rgba(8, 9, 8, 0.5)", borderRadius: "6px", display: "inline-block", minWidth: "220px", textAlign: "left", margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>TR (開拓評価点):</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-cyan)" }}>{gameState.tr} 点</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>配置した緑地・都市数:</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-ember)" }}>
                    {Object.values(gameState.board).filter(c => c.placedBy === "player" && (c.tileType === "forest" || c.tileType === "city")).length} 点
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span>プロジェクトカード勝利点:</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-gold)" }}>
                    {gameState.playedProjects.reduce((sum, id) => sum + (ALL_CARDS.find(c => c.id === id)?.victoryPoints || 0), 0)} 点
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(242, 232, 220, 0.2)", paddingTop: "8px", marginTop: "8px", fontSize: "1.1rem" }}>
                  <span>合計スコア:</span>
                  <span style={{ fontWeight: "bold", color: "var(--color-ink)" }}>{scoreValue} 点</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={initGame}>
                新しいミッションを開始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
