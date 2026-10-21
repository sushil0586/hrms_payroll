import {defineConfig} from '@playwright/test';
import base from './playwright.leave-final.config';
export default defineConfig({...base,testMatch:'assignment-lifetime.spec.ts',outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-final/lifetime/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-final/lifetime/results.json'}]]});
