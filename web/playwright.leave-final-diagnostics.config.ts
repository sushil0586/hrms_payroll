import {defineConfig} from '@playwright/test';
import base from './playwright.leave-final.config';
export default defineConfig({...base,testDir:'./tests/leave-final-diagnostics',testMatch:'*.spec.ts',outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-final/diagnostics/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-final/diagnostics/results.json'}]]});
