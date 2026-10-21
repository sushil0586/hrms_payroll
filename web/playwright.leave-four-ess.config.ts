import {defineConfig} from '@playwright/test';
import base from './playwright.leave-four.config';
export default defineConfig({...base,testDir:'./tests/e2e',testMatch:'ess3-leave-certification.spec.ts',use:{...base.use,baseURL:'http://127.0.0.1:3216'},outputDir:'../docs/qa/evidence/leave-four-workspaces/ess/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-four-workspaces/ess/results.json'}]]});
