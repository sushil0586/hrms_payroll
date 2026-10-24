import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('modal section captions are named groups with no pretend tab interactions',async({page},info)=>{
 const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 await page.goto(`/hr-admin/employees?employeeId=${fixture.manifest.credentials.employee.employee_id}&action=bank`);
 const dialog=page.getByRole('dialog',{name:'Manage bank accounts',exact:true});await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('group',{name:'Manage bank accounts sections',exact:true})).toBeVisible();await expect(dialog.getByRole('tab')).toHaveCount(0);
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const result=await page.evaluate(async()=>await (window as unknown as {axe:{run:(element:Element)=>Promise<{violations:unknown[]}>}}).axe.run(document.querySelector('[role="dialog"]')!));
 await info.attach('bank-dialog-axe',{body:JSON.stringify(result),contentType:'application/json'});expect(result.violations).toEqual([]);
 await dialog.press('Escape');await expect(dialog).toHaveCount(0);await expect(page).not.toHaveURL(/action=bank/);
});
