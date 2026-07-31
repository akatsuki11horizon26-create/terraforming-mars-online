export const ALL_CARDS = [
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

export const INITIAL_CELLS = [
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

export function getInitialState() {
  const board = {};
  INITIAL_CELLS.forEach(cell => {
    board[`${cell.q},${cell.r}`] = {
      ...cell,
      tileType: "empty",
      placedBy: null
    };
  });

  // Setup neutral cities and greeneries deterministically
  // City 1: (0,0), Greenery 1: (0,-1)
  board["0,0"].tileType = "city";
  board["0,0"].placedBy = "neutral";
  board["0,-1"].tileType = "forest";
  board["0,-1"].placedBy = "neutral";

  // City 2: (-2,2), Greenery 2: (-3,3)
  board["-2,2"].tileType = "city";
  board["-2,2"].placedBy = "neutral";
  board["-3,3"].tileType = "forest";
  board["-3,3"].placedBy = "neutral";

  const allCardIds = ALL_CARDS.map(c => c.id);
  const shuffledDeck = shuffle(allCardIds);
  const setupCards = shuffledDeck.slice(0, 10);
  const deck = shuffledDeck.slice(10);

  return {
    generation: 1,
    phase: "setup", // setup, research, action, production, final_greenery, game_over
    turnStep: "start", // start, one_action_taken, second_action_allowed
    pendingOceans: 0,
    researchCards: setupCards,
    discardPile: [],
    actionsRemaining: 2,
    temperature: -30,
    oxygen: 0,
    oceans: 0,
    tr: 14,
    mc: 42,
    mcProd: 0,
    steel: 0,
    steelProd: 0,
    titanium: 0,
    titaniumProd: 0,
    plants: 0,
    plantsProd: 0,
    energy: 0,
    energyProd: 0,
    heat: 0,
    heatProd: 0,
    hand: [],
    deck,
    playedProjects: [],
    board,
    logs: [
      {
        id: "init",
        timestamp: "12:00:00",
        sender: "system",
        text: "公式ソロルール準拠ミッション開始。目標: 14世代以内に全グローバルパラメータの最大化。"
      }
    ],
    isGameOver: false,
    gameResult: null,
    onboarded: false
  };
}

export function isGameOverCheck(temp, oxy, oce) {
  return temp >= 8 && oxy >= 14 && oce >= 9;
}

export function computeScore(state) {
  let score = state.tr;
  
  // Count player greeneries (1 VP each)
  let playerGreeneriesCount = 0;
  Object.values(state.board).forEach(cell => {
    if (cell.placedBy === "player" && cell.tileType === "forest") {
      playerGreeneriesCount += 1;
    }
  });
  score += playerGreeneriesCount;

  // Count adjacent greeneries for each player city (1 VP each greenery, regardless of ownership)
  let cityVp = 0;
  Object.values(state.board).forEach(cell => {
    if (cell.placedBy === "player" && cell.tileType === "city") {
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
  state.playedProjects.forEach(cardId => {
    const card = ALL_CARDS.find(c => c.id === cardId);
    if (card && card.victoryPoints) {
      score += card.victoryPoints;
    }
  });

  return score;
}

export function getCardDiscount(card, state) {
  const maxSteel = card.tags.includes("Building") ? Math.min(state.steel, Math.ceil(card.cost / 2)) : 0;
  const maxTitanium = card.tags.includes("Space") ? Math.min(state.titanium, Math.ceil(card.cost / 3)) : 0;
  return { maxSteel, maxTitanium };
}

export function getCardPlayableStatus(card, state, steelUsed = 0, titaniumUsed = 0) {
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
  let nextState = { ...state };
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
  const nextState = { ...state };
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
  const nextState = { ...state };
  const energyToHeat = nextState.energy;
  nextState.heat += energyToHeat;
  nextState.energy = 0;

  // Clamp MC production at minimum -5
  const mcProdClamped = Math.max(-5, nextState.mcProd);
  const addedMc = mcProdClamped + nextState.tr;
  nextState.mc += addedMc;
  nextState.steel += nextState.steelProd;
  nextState.titanium += nextState.titaniumProd;
  nextState.plants += nextState.plantsProd;
  nextState.energy += nextState.energyProd;
  nextState.heat += nextState.heatProd;

  let localLog = addLog(
    logAcc,
    "system",
    `生産フェーズ完了: MC +${addedMc} (TR ${nextState.tr} + 生産 ${mcProdClamped}), 建材 +${nextState.steelProd}, チタン +${nextState.titaniumProd}, 植物 +${nextState.plantsProd}, エネルギー +${nextState.energyProd}, 熱 +${nextState.heatProd}。エネルギー ${energyToHeat} を熱に変換。`
  );

  nextState.logs = localLog;

  if (nextState.generation >= 14 || isGameOverCheck(nextState.temperature, nextState.oxygen, nextState.oceans)) {
    nextState.phase = "final_greenery";
    const reason = nextState.generation >= 14 ? "第14世代の生産" : "全パラメータ達成";
    nextState.logs = addLog(localLog, "system", `${reason}が終了しました。最後の植物緑化変換フェーズを行います。`);
  } else {
    nextState.generation += 1;
    nextState.phase = "research";
    nextState.actionsRemaining = 2;
    nextState.turnStep = "start";

    // Draw 4 cards for research
    let deck = [...nextState.deck];
    let discard = [...nextState.discardPile];
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
    nextState.deck = deck;
    nextState.discardPile = discard;
    nextState.researchCards = researchCards;
    nextState.logs = addLog(localLog, "system", `第 ${nextState.generation} 世代の研究フェーズが開始されました。カードを4枚引きました。購入するカードを選択してください。`);
  }

  return nextState;
}
