import {defineConfig} from '@playwright/test';
import base from './playwright.employee-phase4.config';
export default defineConfig({...base,testMatch:'phase4-regression.spec.ts',outputDir:'../docs/qa/evidence/employee-makeover-phase4-2026-10-22/results-regression',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase4-2026-10-22/results-regression.json'}]]});
