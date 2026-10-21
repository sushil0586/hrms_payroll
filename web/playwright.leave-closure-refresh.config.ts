import {defineConfig} from '@playwright/test';
import base from './playwright.leave-closure.config';
export default defineConfig({...base,testDir:'./tests/leave-closure-refresh',outputDir:'../docs/qa/evidence/leave-blocker-closure/refresh/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-blocker-closure/refresh/results.json'}]]});
