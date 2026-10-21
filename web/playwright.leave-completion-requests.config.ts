import {defineConfig} from '@playwright/test';
import base from './playwright.leave-completion.config';
import path from 'node:path';
import {mkdirSync} from 'node:fs';
process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT=process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT ?? path.resolve(__dirname,'../docs/qa/evidence/leave-completion-phase1/neighbors');
for (const dir of ['balances','applications','setup']) mkdirSync(path.join(process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT,dir),{recursive:true});
export default defineConfig({...base,testDir:'./tests',testMatch:/\/leave-admin\/requests\.spec\.ts$/});
