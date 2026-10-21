import {test,expect} from '@playwright/test';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
const root=path.resolve(__dirname,'../../../docs/qa/evidence/hr-admin-standardization/attendance-family');
test.beforeAll(async({},info)=>{test.setTimeout(180000);fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('all five attendance report CSV actions and manifests use authorized live sources',async({page},info)=>{
 const requestId=`qa-attendance-family-exports-${info.project.name}-${Date.now()}`;
 await page.setExtraHTTPHeaders({'x-request-id':requestId});
 const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 for(const report of ['attendance-register','attendance-derivation-exceptions','attendance-exceptions','leave-attendance-collisions','roster-rollout-audit']){
  await page.goto(`/hr-admin/reports/${report}`);await expect(page.locator('main h1')).toBeVisible();await expect(page.locator('[data-workspace-error]')).toHaveCount(0);
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Export filtered CSV',exact:true}).click()]);
  expect(await download.failure()).toBeNull();const target=path.join(root,'downloads',`${info.project.name}-${report}.csv`);await download.saveAs(target);expect(readFileSync(target,'utf8').length).toBeGreaterThan(10);
  const manifest=await page.request.get(`/api/hr-admin/reports/${report}?format=manifest`,{headers:{'x-request-id':requestId}});expect(manifest.status()).toBe(200);expect(manifest.headers()['content-type']).toContain('json');
 }
});
