import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/payroll-makeover-phase2-2026-10-24";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: [
    "payroll-setup-flows.spec.ts",
    "salary-setup-flows.spec.ts",
    "payroll-statutory-flows.spec.ts",
    "payroll-rules-flows.spec.ts",
  ],
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: `${evidence}/workflow-results`,
  reporter: [["list"], ["json", { outputFile: `${evidence}/workflow-results.json` }]],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://127.0.0.1:3280",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
  },
});
