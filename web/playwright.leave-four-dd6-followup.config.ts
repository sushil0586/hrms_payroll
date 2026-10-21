import {defineConfig} from '@playwright/test';
import base from './playwright.leave-four-dd6.config';
export default defineConfig({...base,outputDir:'../docs/qa/evidence/leave-four-workspaces/dd6-followup/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-four-workspaces/dd6-followup/results.json'}]]});
