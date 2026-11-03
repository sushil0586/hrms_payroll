import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/attendance-setup-actions",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  outputDir: "../docs/qa/evidence/attendance-setup-actions/results",
  reporter: [["list"], ["json", { outputFile: "../docs/qa/evidence/attendance-setup-actions/results.json" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3206",
    actionTimeout: 15_000,
    trace: "retain-on-failure",
  },
});
