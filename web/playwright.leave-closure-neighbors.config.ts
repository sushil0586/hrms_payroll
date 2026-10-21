import {defineConfig} from '@playwright/test';
import base from './playwright.leave-closure.config';
import path from 'node:path';
import {mkdirSync} from 'node:fs';
process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT=path.join(process.env.LEAVE_CLOSURE_EVIDENCE_ROOT || path.resolve(__dirname,'../docs/qa/evidence/leave-blocker-closure'),'neighbors');
mkdirSync(path.join(process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT!,'balances'),{recursive:true});
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3217'},testDir:'./tests',testMatch:/\/(leave-admin|leave-balances-admin|leave-setup-admin)\/.*\.spec\.ts$/,outputDir:'../docs/qa/evidence/leave-blocker-closure/neighbors/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-blocker-closure/neighbors/results.json'}]]});
