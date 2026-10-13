import { Worker } from 'node:worker_threads';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, unlinkSync, openSync, closeSync, appendFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAuditClock } from './audit-clock.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const options = Object.fromEntries(process.argv.slice(2).map(arg => {
  const match = /^--(directory|minutes|max-games|game-timeout-ms|seed-base)=(.+)$/.exec(arg);
  if (!match) throw new Error(`Unknown argument: ${arg}`);
  return [match[1], match[2]];
}));
const directory = resolve(root, options.directory ?? 'tmp/long-audit');
const numeric = (key, fallback) => {
  const value = Number(options[key] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${key}`);
  return value;
};
const minutes = numeric('minutes', 300);
const maxGames = numeric('max-games', Number.MAX_SAFE_INTEGER);
const timeoutMs = numeric('game-timeout-ms', 120000);
const seedBase = numeric('seed-base', 14000000);
if (![maxGames, timeoutMs, seedBase].every(Number.isSafeInteger)) throw new Error('Game counts, timeout and seed must be integers');
mkdirSync(directory, { recursive: true });
const statusPath = join(directory, 'status.json');
const lockPath = join(directory, 'runner.lock');
const terminal = new Set(['completed', 'failed', 'code_changed', 'stopped']);
const renameWait = new Int32Array(new SharedArrayBuffer(4));
const save = state => {
  writeFileSync(`${statusPath}.tmp`, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
  for (let attempt = 0; ; attempt++) {
    try { renameSync(`${statusPath}.tmp`, statusPath); break; }
    catch (error) {
      // Windows readers can briefly deny replacement even when the writer owns the session lock.
      if (attempt >= 50 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error;
      Atomics.wait(renameWait, 0, 0, 20);
    }
  }
};
const sourceHash = () => {
  const files = execFileSync('git', ['ls-files', 'app', 'scripts', 'package-lock.json'], { cwd: root, encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/);
  files.push('scripts/audit-session.mjs', 'scripts/cpu-soak-worker.mjs', 'scripts/audit-clock.mjs');
  const hash = createHash('sha256');
  for (const file of [...new Set(files)].sort()) hash.update(file).update(readFileSync(join(root, file)));
  return hash.digest('hex');
};

function acquire() {
  try {
    const fd = openSync(lockPath, 'wx');
    writeFileSync(fd, String(process.pid));
    closeSync(fd);
    return true;
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const pid = Number(readFileSync(lockPath, 'utf8'));
    if (Number.isSafeInteger(pid) && pid > 0) {
      try { process.kill(pid, 0); return false; }
      catch (check) { if (check.code !== 'ESRCH') throw check; }
    } else if (Date.now() - statSync(lockPath).mtimeMs < 5000) return false;
    unlinkSync(lockPath);
    return acquire();
  }
}

function play(game, state) {
  return new Promise(resolveResult => {
    const startedAt = Date.now();
    const observe = createAuditClock(startedAt, Date.parse(state.deadline), state.timeoutMs);
    const worker = new Worker(new URL('./cpu-soak-worker.mjs', import.meta.url), {
      workerData: { game, seedBase: state.seedBase, outputUrl: pathToFileURL(`${directory}/`).href }
    });
    let outcome;
    const checkTime = () => {
      if (outcome) return true;
      const limit = observe(Date.now());
      if (!limit) return false;
      outcome = limit;
      void worker.terminate();
      return true;
    };
    const timer = setInterval(checkTime, Math.max(1, Math.min(250, state.timeoutMs, Date.parse(state.deadline) - startedAt)));
    worker.on('message', row => {
      if (checkTime()) return;
      if (row.progress) {
        state.currentGame = row.progress;
        save(state);
      } else outcome = { row };
    });
    worker.on('error', error => { if (!checkTime()) outcome = { error: error.stack }; });
    worker.on('exit', code => {
      checkTime();
      clearInterval(timer);
      resolveResult(outcome ?? { error: `Worker exited without a result (${code})` });
    });
  });
}

if (acquire()) {
  try {
    let state = existsSync(statusPath) ? JSON.parse(readFileSync(statusPath, 'utf8')) : {
      startedAt: new Date().toISOString(), deadline: new Date(Date.now() + minutes * 60000).toISOString(),
      sourceHash: sourceHash(), seedBase, maxGames, timeoutMs, nextGame: 0, completedGames: 0, activeGameMs: 0, resumes: 0
    };
    if (!terminal.has(state.status)) {
      if (state.status === 'running') state.resumes++;
      state = { ...state, status: 'running', pid: process.pid };
      save(state);
      while (Date.now() < Date.parse(state.deadline) && state.nextGame < state.maxGames) {
        if (existsSync(join(directory, 'STOP'))) { state.status = 'stopped'; break; }
        if (sourceHash() !== state.sourceHash) { state.status = 'code_changed'; break; }
        const result = await play(state.nextGame, state);
        if (result.deadline) break;
        if (result.interrupted) {
          state.interruptions = (state.interruptions ?? 0) + 1;
          state.lastInterruption = { game: state.nextGame, gapMs: result.gapMs, at: new Date().toISOString() };
          save(state);
          continue;
        }
        if (result.error) {
          state.status = 'failed';
          state.failure = { game: state.nextGame, seed: state.seedBase + state.nextGame, error: result.error };
          break;
        }
        if (sourceHash() !== state.sourceHash) { state.status = 'code_changed'; break; }
        // The checkpoint is authoritative. A crash before this write repeats only the unfinished game.
        state.nextGame++;
        state.completedGames++;
        state.activeGameMs += result.row.ms;
        state.lastResult = result.row;
        save(state);
        appendFileSync(join(directory, 'results.jsonl'), JSON.stringify({ ...result.row, at: new Date().toISOString() }) + '\n');
      }
      if (state.status === 'running') state.status = 'completed';
      state.finishedAt = new Date().toISOString();
      save(state);
      console.log(JSON.stringify({ status: state.status, completedGames: state.completedGames, directory }));
    }
  } finally {
    unlinkSync(lockPath);
  }
}
