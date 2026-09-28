import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const nextDistDir = process.env.NEXT_DIST_DIR ?? ".next/playwright";
const webServerEnv: Record<string, string> = {
  HRMS_ENABLE_DEMO_DATA: process.env.HRMS_ENABLE_DEMO_DATA ?? "true",
};

if (process.env.HRMS_API_BASE_URL) {
  webServerEnv.HRMS_API_BASE_URL = process.env.HRMS_API_BASE_URL;
}

if (process.env.HRMS_API_BEARER_TOKEN) {
  webServerEnv.HRMS_API_BEARER_TOKEN = process.env.HRMS_API_BEARER_TOKEN;
}

export default defineConfig({
  testDir: "./tests",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixels: 120,
    },
  },
  webServer: {
    command: `NEXT_DIST_DIR=${nextDistDir} pnpm exec next dev --hostname 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: webServerEnv,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 832 },
      },
    },
  ],
});
