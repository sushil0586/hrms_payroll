import {defineConfig} from '@playwright/test';
import base from './playwright.lifecycle-filter-navigation.config';

export default defineConfig({
  ...base,
  outputDir: '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/organization-current/navigation-results',
  reporter: [
    ['list'],
    ['json', {outputFile: '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/organization-current/navigation-results.json'}],
  ],
});
