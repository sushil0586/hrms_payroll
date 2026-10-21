import {defineConfig} from '@playwright/test';
import base from './playwright.leave-final.config';
import path from 'node:path';
process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT=path.resolve(__dirname,'../docs/qa/evidence/hr-admin-standardization/leave-final/diagnostics/hydration');
export default defineConfig({...base,testDir:'./tests/leave-setup-admin',testMatch:'setup.spec.ts',timeout:180000,use:{...base.use,baseURL:'http://127.0.0.1:3206'},outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-final/diagnostics/hydration/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-final/diagnostics/hydration/results.json'}]]});
