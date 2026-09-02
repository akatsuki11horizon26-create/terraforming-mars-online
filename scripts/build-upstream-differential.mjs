// Records every card operation the reference's own test suite performs.
//
// The other upstream manifests here stage a card themselves: a fresh game, a
// player handed resources, one call. That measures the card in one situation
// this script chose. The reference's suite has already built 2,700 situations
// with boards, tags, opponents and production set up per card, and it runs, so
// it can be asked instead of re-derived.
//
// What gets recorded is the operation, not the assertion. Reading assertions
// out of the source is what data/upstream-assertion-baseline.json does, and it
// can only find a "candidate" local test for most rows -- a test that mentions
// the same card. An operation is the thing itself: this API, on this state,
// moved these fields.
//
// card.play is deliberately NOT mapped onto executeGameCommand downstream.
// Player.playCard is upstream's real play path and does more than card.play --
// payment, the card entering the tableau, triggers -- and most specs call
// card.play directly. Comparing one against the other would score the
// difference between two entry points as a defect.
//
// Usage:
//   TM_SOURCE=<upstream clone at the pinned SHA> node scripts/build-upstream-differential.mjs
import { writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const sourceRoot = process.env.TM_SOURCE ?? "C:/Users/takkun/AppData/Local/Temp/tm-src";
const outDir = process.env.DIFFERENTIAL_OUTPUT ?? "data/upstream-differential";
const REF = "1b26fe6989fe53c6a2a76cfe92f08eb9228f832f";

const SUITES = "tests/cards/{base,promo,venusNext,colonies,turmoil,prelude,prelude2,corporation}/**/*.spec.ts";

const hookFile = "aaa-differential-hook.spec.ts";
const resultFile = "differential-out.json";

const hook = [
  "import {ALL_MODULE_MANIFESTS} from './src/server/cards/AllManifests';",
  "import {Game} from './src/server/Game';",
  "import {writeFileSync} from 'fs';",
  "",
  "const IN_SCOPE = new Set(['base','corpera','promo','venus','colonies','turmoil','prelude','prelude2']);",
  "const OPERATIONS = ['canPlay', 'play', 'canAct', 'action', 'getVictoryPoints', 'initialAction'];",
  "",
  "// The player fields that are rules state. Log text, timers, ids and the",
  "// unconsumed deck are implementation detail we do not share and must not",
  "// compare.",
  "// playedCards is a PlayedCards collection, not an array.",
  "const inPlay = (p) => {",
  "  const cards = p.playedCards;",
  "  if (Array.isArray(cards)) return cards;",
  "  if (cards && typeof cards.asArray === 'function') return [...cards.asArray()];",
  "  return [];",
  "};",
  "",
  "const snapPlayer = (p) => ({",
  "  mc: p.megaCredits, steel: p.steel, titanium: p.titanium,",
  "  plants: p.plants, energy: p.energy, heat: p.heat,",
  "  mcP: p.production.megacredits, steelP: p.production.steel,",
  "  titaniumP: p.production.titanium, plantsP: p.production.plants,",
  "  energyP: p.production.energy, heatP: p.production.heat,",
  "  tr: p.terraformRating,",
  "  hand: (p.cardsInHand ?? []).map(c => c.name).sort(),",
  "  played: inPlay(p).map(c => c.name).sort(),",
  "  resources: Object.fromEntries(inPlay(p)",
  "    .filter(c => (c.resourceCount ?? 0) > 0).map(c => [c.name, c.resourceCount]))",
  "});",
  "",
  "const snapGame = (g) => ({",
  "  generation: g.generation, phase: g.phase,",
  "  oxygen: g.oxygenLevel, temperature: g.temperature,",
  "  venus: g.venusScaleLevel,",
  "  tiles: (g.board?.spaces ?? []).filter(s => s.tile !== undefined)",
  "    .map(s => s.id + ':' + s.tile.tileType + ':' + (s.player?.color ?? '-')).sort()",
  "});",
  "",
  "const delta = (before, after) => {",
  "  const out = {};",
  "  for (const key of Object.keys(after)) {",
  "    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) out[key] = after[key];",
  "  }",
  "  return out;",
  "};",
  "",
  "// A card method that calls another card's method is not its own operation:",
  "// only the outermost call is what the test asked for.",
  "let depth = 0;",
  "let currentTest = '(setup)';",
  "const games = new Set();",
  "const rows = [];",
  "const seenCards = new Set();",
  "",
  "const capture = () => [...games].map(g => ({",
  "  game: snapGame(g),",
  "  players: (g.players ?? []).map(p => [p.id, snapPlayer(p)])",
  "}));",
  "",
  "const wrap = (proto, method, cardName) => {",
  "  const original = proto[method];",
  "  if (typeof original !== 'function' || original.__wrapped) return;",
  "  const wrapped = function (...args) {",
  "    if (depth > 0) return original.apply(this, args);",
  "",
  "    const before = capture();",
  "    depth++;",
  "    let returned;",
  "    let threw = null;",
  "    try {",
  "      returned = original.apply(this, args);",
  "    } catch (error) {",
  "      threw = String((error && error.message) || error).slice(0, 120);",
  "    } finally {",
  "      depth--;",
  "    }",
  "    const after = capture();",
  "",
  "    const changes = [];",
  "    for (let i = 0; i < before.length && i < after.length; i++) {",
  "      const gameDelta = delta(before[i].game, after[i].game);",
  "      const playerDeltas = {};",
  "      const beforeById = new Map(before[i].players);",
  "      for (const entry of after[i].players) {",
  "        const d = delta(beforeById.get(entry[0]) ?? {}, entry[1]);",
  "        if (Object.keys(d).length > 0) playerDeltas[entry[0]] = d;",
  "      }",
  "      if (Object.keys(gameDelta).length > 0 || Object.keys(playerDeltas).length > 0) {",
  "        changes.push({ game: gameDelta, players: playerDeltas });",
  "      }",
  "    }",
  "",
  "    seenCards.add(cardName);",
  "    // The situation the operation started from. A test arranges tags, tracks",
  "    // and tableau before it calls, and none of that shows in the delta -- a",
  "    // card that scales with Earth tags looks like it did nothing when the",
  "    // replay has no tags. Without this the audit scores its own missing setup",
  "    // as an engine defect.",
  "    const owner = args[0];",
  "    const situation = owner ? {",
  "      game: before.length > 0 ? before[0].game : null,",
  "      player: (() => {",
  "        for (const frame of before) {",
  "          for (const entry of frame.players) if (entry[0] === owner.id) return entry[1];",
  "        }",
  "        return null;",
  "      })(),",
  "      // Only the tags actually held. The full record is 18 zeroes per row,",
  "      // and the audit only ever asks whether any of them is non-zero.",
  "      tags: (() => {",
  "        try {",
  "          if (!owner.tags || !owner.tags.countAllTags) return null;",
  "          const counts = owner.tags.countAllTags();",
  "          const held = {};",
  "          for (const key of Object.keys(counts)) if (counts[key] > 0) held[key] = counts[key];",
  "          return held;",
  "        } catch (e) { return null; }",
  "      })(),",
  "      // Tests override tag counts with tagsForTest, which countAllTags does",
  "      // not report. A card scaling on tags then produces a number the replay",
  "      // has no way to reach, and the row must be excluded rather than failed.",
  "      tagsForTest: owner.tagsForTest ?? null,",
  "      // Colonies owned, and the tags every other player holds. Cards scale on",
  "      // both, and neither shows in the delta or in the owner's own snapshot.",
  "      colonies: (() => {",
  "        try {",
  "          const g = owner.game;",
  "          if (!g || !g.colonies) return null;",
  "          let owned = 0;",
  "          for (const colony of g.colonies) {",
  "            for (const c of (colony.colonies ?? [])) if (c === owner.id) owned++;",
  "          }",
  "          return owned;",
  "        } catch (e) { return null; }",
  "      })(),",
  "      // Which colonies are in the game and where their tracks sit. A test",
  "      // that swaps the colony set or moves a track changes the answer",
  "      // without changing anything else the snapshot records.",
  "      colonyTracks: (() => {",
  "        try {",
  "          const g = owner.game;",
  "          if (!g || !g.colonies) return null;",
  "          return g.colonies.map(c => String(c.name) + ':' + String(c.trackPosition)).sort();",
  "        } catch (e) { return null; }",
  "      })(),",
  "      opponentTags: (() => {",
  "        try {",
  "          const g = owner.game;",
  "          if (!g) return null;",
  "          let total = 0;",
  "          for (const other of (g.players ?? [])) {",
  "            if (other.id === owner.id) continue;",
  "            const counts = other.tags && other.tags.countAllTags ? other.tags.countAllTags() : {};",
  "            for (const key of Object.keys(counts)) total += counts[key] ?? 0;",
  "            if (other.tagsForTest) total += 1000;",
  "          }",
  "          return total;",
  "        } catch (e) { return null; }",
  "      })(),",
  "      // Cards that attack read the opponents' production, and cards that",
  "      // answer an attack read what happened this generation. Neither is in",
  "      // the owner's own snapshot, and both decide whether a card is playable.",
  "      opponents: (() => {",
  "        try {",
  "          const g = owner.game;",
  "          if (!g) return null;",
  "          return (g.players ?? []).filter(x => x.id !== owner.id).map(x => {",
  "            const all = {",
  "              plants: x.plants, energy: x.energy, heat: x.heat,",
  "              steel: x.steel, titanium: x.titanium, mc: x.megaCredits,",
  "              mcP: x.production.megacredits, energyP: x.production.energy,",
  "              plantsP: x.production.plants, heatP: x.production.heat,",
  "              steelP: x.production.steel, titaniumP: x.production.titanium,",
  "              played: inPlay(x).length",
  "            };",
  "            const held = {};",
  "            for (const key of Object.keys(all)) if (all[key] > 0) held[key] = all[key];",
  "            return held;",
  "          });",
  "        } catch (e) { return null; }",
  "      })(),",
  "      // Who has attacked this player. Law Suit and Crash Site Cleanup are",
  "      // playable only once somebody has, and nothing else in the snapshot",
  "      // records that it happened.",
  "      attackedBy: (() => {",
  "        try { return (owner.removingPlayers ?? []).length; } catch (e) { return null; }",
  "      })(),",
  "      // A separate ledger from removingPlayers: this one is game-wide and",
  "      // says somebody took another player's plants this generation.",
  "      plantsRemoved: (() => {",
  "        try { return owner.game ? owner.game.someoneHasRemovedOtherPlayersPlants === true : null; }",
  "        catch (e) { return null; }",
  "      })(),",
  "      deck: (() => {",
  "        try { return owner.game && owner.game.projectDeck ? owner.game.projectDeck.drawPile.length : null; }",
  "        catch (e) { return null; }",
  "      })(),",
  "      // canPlay reads far more than the owner: the board being played on,",
  "      // how many are seated, and Turmoil's ruling party and policy. The",
  "      // replay is a two-player Tharsis game with no politics, so a row that",
  "      // depended on any of those cannot be reproduced and must be named.",
  "      setting: (() => {",
  "        try {",
  "          const g = owner.game;",
  "          if (!g) return null;",
  "          const turmoil = g.turmoil;",
  "          return {",
  "            players: (g.players ?? []).length,",
  "            board: (g.gameOptions && g.gameOptions.boardName) || null,",
  "            ruling: turmoil && turmoil.rulingParty ? String(turmoil.rulingParty.name) : null,",
  "            politicalAgendas: turmoil && turmoil.politicalAgendasData ? true : false,",
  "            passed: (g.players ?? []).filter(x => x.beingSetup !== true && g.hasPassedThisActionPhase && g.hasPassedThisActionPhase(x)).length",
  "          };",
  "        } catch (e) { return null; }",
  "      })()",
  "    } : null;",
  "    rows.push({",
  "      test: currentTest,",
  "      card: cardName,",
  "      api: method,",
  "      threw,",
  "      situation,",
  "      // A boolean or number return is the answer itself (canPlay, canAct,",
  "      // getVictoryPoints). An object is a PlayerInput, which is a question,",
  "      // so its shape is recorded rather than its identity.",
  "      returned: (typeof returned === 'boolean' || typeof returned === 'number')",
  "        ? returned",
  "        : (returned === undefined || returned === null",
  "            ? null",
  "            : { input: (returned.constructor && returned.constructor.name) || 'input' }),",
  "      changes",
  "    });",
  "    if (threw !== null) throw new Error(threw);",
  "    return returned;",
  "  };",
  "  wrapped.__wrapped = true;",
  "  proto[method] = wrapped;",
  "};",
  "",
  "const originalNew = Game.newInstance;",
  "Game.newInstance = function (...args) {",
  "  const game = originalNew.apply(this, args);",
  "  games.add(game);",
  "  return game;",
  "};",
  "",
  "let wrappedCards = 0;",
  "for (const manifest of ALL_MODULE_MANIFESTS) {",
  "  if (!IN_SCOPE.has(manifest.module)) continue;",
  "  for (const group of ['projectCards', 'corporationCards', 'preludeCards', 'standardProjects']) {",
  "    for (const entry of Object.entries(manifest[group] ?? {})) {",
  "      const proto = entry[1].Factory && entry[1].Factory.prototype;",
  "      if (!proto) continue;",
  "      for (const method of OPERATIONS) wrap(proto, method, entry[0]);",
  "      wrappedCards++;",
  "    }",
  "  }",
  "}",
  "",
  "beforeEach(function () {",
  "  currentTest = (this.currentTest && this.currentTest.fullTitle()) || '(unknown)';",
  "  games.clear();",
  "});",
  "",
  "after(function () {",
  "  writeFileSync(" + JSON.stringify(resultFile) + ", JSON.stringify({",
  "    rows, wrappedCards, distinctCards: [...seenCards].sort()",
  "  }));",
  "});",
  "",
  "describe('differential hook', () => { it('is installed', () => {}); });"
].join("\n");

writeFileSync(join(sourceRoot, hookFile), hook);
let mochaOutput = "";
let failed = false;
try {
  mochaOutput = execFileSync(
    "npx",
    ["mocha", "--import=tsx", "--require", "tests/testing/setup.ts", hookFile, SUITES, "--reporter", "dot"],
    { cwd: sourceRoot, stdio: "pipe", shell: true, maxBuffer: 128 * 1024 * 1024 }
  ).toString();
} catch (error) {
  mochaOutput = String(error.stdout ?? "") + String(error.stderr ?? "");
  failed = true;
}
rmSync(join(sourceRoot, hookFile), { force: true });

const passing = Number(/(\d+) passing/.exec(mochaOutput)?.[1] ?? 0);
const failing = Number(/(\d+) failing/.exec(mochaOutput)?.[1] ?? 0);

// Wrapping the prototypes makes the suite's own run part of what is recorded:
// if the suite no longer passes, the hook changed behaviour and nothing it
// captured can be trusted.
if (failing > 0 || (failed && passing === 0)) {
  console.error(mochaOutput.slice(-4000));
  throw new Error(`the hook disturbed the upstream suite: ${failing} failing`);
}

const captured = JSON.parse(readFileSync(join(sourceRoot, resultFile), "utf8"));
rmSync(join(sourceRoot, resultFile), { force: true });

mkdirSync(outDir, { recursive: true });
const byApi = {};
for (const row of captured.rows) byApi[row.api] = (byApi[row.api] ?? 0) + 1;

const index = {
  schemaVersion: 1,
  upstreamRef: REF,
  upstreamPassing: passing,
  cardsWrapped: captured.wrappedCards,
  operations: captured.rows.length,
  distinctCards: captured.distinctCards.length,
  testsWithOperations: new Set(captured.rows.map(row => row.test)).size,
  byApi
};

writeFileSync(join(outDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
writeFileSync(join(outDir, "operations.json"), JSON.stringify(captured.rows));

console.log(`upstream suite          : ${passing} passing, ${failing} failing`);
console.log(`card prototypes wrapped : ${captured.wrappedCards}`);
console.log(`root operations recorded: ${captured.rows.length}`);
console.log(`distinct cards          : ${captured.distinctCards.length}`);
console.log(`tests with an operation : ${index.testsWithOperations}`);
for (const [api, count] of Object.entries(byApi).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${api.padEnd(18)} ${count}`);
}
