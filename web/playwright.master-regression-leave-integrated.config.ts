import {defineConfig} from '@playwright/test';
import base from './playwright.leave-closure-integrated.config';

export default defineConfig({
  ...base,
  use: {...base.use, baseURL: process.env.HRMS_PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3265'},
  outputDir: '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/leave-deep/integrated/results',
  reporter: [
    ['list'],
    ['json', {outputFile: '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/leave-deep/integrated/results.json'}],
  ],
});
