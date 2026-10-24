import {defineConfig, devices} from '@playwright/test';

const evidence = '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23';

export default defineConfig({
  testDir: './tests/master-regression',
  testMatch: 'leave-ui.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: {timeout: 20_000},
  outputDir: `${evidence}/leave-results`,
  reporter: [['list'], ['json', {outputFile: `${evidence}/leave-results.json`}]],
  use: {baseURL: 'http://127.0.0.1:3262', trace: 'on', actionTimeout: 15_000},
  projects: ['chromium', 'firefox', 'webkit'].map((name) => ({
    name,
    use: {...devices[name === 'chromium' ? 'Desktop Chrome' : name === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari']},
  })),
});
