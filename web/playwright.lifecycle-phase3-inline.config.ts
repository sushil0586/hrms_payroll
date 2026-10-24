import {defineConfig} from '@playwright/test';
import base from './playwright.lifecycle-phase3.config';
export default defineConfig({...base,testMatch:'phase3-inline.spec.ts',outputDir:'../docs/qa/evidence/organization-lifecycle-phase3-2026-10-23/inline-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/organization-lifecycle-phase3-2026-10-23/inline-results.json'}]]});
