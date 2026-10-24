import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('capture current access and bank page/dialog composition',async({page})=>{
 const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);const id=fixture.manifest.credentials.employee.employee_id;
 for(const width of [1440,390,320])for(const kind of ['access','bank'])for(const entry of ['page','dialog']){
  await page.setViewportSize({width,height:width===320?568:844});await page.goto(entry==='page'?`/hr-admin/employees/${id}/${kind==='bank'?'bank-accounts':kind}`:`/hr-admin/employees?employeeId=${id}&action=${kind}`);await expect(page.locator('main h1')).toBeVisible();if(entry==='dialog')await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:`../docs/qa/evidence/employee-makeover-phase4-2026-10-22/baseline/${kind}-${entry}-${width}.png`});
 }
});
