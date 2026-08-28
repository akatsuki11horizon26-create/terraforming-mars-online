import {
  ALL_CARDS,
  getPlayer,
  calculateScoreBreakdowns,
  corporationFor,
  countActiveTags,
  countAdjacentOceans,
  cloneGameState,
  hasPositiveVpIcon,
  DECLINE_CHOICE
} from "./game-logic.js";
import { executeGameCommand, getLegalCommands, COMMAND } from "./game-command.js";

export const BOT_DIFFICULTIES = [
  {
    id: "easy",
    name: "初級ロボット",
    description: "良い手の中から大まかに選び、長期得点より目先の開拓を優先する。",
    noise: 9,
    minMoveValue: 0,
    researchReserve: 6,
    researchThreshold: 0,
    lookahead: 0,
    topK: 4,
    candidateRatio: 0.6,
    weightScale: { award: 0.3, milestone: 0.5, vp: 0.6, attack: 0.3 }
  },
  {
    id: "normal",
    name: "中級ロボット",
    description: "生産量とTRを伸ばし、称号や褒賞も状況に応じて狙う。",
    noise: 5,
    minMoveValue: 0.5,
    researchReserve: 9,
    researchThreshold: 1.5,
    lookahead: 0,
    topK: 4,
    candidateRatio: 1,
    weightScale: { award: 1, milestone: 1, vp: 1, attack: 1 }
  },
  {
    id: "hard",
    name: "上級ロボット",
    description: "終盤の得点効率と次の一手まで見て行動する。",
    noise: 0,
    minMoveValue: 1,
    researchReserve: 12,
    researchThreshold: 2.5,
    lookahead: 2,
    topK: 4,
    candidateRatio: 1,
    weightScale: { award: 1.25, milestone: 1.2, vp: 1.2, attack: 1.1 }
  }
];

export function getBotDifficulty(id) {
  return BOT_DIFFICULTIES.find(entry => entry.id === id) ?? BOT_DIFFICULTIES[1];
}

