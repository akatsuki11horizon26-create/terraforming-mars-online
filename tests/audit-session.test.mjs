import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, existsSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createAuditClock } from '../scripts/audit-clock.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
test('suspension discards a game, while a responsive parent still detects a slow worker', () => {
  const suspended = createAuditClock(0, 300000, 120000);
  assert.equal(suspended(250), null);
  assert.deepEqual(suspended(130000), { interrupted: true, gapMs: 129750 });
  const responsive = createAuditClock(0, 300000, 120000);
  for (let now = 250; now < 120000; now += 250) assert.equal(responsive(now), null);
  assert.deepEqual(responsive(120000), { error: 'Game time limit exceeded' });
});
test('the original deadline wins after sleep and a backward clock jump does not count as play time', () => {
  assert.deepEqual(createAuditClock(0, 300000, 120000)(400000), { deadline: true });
  assert.deepEqual(createAuditClock(1000, 300000, 120000)(900), { interrupted: true, gapMs: -100 });
});
mkdirSync(join(root, 'tmp'), { recursive: true });
const directory = () => mkdtempSync(join(root, 'tmp/audit-session-test-'));
const status = dir => {
  const path = join(dir, 'status.json');
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
};
function launch(dir, ...args) {
  const child = spawn(process.execPath, ['scripts/audit-session.mjs', `--directory=${dir}`, '--minutes=1', '--max-games=2', ...args], { cwd: root, windowsHide: true });
  let output = '';
  child.stdout.on('data', value => { output += value; });
  child.stderr.on('data', value => { output += value; });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (code, signal) => resolve({ code, signal, output }));
  });
  return { child, done };
}
async function waitFor(predicate) {
  const deadline = Date.now() + 45000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Checkpoint did not arrive');
    await delay(20);
  }
}

test('an interrupted audit resumes after its checkpoint, with the original deadline and no double count', { timeout: 60000 }, async t => {
  const dir = directory();
  const first = launch(dir);
  t.after(() => { if (first.child.exitCode === null) first.child.kill(); });
  await waitFor(() => {
    if (first.child.exitCode !== null) throw new Error(`Audit exited before interruption: ${JSON.stringify(status(dir))}`);
    return status(dir)?.completedGames === 1;
  }).catch(async error => {
    if (first.child.exitCode !== null) throw new Error(`${error.message}\n${(await first.done).output}`);
    throw error;
  });
  first.child.kill('SIGKILL');
  await first.done;
  const saved = status(dir);
  assert.equal(saved.completedGames, 1);
  const resumed = await launch(dir, '--minutes=300').done;
  assert.equal(resumed.code, 0, resumed.output);
  const final = status(dir);
  assert.equal(final.status, 'completed');
  assert.equal(final.completedGames, 2);
  assert.equal(final.resumes, 1);
  assert.equal(final.deadline, saved.deadline);
  const rows = readFileSync(join(dir, 'results.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(row => row.game), [0, 1]);
  assert.equal((await launch(dir).done).code, 0);
  assert.deepEqual(status(dir), final);
});

test('a worker timeout is recorded and scheduler retries do not hide the failure', async () => {
  const dir = directory();
  assert.equal((await launch(dir, '--game-timeout-ms=1').done).code, 0);
  const failed = status(dir);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.completedGames, 0);
  assert.match(failed.failure.error, /time limit/);
  await launch(dir).done;
  assert.deepEqual(status(dir), failed);
});

test('a second audit cannot run against the same live checkpoint', async t => {
  const dir = directory();
  const first = launch(dir);
  t.after(() => { if (first.child.exitCode === null) first.child.kill(); });
  await waitFor(() => status(dir)?.status === 'running');
  const second = await launch(dir).done;
  assert.equal(second.code, 0, second.output);
  assert.equal(status(dir).pid, first.child.pid);
  assert.equal((await first.done).code, 0);
  assert.equal(status(dir).completedGames, 2);
});

test('an abandoned empty lock can be recovered and STOP is preserved', async () => {
  const dir = directory();
  const lock = join(dir, 'runner.lock');
  writeFileSync(lock, '');
  utimesSync(lock, new Date(0), new Date(0));
  writeFileSync(join(dir, 'STOP'), '');
  assert.equal((await launch(dir).done).code, 0);
  assert.equal(status(dir).status, 'stopped');
  assert.equal(status(dir).completedGames, 0);
});
