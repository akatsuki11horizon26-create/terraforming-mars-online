import {
  ALL_CARDS,
  getCardPlayableStatus,
  getCardPaymentCost,
  getCardActionStatus,
  getMilestoneStatus,
  getAwardStatus,
  getPlayer
} from "./game-logic.js";
import { milestonesForBoard, awardsForBoard } from "./board-milestones.js";
import { executeGameCommand, COMMAND } from "./game-command.js";

export const BOT_DIFFICULTIES = [
  {
    id: "easy",
    name: "初級ロボット",
    description: "手なりで動く。安い手を優先し、称号や褒賞はほとんど狙わない。",
    // Weakness comes from picking noisily among good moves, not from being blind
    // to terraforming: discounting globalDelta made easy games run 5-10 extra
    // generations because nobody pushed the parameters to their caps.
    noise: 9,
    greed: 0.9,
    minMoveValue: 0,
    researchReserve: 6
  },
  {
    id: "normal",
    name: "中級ロボット",
    description: "生産量とTRを地道に伸ばし、条件が揃えば称号も取りにくる。",
    noise: 5,
    greed: 1.1,
    minMoveValue: 0.5,
    researchReserve: 9
  },
  {
    id: "hard",
    name: "上級ロボット",
    description: "終盤の得点効率まで見て動く。称号・褒賞の取り合いに積極的。",
    noise: 0,
    greed: 1.3,
    minMoveValue: 1,
    researchReserve: 12
  }
];

export function getBotDifficulty(id) {
  return BOT_DIFFICULTIES.find(entry => entry.id === id) ?? BOT_DIFFICULTIES[1];
}

// A cheap deterministic generator so a seeded game replays identically.
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

const PRODUCTION_WEIGHT = {
  mcProd: 3,
  steelProd: 2.4,
  titaniumProd: 3.2,
  plantsProd: 3.6,
  energyProd: 1.8,
  heatProd: 1.6
};

const STOCK_WEIGHT = {
  // Spending MC is the point of the game: valuing a coin as highly as the thing
  // it buys makes the bot hoard and never finish terraforming.
  mc: 0.45,
  steel: 1.6,
  titanium: 2.2,
  plants: 2,
  energy: 1,
  heat: 0.9
};

// How much a bot values one more point of terraforming rating. TR is both a
// victory point and income every generation, so it outweighs raw resources.
function trValue(state) {
  const remaining = Math.max(1, 14 - (state.generation ?? 1));
  return 4 + Math.min(6, remaining * 0.4);
}

function scorePlayerDelta(before, after, state, greed) {
  let score = 0;

  score += (after.tr - before.tr) * trValue(state);

  for (const [field, weight] of Object.entries(PRODUCTION_WEIGHT)) {
    const delta = (after[field] ?? 0) - (before[field] ?? 0);
    // Production compounds, so early generations value it more than late ones.
    const generationsLeft = Math.max(1, 14 - (state.generation ?? 1));
    score += delta * weight * Math.min(4, generationsLeft * 0.5);
  }

  for (const [field, weight] of Object.entries(STOCK_WEIGHT)) {
    score += ((after[field] ?? 0) - (before[field] ?? 0)) * weight;
  }

  const vpDelta = (after.playedProjects?.length ?? 0) - (before.playedProjects?.length ?? 0);
  score += vpDelta * 0.5 * greed;

  return score;
}

function globalDelta(before, after, greed) {
  // Raising a global parameter is worth more than the TR alone when it also
  // pushes the game toward the ending the bot is winning.
  let score = 0;
  // Terraforming has to outweigh pure engine-building, or two bots build
  // production forever and the global parameters never finish.
  score += ((after.oxygen ?? 0) - (before.oxygen ?? 0)) * 6;
  score += ((after.temperature ?? 0) - (before.temperature ?? 0)) * 3;
  score += ((after.oceans ?? 0) - (before.oceans ?? 0)) * 9;
  score += ((after.venus ?? 0) - (before.venus ?? 0)) * 1.5;
  return score * greed;
}

