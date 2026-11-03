import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/document-makeover",
  testMatch: "phase7.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: "../docs/qa/evidence/document-lifecycle-phase7-2026-11-03/results",
  reporter: [["list"], ["json", { outputFile: "../docs/qa/evidence/document-lifecycle-phase7-2026-11-03/results.json" }]],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: { baseURL: "http://localhost:3273", trace: "retain-on-failure", screenshot: "only-on-failure", actionTimeout: 15_000 },
});
