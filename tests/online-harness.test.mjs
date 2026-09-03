import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { createOnlineRun } from "../scripts/online-harness.mjs";

const SCRIPTS = join(import.meta.dirname, "..", "scripts");

function roomDrivers() {
  return readdirSync(SCRIPTS)
    .filter(name => name.endsWith(".mjs") && name !== "online-harness.mjs")
    .map(name => ({ name, source: readFileSync(join(SCRIPTS, name), "utf8") }))
    .filter(({ source }) => /new\s+WebSocket\s*\(/.test(source));
}

test("room drivers can only obtain codes and URLs from the online harness", () => {
  const drivers = roomDrivers();
  assert.ok(drivers.length >= 2, `expected at least two room drivers, found ${drivers.length}`);

  for (const { name, source } of drivers) {
    assert.match(
      source,
      /import\s*\{[^}]*\bcreateOnlineRun\b[^}]*\}\s*from\s*["']\.\/online-harness\.mjs["']/,
      `${name} must import createOnlineRun from online-harness.mjs`
    );
    assert.match(
      source,
      /\bcreateOnlineRun\s*\(/,
      `${name} must obtain its room code from createOnlineRun()`
    );
    assert.match(
      source,
      /\.webSocketUrl\s*\(/,
      `${name} must build room WebSocket URLs through the online harness`
    );
    assert.doesNotMatch(
      source,
      /\/api\/room\//,
      `${name} constructs a room URL directly instead of using the online harness`
    );
  }
});

test("generated room codes use the server's canonical generator", () => {
  const run = createOnlineRun({ random: () => 0 });
  assert.equal(run.code, "AAAAA");
});

test("codes changed or truncated by the server are refused", () => {
  assert.throws(() => createOnlineRun({ code: "TMTL7V2EW" }), /server normalisation: TMTL7/);
  assert.throws(() => createOnlineRun({ code: "abcde" }), /server normalisation: ABCDE/);
  assert.throws(() => createOnlineRun({ code: "ABCD" }), /five-character room code/);
});

test("the harness refuses to issue the same room twice in one process", () => {
  createOnlineRun({ code: "ABCDE" });
  assert.throws(
    () => createOnlineRun({ code: "ABCDE" }),
    /already issued.*independent trials need distinct rooms/
  );
});

test("the harness owns room WebSocket URL construction", () => {
  const run = createOnlineRun({ code: "FGHJK", base: "ws://localhost:3001" });
  assert.equal(
    run.webSocketUrl("seat/A", "再接続 A"),
    "ws://localhost:3001/api/room/FGHJK/ws?playerId=seat%2FA&name=%E5%86%8D%E6%8E%A5%E7%B6%9A+A"
  );
});
