import {defineConfig} from '@playwright/test';
import base from './playwright.employee-phase2.config';
export default defineConfig({...base,outputDir:'../docs/qa/evidence/employee-makeover-phase2-2026-10-22/results-final',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase2-2026-10-22/results-final.json'}]]});
