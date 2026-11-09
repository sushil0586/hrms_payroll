import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let workspace:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{workspace=await provisionIsolatedQaWorkspace(info)});test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(workspace,info));
test('B09 standalone create/edit route variants and denied role',async({page},info)=>{
 const actor=workspacePersona(workspace,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
 const shifts=workspace.manifest.attendance.shift_id;const assignmentResponse=await page.request.get('/api/hr-admin/employee-shift-assignments?page_size=10');expect(assignmentResponse.status()).toBe(200);const assignment=(await assignmentResponse.json()).items[0].id;
 const response=await page.request.post('/api/hr-admin/shift-roster-templates',{data:{code:'wfb-routes',name:'WF-B routes',shift_id:shifts}});expect(response.status()).toBe(201);const template=(await response.json()).id;
 for(const [base,id] of [['shifts',shifts],['employee-shift-assignments',assignment],['shift-roster-templates',template]])for(const suffix of ['new',id+'/edit']){
  await page.goto('/hr-admin/'+base+'/'+suffix);await expect(page.getByRole('heading',{level:1})).toContainText(suffix==='new'?'Create':'Edit');await expect(page.locator('main form')).toBeVisible();await info.attach(base+'-'+(suffix==='new'?'new':'edit')+'.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
 }
 const employee=workspacePersona(workspace,'employee');expect((await page.request.post('/api/auth/login',{data:{identifier:employee.username,password:employee.password}})).status()).toBe(200);
 for(const path of ['shifts','employee-shift-assignments','shift-roster-templates'])expect((await page.request.get('/api/hr-admin/'+path)).status()).toBe(403);
});
