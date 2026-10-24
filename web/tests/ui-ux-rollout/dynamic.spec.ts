import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;let routes:string[];
test.beforeAll(async({},info)=>{
 fixture=await provisionIsolatedQaWorkspace(info);
 const result=execFileSync(path.resolve('../.venv/bin/python'),['backend/manage.py','shell','-c',`import json; from tests.fixtures.ui_ux_rollout import prepare; print(json.dumps(prepare(${JSON.stringify(fixture.manifestPath)})))`],{cwd:path.resolve('..'),env:process.env,encoding:'utf8'});
 routes=JSON.parse(result.trim().split('\n').at(-1)!);
});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('dynamic form and detail route variants',async({page},info)=>{
 const persona=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:persona.username,password:persona.password}})).status()).toBe(200);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 for(const [index,route] of routes.entries()){
  await test.step(route,async()=>{
   const response=await page.goto(route);expect(response?.status()).toBe(200);
   await expect(page.locator('main.accerio-page h1')).toBeVisible();
   for(const width of [1440,390]){
    await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),{message:route}).toBeTruthy();
    await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/dynamic/${info.project.name}-${index}-${width}.png`,fullPage:true});
   }
  });
 }
 expect(errors).toEqual([]);
 await info.attach('routes',{body:JSON.stringify(routes),contentType:'application/json'});
});
