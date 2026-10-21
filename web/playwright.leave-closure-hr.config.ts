import {defineConfig} from '@playwright/test';
import base from './playwright.leave-closure.config';
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3217'},testMatch:/hr-.*\.spec\.ts$/,outputDir:'../docs/qa/evidence/leave-blocker-closure/hr/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-blocker-closure/hr/results.json'}]]});
