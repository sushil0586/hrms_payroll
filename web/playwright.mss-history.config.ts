import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/mss-decision-history",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3295",
    trace: "retain-on-failure",
    actionTimeout: 20_000,
  },
});
