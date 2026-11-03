import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/employee-makeover",
  testMatch: "interaction-contract.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    actionTimeout: 15_000,
    baseURL: "http://127.0.0.1:3271",
    trace: "retain-on-failure",
  },
});
