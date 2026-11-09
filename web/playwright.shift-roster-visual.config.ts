import { defineConfig, devices } from "@playwright/test";

const baseUse = {
  baseURL: "http://127.0.0.1:3212",
  actionTimeout: 15_000,
  trace: "retain-on-failure" as const,
  screenshot: "only-on-failure" as const,
};

export default defineConfig({
  testDir: "./tests/shift-roster-visual",
  testMatch: "*.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 180_000,
  outputDir: "../docs/qa/evidence/shift-roster-phase1/results",
  reporter: [
    ["list"],
    ["json", { outputFile: "../docs/qa/evidence/shift-roster-phase1/results.json" }],
  ],
  projects: [
    { name: "chromium-desktop", use: { ...baseUse, ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } },
    { name: "firefox-desktop", use: { ...baseUse, ...devices["Desktop Firefox"], viewport: { width: 1920, height: 1080 } } },
    { name: "webkit-desktop", use: { ...baseUse, ...devices["Desktop Safari"], viewport: { width: 1920, height: 1080 } } },
    { name: "chromium-laptop", use: { ...baseUse, ...devices["Desktop Chrome"], viewport: { width: 1366, height: 768 } } },
    { name: "chromium-tablet", use: { ...baseUse, ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "chromium-mobile", use: { ...baseUse, ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "chromium-small-mobile", use: { ...baseUse, ...devices["Desktop Chrome"], viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
  ],
});
