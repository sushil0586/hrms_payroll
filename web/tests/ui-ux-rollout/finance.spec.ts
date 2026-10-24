import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;let username:string;
test.beforeAll(async({},info)=>{
 fixture=await provisionIsolatedQaWorkspace(info);
 username=JSON.parse(execFileSync(path.resolve('../.venv/bin/python'),['backend/manage.py','shell','-c',`import json; from tests.fixtures.ui_ux_rollout import finance_persona; print(json.dumps(finance_persona(${JSON.stringify(fixture.manifestPath)})))`],{cwd:path.resolve('..'),env:process.env,encoding:'utf8'}).trim().split('\n').at(-1)!);
});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('finance shell preserves its authorized dashboard at every width',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 expect((await page.request.post('/api/auth/login',{data:{identifier:username,password:'Password@123'}})).status()).toBe(200);
 const response=await page.goto('/finance-manager');expect(response?.status()).toBe(200);
 await expect(page.locator('.accerio-shell')).toBeVisible();await expect(page.locator('main.accerio-page h1')).toBeVisible();
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/${info.project.name}-finance-${width}.png`,fullPage:true});
 }
 expect(errors).toEqual([]);
});
