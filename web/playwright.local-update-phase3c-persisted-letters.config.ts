import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/document-makeover",
  testMatch: "phase5.spec.ts",
  grep: /preview validation stale draft|generation uncertainty retains draft/,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: "../docs/qa/evidence/local-update-phase3c-persisted-2026-10-29/letter-results",
  reporter: [
    ["list"],
    ["json", { outputFile: "../docs/qa/evidence/local-update-phase3c-persisted-2026-10-29/letter-results.json" }],
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: {
    baseURL: "http://127.0.0.1:3273",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
  },
});
