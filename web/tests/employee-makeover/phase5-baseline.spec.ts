import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('capture existing import layouts and stale preview',async({page})=>{
 const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 for(const width of [1440,390,320]){
 await page.setViewportSize({width,height:width===320?568:844});await page.goto('/hr-admin/employees');await page.locator('#employee-imports > details > summary').click();
 for(const kind of ['employee','employee-bank','employee-manager']){
 const work=page.getByTestId(`${kind}-import-workbench`);await work.getByRole('button',{name:'Load sample template',exact:true}).click();await work.getByRole('button',{name:/^Preview/}).click();await expect(work.locator('tbody tr')).not.toHaveCount(0);await work.scrollIntoViewIfNeeded();await page.screenshot({path:`docs/qa/evidence/employee-makeover-phase5-2026-10-22/baseline/${kind}-${width}.png`});
 }
 }
});
