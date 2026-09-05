import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = Number(process.env.PLAYWRIGHT_LIVE_WEB_PORT ?? 3200);
const BACKEND_PORT = Number(process.env.PLAYWRIGHT_LIVE_BACKEND_PORT ?? 8010);
const baseURL = process.env.PLAYWRIGHT_LIVE_BASE_URL ?? `http://127.0.0.1:${WEB_PORT}`;
const backendURL = process.env.PLAYWRIGHT_LIVE_BACKEND_URL ?? `http://127.0.0.1:${BACKEND_PORT}`;
const seedPassword = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const python = process.env.PLAYWRIGHT_LIVE_PYTHON ?? "../.venv/bin/python";
const databaseName = process.env.PLAYWRIGHT_LIVE_DB_NAME ?? "db.playwright.sqlite3";
const reuseExistingLiveServer = process.env.PLAYWRIGHT_LIVE_REUSE_SERVER === "true";

export default defineConfig({
  testDir: "./tests-live",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-live-report" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: [
    {
      command: `rm -f ../backend/${databaseName} && cd ../backend && ${python} manage.py migrate --noinput && ${python} manage.py bootstrap_demo_workspace --password ${seedPassword} && ${python} manage.py runserver 127.0.0.1:${BACKEND_PORT}`,
      url: `${backendURL}/health/`,
      reuseExistingServer: reuseExistingLiveServer,
      timeout: 120_000,
      env: {
        DJANGO_DB_ENGINE: "django.db.backends.sqlite3",
        POSTGRES_DB: databaseName,
      },
    },
    {
      command: `NEXT_DIST_DIR=.next/playwright-live HRMS_ENABLE_DEMO_DATA=false HRMS_API_BASE_URL=${backendURL}/api/v1 pnpm exec next dev --hostname 127.0.0.1 --port ${WEB_PORT}`,
      url: baseURL,
      reuseExistingServer: reuseExistingLiveServer,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "chromium-live",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 832 },
      },
    },
  ],
});
