import {defineConfig} from '@playwright/test';
import base from './playwright.leave-closure-neighbors.config';
export default defineConfig({...base,testDir:'./tests/leave-setup-admin',testMatch:'setup.spec.ts',grep:/type create, validation/,use:{...base.use,baseURL:'http://127.0.0.1:3220'},outputDir:'../docs/qa/evidence/leave-blocker-closure/firefox-diagnostic/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-blocker-closure/firefox-diagnostic/results.json'}]]});
