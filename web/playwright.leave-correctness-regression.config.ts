import {defineConfig} from '@playwright/test';
import base from './playwright.leave-correctness.config';
export default defineConfig({...base,testDir:'./tests/leave-correctness-regression',outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-correctness/final-regression/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-correctness/final-regression/results.json'}]]});
