import {test,expect,type Page} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;let errors:string[]=[];
const root='../docs/qa/evidence/employee-makeover-phase3-2026-10-22';
const form=(page:Page)=>page.locator('.employee-master-form');
const step=(page:Page,label:string)=>form(page).getByRole('navigation',{name:'Employee form progress'}).getByRole('button',{name:new RegExp(`${label}$`)});
const browserApi=async(page:Page,url:string,init?:RequestInit)=>page.evaluate(async({url,init})=>{const response=await fetch(url,{credentials:'same-origin',...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}});return{status:response.status,body:await response.json().catch(()=>({}))}}, {url,init});
const login=async(page:Page,role:'hr_admin'|'employee')=>{await page.context().clearCookies();const user=workspacePersona(fixture,role);await page.goto('/login');await page.getByLabel('Username or email').fill(user.username);await page.getByLabel('Password').fill(user.password);await page.getByRole('button',{name:'Sign in'}).click();await expect(page).not.toHaveURL(/\/login/)};
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{errors=[];page.on('pageerror',e=>{if(!(/^\/localhost:3266\/.*\?_rsc=.* due to access control checks\.$/.test(e.message)))errors.push(e.message)});await login(page,'hr_admin')});
test.afterEach(()=>expect(errors).toEqual([]));

for(const entry of ['page','dialog']) {
 test(`${entry} create: client errors, all steps, real save and context`,async({page},info)=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto(entry==='page'?'/hr-admin/employees/new':'/hr-admin/employees?create=1&q=QA&page_size=5&sort=-code');
  await step(page,'Review').click();await form(page).getByRole('button',{name:'Create employee',exact:true}).click();
  await expect(form(page).locator('[name=employee_code]')).toBeFocused();
  await expect(form(page).locator('[name=employee_code]')).toHaveAttribute('aria-describedby','employee-error-employee_code');
  const code=`P3-${info.project.name}-${entry}`;
  await form(page).locator('[name=employee_code]').fill(code);await form(page).locator('[name=first_name]').fill('Makeover');
  await form(page).getByRole('button',{name:'Continue',exact:true}).click();await expect(form(page).getByRole('heading',{name:'Contact and dates',exact:true})).toBeFocused();
  await form(page).locator('[name=work_email]').fill('invalid');await step(page,'Review').click();await form(page).getByRole('button',{name:'Create employee',exact:true}).click();await expect(form(page).locator('[name=work_email]')).toBeFocused();
  await form(page).locator('[name=work_email]').fill(`${code.toLowerCase()}@example.invalid`);
  await form(page).locator('[name=date_of_joining]').fill('2026-01-01');await form(page).locator('[name=date_of_birth]').fill('2026-02-01');await step(page,'Review').click();await form(page).getByRole('button',{name:'Create employee',exact:true}).click();await expect(form(page).locator('[name=date_of_birth]')).toBeFocused();await form(page).locator('[name=date_of_birth]').fill('1990-02-01');
  await step(page,'Structure').click();await expect(form(page).locator('[name=legal_entity_id]')).toBeVisible();await page.screenshot({path:`${root}/${info.project.name}-${entry}-structure-390.png`});
  await step(page,'Review').click();await expect(form(page)).toContainText(code);await page.screenshot({path:`${root}/${info.project.name}-${entry}-review-390.png`});
  const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/hr-admin/employees')&&r.request().method()==='POST');
  await form(page).getByRole('button',{name:'Create employee',exact:true}).click();const response=await responsePromise;expect(response.status()).toBe(201);await expect(page).toHaveURL(/employeeId=/);const created={id:new URL(page.url()).searchParams.get("employeeId")!};
  await expect(page).toHaveURL(new RegExp(`employeeId=${created.id}`));await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.notice[role=status]')).toContainText('Employee created.');
  if(entry==='dialog'){await expect(page).toHaveURL(/q=QA/);await expect(page).toHaveURL(/page_size=5/);await expect(page).toHaveURL(/sort=-code/)}
  const persisted=await browserApi(page,`/api/hr-admin/employees/${created.id}`);expect(persisted.status).toBe(200);expect(persisted.body.employee_code).toBe(code);
 });
 test(`${entry} edit: preserve fields and persist a real change`,async({page},info)=>{
  const id=fixture.manifest.credentials.employee.employee_id;
  await page.goto(entry==='page'?`/hr-admin/employees/${id}/edit`:`/hr-admin/employees?employeeId=${id}&action=edit&page_size=5&sort=-name`);
  if(entry==='dialog')await expect(page.getByRole('dialog').locator('.workspace-card__eyebrow')).toHaveText(fixture.manifest.credentials.employee.employee_code);
  await form(page).locator('[name=preferred_name]').fill(`Reviewed ${info.project.name} ${entry}`);
  for(const label of ['Contact','Structure','Review'])await step(page,label).click();
  const responsePromise=page.waitForResponse(r=>r.url().endsWith(`/api/hr-admin/employees/${id}`)&&r.request().method()==='PATCH');await form(page).getByRole('button',{name:'Save changes',exact:true}).click();expect((await responsePromise).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`employeeId=${id}`));await expect(page).not.toHaveURL(/action=edit/);
  const persisted=await browserApi(page,`/api/hr-admin/employees/${id}`);expect(persisted.status).toBe(200);expect(persisted.body.preferred_name).toBe(`Reviewed ${info.project.name} ${entry}`);
 });
 test(`${entry} cancel: keep then discard unsaved values`,async({page})=>{
  await page.goto(entry==='page'?'/hr-admin/employees/new':'/hr-admin/employees?create=1&page_size=5');await form(page).locator('[name=first_name]').fill('Unsaved');
  page.once('dialog',d=>d.dismiss());await form(page).getByRole('button',{name:'Cancel',exact:true}).click();await expect(form(page).locator('[name=first_name]')).toHaveValue('Unsaved');
  page.once('dialog',d=>d.accept());await form(page).getByRole('button',{name:'Cancel',exact:true}).click();await expect(form(page)).toHaveCount(0);await expect(page).toHaveURL(entry==='page'?/\/hr-admin\/employees$/:/page_size=5/);
 });
}

