import {defineConfig} from '@playwright/test';
import base from './playwright.ui-ux-rollout.config';
export default defineConfig({...base,testMatch:['attendance.spec.ts','dialogs.spec.ts','modal-family.spec.ts','public-support.spec.ts','section-labels.spec.ts','errors.spec.ts'],testIgnore:[],use:{...base.use,baseURL:'http://127.0.0.1:3263'},outputDir:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/closure-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/closure-results.json'}]]});
