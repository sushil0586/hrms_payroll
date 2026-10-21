import {defineConfig} from '@playwright/test';
import base from './playwright.leave-final.config';
export default defineConfig({...base,outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-final/repeats/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-final/repeats/results.json'}]]});
