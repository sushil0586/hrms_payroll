import {defineConfig} from '@playwright/test';
import base from './playwright.ui-ux-rollout.config';
export default defineConfig({...base,testMatch:'pointer-focus.spec.ts',outputDir:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/pointer-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/pointer-results.json'}]]});
