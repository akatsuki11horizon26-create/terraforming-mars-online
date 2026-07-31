import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const clientDirectory = resolve(root, "dist", "client");
const outputDirectory = resolve(root, "static-dist");
const basePath = (process.env.BASE_PATH ?? "").replace(/\/+$/, "");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const worker = (await import(`${pathToFileURL(resolve(root, "dist", "server", "index.js")).href}?static=${Date.now()}`)).default;
const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);

if (!response.ok) {
  throw new Error(`Static export render failed with status ${response.status}`);
}

let html = await response.text();
html = html.replace(
  /url\([^)]*\.vinext\/fonts\/([^)'\"]+)\)/g,
  "url(/assets/_vinext_fonts/$1)",
);
if (basePath) {
  html = html.replace(/([\"'(])\/(assets|favicon\.svg)/g, `$1${basePath}/$2`);
}

await writeFile(resolve(outputDirectory, "index.html"), html);
await writeFile(resolve(outputDirectory, "404.html"), html);
await writeFile(resolve(outputDirectory, ".nojekyll"), "");
await cp(clientDirectory, outputDirectory, { recursive: true });
