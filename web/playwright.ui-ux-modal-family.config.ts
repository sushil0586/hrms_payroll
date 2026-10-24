import {defineConfig} from '@playwright/test';
import base from './playwright.ui-ux-rollout.config';
export default defineConfig({...base,testMatch:'modal-family.spec.ts',outputDir:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/modal-family-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/modal-family-results.json'}]]});
