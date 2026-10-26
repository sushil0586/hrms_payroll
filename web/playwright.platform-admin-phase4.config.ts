import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/platform-admin-makeover-phase4-2026-10-26";

export default defineConfig({
  testDir: "./tests/platform-admin-makeover",
  testMatch: "phase4-templates-permissions.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 600_000,
  outputDir: `${evidence}/results`,
  reporter: [["list"], ["json", { outputFile: `${evidence}/results.json` }]],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: { baseURL: "http://localhost:3300", trace: "retain-on-failure", actionTimeout: 20_000 },
});
