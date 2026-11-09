import {expect,test} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(fixture,info));
test('assignment preview ignores an obsolete response after current scope settles',async({page,browser},info)=>{
 const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
 await page.goto('/hr-admin/employee-shift-assignments/new');await expect(page.getByRole('button',{name:'Create assignment',exact:true})).toBeEnabled();
 const observations:object[]=[];let release!:()=>void,oldArrived!:()=>void,oldDone!:()=>void;
 const held=new Promise<void>(r=>release=r),arrived=new Promise<void>(r=>oldArrived=r),completed=new Promise<void>(r=>oldDone=r);
 await page.route('**/api/hr-admin/employee-shift-assignments/conflicts',async route=>{
  const request=route.request().postDataJSON();const response=await route.fetch();const payload=await response.json();
  observations.push({kind:'backend-response',at:new Date().toISOString(),from:request.effective_from,to:request.effective_to,status:response.status(),scope:payload.candidate_scope});
  if(request.effective_to==='2049-01-04'){oldArrived();await held;await route.fulfill({response});observations.push({kind:'released-obsolete-response',at:new Date().toISOString()});oldDone()}
  else await route.fulfill({response});
 });
 try{
  const employee=page.getByLabel('Employee',{exact:true});await employee.focus();await expect(employee.locator('option')).not.toHaveCount(1);await employee.selectOption(fixture.manifest.credentials.manager_b.employee_id);
  await page.getByLabel('Base shift',{exact:true}).selectOption(fixture.manifest.attendance.shift_id);
  await page.getByLabel('Effective to',{exact:true}).fill('2049-01-04');await page.getByLabel('Effective from',{exact:true}).fill('2049-01-02');await arrived;
  await page.getByLabel('Effective to',{exact:true}).fill('2049-01-05');
  const scope=page.locator('.detail-row').filter({has:page.locator('.detail-label',{hasText:/^Candidate scope$/})});
  await expect(scope).toContainText('2049-01-05');observations.push({kind:'current-scope-visible',text:await scope.innerText()});
  release();await completed;
  // Current scope must remain authoritative even if an older request finishes last.
  await expect(scope).toContainText('2049-01-05');
 }finally{
  release?.();await info.attach('preview-response-order',{body:JSON.stringify({engine:info.project.use.browserName,version:browser.version(),viewport:page.viewportSize(),observations,submittedBusinessWrite:false},null,2),contentType:'application/json'});
  await info.attach('preview-current-input-versus-scope.png',{body:await page.screenshot({fullPage:true,animations:'disabled'}),contentType:'image/png'});
 }
});
