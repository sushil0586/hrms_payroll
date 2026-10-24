import {defineConfig} from '@playwright/test';
import base from './playwright.lifecycle-phase6.config';

export default defineConfig({
  ...base,
  outputDir: '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/organization-current/webkit-results',
  reporter: [
    ['list'],
    ['json', {outputFile: '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/organization-current/webkit-results.json'}],
  ],
  projects: base.projects?.filter((project) => project.name === 'webkit'),
});