export function makeBotRng(seed) {
  let state = (seed >>> 0) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

function deterministicRng(state, botId) {
  let seed = ((state.generation ?? 1) * 2654435761) >>> 0;
  for (const char of String(botId)) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
  seed ^= ((getPlayer(state, botId)?.actionsRemaining ?? 0) + 1) * 2246822519;
  return makeBotRng(seed);
}

const PRODUCTION_WEIGHT = {
  mcProd: 3,
  steelProd: 2.4,
  titaniumProd: 3.2,
  plantsProd: 3.6,
  energyProd: 1.8,
  heatProd: 1.6
};

const STOCK_WEIGHT = {
  mc: 0.45,
  steel: 1.6,
  titanium: 2.2,
  plants: 2,
  energy: 1,
  heat: 0.9
};

const TILE_BONUS_WEIGHT = {
  mc: 0.45,
  steel: 1.6,
  titanium: 2.2,
  plant: 2,
  plants: 2,
  energy: 1,
  heat: 0.9,
  card: 2.4,
  animal: 2,
  microbe: 1.5
};

function phaseFactors(state) {
  const generation = state.generation ?? 1;
  const limit = state.mode === "solo" ? (state.preludeEnabled ? 12 : 14) : 14;
  const left = Math.max(0, limit - generation);
  const completed = [state.oxygen >= 14, state.temperature >= 8, state.oceans >= 9].filter(Boolean).length;
  const endgame = Math.max(1 - Math.min(1, left / limit), completed / 3);
  return {
    production: Math.min(4, left * 0.5),
    vp: 1 + endgame * 2.5,
    tr: 4 + Math.min(6, left * 0.4),
    stock: 0.7 + endgame * 0.6,
    endgame
  };
}

function safeScores(state) {
  try {
    return calculateScoreBreakdowns(state);
  } catch {
    return {};
  }
}

function tagsTotal(state, playerId) {
  const tags = ["Building", "Space", "Science", "Power", "Earth", "Jovian", "Plant", "Microbe", "Animal", "Venus"];
  return tags.reduce((sum, tag) => sum + countActiveTags(state, playerId, tag), 0);
}

function evaluateDelta(before, after, ctx) {
  const beforePlayer = getPlayer(before, ctx.botId);
  const afterPlayer = getPlayer(after, ctx.botId);
  if (!beforePlayer || !afterPlayer) return -Infinity;
  const { factors, difficulty } = ctx;
  let score = (afterPlayer.tr - beforePlayer.tr) * factors.tr;

  for (const [field, weight] of Object.entries(PRODUCTION_WEIGHT)) {
    score += ((afterPlayer[field] ?? 0) - (beforePlayer[field] ?? 0)) * weight * factors.production;
  }
  for (const [field, weight] of Object.entries(STOCK_WEIGHT)) {
    score += ((afterPlayer[field] ?? 0) - (beforePlayer[field] ?? 0)) * weight * factors.stock;
  }

  score += ((afterPlayer.hand?.length ?? 0) - (beforePlayer.hand?.length ?? 0)) * 1.2;
  score += (tagsTotal(after, ctx.botId) - tagsTotal(before, ctx.botId)) * 0.4;
  score += ((afterPlayer.actionsRemaining ?? 0) - (beforePlayer.actionsRemaining ?? 0)) * 0.8;
  score += ((after.oxygen ?? 0) - (before.oxygen ?? 0)) * 6;
  score += ((after.temperature ?? 0) - (before.temperature ?? 0)) * 3;
  score += ((after.oceans ?? 0) - (before.oceans ?? 0)) * 9;
  score += ((after.venus ?? 0) - (before.venus ?? 0)) * 1.5;

  const beforeScores = ctx.baselineScores ?? safeScores(before);
  const afterScores = safeScores(after);
  const ownVp = (afterScores[ctx.botId]?.total ?? 0) - (beforeScores[ctx.botId]?.total ?? 0);
  score += ownVp * 3 * factors.vp * difficulty.weightScale.vp;

  const opponents = (before.players ?? []).filter(player => player.id !== ctx.botId);
  if (opponents.length > 0) {
    let opponentVp = 0;
    let attack = 0;
    for (const opponent of opponents) {
      opponentVp += (afterScores[opponent.id]?.total ?? 0) - (beforeScores[opponent.id]?.total ?? 0);
      const afterOpponent = getPlayer(after, opponent.id);
      if (!afterOpponent) continue;
      for (const [field, weight] of Object.entries(PRODUCTION_WEIGHT)) {
        attack += Math.max(0, (opponent[field] ?? 0) - (afterOpponent[field] ?? 0)) * weight * 0.8;
      }
      for (const [field, weight] of Object.entries(STOCK_WEIGHT)) {
        attack += Math.max(0, (opponent[field] ?? 0) - (afterOpponent[field] ?? 0)) * weight * 0.6;
      }
    }
    score -= opponentVp * 1.5 / opponents.length;
    score += attack * difficulty.weightScale.attack;
  }

  const beforeColonies = Object.values(before.colonies?.tiles ?? {}).reduce(
    (sum, tile) => sum + (tile.colonies ?? []).filter(id => id === ctx.botId).length,
    0
  );
  const afterColonies = Object.values(after.colonies?.tiles ?? {}).reduce(
    (sum, tile) => sum + (tile.colonies ?? []).filter(id => id === ctx.botId).length,
    0
  );
  score += (afterColonies - beforeColonies) * 6;

  return score;
}

function researchCardValue(card, state, botId, factors) {
  const player = getPlayer(state, botId);
  if (!player || !card) return -Infinity;
  let value = hasPositiveVpIcon(card) ? 2 : 0;
  value += (card.victoryPoints ?? 0) * 2;
  const expectedIncome = Math.max(0, (player.mcProd ?? 0) + (player.tr ?? 20));
  const affordability = (card.cost ?? 0) <= (player.mc ?? 0) + expectedIncome * 2 ? 1 : 0.3;
  value *= affordability;
  for (const tag of card.tags ?? []) value += countActiveTags(state, botId, tag) * 0.5;
  const effect = JSON.stringify(card.effectSpec ?? {});
  if (/Prod|production/i.test(effect)) value += factors.production;
  return value;
}

export const BOT_STANDARD_PROJECTS = [
  { id: "power_plant", commandId: "power-plant", name: "発電所の建設", cost: 11 },
  { id: "asteroid", commandId: "asteroid", name: "小惑星の衝突", cost: 14 },
  { id: "ocean", commandId: "aquifer", name: "海洋の沈降", cost: 18 },
  { id: "greenery", commandId: "greenery", name: "緑化プロジェクト", cost: 23 },
  { id: "city", commandId: "city", name: "都市の建設", cost: 25 },
  { id: "convert_plants", commandId: "convert-plants", name: "植物の緑化", cost: 8 },
  { id: "convert_heat", commandId: "convert-heat", name: "熱による加熱", cost: 8 },
  { id: "sell_patents", commandId: "sell-patents", name: "パテントの売却", cost: 0 }
];

const PROJECT_BY_COMMAND = new Map(BOT_STANDARD_PROJECTS.map(project => [project.commandId, project]));

function moveFromCommand(command) {
  if (command.type === COMMAND.PLAY_CARD) {
    return { kind: "play", card: ALL_CARDS.find(card => card.id === command.cardId), command };
  }
  if (command.type === COMMAND.USE_CARD_ACTION) {
    return { kind: "action", card: ALL_CARDS.find(card => card.id === command.cardId), command };
  }
  if (command.type === COMMAND.CLAIM_MILESTONE) return { kind: "milestone", id: command.milestoneId, command };
  if (command.type === COMMAND.FUND_AWARD) return { kind: "award", id: command.awardId, command };
  if (command.type === COMMAND.STANDARD_PROJECT) {
    return { kind: "standard", project: PROJECT_BY_COMMAND.get(command.projectId), command };
  }
  if (command.type === COMMAND.CORPORATION_ACTION) return { kind: "corporation", command };
  if (command.type === COMMAND.BUILD_COLONY) return { kind: "colony", tileId: command.tileId, command };
  if (command.type === COMMAND.TRADE) return { kind: "trade", tileId: command.tileId, command };
  if (command.type === COMMAND.SEND_DELEGATE) return { kind: "delegate", partyId: command.partyId, command };
  return null;
}

function commandFromMove(move, botId, state) {
  if (move.command) return { ...move.command, playerId: botId };
  if (move.kind === "play") return { type: COMMAND.PLAY_CARD, playerId: botId, cardId: move.card.id };
  if (move.kind === "action") return { type: COMMAND.USE_CARD_ACTION, playerId: botId, cardId: move.card.id };
  if (move.kind === "milestone") return { type: COMMAND.CLAIM_MILESTONE, playerId: botId, milestoneId: move.id };
  if (move.kind === "award") return { type: COMMAND.FUND_AWARD, playerId: botId, awardId: move.id };
  if (move.kind === "standard") {
    const command = { type: COMMAND.STANDARD_PROJECT, playerId: botId, projectId: move.project.commandId };
    if (move.project.commandId === "sell-patents") command.cardIds = move.cardIds ?? getPlayer(state, botId)?.hand?.slice(0, 1) ?? [];
    return command;
  }
  if (move.kind === "corporation") return { type: COMMAND.CORPORATION_ACTION, playerId: botId };
  if (move.kind === "colony") return { type: COMMAND.BUILD_COLONY, playerId: botId, tileId: move.tileId };
  if (move.kind === "trade") return { type: COMMAND.TRADE, playerId: botId, tileId: move.tileId };
  if (move.kind === "delegate") return { type: COMMAND.SEND_DELEGATE, playerId: botId, partyId: move.partyId };
  return null;
}

export function enumerateBotMoves(state, botId) {
  const bot = getPlayer(state, botId);
  if (!bot) return [];
  let seated = state;
  if (state.currentPlayerId !== botId) {
    seated = cloneGameState(state);
    seated.currentPlayerId = botId;
  }
  return getLegalCommands(seated, botId)
    .filter(command => ![COMMAND.PASS, COMMAND.END_TURN].includes(command.type))
    .map(moveFromCommand)
    .filter(Boolean)
    .slice(0, 80)
    .map(move => {
      if (move.kind === "play") {
        return {
          ...move,
          cost: move.card?.cost ?? 0,
          bonus: (move.card?.victoryPoints ?? 0) * 3 + (hasPositiveVpIcon(move.card) ? 2 : 0)
        };
      }
      if (move.kind === "milestone") {
        const claimed = state.milestones?.claimed?.length ?? state.claimedMilestones?.length ?? 0;
        return { ...move, bonus: 15 * (1 + claimed * 0.3) };
      }
      if (move.kind === "award") return { ...move, bonus: 4 };
      return move;
    });
}

function scoreMove(state, botId, move, simulate, ctx) {
  let after;
  try {
    after = simulate(move, state);
  } catch {
    return { move, score: -Infinity, after: state };
  }
  if (!after || after === state) return { move, score: -Infinity, after: state };
  let score = evaluateDelta(state, after, ctx) + (move.bonus ?? 0);
  if (move.kind === "milestone") score += (move.bonus ?? 0) * (ctx.difficulty.weightScale.milestone - 1);
  if (move.kind === "award") score += (move.bonus ?? 0) * (ctx.difficulty.weightScale.award - 1);
  if (ctx.difficulty.noise > 0) score += (ctx.rng() - 0.5) * ctx.difficulty.noise;
  return { move, score, after };
}

export function chooseBotMove(state, botId, simulate, difficultyId, rng) {
  const difficulty = getBotDifficulty(difficultyId);
  const random = rng ?? deterministicRng(state, botId);
  const moves = enumerateBotMoves(state, botId);
  if (moves.length === 0) return null;
  const ctx = {
    botId,
    difficulty,
    factors: phaseFactors(state),
    baselineScores: safeScores(state),
    rng: random
  };
  const scored = moves.map(move => scoreMove(state, botId, move, simulate, ctx)).sort((a, b) => b.score - a.score);

  if (difficulty.lookahead > 0) {
    for (const entry of scored.slice(0, difficulty.topK)) {
      const nextMoves = enumerateBotMoves(entry.after, botId).slice(0, 20);
      let future = 0;
      for (const move of nextMoves) {
        const command = commandFromMove(move, botId, entry.after);
        if (!command) continue;
        const result = executeGameCommand(entry.after, command);
        if (!result.ok || result.state === entry.after) continue;
        const settled = resolveBotChoices(
          { DECLINE_CHOICE },
          result.state,
          botId,
          random,
          24,
          difficultyId
        );
        future = Math.max(future, evaluateDelta(entry.after, settled, {
          ...ctx,
          factors: phaseFactors(entry.after),
          baselineScores: safeScores(entry.after)
        }));
      }
      entry.score += future * 0.45;
    }
    scored.sort((a, b) => b.score - a.score);
  }

  const eligibleCount = Math.max(1, Math.ceil(scored.length * difficulty.candidateRatio));
  const eligible = scored.slice(0, eligibleCount).filter(entry => entry.score >= difficulty.minMoveValue);
  if (eligible.length === 0) return null;
  if (difficulty.id === "easy") return eligible[Math.floor(random() * eligible.length)].move;
  return eligible[0].move;
}

export function applyBotMove(engine, state, botId, move, logs) {
  let current = state;
  if (state.currentPlayerId !== botId) {
    current = engine.cloneGameState(state);
    current.currentPlayerId = botId;
  }
  const command = commandFromMove(move, botId, current);
  if (!command) return { state, logs, actionSpent: false };
  const beforeActions = getPlayer(current, botId)?.actionsRemaining ?? 0;
  const result = executeGameCommand(current, command);
  if (!result.ok) return { state, logs, actionSpent: false };
  const afterActions = getPlayer(result.state, botId)?.actionsRemaining ?? 0;
  return {
    state: result.state,
    logs: result.state.logs ?? logs,
    actionSpent: afterActions < beforeActions
  };
}

function tileChoiceScore(state, botId, choice, option) {
  const cell = state.board?.[option.targetCellKey ?? option.payload?.targetCellKey];
  if (!cell) return 0;
  let score = 0;
  if (cell.bonusType === "multi" && Array.isArray(cell.bonus)) {
    for (const bonus of cell.bonus) score += (TILE_BONUS_WEIGHT[bonus.type] ?? 1) * (bonus.amount ?? 1);
  } else if (cell.bonusType && cell.bonusType !== "none") {
    score += (TILE_BONUS_WEIGHT[cell.bonusType] ?? 1) * (cell.bonusAmount ?? 1);
  }
  score += countAdjacentOceans(cell.q, cell.r, state.board) * 2;
  const adjacent = Object.values(state.board ?? {}).filter(other => {
    const dq = other.q - cell.q;
    const dr = other.r - cell.r;
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr)) === 1;
  });
  const tileType = option.payload?.tileType ?? choice.continuation?.payload?.tileType;
  if (tileType === "city") score += adjacent.filter(other => other.tileType === "forest").length * 1.5;
  if (tileType === "forest") {
    score += adjacent.filter(other => other.tileType === "city" && other.placedBy === botId).length * 1.5;
    score -= adjacent.filter(other => other.tileType === "city" && other.placedBy && other.placedBy !== botId).length * 0.75;
  }
  return score;
}

