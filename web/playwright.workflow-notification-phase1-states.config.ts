import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/workflow-notification-phase1-2026-10-24";

export default defineConfig({
  testDir: "./tests/workflow-notification-makeover",
  testMatch: "phase1-states.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: `${evidence}/state-results`,
  reporter: [["list"], ["json", { outputFile: `${evidence}/state-results.json` }]],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://127.0.0.1:3285", trace: "retain-on-failure", actionTimeout: 15_000 },
});
