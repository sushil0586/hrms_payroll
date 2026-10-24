import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ui-ux-rollout', testIgnore: 'errors.spec.ts', workers: 1, retries: 0, timeout: 120000,
  outputDir: '../docs/qa/evidence/ui-ux-rollout-2026-10-22/release-results',
  reporter: [['list'], ['json', {outputFile: '../docs/qa/evidence/ui-ux-rollout-2026-10-22/release-results.json'}]],
  use: {baseURL: 'http://127.0.0.1:3262', trace: 'on', actionTimeout: 15000},
  projects: ['chromium','firefox','webkit'].map(name => ({name, use: {...devices[name === 'chromium' ? 'Desktop Chrome' : name === 'firefox' ? 'Desktop Firefox' : 'Desktop Safari']}})),
});
