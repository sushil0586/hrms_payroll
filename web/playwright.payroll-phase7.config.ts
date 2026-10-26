import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/payroll-makeover-phase7-2026-10-24";

export default defineConfig({
  testDir: "./tests/payroll-makeover",
  testMatch: "phase7-readonly-closure.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: `${evidence}/results`,
  reporter: [["list"], ["json", { outputFile: `${evidence}/results.json` }]],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: {
    baseURL: "http://localhost:3284",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
  },
});
