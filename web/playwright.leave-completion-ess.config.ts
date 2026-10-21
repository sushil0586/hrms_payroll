import {defineConfig} from '@playwright/test';
import base from './playwright.leave-completion.config';
export default defineConfig({...base,workers:1,testDir:'./tests/e2e',testMatch:'ess3-leave-certification.spec.ts',use:{...base.use,baseURL:'http://127.0.0.1:3225'}});
