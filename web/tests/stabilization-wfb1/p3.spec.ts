import {expect,test} from '@playwright/test';
import {cleanupIsolatedQaWorkspace,provisionIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let workspace:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{workspace=await provisionIsolatedQaWorkspace(info);});
test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(workspace,info));
test('B1-08 Shift required errors and roster same-kind helper',async({page},info)=>{
 const actor=workspacePersona(workspace,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
 await page.goto('/hr-admin/shifts');await page.getByRole('button',{name:'Create shift',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Create shift',exact:true});
 await dialog.getByRole('button',{name:'Create shift',exact:true}).click();const code=dialog.getByRole('textbox',{name:'Code',exact:true});await expect(code).toBeFocused();await expect(code).toHaveAttribute('aria-invalid','true');await expect(dialog.getByText('Code: Code is required.',{exact:true})).toBeVisible();
 await info.attach('B1-shift-required.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 const control=await code.boundingBox();const tabs=await dialog.locator('.hr-admin-modal-tabs').first().boundingBox().catch(()=>null);if(control&&tabs)expect(control.y).toBeGreaterThanOrEqual(tabs.y+tabs.height);
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
 await page.goto('/hr-admin/shift-roster-templates');await expect(page.getByText('Primary assignments win when multiple eligible windows of the same kind could otherwise match the same employee and date.',{exact:true})).toBeVisible();
 await page.getByText('Primary assignments win when multiple eligible windows of the same kind could otherwise match the same employee and date.',{exact:true}).scrollIntoViewIfNeeded();
 await info.attach('B1-roster-helper.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
});
