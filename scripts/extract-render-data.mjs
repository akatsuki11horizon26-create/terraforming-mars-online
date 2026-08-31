// Pulls the icon layout of every card out of the reference implementation.
//
// The catalogue generator already instantiates each upstream card and reads
// `metadata.renderData` -- and then throws all of it away, keeping only strings
// that begin with a word like "Effect" or "Gain". Everything that makes a card
// readable at a glance (which icons, how many, in what order, on which row, in
// whose production box, marked as anyone's or your own) is discarded there. So
// there has never been anything on our side to compare against upstream: the
// icons are not wrong, they do not exist.
//
// This keeps the tree. It goes in its own file rather than the catalogue: it is
// audit material with its own ref and schema, several times larger than the
// text beside it, and the browser wants a reduced form rather than all of it.
//
// The upstream sources import each other without file extensions, which Node
// will not resolve, so the whole card manifest is bundled once with esbuild and
// every card is constructed from that.
//
// Usage:
//   git clone <upstream> <dir> && git checkout <REF> && npm install
//   TM_SOURCE=<dir> node scripts/extract-render-data.mjs
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";

const sourceRoot = process.env.TM_SOURCE ?? "C:/Users/takkun/AppData/Local/Temp/tm-src";
const outFile = process.env.RENDER_DATA_OUTPUT ?? "data/upstream-render-data.json";
const scratch = process.env.RENDER_SCRATCH ?? join(process.env.TEMP ?? "/tmp", "tm-render-build");

const REF = "1b26fe6989fe53c6a2a76cfe92f08eb9228f832f";
const SCHEMA_VERSION = 1;

const GROUPS = [
  "projectCards", "corporationCards", "preludeCards",
  "ceoCards", "standardProjects", "standardActions"
];

// The builder chain has already run by the time a card is constructed, so what
// comes back is nested objects. They are normalised rather than copied: class
// names are kept as a tag, empty and undefined members are dropped, and keys
// are sorted so the same card hashes the same way on every run.
const normalise = value => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "function") return null;
  if (Array.isArray(value)) {
    const items = value.map(normalise).filter(item => item !== null);
    return items.length > 0 ? items : null;
  }
  if (typeof value !== "object") return null;

  const kind = value.constructor?.name;
  const out = {};
  for (const key of Object.keys(value).sort()) {
    const normalised = normalise(value[key]);
    if (normalised === null) continue;
    out[key] = normalised;
  }
  if (kind && kind !== "Object") out._kind = kind;
  return Object.keys(out).length > 0 ? out : null;
};

await rm(scratch, { recursive: true, force: true });
await mkdir(scratch, { recursive: true });

const entryFile = join(scratch, "all-cards-entry.ts");
const bundleFile = join(scratch, "all-cards.mjs");
await writeFile(entryFile, `export * from ${JSON.stringify(join(sourceRoot, "src/server/cards/AllManifests").replaceAll("\\", "/"))};\n`);

execFileSync(
  "npx",
  ["esbuild", entryFile, "--bundle", "--format=esm", "--platform=node", "--log-level=error", `--outfile=${bundleFile}`],
  { stdio: "inherit", shell: true }
);

const { ALL_MODULE_MANIFESTS } = await import(pathToFileURL(bundleFile).href);

const cards = {};
const dropped = [];

for (const manifest of ALL_MODULE_MANIFESTS) {
  const moduleName = manifest.module ?? "unknown";
  for (const group of GROUPS) {
    for (const [name, entry] of Object.entries(manifest[group] ?? {})) {
      let instance;
      try {
        instance = new entry.Factory();
      } catch (error) {
        // Every dropped card is named with a reason. A silent catch here is
        // what let the catalogue generator lose cards without anyone noticing.
        dropped.push([name, `construct failed: ${String(error.message).slice(0, 70)}`]);
        continue;
      }
      const render = instance?.properties?.metadata?.renderData;
      if (!render) {
        dropped.push([name, "no renderData"]);
        continue;
      }
      cards[name] = { module: moduleName, group, render: normalise(render) };
    }
  }
}

await rm(scratch, { recursive: true, force: true });

const payload = { ref: REF, schemaVersion: SCHEMA_VERSION, cards };
const compact = JSON.stringify(payload);
await writeFile(outFile, compact);

console.log(`cards with a render tree: ${Object.keys(cards).length}`);
console.log(`dropped                 : ${dropped.length}`);
console.log(`compact JSON            : ${compact.length} bytes`);
for (const [name, why] of dropped) console.log(`  ${name}: ${why}`);
