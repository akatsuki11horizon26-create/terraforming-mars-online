// Records what playing each card does in the reference implementation itself.
//
// Every other oracle here reads upstream's tests as text and reconstructs what
// they assert. That is why 335 of their blocks came back unread: a test that
// arranges its game through helpers is not something a parser can reduce to a
// case. But the reference's own suite runs at the pinned SHA -- 1514 assertions
// in the base set in six seconds -- so its engine can simply be asked.
//
// This plays every in-scope card into a stocked game and records the resources,
// production and rating it moved. The result is a manifest our own audit
// compares against, so the comparison is against upstream's behaviour rather
// than against our reading of upstream's tests.
//
// The manifest is committed. CI has no upstream checkout, and cloning one to
// run a comparison would make every build depend on GitHub being up.
//
// Usage:
//   git clone <upstream> <dir> && git checkout <REF> && npm install
//   TM_SOURCE=<dir> node scripts/build-upstream-play-manifest.mjs
import { writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const sourceRoot = process.env.TM_SOURCE ?? "C:/Users/takkun/AppData/Local/Temp/tm-src";
const outFile = process.env.PLAY_MANIFEST_OUTPUT ?? "data/upstream-play.json";
const REF = "1b26fe6989fe53c6a2a76cfe92f08eb9228f832f";

// The probe runs inside upstream's own mocha setup, because its test harness is
// what builds a playable game; constructing one directly throws.
const probe = `
import {ALL_MODULE_MANIFESTS} from './src/server/cards/AllManifests';
import {testGame} from './tests/TestGame';
import {writeFileSync} from 'fs';

const IN_SCOPE = new Set(['base','corpera','promo','venus','colonies','turmoil','prelude','prelude2']);

const snapshot = (p) => ({
  mc: p.megaCredits, steel: p.steel, titanium: p.titanium,
  plants: p.plants, energy: p.energy, heat: p.heat,
  mcP: p.production.megacredits, steelP: p.production.steel,
  titaniumP: p.production.titanium, plantsP: p.production.plants,
  energyP: p.production.energy, heatP: p.production.heat,
  tr: p.terraformRating
});

describe('play-manifest', () => {
  it('records what each card moves', () => {
    const cards = {};
    const dropped = {};
    for (const manifest of ALL_MODULE_MANIFESTS) {
      if (!IN_SCOPE.has(manifest.module)) continue;
      for (const [name, entry] of Object.entries(manifest.projectCards ?? {})) {
        try {
          const [, player] = testGame(2);
          const card = new entry.Factory();
          const p = player;
          p.megaCredits = 100; p.steel = 20; p.titanium = 20;
          p.plants = 20; p.energy = 20; p.heat = 20;
          const before = snapshot(p);
          card.play(player);
          const after = snapshot(p);
          const delta = {};
          for (const key of Object.keys(before)) {
            const moved = after[key] - before[key];
            if (moved !== 0) delta[key] = moved;
          }
          cards[name] = { module: manifest.module, cost: card.cost ?? null, delta };
        } catch (error) {
          // Named, not swallowed: a card the probe cannot stage is a hole in
          // the oracle, and a hole nobody can see is the problem this whole
          // exercise exists to avoid.
          dropped[name] = String(error.message).slice(0, 80);
        }
      }
    }
    writeFileSync('play-manifest-out.json', JSON.stringify({ cards, dropped }));
  });
});
`;

const probeFile = join(sourceRoot, "play-manifest.spec.ts");
const resultFile = join(sourceRoot, "play-manifest-out.json");

writeFileSync(probeFile, probe);
try {
  execFileSync(
    "npx",
    ["mocha", "--import=tsx", "--require", "tests/testing/setup.ts", "play-manifest.spec.ts"],
    { cwd: sourceRoot, stdio: "pipe", shell: true }
  );
} finally {
  rmSync(probeFile, { force: true });
}

const { cards, dropped } = JSON.parse(readFileSync(resultFile, "utf8"));
rmSync(resultFile, { force: true });

writeFileSync(outFile, `${JSON.stringify({ ref: REF, cards, dropped }, null, 1)}\n`);

console.log(`cards played in the reference: ${Object.keys(cards).length}`);
console.log(`could not be staged           : ${Object.keys(dropped).length}`);
const reasons = new Map();
for (const why of Object.values(dropped)) reasons.set(why, (reasons.get(why) ?? 0) + 1);
for (const [why, count] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${String(count).padStart(3)}  ${why}`);
}
