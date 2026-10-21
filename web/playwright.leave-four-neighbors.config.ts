import {defineConfig} from '@playwright/test';
import base from './playwright.leave-four.config';
import path from 'node:path';
process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT=path.resolve(__dirname,'../docs/qa/evidence/leave-four-workspaces/neighbors');
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3219'},testDir:'./tests',testMatch:/\/(leave-admin|leave-balances-admin|leave-setup-admin)\/.*\.spec\.ts$/,outputDir:'../docs/qa/evidence/leave-four-workspaces/neighbors/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-four-workspaces/neighbors/results.json'}]]});
