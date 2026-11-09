import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let workspace:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{workspace=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(workspace,info));
test('BEFORE C09 accepted HR regularization has no shared success toast',async({page},info)=>{
 const actor=workspacePersona(workspace,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
 const id=workspace.manifest.fixtures.attendance_regularization_id;
 await page.goto('/hr-admin/attendance-regularizations?reviewRegularization='+id);const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await info.attach('before-HR-review.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
 const saved=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes(id+'/approve'));await dialog.getByRole('button',{name:'Approve request',exact:true}).click();expect((await saved).status()).toBe(200);await expect(dialog).toHaveCount(0);await expect(page.locator('.action-toast')).toHaveCount(0);await info.attach('before-HR-missing-toast.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
});
