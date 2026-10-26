import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/workflow-notification-phase2-hardening-2026-10-24";

export default defineConfig({
  testDir: "./tests/workflow-notification-makeover",
  testMatch: "phase2-workflow-hardening.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: `${evidence}/results`,
  reporter: [["list"], ["json", { outputFile: `${evidence}/results.json` }]],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: { baseURL: "http://127.0.0.1:3285", trace: "retain-on-failure", actionTimeout: 15_000 },
});
