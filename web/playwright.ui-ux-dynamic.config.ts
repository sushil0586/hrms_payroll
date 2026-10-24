import {defineConfig} from '@playwright/test';
import base from './playwright.ui-ux-rollout.config';
export default defineConfig({...base,testMatch:'dynamic.spec.ts',timeout:240000,outputDir:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/dynamic-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/ui-ux-rollout-2026-10-22/dynamic-results.json'}]]});