// Scores a candidate move by simulating it and diffing the result. Simulation
// beats hand-written per-card rules: it stays correct as cards change.
function scoreMove(state, botId, move, apply, difficulty, rng) {
  const before = getPlayer(state, botId);
  if (!before) return -Infinity;

  let after;
  try {
    after = apply();
  } catch {
    return -Infinity;
  }
  if (!after) return -Infinity;

  const afterPlayer = getPlayer(after, botId);
  if (!afterPlayer) return -Infinity;

  let score = scorePlayerDelta(before, afterPlayer, state, difficulty.greed);
  score += globalDelta(state, after, difficulty.greed);
  score += move.bonus ?? 0;

  if (difficulty.noise > 0) score += (rng() - 0.5) * difficulty.noise;
  return score;
}

export function enumerateBotMoves(state, botId) {
  const bot = getPlayer(state, botId);
  if (!bot) return [];
  const moves = [];

  for (const cardId of bot.hand ?? []) {
    const card = ALL_CARDS.find(item => item.id === cardId);
    if (!card) continue;
    const status = getCardPlayableStatus(card, state, 0, 0);
    if (!status.playable) continue;
    const cost = getCardPaymentCost(card, state, 0, 0);
    if ((bot.mc ?? 0) < cost) continue;
    moves.push({ kind: "play", card, cost, bonus: (card.victoryPoints ?? 0) * 3 });
  }

  for (const cardId of bot.playedProjects ?? []) {
    const card = ALL_CARDS.find(item => item.id === cardId);
    if (!card) continue;
    if (getCardActionStatus(state, card).playable) {
      moves.push({ kind: "action", card, bonus: 1 });
    }
  }

  // Each map prints its own five; the bot used to chase Tharsis's on every board.
  for (const milestone of milestonesForBoard(state.boardId)) {
    if (getMilestoneStatus(state, milestone.id, botId).claimable) {
      moves.push({ kind: "milestone", id: milestone.id, bonus: 5 * 3 });
    }
  }

  for (const award of awardsForBoard(state.boardId)) {
    if (getAwardStatus(state, award.id, botId).fundable) {
      moves.push({ kind: "award", id: award.id, bonus: 4 });
    }
  }

  for (const project of BOT_STANDARD_PROJECTS) {
    if ((bot.mc ?? 0) < project.cost) continue;
    if (!project.available(state)) continue;
    moves.push({ kind: "standard", project, cost: project.cost });
  }

  return moves;
}

// Picks the highest scoring move, or null when passing is better. `simulate`
// takes a move and returns the resulting state without mutating the original.
export function chooseBotMove(state, botId, simulate, difficultyId, rng) {
  const difficulty = getBotDifficulty(difficultyId);
  const random = rng ?? Math.random;
  const moves = enumerateBotMoves(state, botId);
  if (moves.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const score = scoreMove(state, botId, move, () => simulate(move), difficulty, random);
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }

  // A move has to beat doing nothing. Hoarding for a better generation is a real
  // option, so weak plays are declined rather than taken for their own sake.
  const threshold = difficulty.minMoveValue ?? 0;
  if (!best || bestScore < threshold) return null;
  return best;
}

// Applies a chosen move and returns { state, logs }. Kept next to the chooser so
// simulation and execution can never drift apart.
export function applyBotMove(engine, state, botId, move, logs) {
  const { cloneGameState, claimMilestone, fundAward } = engine;

  // Card effects resolve against currentPlayerId, so the seat has to be the bot
  // before anything is applied or the human is credited with the bot's card.
  if (state.currentPlayerId !== botId) {
    const seated = cloneGameState(state);
    seated.currentPlayerId = botId;
    state = seated;
  }

  // Playing and acting go through the shared command layer, so the bot pays,
  // draws triggers and spends its action by exactly the same rules the human
  // does. Hand-rolling them here is how the bot came to skip corporation
  // effects and double-count its standard projects.
  if (move.kind === "play") {
    const result = executeGameCommand(state, {
      type: COMMAND.PLAY_CARD,
      playerId: botId,
      cardId: move.card.id
    });
    return { state: result.state, logs: result.state.logs ?? logs, actionSpent: true };
  }

  if (move.kind === "action") {
    const result = executeGameCommand(state, {
      type: COMMAND.USE_CARD_ACTION,
      playerId: botId,
      cardId: move.card.id
    });
    return { state: result.state, logs: result.state.logs ?? logs, actionSpent: true };
  }

  if (move.kind === "milestone") {
    const result = claimMilestone(state, move.id, logs, botId);
    return { state: result.state, logs: result.logs };
  }

  if (move.kind === "award") {
    const result = fundAward(state, move.id, logs, botId);
    return { state: result.state, logs: result.logs };
  }

  if (move.kind === "standard") {
    const result = move.project.apply(engine, state, botId, logs);
    if (!result) return { state, logs };
    return result;
  }

  return { state, logs };
}

