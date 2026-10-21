import {defineConfig} from '@playwright/test';
import base from './playwright.leave-final-neighbors.config';
import path from 'node:path';
process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT=path.resolve(__dirname,'../docs/qa/evidence/hr-admin-standardization/leave-final/repeats-neighbors/fixtures');
export default defineConfig({...base,projects:base.projects?.filter(project=>['chromium','webkit'].includes(project.name!)).map(project=>({...project,grep:project.name==='chromium'?/type create, validation/:/assignment effective dates|neighboring Leave review/})),testDir:'./tests/leave-setup-admin',testMatch:'setup.spec.ts',outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-final/repeats-neighbors/results',reporter:[['list'],['json',{outputFile:'../docs/qa/evidence/hr-admin-standardization/leave-final/repeats-neighbors/results.json'}]]});
