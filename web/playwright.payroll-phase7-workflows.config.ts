import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/payroll-makeover-phase7-2026-10-24";

export default defineConfig({
  testDir: "./tests",
  testMatch: [
    "payroll-makeover/phase3-transition-recovery.spec.ts",
    "e2e/phase4-action-recovery.spec.ts",
    "e2e/dd5-payroll-adjustment-integrity.spec.ts",
    "e2e/dd1-employee-lifecycle-fnf.spec.ts",
    "e2e/phase5-provider-action-recovery.spec.ts",
  ],
  workers: 1,
  retries: 0,
  timeout: 240_000,
  outputDir: `${evidence}/workflow-results`,
  reporter: [
    ["list"],
    ["json", { outputFile: `${evidence}/workflow-results.json` }],
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  use: {
    baseURL: "http://127.0.0.1:3284",
    trace: "retain-on-failure",
    actionTimeout: 15_000,
  },
});