test('server validation and pending dialog guard preserve values without duplicate requests',async({page},info)=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.goto(`/hr-admin/employees?employeeId=${id}&action=edit`);
 await form(page).locator('[name=first_name]').fill('Preserved');await step(page,'Review').click();
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);let requests=0;
 await page.route(`**/api/hr-admin/employees/${id}`,async route=>{if(route.request().method()!=='PATCH')return route.continue();requests++;expect(route.request().postDataJSON().first_name).toBe('Preserved');expect(route.request().postDataJSON().employee_code).toBe(fixture.manifest.credentials.employee.employee_code);await gate;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({work_email:['This email is already in use.']})})});
 await form(page).getByRole('button',{name:'Save changes',exact:true}).click();await expect(form(page)).toHaveAttribute('aria-busy','true');await expect(page.getByRole('button',{name:'Close Edit employee',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toBeVisible();await expect(step(page,'Identity')).toBeDisabled();release();
 await expect(form(page).locator('[name=work_email]')).toBeFocused();await expect(form(page)).toContainText('This email is already in use.');await step(page,'Identity').click();await expect(form(page).locator('[name=first_name]')).toHaveValue('Preserved');expect(requests).toBe(1);
 await page.screenshot({path:`${root}/${info.project.name}-server-error.png`});
 errors=errors.filter(error=>error!=='Load failed');
});

test('responsive four-step composition and scoped accessibility',async({page},info)=>{
 test.setTimeout(240000);
 const id=fixture.manifest.credentials.employee.employee_id;
 for(const entry of ['page','dialog'])for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:width===320?568:844});await page.goto(entry==='page'?`/hr-admin/employees/${id}/edit`:`/hr-admin/employees?employeeId=${id}&action=edit`);
  for(const label of ['Identity','Contact','Structure','Review']){
   await step(page,label).click();await expect(step(page,label)).toHaveAttribute('aria-current','step');const body=(await form(page).locator('.employee-form-step-body').boundingBox())!;const section=(await form(page).locator('.employee-form-step-body .form-section-card').boundingBox())!;expect(section.width).toBeGreaterThan(body.width-40);expect((await step(page,label).boundingBox())!.height).toBeGreaterThanOrEqual(44);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   const inputs=form(page).locator('.employee-form-step-body .input-control');
   if(await inputs.count()>2){const first=(await inputs.nth(0).boundingBox())!;const second=(await inputs.nth(1).boundingBox())!;const third=(await inputs.nth(2).boundingBox())!;if(width>820){expect(Math.abs(first.y-second.y)).toBeLessThan(2);expect(third.y).toBeGreaterThan(first.y)}else expect(second.y).toBeGreaterThan(first.y)}
   if(info.project.name==='chromium'){await form(page).locator('.employee-form-stepper').scrollIntoViewIfNeeded();await page.screenshot({path:`${root}/${entry}-${label.toLowerCase()}-${width}-top.png`})}
   await form(page).getByRole('button',{name:'Cancel',exact:true}).scrollIntoViewIfNeeded();await expect.poll(()=>form(page).locator('.workspace-form-footer__actions button').evaluateAll(items=>items.every(item=>item.scrollWidth<=item.clientWidth+1&&item.getBoundingClientRect().left>=0&&item.getBoundingClientRect().right<=innerWidth))).toBeTruthy();await expect(form(page).getByRole('button',{name:'Cancel',exact:true})).toBeInViewport();
   if(info.project.name==='chromium')await page.screenshot({path:`${root}/${entry}-${label.toLowerCase()}-${width}.png`});
  }
 }
 await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const scan=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(c:object,o:object)=>Promise<{violations:unknown[]}>}}).axe;return axe.run({include:[['.employee-master-form']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})});await info.attach('form-axe',{body:JSON.stringify(scan),contentType:'application/json'});expect(scan.violations).toEqual([]);
});

