import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/organization-lifecycle",
  testMatch: "phase6-organization.spec.ts",
  grep: /guarded form create edit acknowledgement|guided partial retry|CSV stale preview pending guard|permission read dependencies/,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  outputDir: "../docs/qa/evidence/local-update-phase3a-persisted-2026-10-29/results",
  reporter: [
    ["list"],
    ["json", { outputFile: "../docs/qa/evidence/local-update-phase3a-persisted-2026-10-29/results.json" }],
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: { baseURL: "http://127.0.0.1:3278", trace: "retain-on-failure", actionTimeout: 15_000 },
});
