import { defineConfig, devices } from "@playwright/test";

// Dedicated production-server certification; never launches a demo/dev server.
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "ess1-dashboard-profile-certification.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  outputDir: process.env.HRMS_CERT_EVIDENCE_DIR ? "test-results/accerio-ess1" : "test-results/ess1",
  reporter: [["list"], ["html", { open: "never", outputFolder: process.env.HRMS_CERT_EVIDENCE_DIR ? "playwright-report/accerio-ess1" : "playwright-report/ess1" }], ["json", { outputFile: process.env.HRMS_CERT_EVIDENCE_DIR ? `${process.env.HRMS_CERT_EVIDENCE_DIR}/browser-results.json` : "../docs/qa/evidence/ess1-dashboard-profile/browser-results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:3139",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
