import {defineConfig} from '@playwright/test';
import base from './playwright.leave-four.config';
export default defineConfig({...base,use:{...base.use,baseURL:'http://127.0.0.1:3219'},testMatch:'integrated.spec.ts',grep:/four workspaces desktop|Tenant Admin creates/,outputDir:'../docs/qa/evidence/leave-four-workspaces/followup/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-four-workspaces/followup/results.json'}]]});
