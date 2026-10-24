import {defineConfig} from '@playwright/test';
import base from './playwright.ui-ux-rollout.config';
export default defineConfig({...base,testMatch:'public-support.spec.ts',outputDir:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/public-support-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/public-support-results.json'}]]});
