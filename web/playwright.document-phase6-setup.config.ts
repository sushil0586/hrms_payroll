import {defineConfig} from '@playwright/test';
import base from './playwright.document-phase6.config';
export default defineConfig({...base,testMatch:'phase3.spec.ts',grep:/category validation dirty|requirement validation save/,workers:1,outputDir:'../docs/qa/evidence/document-makeover-phase6-2026-10-23/setup-recheck/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/document-makeover-phase6-2026-10-23/setup-recheck/results.json'}]]});
