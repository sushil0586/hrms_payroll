import {defineConfig} from '@playwright/test';
import base from './playwright.leave-final.config';
import path from 'node:path';
process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT=path.resolve(__dirname,'../docs/qa/evidence/hr-admin-standardization/leave-final/neighbors');
export default defineConfig({...base,testDir:'./tests',testMatch:/\/(leave-admin|leave-balances-admin|leave-setup-admin)\/.*\.spec\.ts$/,outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-final/neighbors/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-final/neighbors/results.json'}]]});
