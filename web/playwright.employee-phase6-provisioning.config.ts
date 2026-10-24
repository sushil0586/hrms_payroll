import {defineConfig} from '@playwright/test';
import base from './playwright.employee-phase6.config';
export default defineConfig({...base,projects:base.projects?.map(project=>({...project,grep:project.name==='webkit'?/inactive provisioning follow-up|cross-screen responsive/:/inactive provisioning follow-up/})),outputDir:'../docs/qa/evidence/employee-makeover-phase6-2026-10-22/results-provisioning',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/employee-makeover-phase6-2026-10-22/results-provisioning.json'}]],use:{...base.use,trace:'off',screenshot:'only-on-failure'}});
