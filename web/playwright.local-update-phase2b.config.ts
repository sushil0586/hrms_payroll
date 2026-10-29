import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3148);
const baseURL = `http://127.0.0.1:${port}`;
const nextDistDir = process.env.NEXT_DIST_DIR ?? ".next/playwright-local-update-phase2b";

export default defineConfig({
  testDir: "./tests/local-update-phase2b", fullyParallel: false, workers: 1, retries: 0, timeout: 75_000, reporter: [["list"]],
  use: { baseURL, screenshot: "only-on-failure", trace: "retain-on-failure", video: "retain-on-failure" },
  webServer: { command: `NEXT_DIST_DIR=${nextDistDir} pnpm exec next dev --hostname 127.0.0.1 --port ${port}`, url: baseURL, reuseExistingServer: false, timeout: 120_000, env: { HRMS_ENABLE_DEMO_DATA: "true", HRMS_API_BASE_URL: "" } },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 832 } } },
    { name: "firefox", use: { ...devices["Desktop Firefox"], viewport: { width: 1280, height: 832 } } },
    { name: "webkit", use: { ...devices["Desktop Safari"], viewport: { width: 1280, height: 832 } } },
  ],
});
