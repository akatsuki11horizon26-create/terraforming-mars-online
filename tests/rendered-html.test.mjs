import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const templateRoot = new URL("../", import.meta.url);
const previewRoot = new URL("../app/_sites-preview/", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Mars Frontier game page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.match(html, /<title>MARS FRONTIER — 火星開拓戦略ゲーム<\/title>/i);
  assert.match(html, /MARS FRONTIER/);
  assert.match(html, /火星開拓戦略制御システム/);

  // The app opens on the title screen, so that is what the server renders.
  assert.match(html, /ソロプレイ/);
  assert.match(html, /ロボット戦/);
  assert.match(html, /オンライン対戦/);
  assert.match(html, /公式ルール準拠・非公式ファンメイド/);
});

test("verifies that loading skeleton is deleted and dependencies are absent", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("app/page.tsx", templateRoot), "utf8"),
    readFile(new URL("app/layout.tsx", templateRoot), "utf8"),
    readFile(new URL("package.json", templateRoot), "utf8"),
  ]);

  assert.doesNotMatch(page, /SkeletonPreview/);
  assert.doesNotMatch(page, /codex-preview/);
  assert.doesNotMatch(layout, /codex-preview/);
  assert.doesNotMatch(layout, /_sites-preview/);
  assert.doesNotMatch(packageJson, /"react-loading-skeleton"/);

  await assert.rejects(
    access(previewRoot),
    "The directory app/_sites-preview should be deleted"
  );
});
