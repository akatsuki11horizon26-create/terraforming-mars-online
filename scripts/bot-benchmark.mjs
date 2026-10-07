import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import * as engine from "../app/game-logic.js";
import * as current from "../app/bot-player.js";
import { executeGameCommand, getLegalCommands, COMMAND } from "../app/game-command.js";

const referencePath = process.argv[2];
if (!referencePath) throw new Error("Usage: node scripts/bot-benchmark.mjs reference-module [pairs=4] [difficulty=normal] [seed=2026]");
const reference = await import(pathToFileURL(resolve(referencePath)).href);
const pairs = Number(process.argv[3] ?? 4);
const difficulty = process.argv[4] ?? "normal";
const firstSeed = Number(process.argv[5] ?? 2026);
if (!Number.isInteger(pairs) || pairs < 1 || !Number.isInteger(firstSeed) || !["easy", "normal", "hard"].includes(difficulty)) throw new Error("Invalid benchmark arguments");
const results = [];
let totalTime = 0, decisions = 0, maxDecisionMs = 0;
for (let pair = 0; pair < pairs; pair++) {
  for (let swap = 0; swap < 2; swap++) {
    const seed = firstSeed + pair;
    let state = engine.getInitialState({ playerCount: 2, seed, prelude: true });
    const ids = state.players.map(p => p.id);
    const updatedId = ids[swap];
    const policy = id => id === updatedId ? current : reference;
    const random = Object.fromEntries(ids.map((id, i) => [id, current.makeBotRng(seed * 31 + i)]));
    let steps = 0;
    while (state.phase !== "game_over" && steps++ < 4000) {
      const before = state;
      if (state.pendingChoice) {
        const id = state.pendingChoice.ownerPlayerId;
        state = policy(id).resolveBotChoices(engine, state, id, random[id], 24, difficulty);
      } else if (state.phase === "setup" || state.phase === "research") {
        const phase = state.phase;
        for (const id of ids) {
          state = phase === "setup"
            ? policy(id).runBotSetup(engine, state, id, difficulty, random[id])
            : policy(id).runBotResearch(engine, state, id, difficulty);
          if (state.pendingChoice || state.phase !== phase) break;
        }
      } else if (state.phase === "action") {
        const id = state.currentPlayerId;
        const start = performance.now();
        state = policy(id).runBotTurn(engine, state, id, difficulty, random[id]).state;
        if (id === updatedId) {
          const elapsed = performance.now() - start;
          totalTime += elapsed; decisions++; maxDecisionMs = Math.max(maxDecisionMs, elapsed);
        }
      } else if (state.phase === "final_greenery") {
        const legal = getLegalCommands(state, state.currentPlayerId);
        const command = legal.find(c => c.type === COMMAND.CONVERT_FINAL_GREENERY) ?? legal.find(c => c.type === COMMAND.FINISH_FINAL_GREENERY);
        state = executeGameCommand(state, command).state;
      }
      if (before === state) throw new Error(`Stalled: seed ${seed}, phase ${state.phase}`);
    }
    if (state.phase !== "game_over") throw new Error(`Game did not finish: seed ${seed}`);
    const scores = engine.calculateScoreBreakdowns(state);
    const opponentId = ids.find(id => id !== updatedId);
    const margin = scores[updatedId].total - scores[opponentId].total;
    const cashMargin = engine.getPlayer(state, updatedId).mc - engine.getPlayer(state, opponentId).mc;
    const row = { seed, seat: swap + 1, generation: state.generation, updated: scores[updatedId].total, reference: scores[opponentId].total, margin, result: Math.sign(margin || cashMargin) };
    results.push(row);
    console.log(JSON.stringify(row));
  }
}
console.log(JSON.stringify({ games: results.length, wins: results.filter(r => r.result > 0).length, draws: results.filter(r => r.result === 0).length, averageMargin: results.reduce((sum, r) => sum + r.margin, 0) / results.length, averageDecisionMs: totalTime / decisions, maxDecisionMs }));
