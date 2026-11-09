import {expect,test,type TestInfo,type Page} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
import {retainShiftMutationEvidence,prepareOwnedAttendanceClose} from './database-evidence';
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
  await info.attach(`${id}.png`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
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
    await page.goto(base+'/new');
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
      await page.getByLabel('Effective to',{exact:true}).fill('2049-01-03');
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
    await page.goto(`${base}/${item.id}/edit`);
    if(kind==='shift')await page.getByLabel('Name',{exact:true}).fill('P6 standalone edited');
    else await page.getByLabel('Effective to',{exact:true}).fill('2049-01-04');
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

test('Shift CSV interrupted commit remains unconfirmed and is never retried automatically',async({page},info)=>{
  const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).ok()).toBeTruthy();
  await page.goto('/hr-admin/employee-shift-assignments');
  const workbench=page.getByTestId('employee-shift-assignment-import-workbench');
  const payload=await (await page.request.get('/api/hr-admin/shifts')).json();const shift=(payload.items??payload.results??payload).find((item:{id:string})=>item.id===fixture.manifest.attendance.shift_id);
  const csv=`employee_code,shift_name,assignment_kind,effective_from,effective_to,is_primary,rotation_anchor_date\n${fixture.manifest.credentials.manager_b.employee_code},${shift.name},fixed,2052-01-01,2052-01-02,true,`;
  await workbench.getByLabel('Shift assignment CSV data').fill(csv);
  await workbench.getByRole('button',{name:'Preview shift import',exact:true}).click();
  let requests=0;
  await page.route('**/api/hr-admin/employee-shift-assignments',async route=>{
    if(route.request().method()==='POST'){requests++;await route.abort('connectionreset')}else await route.continue();
  });
  await workbench.getByRole('button',{name:'Commit ready shift rows',exact:true}).click();
  await expect(workbench.getByRole('alert')).toContainText('Some rows could not be confirmed');
  await expect(workbench.getByRole('alert')).toContainText('do not blindly resubmit');
  await expect(workbench.locator('.notice--success')).toHaveCount(0);
  await expect(workbench.getByRole('button',{name:'Commit ready shift rows'})).toBeDisabled();
  await expect(workbench.getByLabel('Shift assignment CSV data')).toHaveValue(csv);
  await workbench.getByRole('alert').scrollIntoViewIfNeeded();
  await capture(page,info,'SH-V04.import-unconfirmed');
  await expect.poll(()=>requests).toBe(1);
  await info.attach('ambiguous-commit-observation',{body:JSON.stringify({fault:'explicit client transport interruption',attempts:requests,ui:'unconfirmed',automaticRetry:false,durableServerOutcome:'not inferred from a transport error'}),contentType:'application/json'});
});

