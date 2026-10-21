import {defineConfig} from '@playwright/test';
import base from './playwright.leave-correctness.config';
export default defineConfig({...base,testDir:'./tests/leave-correctness-diagnostics',outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-correctness/diagnostics/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-correctness/diagnostics/results.json'}]]});
