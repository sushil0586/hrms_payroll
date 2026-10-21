import {defineConfig} from '@playwright/test';
import base from './playwright.leave-final-lifetime.config';
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3207'},outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-final/lifetime-before/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-final/lifetime-before/results.json'}]]});
