import {defineConfig} from '@playwright/test';
import base from './playwright.leave-closure.config';
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3217'},testDir:'./tests/e2e',testMatch:'dd6-ess-mss-domain-certification.spec.ts',outputDir:'../docs/qa/evidence/leave-blocker-closure/dd6/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-blocker-closure/dd6/results.json'}]]});
