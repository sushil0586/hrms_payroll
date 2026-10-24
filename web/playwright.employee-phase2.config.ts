import {defineConfig} from '@playwright/test';
import base from './playwright.employees.config';
export default defineConfig({...base,testMatch:['directory.spec.ts','phase2.spec.ts'],use:{...base.use,baseURL:'http://127.0.0.1:3265'},outputDir:'../docs/qa/evidence/employee-makeover-phase2-2026-10-22/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase2-2026-10-22/results.json'}]]});
