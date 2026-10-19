import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "ess5-requests-notifications-settings.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  outputDir: "test-results/ess5",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile: `${process.env.HRMS_CERT_EVIDENCE_DIR || "../docs/qa/evidence/ess5-requests-notifications-settings"}/browser-results.json`,
      },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:3189",
    trace: "on",
    screenshot: "only-on-failure",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
