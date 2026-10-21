import {defineConfig} from '@playwright/test';
import base from './playwright.leave-four.config';
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3219'},testDir:'./tests/e2e',testMatch:'dd6-ess-mss-domain-certification.spec.ts',outputDir:'../docs/qa/evidence/leave-four-workspaces/dd6/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-four-workspaces/dd6/results.json'}]]});
