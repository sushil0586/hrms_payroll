import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/attendance-reports-actions",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  outputDir: "../docs/qa/evidence/attendance-reports-actions/results",
  reporter: [["list"], ["json", { outputFile: "../docs/qa/evidence/attendance-reports-actions/results.json" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3211",
    actionTimeout: 15_000,
    trace: "retain-on-failure",
  },
});
