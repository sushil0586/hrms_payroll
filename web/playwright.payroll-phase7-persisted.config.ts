import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/payroll-makeover-phase7-2026-10-24";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "phase5c-disposable-payroll-close-browser-flow.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 240_000,
  outputDir: `${evidence}/persisted-results`,
  reporter: [
    ["list"],
    ["json", { outputFile: `${evidence}/persisted-results.json` }],
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://127.0.0.1:3284",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
  },
});
