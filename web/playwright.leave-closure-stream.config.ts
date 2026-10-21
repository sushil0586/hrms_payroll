import {defineConfig} from '@playwright/test';
import base from './playwright.leave-closure.config';
export default defineConfig({...base,testDir:'./tests/leave-closure-stream',outputDir:'../docs/qa/evidence/leave-blocker-closure/stream/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/leave-blocker-closure/stream/results.json'}]]});