test('real duplicate-code rejection and structural dependencies remain actionable',async({page},info)=>{
 await page.goto('/hr-admin/employees/new');await form(page).locator('[name=employee_code]').fill(fixture.manifest.credentials.employee.employee_code);await form(page).locator('[name=first_name]').fill('Duplicate draft');await step(page,'Structure').click();
 const legal=form(page).locator('[name=legal_entity_id]');const branch=form(page).locator('[name=branch_id]');const legalValues=await legal.locator('option').evaluateAll(options=>options.map(option=>(option as HTMLOptionElement).value).filter(Boolean));for(const value of legalValues){await legal.selectOption(value);if(await branch.isEnabled())break}await expect(branch).toBeEnabled();await branch.selectOption({index:1});await expect(legal).not.toHaveValue('');await expect(form(page).locator('[name=location_id]')).not.toHaveValue('');
 await step(page,'Review').click();const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/hr-admin/employees')&&r.request().method()==='POST');await form(page).getByRole('button',{name:'Create employee',exact:true}).click();expect((await responsePromise).status()).toBe(400);await expect(form(page).locator('[name=employee_code]')).toBeFocused();await expect(form(page).locator('[name=first_name]')).toHaveValue('Duplicate draft');await expect(form(page).locator('#employee-error-employee_code')).toBeVisible();await page.screenshot({path:`${root}/${info.project.name}-real-duplicate-validation.png`});
});

test('keyboard step changes and all field groups pass scoped automated checks',async({page},info)=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 for(const entry of ['page','dialog']){
  await page.goto(entry==='page'?`/hr-admin/employees/${id}/edit`:`/hr-admin/employees?employeeId=${id}&action=edit`);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  for(const label of ['Contact','Structure','Review','Identity']){
   await step(page,label).focus();await step(page,label).press('Enter');await expect(form(page).locator('.employee-form-step-body h2')).toBeFocused();
   const scan=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(c:object,o:object)=>Promise<{violations:unknown[]}>}}).axe;return axe.run({include:[['.employee-master-form']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})});await info.attach(`${entry}-${label}-axe`,{body:JSON.stringify(scan),contentType:'application/json'});expect(scan.violations).toEqual([]);
  }
 }
});

test('unconfirmed transport failure retains the draft and focuses persistent feedback',async({page})=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.goto(`/hr-admin/employees/${id}/edit`);await form(page).locator('[name=preferred_name]').fill('Unconfirmed draft');await step(page,'Review').click();await page.route(`**/api/hr-admin/employees/${id}`,route=>route.abort('failed'));await form(page).getByRole('button',{name:'Save changes',exact:true}).click();const feedback=form(page).getByRole('alert');await expect(feedback).toContainText('could not confirm the outcome');await expect(feedback).toBeFocused();await step(page,'Identity').click();await expect(form(page).locator('[name=preferred_name]')).toHaveValue('Unconfirmed draft');await expect(form(page)).toHaveAttribute('aria-busy','false');
 await page.unroute(`**/api/hr-admin/employees/${id}`);
 for(const failure of [{status:500,body:{detail:'Server unavailable'},message:'could not confirm the outcome'},{status:400,body:{non_field_errors:['Employee policy blocks this change.']},message:'Employee policy blocks this change.'}]){
  await page.route(`**/api/hr-admin/employees/${id}`,route=>route.fulfill({status:failure.status,contentType:'application/json',body:JSON.stringify(failure.body)}));await step(page,'Review').click();await form(page).getByRole('button',{name:'Save changes',exact:true}).click();await expect(feedback).toContainText(failure.message);await expect(feedback).toBeFocused();await page.unroute(`**/api/hr-admin/employees/${id}`);
 }
});

test('stale edit is rejected and preserves the draft for reconciliation',async({page})=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.goto(`/hr-admin/employees/${id}/edit`);await form(page).locator('[name=preferred_name]').fill('Stale browser draft');
 const current=await browserApi(page,`/api/hr-admin/employees/${id}`);expect(current.status).toBe(200);const competing=await browserApi(page,`/api/hr-admin/employees/${id}`,{method:'PATCH',body:JSON.stringify({preferred_name:'Concurrent committed value',expected_updated_at:current.body.updated_at})});expect(competing.status).toBe(200);
 await step(page,'Review').click();const response=page.waitForResponse(r=>r.url().endsWith(`/api/hr-admin/employees/${id}`)&&r.request().method()==='PATCH');await form(page).getByRole('button',{name:'Save changes',exact:true}).click();expect((await response).status()).toBe(400);await expect(form(page).getByRole('alert')).toContainText('changed after the form was opened');await step(page,'Identity').click();await expect(form(page).locator('[name=preferred_name]')).toHaveValue('Stale browser draft');
 const persisted=await browserApi(page,`/api/hr-admin/employees/${id}`);expect(persisted.status).toBe(200);expect(persisted.body.preferred_name).toBe('Concurrent committed value');
});

