import path from "node:path";
import {defineConfig} from "@playwright/test";
const listing=process.argv.includes('--list');const run=process.env.HRMS_PILOT_RUN;
if(!listing&&!run)throw new Error('Use run-wf-dependencies.mjs for unique original evidence');
const engines=['chromium','firefox','webkit'] as const;
export default defineConfig({testDir:'./tests',workers:1,retries:0,timeout:90000,outputDir:run?path.join(run,'results'):undefined,
reporter:listing?[["list"]]:[["./tests/shift-p8/evidence-reporter.ts"],["list"],["json",{outputFile:path.join(run!,'results.json')}]],
use:{baseURL:'http://127.0.0.1:3289',trace:'retain-on-failure',screenshot:'only-on-failure'},
projects:engines.flatMap(browserName=>[{name:`${browserName}-1440`,testMatch:['**/shift-p8/preview-race.spec.ts','**/shift-p8/date-only-oracle.spec.ts','**/wf-dependencies/*.spec.ts','**/attendance-setup-actions/shift-roster-lifecycle.spec.ts','**/employee-shift-actions/employee-shift-lifecycle.spec.ts','**/ui-ux-rollout/dialogs.spec.ts','**/shell/global-shell.spec.ts','**/shift-pilot/accessibility.spec.ts'],use:{browserName,viewport:{width:1440,height:900}}},{name:`${browserName}-320`,testMatch:['**/wf-dependencies/preview-ui.spec.ts','**/shift-pilot/accessibility.spec.ts'],grep:/obsolete blocking|invalid window|modal assignment containment/,use:{browserName,viewport:{width:320,height:800}}}])});
