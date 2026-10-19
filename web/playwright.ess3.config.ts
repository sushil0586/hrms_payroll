import { defineConfig, devices } from "@playwright/test";

// Dedicated production-server certification; never launches a demo/dev server.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "ess3-leave-certification.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  maxFailures: 1,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  outputDir: process.env.HRMS_CERT_EVIDENCE_DIR ? "test-results/ess3" : "test-results/ess3",
  reporter: [["list"], ["html", { open: "never", outputFolder: process.env.HRMS_CERT_EVIDENCE_DIR ? "playwright-report/ess3" : "playwright-report/ess3" }], ["json", { outputFile: process.env.HRMS_CERT_EVIDENCE_DIR ? `${process.env.HRMS_CERT_EVIDENCE_DIR}/browser-results.json` : "../docs/qa/evidence/ess3-leave/browser-results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:3169",
    trace: "retain-on-failure",
    timezoneId: "Asia/Tokyo",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
});