// Any effect can stop on a choice the bot must answer before play continues.
// Left unresolved, the game simply never advances.
export function resolveBotChoices(engine, state, botId, rng, limit = 24) {
  const { resolvePendingChoice, DECLINE_CHOICE } = engine;
  let current = state;
  const random = rng ?? Math.random;

  for (let i = 0; i < limit; i++) {
    const choice = current.pendingChoice;
    if (!choice || choice.ownerPlayerId !== botId) break;

    const options = choice.options ?? [];
    if (options.length === 0) {
      if (!choice.optional) break;
      const declined = resolvePendingChoice(current, DECLINE_CHOICE, current.logs, botId);
      current = declined.state;
      continue;
    }

    // Tile placements prefer squares that pay a bonus; everything else takes the
    // first legal option, which the engine has already filtered to be valid.
    let picked = options[0];
    if (choice.kind === "tile-placement" || choice.kind === "ocean-placement") {
      const scored = options.map(option => {
        const cell = current.board?.[option.targetCellKey];
        let value = 0;
        if (cell?.bonusType && cell.bonusType !== "none") value += (cell.bonusAmount ?? 0) + 1;
        if (cell?.bonusType === "card") value += 1;
        return { option, value };
      });
      scored.sort((a, b) => b.value - a.value);
      const top = scored.filter(entry => entry.value === scored[0].value);
      picked = top[Math.floor(random() * top.length)].option;
    } else if (options.length > 1) {
      picked = options[Math.floor(random() * options.length)];
    }

    const result = resolvePendingChoice(current, picked.id, current.logs, botId);
    if (result.state === current) break;
    current = result.state;
  }

  return current;
}

// Drives one bot turn to completion: it either takes its best move and spends an
// action, or passes. Returns the state the caller should save.
export function runBotTurn(engine, state, botId, difficultyId, rng, logs) {
  const { handleActionSpend, passPlayer } = engine;
  const currentLogs = logs ?? state.logs;

  const simulate = move =>
    resolveBotChoices(engine, applyBotMove(engine, state, botId, move, currentLogs).state, botId, rng);
  const move = chooseBotMove(state, botId, simulate, difficultyId, rng);

  if (!move) {
    const passed = passPlayer(state, currentLogs, botId);
    return { state: passed.state, logs: passed.logs, move: null };
  }

  const applied = applyBotMove(engine, state, botId, move, currentLogs);
  const settled = resolveBotChoices(engine, applied.state, botId, rng);
  // Moves routed through the command layer have already spent the action;
  // spending again would give the bot half the turns it should have.
  const spent = applied.actionSpent
    ? settled
    : handleActionSpend(settled, settled.logs ?? applied.logs);
  return { state: spent, logs: spent.logs, move };
}

export function describeBotMove(move) {
  if (!move) return "パスしました。";
  if (move.kind === "play") return `【${move.card.name}】をプレイしました。`;
  if (move.kind === "action") return `【${move.card.name}】のアクションを使用しました。`;
  if (move.kind === "milestone") return "称号を獲得しました。";
  if (move.kind === "award") return "褒賞を出資しました。";
  return "行動しました。";
}

// The research phase offers four cards at 3 MC each. A bot buys what it can
// afford and would plausibly play, leaving a reserve to actually play them.
export function runBotResearch(engine, state, botId, difficultyId) {
  const { cloneGameState } = engine;
  const difficulty = getBotDifficulty(difficultyId);
  const bot = getPlayer(state, botId);
  if (!bot || (bot.researchCards?.length ?? 0) === 0) return state;

  const reserve = difficulty.researchReserve ?? 12;
  const affordable = Math.max(0, Math.floor(((bot.mc ?? 0) - reserve) / 3));
  const wanted = bot.researchCards.filter(cardId => {
    const card = ALL_CARDS.find(item => item.id === cardId);
    if (!card) return false;
    // Skip cards it could never pay for even at full price.
    return (card.cost ?? 0) <= (bot.mc ?? 0) + 20;
  });

  const buying = wanted.slice(0, Math.min(affordable, wanted.length));
  const next = cloneGameState(state);
  next.players = next.players.map(player =>
    player.id === botId
      ? {
          ...player,
          hand: [...player.hand, ...buying],
          mc: player.mc - buying.length * 3,
          researchCards: []
        }
      : player
  );
  next.discardPile = [
    ...next.discardPile,
    ...bot.researchCards.filter(id => !buying.includes(id))
  ];
  return next;
}

