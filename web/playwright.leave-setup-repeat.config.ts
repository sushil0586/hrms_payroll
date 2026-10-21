import {defineConfig} from '@playwright/test';
import base from './playwright.leave-setup.config';
export default defineConfig({...base,repeatEach:3,grep:/neighboring Leave review/,projects:base.projects?.filter(project=>project.name==='webkit'),outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-setup/repeats',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-setup/repeats.json'}]]});
