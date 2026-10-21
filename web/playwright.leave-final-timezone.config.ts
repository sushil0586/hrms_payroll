import {defineConfig} from '@playwright/test';
import base from './playwright.leave-final.config';
export default defineConfig({...base,testMatch:'timezone.spec.ts',outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-final/timezones/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-final/timezones/results.json'}]]});
