import {defineConfig} from '@playwright/test';
import base from './playwright.leave-four.config';
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3219'},testMatch:'integrated.spec.ts',outputDir:'../docs/qa/evidence/leave-four-workspaces/integrated/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-four-workspaces/integrated/results.json'}]]});
