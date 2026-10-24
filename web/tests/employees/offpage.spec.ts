import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('off-page direct employee details close to the directory region without losing page scope',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 const id=fixture.manifest.credentials.employee.employee_id;
 await page.setViewportSize({width:390,height:844});await page.goto(`/hr-admin/employees?page=2&page_size=5&employeeId=${id}`);
 const detail=page.locator('.employee-detail-drawer');await expect(detail.getByRole('heading',{name:'Esha Employee',exact:true})).toBeFocused();await expect(page.locator(`tr[data-employee-id="${id}"]`)).toHaveCount(0);
 await detail.getByRole('link',{name:'Close details',exact:true}).click();await expect(detail).toHaveCount(0);await expect(page).not.toHaveURL(/employeeId=/);await expect(page).toHaveURL(/page=2/);await expect(page).toHaveURL(/page_size=5/);
 await expect(page.getByRole('region',{name:'Employee directory, scroll for more columns'})).toBeFocused();await expect(page.getByRole('table',{name:'Employee directory',exact:true}).locator('tbody tr')).toHaveCount(1);
 await page.screenshot({path:`${process.env.EMPLOYEE_EVIDENCE_DIR || "../docs/qa/evidence/hr-admin-employees"}/${info.project.name}-offpage-close-390.png`});expect(errors).toEqual([]);
});
