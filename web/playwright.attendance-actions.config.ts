import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/attendance-actions",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  outputDir: "../docs/qa/evidence/attendance-actions/results",
  reporter: [["list"], ["json", { outputFile: "../docs/qa/evidence/attendance-actions/results.json" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3205",
    actionTimeout: 15_000,
    trace: "retain-on-failure",
  },
});
