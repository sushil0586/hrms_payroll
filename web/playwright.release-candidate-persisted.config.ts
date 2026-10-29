import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  outputDir: "../docs/qa/evidence/release-candidate-persisted-2026-10-29/results",
  reporter: [
    ["list"],
    ["json", { outputFile: "../docs/qa/evidence/release-candidate-persisted-2026-10-29/results.json" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:3309",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
