import path from 'node:path';
import {defineConfig} from '@playwright/test';
const run=process.env.HRMS_PILOT_RUN;
if(!run&&!process.argv.includes('--list'))throw Error('Use WF-E evidence launcher');
export default defineConfig({testDir:'./tests/stabilization-wff',testMatch:['pages.spec.ts','actions.spec.ts','repairs.spec.ts'],workers:2,retries:0,timeout:300000,outputDir:run?path.join(run,'results'):undefined,reporter:process.argv.includes('--list')?[['list']]:[['./tests/shift-p8/evidence-reporter.ts'],['list'],['json',{outputFile:path.join(run!,'results.json')}]],use:{baseURL:'http://127.0.0.1:3309',actionTimeout:20000,screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[...(['chromium','firefox','webkit']as const).map(browserName=>({name:`${browserName}-1440`,use:{browserName,viewport:{width:1440,height:900}}})),...[320,768].map(width=>({name:`chromium-${width}`,use:{browserName:'chromium' as const,viewport:{width,height:900}}}))]});
