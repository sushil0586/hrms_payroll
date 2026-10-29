import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/document-makeover",
  testMatch: /phase[24]\.spec\.ts/,
  grep: /pending replacement persists lineage|automatic acceptance truthful receipt|permission-only roles have stable denied destinations|expiry reminder has a scoped receipt/,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  outputDir: "../docs/qa/evidence/local-update-phase3c-persisted-2026-10-29/authorization-results",
  reporter: [
    ["list"],
    ["json", { outputFile: "../docs/qa/evidence/local-update-phase3c-persisted-2026-10-29/authorization-results.json" }],
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
