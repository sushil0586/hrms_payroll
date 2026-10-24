import {defineConfig} from '@playwright/test';
import base from './playwright.employee-phase2.config';
export default defineConfig({...base,testMatch:['phase2.spec.ts','offpage.spec.ts'],grep:/pointer and keyboard|direct selection and history|detail actions|off-page/,outputDir:'../docs/qa/evidence/employee-makeover-phase2-2026-10-22/results-finalized',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase2-2026-10-22/results-finalized.json'}]]});
