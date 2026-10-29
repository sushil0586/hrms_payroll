import { defineConfig, devices } from "@playwright/test";

const shard = process.env.PHASE3B_SHARD ? `-${process.env.PHASE3B_SHARD}` : "";

export default defineConfig({
  testDir: "./tests/organization-lifecycle",
  testMatch: /phase6-(lifecycle|movement|exit)\.spec\.ts/,
  grep: /independent off-filter off-page record selection and tenant boundaries|onboarding validation template work items persistence|probation extension and confirmation|standalone unknown outcomes retain drafts|bulk owner confirmed count|existing lifecycle permission policy|bulk decision reports the requested scope|mixed owner groups retain confirmed earlier writes|all relationship fields preserve source evidence|pending guards one real create|known and unconfirmed saves retain draft|draft edit retains timeline flags|one pending create disables fields|chronology and uncertain outcomes retain focused drafts/,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  expect: { timeout: 15_000 },
  outputDir: `../docs/qa/evidence/local-update-phase3b-persisted-2026-10-29/results${shard}`,
  reporter: [
    ["list"],
    ["json", { outputFile: `../docs/qa/evidence/local-update-phase3b-persisted-2026-10-29/results${shard}.json` }],
  ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  use: { baseURL: "http://127.0.0.1:3278", trace: "retain-on-failure", actionTimeout: 15_000 },
});