export function scoreChoiceOption(state, botId, choice, option, difficultyId = "normal") {
  const targetPlayerId = option.targetPlayerId ?? option.payload?.targetPlayerId;
  const attackKinds = new Set(["resource-attack", "production-attack", "resource-steal", "law-suit"]);
  if (attackKinds.has(choice.kind) && targetPlayerId === botId && !option.targetCardId && !option.payload?.targetCardId) {
    return -Infinity;
  }
  if (["tile-placement", "ocean-placement", "cathedral-placement", "ocean-removal"].includes(choice.kind)) {
    return tileChoiceScore(state, botId, choice, option);
  }
  if (["discard-card", "event-discard"].includes(choice.kind)) {
    const cardId = option.cardId ?? option.payload?.cardId ?? option.id;
    return -researchCardValue(ALL_CARDS.find(card => card.id === cardId), state, botId, phaseFactors(state));
  }

  const result = executeGameCommand(state, {
    type: COMMAND.RESOLVE_PENDING,
    playerId: botId,
    optionId: option.id
  });
  if (!result.ok || result.state === state) return -Infinity;
  const difficulty = getBotDifficulty(difficultyId);
  return evaluateDelta(state, result.state, {
    botId,
    difficulty,
    factors: phaseFactors(state),
    baselineScores: safeScores(state),
    rng: deterministicRng(state, botId)
  });
}

