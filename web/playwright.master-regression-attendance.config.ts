import {defineConfig, devices} from '@playwright/test';

const evidence = '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23';

export default defineConfig({
  testDir: './tests/ui-ux-rollout',
  testMatch: 'attendance.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 120_000,
  outputDir: `${evidence}/attendance-results`,
  reporter: [
    ['list'],
    ['json', {outputFile: `${evidence}/attendance-results.json`}],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3262',
    trace: 'on',
    actionTimeout: 15_000,
  },
  projects: ['chromium', 'firefox', 'webkit'].map((name) => ({
    name,
    use: {...devices[name === 'chromium' ? 'Desktop Chrome' : name === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari']},
  })),
});
