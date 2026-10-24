import {defineConfig} from '@playwright/test';
import base from './playwright.employee-phase3.config';
export default defineConfig({...base,grep:/responsive four-step/,outputDir:'../docs/qa/evidence/employee-makeover-phase3-2026-10-22/results-footer',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase3-2026-10-22/results-footer.json'}]]});
