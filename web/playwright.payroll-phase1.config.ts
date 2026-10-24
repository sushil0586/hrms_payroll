import {defineConfig,devices} from '@playwright/test';

const evidence='../docs/qa/evidence/payroll-makeover-phase1-2026-10-24';

export default defineConfig({
  testDir:'./tests/payroll-makeover',
  testMatch:'phase1-baseline.spec.ts',
  workers:3,
  retries:0,
  timeout:180000,
  outputDir:`${evidence}/results`,
  reporter:[['list'],['json',{outputFile:`${evidence}/results.json`}]],
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}},
    {name:'firefox',use:{...devices['Desktop Firefox']}},
    {name:'webkit',use:{...devices['Desktop Safari']}},
  ],
  use:{baseURL:'http://127.0.0.1:3280',trace:'retain-on-failure',actionTimeout:15000},
});