export function resolveBotChoices(engine, state, botId, rng, limit = 24, difficultyId = "normal") {
  let current = state;
  const random = rng ?? deterministicRng(state, botId);
  for (let i = 0; i < limit; i++) {
    const choice = current.pendingChoice;
    if (!choice || choice.ownerPlayerId !== botId) break;
    const options = [
      ...(choice.options ?? []),
      ...(choice.optional ? [{ id: engine.DECLINE_CHOICE, label: "decline" }] : [])
    ];
    if (options.length === 0) {
      break;
    }
    const scored = options.map(option => ({
      option,
      score: scoreChoiceOption(current, botId, choice, option, difficultyId),
      tie: random()
    })).sort((a, b) => b.score - a.score || b.tie - a.tie);
    const picked = scored[0]?.option;
    if (!picked) break;
    const result = executeGameCommand(current, {
      type: COMMAND.RESOLVE_PENDING,
      playerId: botId,
      optionId: picked.id
    });
    if (!result.ok || result.state === current) break;
    current = result.state;
  }
  return current;
}

export function runBotTurn(engine, state, botId, difficultyId, rng, logs) {
  const random = rng ?? deterministicRng(state, botId);
  const currentLogs = logs ?? state.logs;
  const simulate = (move, base = state) => {
    const applied = applyBotMove(engine, base, botId, move, base.logs ?? currentLogs);
    return resolveBotChoices(engine, applied.state, botId, random, 24, difficultyId);
  };
  const move = chooseBotMove(state, botId, simulate, difficultyId, random);
  if (!move) {
    const passed = executeGameCommand(state, { type: COMMAND.PASS, playerId: botId });
    return { state: passed.state, logs: passed.state.logs ?? currentLogs, move: null };
  }
  const applied = applyBotMove(engine, state, botId, move, currentLogs);
  const settled = resolveBotChoices(engine, applied.state, botId, random, 24, difficultyId);
  return { state: settled, logs: settled.logs ?? applied.logs, move };
}

