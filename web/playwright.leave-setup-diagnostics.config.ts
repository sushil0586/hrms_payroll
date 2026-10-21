import {defineConfig} from '@playwright/test';
import base from './playwright.leave-setup.config';
export default defineConfig({...base,testDir:'./tests/leave-setup-diagnostics',projects:base.projects?.filter(project=>project.name==='webkit'),outputDir:'../docs/qa/evidence/hr-admin-standardization/leave-setup/keyboard-diagnostic',reporter:[['list']]});
