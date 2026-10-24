import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,workspacePlatformPersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;let finance:string;
test.beforeAll(async({},info)=>{
 fixture=await provisionIsolatedQaWorkspace(info);
 finance=JSON.parse(execFileSync(path.resolve('../.venv/bin/python'),['backend/manage.py','shell','-c',`import json; from tests.fixtures.ui_ux_rollout import finance_persona; print(json.dumps(finance_persona(${JSON.stringify(fixture.manifestPath)})))`],{cwd:path.resolve('..'),env:process.env,encoding:'utf8'}).trim().split('\n').at(-1)!);
});
test.afterEach(async({request})=>{await request.post('http://127.0.0.1:8063/__qa__/fault',{data:{enabled:false}})});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
for(const [route,role]of [['/hr-admin','hr_admin'],['/mss','manager'],['/tenant-admin','tenant_admin'],['/platform-admin','platform'],['/finance-manager','finance']] as const){
 test(`shared error and real read recovery ${route}`,async({page,request},info)=>{
  const user=role==='platform'?workspacePlatformPersona(fixture):role==='finance'?{username:finance,password:'Password@123'}:workspacePersona(fixture,role);
  expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
  await request.post('http://127.0.0.1:8063/__qa__/fault',{data:{enabled:true}});
  await page.goto(route);const error=page.locator('main[data-workspace-error]');await expect(error).toBeVisible();await expect(error).toHaveClass(/accerio-page/);
  await expect(error).not.toContainText('HRMS_ENABLE_DEMO_DATA');await expect(error).not.toContainText('Technical detail');
  await page.setViewportSize({width:320,height:700});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/error-${info.project.name}-${role}.png`,fullPage:true});
  await request.post('http://127.0.0.1:8063/__qa__/fault',{data:{enabled:false}});
  await error.getByRole('button',{name:'Retry workspace',exact:true}).click();await expect(error).toHaveCount(0);await expect(page.locator('main h1').first()).toBeVisible();
 });
}
