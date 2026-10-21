import {defineConfig} from '@playwright/test';
import base from './playwright.leave-phase2.config';
export default defineConfig({...base,testDir:'./tests/e2e',testMatch:'dd6-ess-mss-domain-certification.spec.ts',grep:/manager retains tenant-scoped ESS and MSS contexts/});
