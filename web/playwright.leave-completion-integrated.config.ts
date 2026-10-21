import {defineConfig} from '@playwright/test';
import base from './playwright.leave-completion.config';
import path from 'node:path';
process.env.LEAVE_CLOSURE_EVIDENCE_ROOT=process.env.LEAVE_CLOSURE_EVIDENCE_ROOT ?? path.resolve(__dirname,'../docs/qa/evidence/leave-completion-phase1/integrated');
export default defineConfig({...base,testDir:'./tests/leave-blocker-closure',testMatch:'integrated.spec.ts'});
