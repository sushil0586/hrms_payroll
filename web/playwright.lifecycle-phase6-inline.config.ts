import {defineConfig} from '@playwright/test';
import base from './playwright.lifecycle-phase6.config';
export default defineConfig({...base,testMatch:'phase6-inline.spec.ts',outputDir:'../docs/qa/evidence/organization-lifecycle-phase6-2026-10-23/artifacts/inline-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/organization-lifecycle-phase6-2026-10-23/artifacts/inline-results.json'}]]});
