import {expect,test,type Page,type TestInfo} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(fixture,info));
async function capture(page:Page,info:TestInfo,id:string){
  const path=new URL(page.url()).pathname;
  if(path==='/hr-admin/shifts'||path==='/hr-admin/employee-shift-assignments')await expect(page.locator('[data-local-update-hydrated="true"]').first()).toBeVisible();
  const scrollBefore=await page.evaluate(()=>({x:scrollX,y:scrollY}));
  await info.attach(`${id}.viewport.png`,{body:await page.screenshot({animations:'disabled',fullPage:false}),contentType:'image/png'});
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
  await info.attach(`${id}.framing`,{body:JSON.stringify({scrollBefore,fullDocumentScroll:{x:0,y:0},nativeViewportPreserved:true,reason:'Avoid sticky header occlusion in full-document composition; retain original viewport separately.'}),contentType:'application/json'});

 await page.evaluate(()=>document.fonts.ready);
 await info.attach(id+'.png',{body:await page.screenshot({fullPage:true,animations:'disabled'}),contentType:'image/png'});
 await info.attach(id+'.cell',{body:JSON.stringify({id,route:new URL(page.url()).pathname+new URL(page.url()).search,viewport:page.viewportSize(),engine:info.project.use.browserName,visual:'NOT RUN untilactualreview',at:new Date().toISOString()}),contentType:'application/json'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
}
test('eligible ESS MSS empty read-error and restricted-response visual states',async({page,browser},info)=>{
 await info.attach('runtime',{body:JSON.stringify({version:browser.version(),engine:info.project.use.browserName,viewport:page.viewportSize()}),contentType:'application/json'});
 for(const role of ['employee','manager_b'] as const){
  const actor=workspacePersona(fixture,role);expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
  if(role==='employee'){
   await page.goto('/ess/attendance');await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');await capture(page,info,'SH-V07.own');await page.goto('/ess/attendance?month=2049-01');await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');
   await expect(page.getByText('No attendance records in this period. Missing days are not inferred as absences.',{exact:true})).toBeVisible();await capture(page,info,'SH-V07.empty');
   await page.route('**/api/me/attendance-records?*',r=>r.fulfill({status:503,json:{detail:'P8 controlled attendance read unavailable.'}}));
   await page.getByRole('button',{name:'Show period',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('P8 controlled attendance read unavailable.');await capture(page,info,'SH-V07.error');
   await page.unroute('**/api/me/attendance-records?*');await page.route('**/api/me/attendance-records?*',r=>r.fulfill({status:403,json:{detail:'P8 controlled attendance permission denial.'}}));
   await page.getByRole('button',{name:'Retry period',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('P8 controlled attendance permission denial.');await capture(page,info,'SH-V07.restricted');
   await page.unroute('**/api/me/attendance-records?*');await page.getByRole('button',{name:'Retry period',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  }else{
   await page.goto('/mss/approvals?queue=attendance');await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');
   await expect(page.getByText('No pending regularizations.',{exact:true})).toBeVisible();await capture(page,info,'SH-V08.empty');
   await page.route('**/api/manager/approval-inbox?*',r=>r.fulfill({status:503,json:{detail:'P8 controlled manager read unavailable.'}}));
   await page.getByRole('navigation',{name:'Approval views'}).getByRole('link',{name:/Attendance/}).click();await expect(page.locator('main').getByRole('alert')).toContainText('P8 controlled manager read unavailable.');await capture(page,info,'SH-V08.error');
   await page.unroute('**/api/manager/approval-inbox?*');await page.route('**/api/manager/approval-inbox?*',r=>r.fulfill({status:403,json:{detail:'P8 controlled manager permission denial.'}}));
   await page.getByRole('button',{name:'Retry queue',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toContainText('P8 controlled manager permission denial.');await capture(page,info,'SH-V08.restricted');
   await page.unroute('**/api/manager/approval-inbox?*');await page.getByRole('button',{name:'Retry queue',exact:true}).click();await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  }
 }
 await info.attach('fault-scope',{body:JSON.stringify({empty:'actualisolatedemployee2049month andmanager_bno-reporteequeue',error:'controlledHTTP503 UIresponses',restricted:'controlledHTTP403 UIresponses; NOTactualRBACcertification',noBusinessMutationSubmitted:true}),contentType:'application/json'});
});
