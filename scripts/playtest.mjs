// Plays complete games against the engine and reports anything that looks wrong.
// Intended for automated debugging: it drives the same APIs the UI calls, so a
// crash or rule violation here is a real bug, not a harness artefact.
//
// Usage:
//   node scripts/playtest.mjs [--games=20] [--players=1] [--turmoil] [--colonies] [--seed=N]
import {
  getInitialState,
  applyCorporation,
  applyPreludes,
  applyCardEffect,
  applyCardAction,
  getCardActionStatus,
  getCardPlayableStatus,
  getCardPaymentCost,
  resolvePendingChoice,
  handleActionSpend,
  triggerProduction,
  computeScore,
  claimMilestone,
  fundAward,
  getMilestoneStatus,
  getAwardStatus,
  sendDelegateToParty,
  buildColonyOn,
  tradeWith,
  canBuildColony,
  canTrade,
  MILESTONES,
  AWARDS,
  PARTIES,
  ALL_CARDS
} from "../app/game-logic.js";

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  })
);

const GAMES = Number(args.games ?? 20);
const PLAYERS = Number(args.players ?? 1);
const USE_TURMOIL = Boolean(args.turmoil);
const USE_COLONIES = Boolean(args.colonies);
const MAX_STEPS = 4000;

const issues = [];
function report(kind, detail, context = {}) {
  issues.push({ kind, detail, ...context });
}

