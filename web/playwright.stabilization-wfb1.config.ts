import path from 'node:path';
import {defineConfig} from '@playwright/test';
const run=process.env.HRMS_PILOT_RUN;
if(!run&&!process.argv.includes('--list'))throw Error('Use WF-B.1 evidence launcher');
export default defineConfig({testDir:'./tests/stabilization-wfb1',workers:1,retries:0,timeout:180000,outputDir:run?path.join(run,'results'):undefined,reporter:process.argv.includes('--list')?[['list']]:[['./tests/shift-p8/evidence-reporter.ts'],['list'],['json',{outputFile:path.join(run!,'results.json')}]],use:{baseURL:'http://127.0.0.1:3304',actionTimeout:20000,screenshot:'only-on-failure',trace:'retain-on-failure'},projects:[...(['chromium','firefox','webkit']as const).flatMap(browserName=>[1440,320].map(width=>({name:`${browserName}-${width}`,testIgnore:browserName!=='chromium'?['**/p3.spec.ts']:[],use:{browserName,viewport:{width,height:900}}}))),{name:'chromium-768',testIgnore:['**/p3.spec.ts'],use:{browserName:'chromium',viewport:{width:768,height:900}}}] });
