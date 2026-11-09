import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/employee-makeover",
  testMatch: ["phase4.spec.ts", "el1f.spec.ts"],
  workers: 1,
  retries: 0,
  timeout: 120_000,
  outputDir: "../docs/qa/evidence/employee-el1f-2026-11-05/results",
  reporter: [
    ["list"],
    ["json", { outputFile: "../docs/qa/evidence/employee-el1f-2026-11-05/results.json" }],
  ],
  use: {
    baseURL: "http://localhost:3266",
    trace: "on",
    actionTimeout: 15_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