// Invariants that must hold after every single step of every game.
function checkInvariants(state, where) {
  for (const player of state.players) {
    for (const field of ["mc", "steel", "titanium", "plants", "energy", "heat"]) {
      const value = player[field];
      if (!Number.isFinite(value)) {
        report("non-finite-resource", `${player.id}.${field} = ${value}`, { where });
      } else if (value < 0 && field !== "mc") {
        report("negative-resource", `${player.id}.${field} = ${value}`, { where });
      } else if (field === "mc" && value < 0) {
        // The rulebook floors a generation's MC income at zero, so going into
        // the red can only come from overspending — a real defect.
        report("negative-resource", `${player.id}.mc = ${value}`, { where });
      }
    }
    if (!Number.isFinite(player.tr) || player.tr < 0) {
      report("bad-tr", `${player.id}.tr = ${player.tr}`, { where });
      // Once TR is corrupt every later check repeats it; repair so the run keeps
      // exercising the rest of the engine instead of drowning in one fault.
      player.tr = 14;
    }
  }

  if (state.oceans > 9) report("too-many-oceans", `oceans = ${state.oceans}`, { where });
  if (state.oxygen > 14) report("oxygen-over-max", `oxygen = ${state.oxygen}`, { where });
  if (state.temperature > 8) report("temperature-over-max", `temp = ${state.temperature}`, { where });
  if (state.temperature % 2 !== 0) report("temperature-off-grid", `temp = ${state.temperature}`, { where });

  const oceanTiles = Object.values(state.board).filter(cell => cell.tileType === "ocean").length;
  if (oceanTiles !== state.oceans) {
    report("ocean-count-mismatch", `board has ${oceanTiles}, counter says ${state.oceans}`, { where });
  }
  for (const cell of Object.values(state.board)) {
    if (cell.tileType === "ocean" && !cell.isOceanOnly) {
      report("ocean-on-land", `${cell.q},${cell.r}`, { where });
    }
    if (cell.tileType !== "empty" && cell.tileType !== "ocean" && cell.placedBy === null) {
      report("unowned-tile", `${cell.q},${cell.r} ${cell.tileType}`, { where });
    }
  }

  if ((state.claimedMilestones ?? []).length > 3) report("too-many-milestones", "", { where });
  if ((state.fundedAwards ?? []).length > 3) report("too-many-awards", "", { where });

  if (state.colonies) {
    for (const tile of Object.values(state.colonies.tiles)) {
      if (tile.colonies.length > 3) {
        report("colony-overfull", `${tile.id} has ${tile.colonies.length}`, { where });
      }
      if (new Set(tile.colonies).size !== tile.colonies.length) {
        report("duplicate-colony", `${tile.id}`, { where });
      }
      if (tile.trackPosition < 0 || tile.trackPosition > 6) {
        report("track-out-of-range", `${tile.id} = ${tile.trackPosition}`, { where });
      }
    }
  }
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

// Deterministic PRNG so a failing game can be replayed from its seed.
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Research: 3 MC per card kept. Without this the player never has a hand and
// the whole game degenerates into passing.
const RESEARCH_CARD_COST = 3;

function buyResearchCards(state, playerId, rng, where) {
  const player = state.players.find(p => p.id === playerId);
  if (!player || player.researchCards.length === 0) return;

  const affordable = Math.floor(player.mc / RESEARCH_CARD_COST);
  const wanted = Math.min(affordable, player.researchCards.length, 1 + Math.floor(rng() * 4));
  const bought = player.researchCards.slice(0, wanted);
  const passed = player.researchCards.slice(wanted);

  state.players = state.players.map(p =>
    p.id === playerId
      ? {
          ...p,
          mc: p.mc - bought.length * RESEARCH_CARD_COST,
          hand: [...p.hand, ...bought],
          researchCards: []
        }
      : p
  );
  state.discardPile = [...state.discardPile, ...passed];
  checkInvariants(state, where);
}

function resolveAnyPending(state, logs, rng, where) {
  let current = { state, logs };
  let guard = 0;
  while (current.state.pendingChoice) {
    if (++guard > 60) {
      report("pending-choice-loop", `${current.state.pendingChoice.kind} never resolved`, { where });
      break;
    }
    const choice = current.state.pendingChoice;
    if (choice.options.length === 0) {
      report("pending-choice-no-options", `${choice.kind} offered nothing`, { where });
      current.state.pendingChoice = null;
      break;
    }
    const option = pick(choice.options, rng);
    const next = resolvePendingChoice(current.state, option.id, current.logs, choice.ownerPlayerId);
    if (next.state.pendingChoice === choice) {
      report("pending-choice-stuck", `${choice.kind} unchanged after resolve`, { where });
      break;
    }
    current = { state: next.state, logs: next.logs };
    checkInvariants(current.state, `${where}/resolve:${choice.kind}`);
  }
  return current;
}

function playGame(seed) {
  const rng = makeRng(seed);
  let state = getInitialState({
    playerCount: PLAYERS,
    turmoil: USE_TURMOIL,
    colonies: USE_COLONIES
  });
  let logs = state.logs;
  const where = `seed:${seed}`;
  checkInvariants(state, `${where}/initial`);

  // Setup follows the real flow: the engine hands the seat between players, so
  // drive whoever it says is up rather than looping over the roster ourselves.
  let setupGuard = 0;
  while (state.phase === "setup" && setupGuard++ < 40) {
    const seat = state.players.find(p => p.id === state.currentPlayerId);
    if (!seat) {
      report("setup-lost-seat", `${state.currentPlayerId} is not a player`, { where });
      break;
    }
    if (seat.corporationOptions.length > 0) {
      const corporationId = pick(seat.corporationOptions, rng);
      state = applyCorporation(state, corporationId);
      checkInvariants(state, `${where}/corp:${corporationId}`);
      continue;
    }
    if (seat.preludeOptions.length >= 2 && seat.selectedPreludeIds.length === 0) {
      state = applyPreludes(state, seat.preludeOptions.slice(0, 2));
      checkInvariants(state, `${where}/prelude:${seat.id}`);
      continue;
    }
    report("setup-stuck", `${seat.id} has nothing left to choose`, { where });
    break;
  }
  if (state.phase === "setup") {
    report("setup-never-finished", `phase still setup after ${setupGuard} steps`, { where });
    state.phase = "action";
  }
  for (const p of [...state.players]) {
    buyResearchCards(state, p.id, rng, `${where}/research`);
  }

  let steps = 0;
  while (!state.isGameOver && state.phase !== "game_over" && steps < MAX_STEPS) {
    steps += 1;
    const before = JSON.stringify({ gen: state.generation, phase: state.phase });

    const resolved = resolveAnyPending(state, logs, rng, where);
    state = resolved.state;
    logs = resolved.logs;

    if (state.phase === "final_greenery" || state.generation > 40) break;

    const player = state.players.find(p => p.id === state.currentPlayerId);
    if (!player) {
      report("missing-current-player", `${state.currentPlayerId}`, { where });
      break;
    }

    // Choose an action at random from what the engine says is legal.
    const moves = [];

    for (const cardId of player.hand) {
      const card = ALL_CARDS.find(c => c.id === cardId);
      if (!card) continue;
      const status = getCardPlayableStatus(card, state, 0, 0);
      const cost = getCardPaymentCost(card, state, 0, 0);
      if (status.playable && player.mc >= cost) moves.push({ kind: "play", card, cost });
    }

    for (const cardId of player.playedProjects) {
      const card = ALL_CARDS.find(c => c.id === cardId);
      if (!card) continue;
      if (getCardActionStatus(state, card).playable) moves.push({ kind: "action", card });
    }

    for (const milestone of MILESTONES) {
      if (getMilestoneStatus(state, milestone.id, player.id).claimable) {
        moves.push({ kind: "milestone", id: milestone.id });
      }
    }
    for (const award of AWARDS) {
      if (getAwardStatus(state, award.id, player.id).fundable) {
        moves.push({ kind: "award", id: award.id });
      }
    }
    if (state.turmoil) {
      for (const party of PARTIES) {
        if (state.turmoil.lobby.includes(player.id)) {
          moves.push({ kind: "delegate", id: party.id });
        }
      }
    }
    if (state.colonies) {
      for (const tileId of state.colonies.tilesInPlay) {
        if (canBuildColony(state.colonies, tileId, player.id).ok) {
          moves.push({ kind: "colony", id: tileId });
        }
        if (canTrade(state.colonies, tileId, player.id).ok) {
          moves.push({ kind: "trade", id: tileId });
        }
      }
    }

    if (moves.length === 0 || rng() < 0.25) {
      // Pass: end the generation.
      const produced = triggerProduction(state, logs);
      state = produced;
      logs = produced.logs;
      checkInvariants(state, `${where}/production:gen${state.generation}`);
      // A new generation deals research cards; buy some or the hand runs dry.
      for (const p of [...state.players]) {
        buyResearchCards(state, p.id, rng, `${where}/research:gen${state.generation}`);
      }
      continue;
    }

    const move = pick(moves, rng);
    try {
      if (move.kind === "play") {
        state.players = state.players.map(p =>
          p.id === player.id
            ? { ...p, mc: p.mc - move.cost, hand: p.hand.filter(id => id !== move.card.id) }
            : p
        );
        const result = applyCardEffect(state, move.card, logs);
        state = result.state;
        logs = result.logs;
        state.players = state.players.map(p =>
          p.id === player.id ? { ...p, playedProjects: [...p.playedProjects, move.card.id] } : p
        );
      } else if (move.kind === "action") {
        const result = applyCardAction(state, move.card, logs);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "milestone") {
        const result = claimMilestone(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "award") {
        const result = fundAward(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "delegate") {
        const result = sendDelegateToParty(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "colony") {
        const result = buildColonyOn(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      } else if (move.kind === "trade") {
        const result = tradeWith(state, move.id, logs, player.id);
        state = result.state;
        logs = result.logs;
      }
    } catch (error) {
      report("exception", `${move.kind} ${move.card?.name ?? move.id}: ${error.message}`, {
        where,
        stack: String(error.stack).split("\n").slice(0, 3).join(" | ")
      });
      break;
    }

    checkInvariants(state, `${where}/${move.kind}`);

    const spent = handleActionSpend(state, logs);
    state = spent;
    logs = spent.logs;

    if (JSON.stringify({ gen: state.generation, phase: state.phase }) === before && steps >= MAX_STEPS - 1) {
      report("no-progress", "state stopped advancing", { where });
    }
  }

  if (steps >= MAX_STEPS) report("step-limit", `hit ${MAX_STEPS} steps`, { where });

  const scores = state.players.map(p => ({ id: p.id, score: computeScore(state, p.id) }));
  for (const entry of scores) {
    if (!Number.isFinite(entry.score)) {
      const p = state.players.find(x => x.id === entry.id);
      const fields = ["tr","mc","steel","titanium","plants","energy","heat"]
        .map(f => `${f}=${p[f]}`).join(" ");
      const badRes = Object.entries(p.cardResources ?? {})
        .filter(([, v]) => !Number.isFinite(v)).map(([k, v]) => `${k}=${v}`);
      report("non-finite-score",
        `${entry.id} scored ${entry.score} | ${fields} | badCardResources=[${badRes.join(",")}] | played=${p.playedProjects.length}`,
        { where });
    }
  }

  return { generation: state.generation, steps, scores, phase: state.phase };
}

const summaries = [];
for (let i = 0; i < GAMES; i++) {
  const seed = Number(args.seed ?? 1) + i * 7919;
  try {
    summaries.push(playGame(seed));
  } catch (error) {
    report("harness-crash", error.message, {
      where: `seed:${seed}`,
      stack: String(error.stack).split("\n").slice(0, 4).join(" | ")
    });
  }
}

const mode = `${PLAYERS}人${USE_TURMOIL ? "+Turmoil" : ""}${USE_COLONIES ? "+Colonies" : ""}`;
console.log(`=== ${GAMES}ゲーム完走 (${mode}) ===`);
const gens = summaries.map(s => s.generation);
console.log(
  `世代: 最小${Math.min(...gens)} 最大${Math.max(...gens)} 平均${(gens.reduce((a, b) => a + b, 0) / gens.length).toFixed(1)}`
);
const allScores = summaries.flatMap(s => s.scores.map(x => x.score));
console.log(
  `得点: 最小${Math.min(...allScores)} 最大${Math.max(...allScores)} 平均${(allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(1)}`
);

const grouped = new Map();
for (const issue of issues.filter(i => !i.benign)) {
  const key = issue.kind;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(issue);
}

const real = issues.filter(issue => !issue.benign);
const benign = issues.filter(issue => issue.benign);
if (benign.length > 0) {
  console.log(`\n(参考) ルール通りだが目を引く事象: ${benign.length}件`);
  const kinds = new Set(benign.map(issue => issue.kind));
  for (const kind of kinds) {
    console.log(`  ${kind}: ${benign.filter(i => i.kind === kind).length}件`);
  }
}

console.log(`\n=== 検出された問題: ${real.length}件 (${new Set(real.map(i => i.kind)).size}種類) ===`);
for (const [kind, list] of [...grouped].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n[${kind}] ${list.length}件`);
  for (const issue of list.slice(0, 4)) {
    console.log(`  ${issue.where ?? ""} ${issue.detail}`);
    if (issue.stack) console.log(`    ${issue.stack}`);
  }
}
if (real.length === 0) console.log("問題なし。");

process.exitCode = real.length > 0 ? 1 : 0;
