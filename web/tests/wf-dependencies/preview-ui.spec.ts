import {expect,test,type Page,type TestInfo} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
import {retainShiftMutationEvidence} from '../shift-pilot/database-evidence';
let fixture:IsolatedQaWorkspace;
test.beforeEach(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterEach(async({},info)=>cleanupIsolatedQaWorkspace(fixture,info));
async function open(page:Page,info:TestInfo){
 const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
 await retainShiftMutationEvidence(page,info,fixture.manifest.tenant.id,actor.username);
 const seed=await page.request.post('/api/hr-admin/employee-shift-assignments',{data:{employee_id:fixture.manifest.credentials.manager_b.employee_id,shift_id:fixture.manifest.attendance.shift_id,effective_from:'2049-01-04',effective_to:'2049-01-04',is_primary:true}});expect(seed.status()).toBe(201);
 await page.goto('/hr-admin/employee-shift-assignments/new');await expect(page.getByRole('button',{name:'Create assignment',exact:true})).toBeEnabled();
 const employee=page.getByLabel('Employee',{exact:true});await employee.focus();await expect(employee.locator('option')).not.toHaveCount(1);await employee.selectOption(fixture.manifest.credentials.manager_b.employee_id);await page.getByLabel('Base shift',{exact:true}).selectOption(fixture.manifest.attendance.shift_id);
}
const scope=(page:Page)=>page.locator('.detail-row').filter({has:page.locator('.detail-label',{hasText:/^Candidate scope$/})});
function gate(){let release!:()=>void;const promise=new Promise<void>(r=>release=r);return{promise,release}}
async function capture(page:Page,info:TestInfo,name:string){await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));await info.attach(name+'.png',{body:await page.screenshot({fullPage:true,animations:'disabled'}),contentType:'image/png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)).toBe(false)}
for(const scenario of ['obsolete blocking cannot replace current clear or prevent valid Save','obsolete clear cannot replace current blocking or permit Save','obsolete error cannot clear current successful scope']){
 test(scenario,async({page,browser},info)=>{
  await open(page,info);const oldEnd=scenario.includes('obsolete clear')?'2049-01-03':'2049-01-04';const newEnd=scenario.includes('obsolete clear')?'2049-01-04':'2049-01-03';const arrived=gate(),held=gate(),done=gate();const records:object[]=[];
  await page.route('**/api/hr-admin/employee-shift-assignments/conflicts',async route=>{const query=route.request().postDataJSON();const response=await route.fetch();const payload=await response.json();records.push({to:query.effective_to,status:response.status(),scope:payload.candidate_scope,blocking:payload.has_blocking_conflict});if(query.effective_to===oldEnd){arrived.release();await held.promise;try{if(scenario.includes('obsolete error'))await route.fulfill({status:503,json:{detail:'Controlled obsolete transport failure'}});else await route.fulfill({response})}finally{done.release()}}else await route.fulfill({response})});
  try{
   await page.getByLabel('Effective to',{exact:true}).fill(oldEnd);await page.getByLabel('Effective from',{exact:true}).fill('2049-01-02');await arrived.promise;
   await page.getByLabel('Effective to',{exact:true}).fill(newEnd);await expect(scope(page)).toContainText(newEnd);held.release();await done.promise;await expect(scope(page)).toContainText(newEnd);
   if(scenario.includes('obsolete clear')){
    await expect(page.getByText('Blocking overlap detected.',{exact:true})).toBeVisible();let posts=0;page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname==='/api/hr-admin/employee-shift-assignments')posts++});await page.getByRole('button',{name:'Create assignment',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Save failed.'})).toContainText('overlaps');expect(posts).toBe(0);
   }else{await expect(page.getByText('No overlapping shift assignment detected for this employee and date window.',{exact:true})).toBeVisible()}
   await capture(page,info,'current-preview-after-obsolete-result');
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const violations=await page.evaluate(async()=> (window as unknown as {axe:{run:(context:Element,options:object)=>Promise<{violations:unknown[]}>}}).axe.run(document.querySelector('main')!,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations));await info.attach('preview-axe',{body:JSON.stringify(violations),contentType:'application/json'});expect(violations).toEqual([]);
   if(scenario.startsWith('obsolete blocking')){
    const response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/hr-admin/employee-shift-assignments');await page.getByRole('button',{name:'Create assignment',exact:true}).click();const saved=await response;expect(saved.status()).toBe(201);const id=(await saved.json()).id;
    const reread=await page.request.get('/api/hr-admin/employee-shift-assignments');expect(reread.status()).toBe(200);const collection=await reread.json();expect((collection.items??collection.results??collection).find((item:{id:string})=>item.id===id)).toMatchObject({effective_from:'2049-01-02',effective_to:newEnd});await expect(page).toHaveURL(/\/hr-admin\/employee-shift-assignments(?:\?|$)/);
    await expect(page.locator('[data-local-update-hydrated="true"]').first()).toBeVisible();await capture(page,info,'valid-save-after-obsolete-blocking');
   }
  }finally{held.release();await info.attach('actual-response-order',{body:JSON.stringify({records,scenario,engine:info.project.use.browserName,version:browser.version(),viewport:page.viewportSize()}),contentType:'application/json'})}
 });
}
test('obsolete completion does not clear current request loading state',async({page},info)=>{
 await open(page,info);const oldArrived=gate(),newArrived=gate(),oldHeld=gate(),newHeld=gate(),oldDone=gate();
 await page.route('**/api/hr-admin/employee-shift-assignments/conflicts',async route=>{const query=route.request().postDataJSON();const response=await route.fetch();if(query.effective_to==='2049-01-03'){oldArrived.release();await oldHeld.promise;try{await route.fulfill({response})}finally{oldDone.release()}}else{newArrived.release();await newHeld.promise;await route.fulfill({response})}});
 try{await page.getByLabel('Effective to',{exact:true}).fill('2049-01-03');await page.getByLabel('Effective from',{exact:true}).fill('2049-01-02');await oldArrived.promise;await page.getByLabel('Effective to',{exact:true}).fill('2049-01-05');await newArrived.promise;
  const loading=page.getByText('Reviewing existing shift assignments for the employee.',{exact:true});await expect(loading).toBeVisible();oldHeld.release();await oldDone.promise;await expect(loading).toBeVisible();await expect(scope(page)).toHaveCount(0);await capture(page,info,'current-loading-after-obsolete-completion');newHeld.release();await expect(scope(page)).toContainText('2049-01-05');await expect(loading).toHaveCount(0);
 }finally{oldHeld.release();newHeld.release()}
});
test('invalid window and cleared input cannot retain or fetch a conflict verdict',async({page},info)=>{
 await open(page,info);const arrived=gate(),held=gate(),done=gate();const queries:Array<{effective_from:string,effective_to:string}>=[];
 await page.route('**/api/hr-admin/employee-shift-assignments/conflicts',async route=>{const query=route.request().postDataJSON();queries.push(query);const response=await route.fetch();arrived.release();await held.promise;try{await route.fulfill({response})}finally{done.release()}});
 try{await page.getByLabel('Effective to',{exact:true}).fill('2049-01-03');await page.getByLabel('Effective from',{exact:true}).fill('2049-01-02');await arrived.promise;await page.getByLabel('Effective to',{exact:true}).fill('2049-01-01');held.release();await done.promise;
  await page.getByRole('button',{name:'Create assignment',exact:true}).click();await expect(page.getByLabel('Effective to',{exact:true})).toHaveAttribute('aria-invalid','true');await expect(scope(page)).toHaveCount(0);await capture(page,info,'invalid-window-without-verdict');
  // Verify the debounce window has elapsed; response ordering itself is gate-controlled.
  await page.waitForTimeout(350);expect(queries).toHaveLength(1);
  await page.getByLabel('Effective from',{exact:true}).fill('');await expect(scope(page)).toHaveCount(0);await page.getByRole('button',{name:'Create assignment',exact:true}).click();await expect(page.getByLabel('Effective from',{exact:true})).toHaveAttribute('aria-invalid','true');await capture(page,info,'cleared-input-without-verdict');
 }finally{held.release();await info.attach('preview-query-inventory',{body:JSON.stringify(queries),contentType:'application/json'})}
});
test('Cancel while preview pending leaves reopened form free of obsolete scope',async({page},info)=>{
 await open(page,info);const arrived=gate(),held=gate(),done=gate();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/hr-admin/employee-shift-assignments/conflicts',async route=>{const response=await route.fetch();arrived.release();await held.promise;try{await route.fulfill({response})}catch{/* Browser cancellation on navigation is an allowed transport outcome. */}finally{done.release()}});
 try{await page.getByLabel('Effective to',{exact:true}).fill('2049-01-03');await page.getByLabel('Effective from',{exact:true}).fill('2049-01-02');await arrived.promise;await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page).toHaveURL(/\/hr-admin\/employee-shift-assignments(?:\?|$)/);await expect(page.locator('[data-local-update-hydrated="true"]').first()).toBeVisible();held.release();await done.promise;await page.getByRole('button',{name:'Create assignment',exact:true}).first().click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(scope(page)).toHaveCount(0);await expect(dialog.getByLabel('Effective from',{exact:true})).toHaveValue('');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();expect(errors).toEqual([]);await capture(page,info,'cancelled-preview-clean-queue');}finally{held.release();await info.attach('page-errors',{body:JSON.stringify(errors),contentType:'application/json'})}
});
