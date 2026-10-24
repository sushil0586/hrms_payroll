import {defineConfig} from '@playwright/test';
import base from './playwright.employee-phase3.config';
export default defineConfig({...base,testDir:'./tests/employees',testMatch:'phase2.spec.ts',grep:/pointer and keyboard|detail actions/,outputDir:'../docs/qa/evidence/employee-makeover-phase3-2026-10-22/results-regression',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase3-2026-10-22/results-regression.json'}]]});