// Standard projects live in page.tsx, so the bot needs its own path to the two
// that reliably move the global parameters. Without these it can raise oxygen
// from cards but never place an ocean, and the game never ends.
export const BOT_STANDARD_PROJECTS = [
  {
    id: "ocean",
    name: "海洋の沈降",
    cost: 18,
    available: state => (state.oceans ?? 0) < 9,
    apply: (engine, state, botId, logs) => {
      const next = engine.cloneGameState(state);
      next.currentPlayerId = botId;
      next.mc -= 18;
      const cells = engine.legalCellsFor(next, "ocean", botId);
      if (cells.length === 0) return null;
      const cell = cells[0];
      // placeTileAt already raises the ocean count and TR; adding them here
      // moved both twice for a single project.
      engine.placeTileAt(next, next.board[`${cell.q},${cell.r}`] ?? cell, "ocean", botId, "standard-ocean");
      return { state: next, logs: engine.addLog(logs, "cpu", "標準プロジェクト【海洋の沈降】を実行しました。") };
    }
  },
  {
    id: "asteroid",
    name: "小惑星の衝突",
    cost: 14,
    available: state => (state.temperature ?? -30) < 8,
    apply: (engine, state, botId, logs) => {
      const next = engine.cloneGameState(state);
      next.currentPlayerId = botId;
      next.mc -= 14;
      next.temperature = Math.min(8, (next.temperature ?? -30) + 2);
      next.tr += 1;
      return { state: next, logs: engine.addLog(logs, "cpu", "標準プロジェクト【小惑星の衝突】を実行しました。") };
    }
  },
  {
    id: "greenery",
    name: "緑化プロジェクト",
    cost: 23,
    available: state => (state.oxygen ?? 0) < 14,
    apply: (engine, state, botId, logs) => {
      const next = engine.cloneGameState(state);
      next.currentPlayerId = botId;
      next.mc -= 23;
      const cells = engine.legalCellsFor(next, "forest", botId);
      if (cells.length === 0) return null;
      const cell = cells[0];
      engine.placeTileAt(next, next.board[`${cell.q},${cell.r}`] ?? cell, "forest", botId, "standard-greenery");
      return { state: next, logs: engine.addLog(logs, "cpu", "標準プロジェクト【緑化プロジェクト】を実行しました。") };
    }
  },
  {
    id: "power_plant",
    name: "発電所の建設",
    cost: 11,
    available: () => true,
    apply: (engine, state, botId, logs) => {
      const next = engine.cloneGameState(state);
      next.currentPlayerId = botId;
      next.mc -= 11;
      next.energyProd += 1;
      return { state: next, logs: engine.addLog(logs, "cpu", "標準プロジェクト【発電所の建設】を実行しました。") };
    }
  }
];

// Advances a robot game to the point where it is the human's turn again, or the
// game ends. Callers drive this after every human action.
export function advanceRobotGame(engine, state, humanId, difficultyId, rng, maxSteps = 400) {
  let current = state;
  let steps = 0;

  while (steps++ < maxSteps) {
    if (current.phase === "research") {
      // Bots buy their own research; the human's offer waits for the human.
      for (const player of current.players) {
        if (player.id === humanId) continue;
        current = runBotResearch(engine, current, player.id, difficultyId);
      }
      const humanPlayer = engine.getPlayer(current, humanId);
      if ((humanPlayer?.researchCards?.length ?? 0) > 0) return current;
      current = engine.cloneGameState(current);
      current.phase = "action";
      continue;
    }

    if (current.phase !== "action") return current;
    if (current.currentPlayerId === humanId) return current;
    if (current.pendingChoice && current.pendingChoice.ownerPlayerId === humanId) return current;

    const before = current.currentPlayerId;
    const result = runBotTurn(engine, current, before, difficultyId, rng);
    current = result.state;

    // Nothing moved: bail rather than spin.
    if (current.currentPlayerId === before && current.phase === "action" && !result.move) {
      const stillStuck = engine.getPlayer(current, before)?.passed;
      if (!stillStuck) return current;
    }
  }

  return current;
}
