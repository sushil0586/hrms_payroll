import {defineConfig} from '@playwright/test';
import base from './playwright.employee-phase4.config';
export default defineConfig({...base,grep:/new access uses/,repeatEach:3,projects:base.projects?.filter(project=>project.name==='firefox'),outputDir:'../docs/qa/evidence/employee-makeover-phase4-2026-10-22/results-probe',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase4-2026-10-22/results-probe.json'}]]});
