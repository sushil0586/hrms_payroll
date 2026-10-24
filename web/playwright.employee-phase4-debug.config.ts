import {defineConfig} from '@playwright/test';
import base from './playwright.employee-phase4.config';
export default defineConfig({...base,grep:/new access uses/,projects:base.projects?.filter(project=>project.name==='firefox'),use:{...base.use,baseURL:'http://127.0.0.1:3268'},outputDir:'../docs/qa/evidence/employee-makeover-phase4-2026-10-22/results-debug',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase4-2026-10-22/results-debug.json'}]]});
