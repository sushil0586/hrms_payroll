import {defineConfig} from '@playwright/test';
import base from './playwright.leave-phase2.config';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
for(const dir of ['balances','applications','setup']) mkdirSync(path.join(process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT!,dir),{recursive:true});
export default defineConfig({...base,testDir:'./tests',timeout:180000,testMatch:/\/(leave-completion|leave-admin|leave-balances-admin|leave-setup-admin|leave-feedback)\/.*\.spec\.ts$|\/leave-blocker-closure\/integrated\.spec\.ts$/});
