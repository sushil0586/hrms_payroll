import {defineConfig} from '@playwright/test';
import base from './playwright.lifecycle-filters.config';
export default defineConfig({...base,testMatch:'filter-navigation.spec.ts',outputDir:'../docs/qa/evidence/organization-lifecycle-filter-audit-2026-10-23/navigation-results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/organization-lifecycle-filter-audit-2026-10-23/navigation-results.json'}]]});
