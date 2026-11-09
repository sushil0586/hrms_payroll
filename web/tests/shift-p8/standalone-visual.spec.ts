import {expect,test,type TestInfo,type Page} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
import {retainShiftMutationEvidence} from '../shift-pilot/database-evidence';
let fixture:IsolatedQaWorkspace;
const health = new WeakMap<TestInfo, object[]>();
test.beforeEach(async({page},info)=>{
  const events:object[]=[];health.set(info,events);
  page.on('pageerror',error=>events.push({kind:'pageerror',message:error.message}));
  page.on('console',message=>{if(['warning','error'].includes(message.type()))events.push({kind:'console',type:message.type(),message:message.text()})});
  page.on('response',response=>{if(response.status()>=400)events.push({kind:'http',status:response.status(),path:new URL(response.url()).pathname})});
  page.on('requestfailed',request=>events.push({kind:'requestfailed',path:new URL(request.url()).pathname,error:request.failure()?.errorText}));
});
test.afterEach(async({},info)=>{await info.attach('browser-health-events',{body:JSON.stringify(health.get(info)??[],null,2),contentType:'application/json'})});
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
  await info.attach(`${id}.png`,{body:await page.screenshot({animations:'disabled',fullPage:true}),contentType:'image/png'});
  await info.attach(`${id}.cell`,{body:JSON.stringify({id,role:'hr_admin',route:new URL(page.url()).pathname,engine:info.project.use.browserName,viewport:page.viewportSize(),visual:'NOT RUN; separate readable review required'}),contentType:'application/json'});
}
for(const kind of ['shift','assignment'] as const){
  test(`Shift standalone ${kind} create edit pending rejection success and Cancel`,async({page},info)=>{
    const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).ok()).toBeTruthy();
    await retainShiftMutationEvidence(page,info,fixture.manifest.tenant.id,actor.username);
    const base=kind==='shift'?'/hr-admin/shifts':'/hr-admin/employee-shift-assignments';
    const writes:object[]=[];page.on('request',request=>{if(['POST','PATCH'].includes(request.method())){const path=new URL(request.url()).pathname;if(path==='/api'+base||(path.startsWith('/api'+base+'/')&&/\/[a-f\d-]{36}$/i.test(path)))writes.push({method:request.method(),path})}});
    const form=page.locator(kind==='shift'?'form.shift-form':'form.employee-shift-assignment-form');
    const api='/api'+base;const createId=kind==='shift'?'SH-V02':'SH-V05';const editId=kind==='shift'?'SH-V03':'SH-V06';
    await page.goto(base+'/new');await expect(page.locator('form button[type="submit"]')).toBeEnabled();await capture(page,info,createId+'.default');
    if(kind==='shift'){
      await page.getByLabel('Code',{exact:true}).fill('p6-standalone');
      await page.getByLabel('Name',{exact:true}).fill('P6 standalone shift');
    }else{
      await page.getByRole('button',{name:'Create assignment',exact:true}).click();
      await expect(page.getByLabel('Employee',{exact:true})).toBeFocused();await capture(page,info,createId+'.required');
      const employee=page.getByLabel('Employee',{exact:true});await employee.focus();await expect(employee.locator('option')).not.toHaveCount(1);
      await employee.selectOption(fixture.manifest.credentials.manager_b.employee_id);
      await page.getByLabel('Base shift',{exact:true}).selectOption(fixture.manifest.attendance.shift_id);
      await page.getByLabel('Effective from',{exact:true}).fill('2049-01-02');
      await page.getByLabel('Effective to',{exact:true}).fill('2049-01-01');
      await page.getByRole('button',{name:'Create assignment',exact:true}).click();await expect(page.getByLabel('Effective to',{exact:true})).toBeFocused();await capture(page,info,createId+'.invalid-date');
      await page.getByLabel('Effective to',{exact:true}).fill('2049-01-03');await expect(page.locator('.detail-row').filter({has:page.locator('.detail-label',{hasText:/^Candidate scope$/})})).toContainText('2049-01-03');
    }
    await capture(page,info,createId+'.filled');
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
    await page.route('**'+api,async route=>{
      if(route.request().method()==='POST'){await gate;await route.fulfill({status:400,json:{detail:'Synthetic standalone rejection; no write performed.'}})}else await route.continue();
    });
    const create=page.getByRole('button',{name:kind==='shift'?'Create shift':'Create assignment',exact:true});
    await create.click();await expect(page.locator('form button[type="submit"]')).toBeDisabled();await capture(page,info,createId+'.pending');
    release();await expect(form.getByRole('alert')).toContainText('Synthetic standalone rejection');await capture(page,info,createId+'.server-error');
    await page.unroute('**'+api);
    const accepted=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===api);
    await create.click();const response=await accepted;expect(response.status()).toBe(201);const item=await response.json();expect(item.id).toBeTruthy();
    await page.waitForURL(base);
    await expect(page.getByRole('table').first()).toContainText(kind==='shift'?'P6 standalone shift':fixture.manifest.credentials.manager_b.employee_code);
    await page.reload();await expect(page.getByRole('table').first()).toContainText(kind==='shift'?'P6 standalone shift':fixture.manifest.credentials.manager_b.employee_code);
    await capture(page,info,createId+'.success');
    await page.goto(`${base}/${item.id}/edit`);await expect(page.locator('form button[type="submit"]')).toBeEnabled();await capture(page,info,editId+'.default');
    if(kind==='shift'){
      const name=page.getByLabel('Name',{exact:true});const prior=await name.inputValue();await name.fill('');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(name).toBeFocused();await capture(page,info,'SH-V03.validation');await name.fill(prior);
    }else{
      const end=page.getByLabel('Effective to',{exact:true});await end.fill('2049-01-01');await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(end).toBeFocused();await capture(page,info,'SH-V06.invalid-date');await end.fill('2049-01-03');
    }
    if(kind==='shift')await page.getByLabel('Name',{exact:true}).fill('P6 standalone edited');
    else {await page.getByLabel('Effective to',{exact:true}).fill('2049-01-04');await expect(page.locator('.detail-row').filter({has:page.locator('.detail-label',{hasText:/^Candidate scope$/})})).toContainText('2049-01-04');}
    await capture(page,info,editId+'.filled');
    let releaseEdit!:()=>void;const editGate=new Promise<void>(resolve=>{releaseEdit=resolve});
    await page.route('**'+api+'/'+item.id,async route=>{
      if(route.request().method()==='PATCH'){await editGate;await route.fulfill({status:409,json:{detail:'Synthetic stale revision. Refresh before retry.'}})}else await route.continue();
    });
    const save=page.getByRole('button',{name:'Save changes',exact:true});await save.click();await expect(page.locator('form button[type="submit"]')).toBeDisabled();await capture(page,info,editId+'.pending');
    releaseEdit();await expect(form.getByRole('alert')).toContainText('Synthetic stale revision');await capture(page,info,editId+'.'+(kind==='assignment'?'stale':'server-error'));
    await page.unroute('**'+api+'/'+item.id);
    const updated=page.waitForResponse(r=>r.request().method()==='PATCH'&&new URL(r.url()).pathname===api+'/'+item.id);
    await save.click();const updateResponse=await updated;expect(updateResponse.status()).toBe(200);
    if(kind==='assignment'){const submitted=updateResponse.request().postDataJSON();expect(submitted.effective_to).toBe('2049-01-04');await info.attach('submitted-date-reconciliation',{body:JSON.stringify({intended:'2049-01-04',submitted:submitted.effective_to,accepted:(await updateResponse.json()).effective_to}),contentType:'application/json'})}
    await page.waitForURL(base);await expect(page.getByRole('table').first()).toContainText(kind==='shift'?'P6 standalone edited':'2049-01-04');
    await page.reload();await expect(page.getByRole('table').first()).toContainText(kind==='shift'?'P6 standalone edited':'2049-01-04');await capture(page,info,editId+'.success');
    const beforeCancel=writes.length;
    for(const [route,id] of [[base+'/new',createId],[`${base}/${item.id}/edit`,editId]]){
      await page.goto(route);await page.getByRole('button',{name:'Cancel',exact:true}).click();await page.waitForURL(base);await capture(page,info,id+'.cancel');
    }
    expect(writes.length).toBe(beforeCancel);
    await info.attach('standalone-write-and-cancel-observation',{body:JSON.stringify({writes,beforeCancel,afterCancel:writes.length,hardReloadReadback:true}),contentType:'application/json'});
  });
}