export function describeBotMove(move) {
  if (!move) return "パスしました。";
  if (move.kind === "play") return `【${move.card.name}】をプレイしました。`;
  if (move.kind === "action") return `【${move.card.name}】のアクションを使用しました。`;
  if (move.kind === "milestone") return "称号を獲得しました。";
  if (move.kind === "award") return "褒賞を出資しました。";
  if (move.kind === "standard") return `標準プロジェクト【${move.project.name}】を実行しました。`;
  if (move.kind === "colony") return "植民地を建設しました。";
  if (move.kind === "trade") return "植民地と交易しました。";
  if (move.kind === "delegate") return "代表者を送りました。";
  return "企業アクションを実行しました。";
}

export function runBotResearch(engine, state, botId, difficultyId) {
  const difficulty = getBotDifficulty(difficultyId);
  const bot = getPlayer(state, botId);
  if (!bot || (bot.researchCards?.length ?? 0) === 0) return state;
  const factors = phaseFactors(state);
  const corporation = corporationFor(bot);
  const freeStartingCards = state.phase === "setup" && corporation?.effects?.freeStartingCards;
  const affordable = freeStartingCards
    ? bot.researchCards.length
    : Math.max(0, Math.floor(((bot.mc ?? 0) - difficulty.researchReserve) / 3));
  const ranked = bot.researchCards
    .map(cardId => ({ cardId, value: researchCardValue(ALL_CARDS.find(card => card.id === cardId), state, botId, factors) }))
    .filter(entry => entry.value >= difficulty.researchThreshold)
    .sort((a, b) => b.value - a.value);
  const limit = difficulty.id === "hard" && factors.endgame > 0.7 && (bot.hand?.length ?? 0) >= 5
    ? Math.min(1, affordable)
    : affordable;
  const result = executeGameCommand(state, {
    type: COMMAND.BUY_RESEARCH,
    playerId: botId,
    cardIds: ranked.slice(0, limit).map(entry => entry.cardId)
  });
  return result.ok ? result.state : state;
}