test('Shift assignment pagination history overlap and closed-history feedback',async({page},info)=>{
  const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).ok()).toBeTruthy();
  const employee=fixture.manifest.credentials.manager_b;
  // Exact owned synthetic employee; disjoint inclusive windows require no policy exception.
  for(let day=1;day<=11;day++){
    const date=`2054-01-${String(day).padStart(2,'0')}`;
    const response=await page.request.post('/api/hr-admin/employee-shift-assignments',{data:{employee_id:employee.employee_id,shift_id:fixture.manifest.attendance.shift_id,effective_from:date,effective_to:date,is_primary:true}});
    expect(response.status()).toBe(201);
  }
  await page.goto('/hr-admin/employee-shift-assignments');
  const search=page.getByPlaceholder('Employee, code, shift, scope');await search.fill(employee.employee_code);
  await page.getByRole('button',{name:'Apply filters',exact:true}).click();
  await expect(page).toHaveURL(new RegExp(`q=${employee.employee_code}`));
  await expect(page.getByRole('link',{name:'Next',exact:true})).toBeEnabled();
  await page.getByRole('link',{name:'Next',exact:true}).click();
  await expect(page).toHaveURL(/page=2/);await expect(page.getByText('Page 2',{exact:true})).toBeVisible();await capture(page,info,'SH-V04.pagination');
  await page.goBack();await expect(page).not.toHaveURL(/page=2/);await expect(search).toHaveValue(employee.employee_code);await capture(page,info,'SH-V04.filter-history');
  await page.reload();await expect(search).toHaveValue(employee.employee_code);
  await page.goto('/hr-admin/employee-shift-assignments/new');
  const select=page.getByLabel('Employee',{exact:true});await select.focus();await expect(select.locator('option')).not.toHaveCount(1);
  await select.selectOption(fixture.manifest.credentials.employee.employee_id);
  await page.getByLabel('Base shift',{exact:true}).selectOption(fixture.manifest.attendance.shift_id);
  await page.getByLabel('Effective from',{exact:true}).fill('2040-01-01');
  await expect(page.getByText('Blocking overlap detected.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Create assignment',exact:true}).click();await expect(page.locator('form.employee-shift-assignment-form').getByRole('alert')).toContainText('overlaps an existing primary');
  await capture(page,info,'SH-V05.overlap');
  const response=await page.request.get('/api/hr-admin/employee-shift-assignments?q=QA-EMP-001');const payload=await response.json();const item=(payload.items??payload.results??payload).find((row:{effective_from:string})=>row.effective_from==='2024-01-01');expect(item).toBeTruthy();
  await prepareOwnedAttendanceClose(info,fixture);
  await retainShiftMutationEvidence(page,info,fixture.manifest.tenant.id,actor.username);
  await page.goto(`/hr-admin/employee-shift-assignments/${item.id}/edit`);
  const rejected=page.waitForResponse(response=>response.request().method()==='PATCH'&&new URL(response.url()).pathname===`/api/hr-admin/employee-shift-assignments/${item.id}`);
  await page.getByRole('button',{name:'Save changes',exact:true}).click();expect((await rejected).status()).toBe(400);
  await expect(page.locator('form.employee-shift-assignment-form').getByRole('alert')).toContainText('closed attendance period');
  await capture(page,info,'SH-V06.locked');
});

test('Shift controls stay disabled until client initialization completes',async({page},info)=>{
  const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).ok()).toBeTruthy();
  for(const [route,rootSelector,controlSelector,id] of [
    ['/hr-admin/shifts/new','form.shift-form','input[name="code"]','SH-V02.initializing'],
    ['/hr-admin/employee-shift-assignments/new','form.employee-shift-assignment-form','select[name="employee_id"]','SH-V05.initializing'],
    ['/hr-admin/employee-shift-assignments','[data-testid="employee-shift-assignment-import-workbench"]','textarea','SH-V04.import-initializing'],
  ]){
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});const scripts=/\/_next\/static\/.*\.js(?:\?.*)?$/;
    const hold=async(route:import('@playwright/test').Route)=>{await gate;await route.continue().catch(()=>undefined)};
    await page.route(scripts,hold);
    const root=page.locator(rootSelector),control=root.locator(controlSelector);
    try{
      await page.goto(route,{waitUntil:'domcontentloaded'});
      await expect(root).toHaveAttribute('data-local-update-hydrated','false');
      await expect(root).toHaveAttribute('aria-busy','true');
      await expect(control).toBeDisabled();
      // A screenshot waits for document fonts; holding script delivery can also
      // hold that readiness. Retain actual attributes without blocking release.
      await info.attach(`${id}.pending-dom`,{body:JSON.stringify({route,hydrated:await root.getAttribute('data-local-update-hydrated'),busy:await root.getAttribute('aria-busy'),disabled:await control.isDisabled(),screenshot:'NOT CAPTURED during intentional script hold; no visual acceptance inferred'}),contentType:'application/json'});
    }finally{release()}
    await expect(root).toHaveAttribute('data-local-update-hydrated','true');await expect(control).toBeEnabled();
    await page.unroute(scripts,hold);
    await info.attach(`${id}.transition`,{body:JSON.stringify({route,controlledDelay:'JavaScript chunk delivery held then released',before:'native fieldset disables controls; busy=true',after:'controls enabled only after client initialization',browserSpecificWorkaround:false}),contentType:'application/json'});
  }
});
