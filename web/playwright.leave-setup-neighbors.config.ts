import {defineConfig} from '@playwright/test';
import base from './playwright.leave-setup.config';
export default defineConfig({...base,testDir:'./tests/leave-admin',outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-setup/neighbors/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-setup/neighbors/results.json'}]]});
