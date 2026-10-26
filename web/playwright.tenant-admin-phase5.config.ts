import { defineConfig, devices } from "@playwright/test";

const evidence = "../docs/qa/evidence/tenant-admin-makeover-phase5-2026-10-26";

export default defineConfig({
  testDir: "./tests/tenant-admin-makeover",
  testMatch: "phase5-security-support-trust-governance.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 300_000,
  outputDir: `${evidence}/results`,
  reporter: [["list"], ["json", { outputFile: `${evidence}/results.json` }]],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: { baseURL: "http://localhost:3296", trace: "retain-on-failure", actionTimeout: 20_000 },
});
