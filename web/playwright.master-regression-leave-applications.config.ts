import {defineConfig, devices} from '@playwright/test';

const evidence = '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/leave-deep/applications';

export default defineConfig({
  testDir: './tests/leave-admin',
  workers: 1,
  retries: 0,
  timeout: 120_000,
  outputDir: `${evidence}/results`,
  reporter: [
    ['list'],
    ['json', {outputFile: `${evidence}/results.json`}],
  ],
  use: {
    baseURL: process.env.HRMS_PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3264',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
  },
  projects: ['chromium', 'firefox', 'webkit'].map((name) => ({
    name,
    use: {...devices[name === 'chromium' ? 'Desktop Chrome' : name === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari']},
  })),
});
