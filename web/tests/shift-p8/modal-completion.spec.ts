import {expect,test,type Page,type TestInfo,type Locator} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
import {retainShiftMutationEvidence} from '../shift-pilot/database-evidence';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(fixture,info));
async function login(page:Page){const a=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:a.username,password:a.password}})).status()).toBe(200)}
async function capture(page:Page,info:TestInfo,id:string,dialog?:Locator){
 const frames:string[]=[];
 await page.evaluate(()=>document.fonts.ready);
 if(dialog){
  const steps=await dialog.evaluate(root=>{const el=[...root.querySelectorAll<HTMLElement>('*')].find(e=>e.scrollHeight>e.clientHeight+4&&['auto','scroll'].includes(getComputedStyle(e).overflowY));if(!el)return[0];const max=el.scrollHeight-el.clientHeight,step=Math.max(100,el.clientHeight-80);return [...new Set([...Array.from({length:Math.ceil(max/step)+1},(_,i)=>Math.min(max,i*step)),max])];});
  for(let i=0;i<steps.length;i++){
   await dialog.evaluate((root,top)=>{const el=[...root.querySelectorAll<HTMLElement>('*')].find(e=>e.scrollHeight>e.clientHeight+4&&['auto','scroll'].includes(getComputedStyle(e).overflowY));if(el)el.scrollTop=top;},steps[i]);
   const name=`${id}.modal-${i}.png`;await info.attach(name,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});frames.push(name);
  }
 }else{
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));const name=id+'.png';await info.attach(name,{body:await page.screenshot({fullPage:true,animations:'disabled'}),contentType:'image/png'});frames.push(name);
 }
 await info.attach(id+'.cell',{body:JSON.stringify({id,route:new URL(page.url()).pathname,engine:info.project.use.browserName,viewport:page.viewportSize(),frames,visual:'NOT RUN until each native frame reviewed',at:new Date().toISOString()}),contentType:'application/json'});
}
test('complete Shift catalogue and modal visual states with all scroll slices',async({page,browser},info)=>{
 await login(page);await page.goto('/hr-admin/shifts');await expect(page.locator('[data-local-update-hydrated="true"]').first()).toBeVisible();
 await capture(page,info,'SH-V01.populated');const region=page.getByRole('region',{name:'Shifts, scroll for more columns'});await region.focus();for(let n=0;n<5;n++)await page.keyboard.press('ArrowRight');await capture(page,info,'SH-V01.populated.right');
 await page.getByRole('button',{name:'Inspect',exact:true}).first().click();const detail=page.getByRole('complementary',{name:'Shift detail',exact:true});await expect(detail).toBeVisible();await capture(page,info,'SH-V01.inspect');
 await detail.getByRole('button',{name:'Edit shift',exact:true}).click();let dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await capture(page,info,'SH-V01.edit-modal',dialog);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Create shift',exact:true}).first().click();dialog=page.getByRole('dialog');await capture(page,info,'SH-V01.create-modal',dialog);
 await dialog.getByRole('button',{name:'Create shift',exact:true}).click();await expect(dialog.getByLabel('Code',{exact:true})).toBeFocused();await capture(page,info,'SH-V01.required',dialog);
 await dialog.getByLabel('Code',{exact:true}).fill('p8-modal-visual');await dialog.getByLabel('Name',{exact:true}).fill('P8 modal controlled rejection');
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);await page.route('**/api/hr-admin/shifts',async route=>{if(route.request().method()==='POST'){await gate;await route.fulfill({status:400,json:{detail:'P8 controlled rejection; no write performed.'}})}else await route.continue()});
 await dialog.getByRole('button',{name:'Create shift',exact:true}).click();await expect(dialog.locator('button[type="submit"]')).toBeDisabled();await capture(page,info,'SH-V01.pending',dialog);release();await expect(dialog.getByRole('alert')).toContainText('P8 controlled rejection');await capture(page,info,'SH-V01.server-error',dialog);
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);
 await info.attach('runtime-scope',{body:JSON.stringify({version:browser.version(),controlledMutationResponses:true,businessWritePerformed:false}),contentType:'application/json'});
});
test('complete assignment modal pending rejection and overlap visual states',async({page,browser},info)=>{
 await login(page);await retainShiftMutationEvidence(page,info,fixture.manifest.tenant.id,fixture.manifest.credentials.hr_admin.username);
 const list=await (await page.request.get('/api/hr-admin/employee-shift-assignments')).json();const item=(list.items??list.results??list)[0];expect(item.id).toBeTruthy();
 const seed=await page.request.post('/api/hr-admin/employee-shift-assignments',{data:{employee_id:fixture.manifest.credentials.manager_b.employee_id,shift_id:fixture.manifest.attendance.shift_id,effective_from:'2050-01-01',effective_to:'2050-01-02',is_primary:true}});expect(seed.status()).toBe(201);
 await page.goto('/hr-admin/employee-shift-assignments');await expect(page.locator('[data-local-update-hydrated="true"]').first()).toBeVisible();await capture(page,info,'SH-V04.populated');
 const tableRegion=page.getByRole('region',{name:'Employee shift assignments, scroll for more columns'});await tableRegion.focus();for(let n=0;n<5;n++)await page.keyboard.press('ArrowRight');await capture(page,info,'SH-V04.populated.right');
 const inspect=page.getByRole('row').filter({hasText:fixture.manifest.credentials.employee.employee_code}).getByRole('button',{name:'Inspect',exact:true});await inspect.click();const detail=page.getByRole('complementary',{name:'Shift assignment detail',exact:true});await capture(page,info,'SH-V04.inspect');
 await detail.getByRole('button',{name:'Edit assignment',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await capture(page,info,'SH-V04.edit-modal',dialog);
 // Existing owned record remains unchanged: these three rejected PATCH outcomes are controlled UI responses.
 const endpoint='**/api/hr-admin/employee-shift-assignments/'+item.id;let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 await page.route(endpoint,async route=>{if(route.request().method()==='PATCH'){await gate;await route.fulfill({status:409,json:{detail:'P8 controlled stale revision. Refresh before retry.'}})}else await route.continue()});
 await dialog.getByRole('button',{name:'Save changes',exact:true}).click();await expect(dialog.locator('button[type="submit"]')).toBeDisabled();await capture(page,info,'SH-V04.pending',dialog);release();await expect(dialog.getByRole('alert')).toContainText('P8 controlled stale revision');await capture(page,info,'SH-V04.stale',dialog);
 for(const [status,message,id]of[[403,'P8 controlled permission denial.','SH-V04.forbidden'],[400,'P8 controlled closed attendance period rejection.','SH-V04.locked']]as const){
  await page.unroute(endpoint);await page.route(endpoint,route=>route.request().method()==='PATCH'?route.fulfill({status,json:{detail:message}}):route.continue());await dialog.getByRole('button',{name:'Save changes',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText(message);await capture(page,info,id,dialog);
 }
 await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await page.unroute(endpoint);
 // Actual backend conflict preview against the one exact-owned additional assignment. No PATCH is submitted.
 await page.goto(`/hr-admin/employee-shift-assignments/${item.id}/edit`);await expect(page.getByRole('button',{name:'Save changes',exact:true})).toBeEnabled();const employee=page.getByLabel('Employee',{exact:true});await employee.focus();await employee.selectOption(fixture.manifest.credentials.manager_b.employee_id);await page.getByLabel('Effective from',{exact:true}).fill('2050-01-01');await page.getByLabel('Effective to',{exact:true}).fill('2050-01-02');await expect(page.getByText('Blocking overlap detected.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('form').getByRole('alert')).toContainText('overlap');await capture(page,info,'SH-V06.overlap');
 await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.locator('[data-local-update-hydrated="true"]').first()).toBeVisible();
 await page.getByRole('row').filter({hasText:fixture.manifest.credentials.employee.employee_code}).getByRole('button',{name:'Inspect',exact:true}).click();await page.getByRole('complementary',{name:'Shift assignment detail',exact:true}).getByRole('button',{name:'Edit assignment',exact:true}).click();
 const modal=page.getByRole('dialog');const select=modal.getByLabel('Employee',{exact:true});await select.focus();await select.selectOption(fixture.manifest.credentials.manager_b.employee_id);await modal.getByLabel('Effective from',{exact:true}).fill('2050-01-01');await modal.getByLabel('Effective to',{exact:true}).fill('2050-01-02');await expect(modal.getByText('Blocking overlap detected.',{exact:true})).toBeVisible();await capture(page,info,'SH-V04.conflict-preview',modal);await modal.getByRole('button',{name:'Cancel',exact:true}).click();
 await info.attach('runtime-scope',{body:JSON.stringify({version:browser.version(),ownedSeedAssignment:(await seed.json()).id,actualSeed201:true,rejectedPatchOutcomes:'controlled409/403/400 UI-only; not actualRBAC/closedhistoryintegration certification',overlapPreview:'actualbackendresponses; nooverlappingPATCHsubmitted'}),contentType:'application/json'});
});
