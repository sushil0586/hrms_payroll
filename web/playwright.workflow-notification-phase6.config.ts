import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/workflow-notification-phase6-2026-10-26";

export default defineConfig({
  testDir: "./tests/workflow-notification-makeover",
  testMatch: "phase6-joined-certification.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 240_000,
  outputDir: `${evidence}/results`,
  reporter: [["list"], ["json", { outputFile: `${evidence}/results.json` }]],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: { baseURL: "http://127.0.0.1:3285", trace: "retain-on-failure", actionTimeout: 20_000 },
});
