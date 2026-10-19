import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["accerio-foundation.spec.ts", "user-journey-phase4-manager-workflow.spec.ts"],
  workers: 1, retries: 0, timeout: 90_000,
  expect: { timeout: 15_000 },
  outputDir: "test-results/accerio-foundation",
  reporter: [["list"], ["json", { outputFile: "../docs/qa/evidence/accerio-design-system/foundation-results.json" }]],
  use: { baseURL: "http://127.0.0.1:3159", screenshot: "only-on-failure", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: devices["Desktop Chrome"] },
    { name: "firefox", use: devices["Desktop Firefox"] },
    { name: "webkit", use: devices["Desktop Safari"] },
  ],
});