export function runBotSetup(engine, state, botId, difficultyId, rng, maxSteps = 40) {
  let current = state;
  const random = rng ?? deterministicRng(state, botId);
  for (let step = 0; step < maxSteps && current.phase === "setup"; step++) {
    const bot = getPlayer(current, botId);
    if (!bot) break;
    let command = null;
    if (!bot.corporationId && (bot.corporationOptions?.length ?? 0) > 0) {
      const corporationId = bot.corporationOptions[Math.floor(random() * bot.corporationOptions.length)];
      command = { type: COMMAND.SELECT_CORPORATION, playerId: botId, corporationId };
    } else if ((bot.preludeOptions?.length ?? 0) >= 2 && (bot.selectedPreludeIds?.length ?? 0) === 0) {
      command = { type: COMMAND.SELECT_PRELUDES, playerId: botId, preludeIds: bot.preludeOptions.slice(0, 2) };
    } else if (current.draft?.queues?.[botId]?.length > 0) {
      const cards = current.draft.queues[botId];
      const cardId = cards.slice().sort((a, b) =>
        researchCardValue(ALL_CARDS.find(card => card.id === b), current, botId, phaseFactors(current)) -
        researchCardValue(ALL_CARDS.find(card => card.id === a), current, botId, phaseFactors(current))
      )[0];
      command = { type: COMMAND.DRAFT_PICK, playerId: botId, cardId };
    } else if ((bot.researchCards?.length ?? 0) > 0) {
      const next = runBotResearch(engine, current, botId, difficultyId);
      if (next === current) break;
      current = next;
      continue;
    }
    if (!command) break;
    const result = executeGameCommand(current, command);
    if (!result.ok || result.state === current) break;
    current = result.state;
  }
  return current;
}

export function advanceRobotGame(engine, state, humanId, difficultyId, rng, maxSteps = 400) {
  let current = state;
  const random = rng ?? deterministicRng(state, humanId);
  for (let step = 0; step < maxSteps; step++) {
    const choiceOwner = current.pendingChoice?.ownerPlayerId;
    if (choiceOwner) {
      if (choiceOwner === humanId) return current;
      const settled = resolveBotChoices(engine, current, choiceOwner, random, 24, difficultyId);
      if (settled === current) return current;
      current = settled;
      continue;
    }
    if (current.phase === "setup") {
      let moved = false;
      for (const player of current.players) {
        if (player.id === humanId) continue;
        const next = runBotSetup(engine, current, player.id, difficultyId, random);
        moved ||= next !== current;
        current = next;
      }
      if (!moved || current.phase === "setup") return current;
      continue;
    }
    if (current.phase === "research") {
      let moved = false;
      for (const player of current.players) {
        if (player.id === humanId) continue;
        const next = runBotResearch(engine, current, player.id, difficultyId);
        moved ||= next !== current;
        current = next;
      }
      if ((getPlayer(current, humanId)?.researchCards?.length ?? 0) > 0 || !moved) return current;
      continue;
    }
    if (current.phase === "final_greenery") {
      if (current.currentPlayerId === humanId) return current;
      const botId = current.currentPlayerId;
      const legal = getLegalCommands(current, botId);
      const command = legal.find(item => item.type === COMMAND.CONVERT_FINAL_GREENERY) ??
        legal.find(item => item.type === COMMAND.FINISH_FINAL_GREENERY);
      if (!command) return current;
      const result = executeGameCommand(current, command);
      if (!result.ok || result.state === current) return current;
      current = result.state;
      continue;
    }
    if (current.phase !== "action" || current.currentPlayerId === humanId) return current;
    const botId = current.currentPlayerId;
    const result = runBotTurn(engine, current, botId, difficultyId, random);
    if (result.state === current) return current;
    current = result.state;
  }
  return current;
}
