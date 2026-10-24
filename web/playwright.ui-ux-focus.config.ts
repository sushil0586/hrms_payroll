import {defineConfig} from '@playwright/test';
import base from './playwright.ui-ux-rollout.config';
export default defineConfig({...base,testMatch:['attendance.spec.ts','dialogs.spec.ts','dynamic.spec.ts'],timeout:240000,outputDir:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/focus-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/focus-results.json'}]]});
