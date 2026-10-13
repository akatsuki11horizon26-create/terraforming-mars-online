import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { parentPort, workerData } from 'node:worker_threads';
import * as engine from '../app/game-logic.js';
import * as bot from '../app/bot-player.js';
import { executeGameCommand, getLegalCommands, COMMAND } from '../app/game-command.js';
import { loadSavedState, serializeSavedState } from '../app/save-migration.js';

const game = workerData.game;
const boards = ['tharsis', 'hellas', 'elysium', 'utopia', 'amazonis', 'terra-cimmeria', 'vastitas-borealis'];
  const seed = workerData.seedBase + game;
  const playerCount = game % 5 + 1;
  const boardId = boards[Math.floor(game / 5) % boards.length];
  const full = Math.floor(game / 35) % 2 === 0;
  const difficulty = ['easy', 'normal', 'hard'][Math.floor(game / 70) % 3];
  const options = { seed, playerCount, board: boardId, prelude: full, prelude2: full, venus: full, colonies: full, turmoil: full, promo: full, draft: playerCount > 1, initialDraft: playerCount > 1 };
  let state = engine.getInitialState(options);
  assert.equal(state.boardId, boardId);
  const ids = state.players.map(p => p.id);
  const random = Object.fromEntries(ids.map((id, i) => [id, bot.makeBotRng(seed * 31 + i)]));
  let steps = 0;
  const start = performance.now();
  try {
    while (state.phase !== 'game_over' && steps++ < 4000) {
      if (steps % 20 === 1) parentPort.postMessage({ progress: { game, steps, phase: state.phase, generation: state.generation } });
      const before = serializeSavedState(state);
      if (state.pendingChoice) {
        const id = state.pendingChoice.ownerPlayerId;
        state = bot.resolveBotChoices(engine, state, id, random[id], 24, difficulty);
      } else if (state.phase === 'setup' || state.phase === 'research') {
        const phase = state.phase;
        for (const id of ids) {
          state = phase === 'setup'
            ? bot.runBotSetup(engine, state, id, difficulty, random[id])
            : bot.runBotResearch(engine, state, id, difficulty);
          if (state.pendingChoice || state.phase !== phase) break;
        }
      } else if (state.phase === 'action') {
        const id = state.currentPlayerId;
        state = bot.runBotTurn(engine, state, id, difficulty, random[id]).state;
      } else if (state.phase === 'final_greenery') {
        const legal = getLegalCommands(state, state.currentPlayerId);
        const command = legal.find(c => c.type === COMMAND.CONVERT_FINAL_GREENERY) ?? legal.find(c => c.type === COMMAND.FINISH_FINAL_GREENERY);
        assert.ok(command, 'final greenery has no legal command');
        const result = executeGameCommand(state, command);
        assert.ok(result.ok);
        state = result.state;
      }
      const saved = serializeSavedState(state);
      assert.notEqual(saved, before, `stalled in ${state.phase}`);
      const loaded = loadSavedState(saved);
      assert.ok(loaded, 'save rejected');
      assert.equal(serializeSavedState(loaded), saved, 'reload changed the state');
      state = loaded;
      for (const p of state.players) {
        for (const resource of ['mc', 'steel', 'titanium', 'plants', 'energy', 'heat']) {
          assert.ok(Number.isFinite(p[resource]) && p[resource] >= 0, `${p.id}.${resource}=${p[resource]}`);
          assert.ok(Number.isFinite(p[`${resource}Prod`]) && p[`${resource}Prod`] >= (resource === 'mc' ? -5 : 0), `${resource} production`);
        }
      }
    }
    assert.equal(state.phase, 'game_over', 'step limit reached');
    const scores = engine.calculateScoreBreakdowns(state);
    for (const score of Object.values(scores)) assert.ok(Number.isFinite(score.total));
    parentPort.postMessage({ game, ...options, difficulty, steps, generation: state.generation, ms: Math.round(performance.now() - start), result: 'pass' });
  } catch (error) {
    writeFileSync(new URL(`failure-${seed}.json`, workerData.outputUrl), serializeSavedState(state));
    throw error;
  }
