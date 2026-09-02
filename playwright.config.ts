import { defineConfig, devices } from "@playwright/test";

// E2E covers what the other rigs structurally cannot see: a button that never
// mounts, a modal that swallows the click, a value the engine computed and the
// DOM never showed. Whole-game synchronisation stays with the WebSocket driver
// in scripts/, and per-card arithmetic stays with the audits.
const PORT = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "./tests/e2e",
  // A flaky pass is not a pass. Locally nothing is retried so a flake is seen;
  // on CI two retries absorb runner noise and the report still records it.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: Boolean(process.env.CI),
  timeout: process.env.CI ? 30_000 : 15_000,
  expect: { timeout: 7_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 5_000,
    // The global parameter readouts count up over several frames; freezing the
    // animation makes the assertion about the value, not about the timing.
    reducedMotion: "reduce",
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  projects: [
    {
      name: "pages-static",
      // The board is a fixed-size hex grid inside the page; a small viewport
      // pushes its lower rows under other panels and the click never lands.
      use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 1200 } }
    }
  ],
  webServer: {
    command: "node scripts/serve-static.mjs",
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { E2E_PORT: String(PORT) }
  }
});
