import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/tenant-admin-makeover-phase3-2026-10-26";

export default defineConfig({
  testDir: "./tests/tenant-admin-makeover",
  testMatch: "phase3-setup-settings-plan.spec.ts",
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
  use: {
    baseURL: "http://localhost:3295",
    trace: "retain-on-failure",
    actionTimeout: 20_000,
  },
});
