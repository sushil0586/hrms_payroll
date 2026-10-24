import {defineConfig} from '@playwright/test';
import base from './playwright.master-regression-leave-integrated.config';

export default defineConfig({
  ...base,
  projects: base.projects?.filter(project => project.name === 'chromium'),
  outputDir: '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/leave-deep/integrated/correction-results',
  reporter: [
    ['list'],
    ['json', {outputFile: '../docs/qa/evidence/leave-attendance-organization-lifecycle-regression-2026-10-23/leave-deep/integrated/correction-results.json'}],
  ],
});