test('employee formats are rejected consistently without persistence',async({page})=>{
 await page.goto('/hr-admin/employees/new');
 await expect(form(page).locator('[name=employee_code]')).toHaveAttribute('maxlength','50');await expect(form(page).locator('[name=first_name]')).toHaveAttribute('maxlength','120');
 await form(page).locator('[name=employee_code]').fill('INVALID CODE!');await form(page).locator('[name=first_name]').fill('Format');await step(page,'Contact').click();await form(page).locator('[name=phone_number]').fill('12-ABC');await step(page,'Review').click();
 let writes=0;page.on('request',request=>{if(request.url().endsWith('/api/hr-admin/employees')&&request.method()==='POST')writes++});
 await form(page).getByRole('button',{name:'Create employee',exact:true}).click();await expect(form(page).locator('[name=employee_code]')).toBeFocused();await expect(form(page).locator('#employee-error-employee_code')).toContainText('letters, numbers');expect(writes).toBe(0);
 const apiRejected=await browserApi(page,'/api/hr-admin/employees',{method:'POST',body:JSON.stringify({employee_code:'INVALID CODE!',first_name:'Format',phone_number:'12-ABC'})});expect(apiRejected.status).toBe(400);expect(apiRejected.body.employee_code).toBeTruthy();expect(apiRejected.body.phone_number).toBeTruthy();
});

test('edit form excludes self from reporting-manager choices',async({page})=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.goto(`/hr-admin/employees/${id}/edit`);await step(page,'Structure').click();await expect(form(page).locator(`[name=reporting_manager_id] option[value="${id}"]`)).toHaveCount(0);
});

test('optional employee values persist after refresh and can be cleared durably',async({page},info)=>{
 const code=`P3-OPTIONAL-${info.project.name}`;
 const created=await browserApi(page,'/api/hr-admin/employees',{method:'POST',body:JSON.stringify({employee_code:code,first_name:'Optional',middle_name:'Middle',last_name:'Person',preferred_name:'Preferred',work_email:`${code.toLowerCase()}@example.invalid`,personal_email:`personal-${code.toLowerCase()}@example.invalid`,phone_number:'+91 98765 43210',date_of_birth:'1990-01-02',date_of_joining:'2026-01-02',probation_end_date:'2026-04-02',confirmation_date:'2026-04-03'})});expect(created.status).toBe(201);
 const id=created.body.id;await page.goto(`/hr-admin/employees/${id}/edit`);await expect(form(page).locator('[name=preferred_name]')).toHaveValue('Preferred');await page.reload();await expect(form(page).locator('[name=preferred_name]')).toHaveValue('Preferred');
 for(const name of ['middle_name','last_name','preferred_name'])await form(page).locator(`[name=${name}]`).fill('');await step(page,'Contact').click();for(const name of ['personal_email','phone_number','date_of_birth','probation_end_date','confirmation_date'])await form(page).locator(`[name=${name}]`).fill('');await step(page,'Review').click();
 const response=page.waitForResponse(r=>r.url().endsWith(`/api/hr-admin/employees/${id}`)&&r.request().method()==='PATCH');await form(page).getByRole('button',{name:'Save changes',exact:true}).click();expect((await response).status()).toBe(200);await expect(page).toHaveURL(new RegExp(`employeeId=${id}`));
 const persisted=await browserApi(page,`/api/hr-admin/employees/${id}`);expect(persisted.status).toBe(200);for(const name of ['middle_name','last_name','preferred_name','personal_email','phone_number'])expect(persisted.body[name]).toBe('');for(const name of ['date_of_birth','probation_end_date','confirmation_date'])expect(persisted.body[name]).toBeNull();expect(persisted.body.first_name).toBe('Optional');expect(persisted.body.date_of_joining).toBe('2026-01-02');
});

test('employee persona cannot open or submit HR employee forms',async({page})=>{
 await login(page,'employee');
 for(const url of ['/hr-admin/employees/new',`/hr-admin/employees/${fixture.manifest.credentials.employee.employee_id}/edit`]){await page.goto(url);await expect(form(page)).toHaveCount(0)}
 const denied=await browserApi(page,'/api/hr-admin/employees',{method:'POST',body:JSON.stringify({employee_code:'UNAUTHORIZED-PHASE3',first_name:'Denied'})});expect(denied.status).toBe(403);
});
