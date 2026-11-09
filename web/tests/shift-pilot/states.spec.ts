import { retainShiftMutationEvidence } from "./database-evidence";
import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { provisionIsolatedQaWorkspace, cleanupIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from '../helpers/isolated-qa-workspace';
let fixture: IsolatedQaWorkspace;
const healthEvents = new WeakMap<TestInfo, object[]>();
test.beforeAll(async ({}, info) => { fixture = await provisionIsolatedQaWorkspace(info); });
test.afterAll(async ({}, info) => cleanupIsolatedQaWorkspace(fixture, info));
test.beforeEach(async ({page}, info) => {
  const events: object[]=[];
  page.on('pageerror', error=>events.push({kind:'pageerror',message:error.message}));
  page.on('console', message=>{if(message.type()==='error'||message.type()==='warning')events.push({kind:'console',type:message.type(),message:message.text()});});
  page.on('response', response=>{if(response.status()>=400)events.push({kind:'http',status:response.status(),path:new URL(response.url()).pathname});});
  page.on('requestfailed', request=>events.push({kind:'requestfailed',path:new URL(request.url()).pathname,error:request.failure()?.errorText}));
  await info.attach('observability-scope',{body:JSON.stringify({captures:'console warnings/errors, pageerror, HTTP >=400, requestfailed; intentional faults retained',candidate:'native launcher source-before.json'}),contentType:'application/json'});
  healthEvents.set(info,events);
});
test.afterEach(async ({},info)=>{
  await info.attach('browser-health-events',{body:JSON.stringify(healthEvents.get(info)??[],null,2),contentType:'application/json'});
});
test('Shift mandatory rendered core states', async ({ page, browser }, info) => {
  const actor = workspacePersona(fixture, 'hr_admin');
  expect((await page.request.post('/api/auth/login', {data: {identifier: actor.username, password: actor.password}})).status()).toBe(200);
  await retainShiftMutationEvidence(page, info, fixture.manifest.tenant.id, actor.username);
  const cells: object[] = [];
  const axeFindings: unknown[] = [];
  async function capture(id: string, expected: string) {
    await page.evaluate(() => document.fonts.ready);
    if (id.endsWith('.inspect')) await page.getByRole('complementary').last().evaluate(el=>el.scrollIntoView({block:'start'}));
    if (id==='SH-V01.no-match') await page.getByText('No shifts match the current filters.').scrollIntoViewIfNeeded();
    if (id==='SH-V04.import-rejected') await page.getByText(/CSV is missing required columns/).scrollIntoViewIfNeeded();
    if (id==='SH-V04.resolution-preview') await page.getByText('Choose both an employee and a start date to inspect resolved shift coverage.').scrollIntoViewIfNeeded();
    if (['SH-V02.default','SH-V03.default','SH-V05.default','SH-V06.default','SH-V01.create-modal','SH-V01.edit-modal','SH-V01.required','SH-V04.create-modal','SH-V04.validation'].includes(id)) {
      await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
      const violations=await page.evaluate(async()=> (window as unknown as {axe:{run:(context:Document,options:object)=>Promise<{violations:unknown[]}>}}).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations));
      await info.attach(`${id}.axe`,{body:JSON.stringify(violations,null,2),contentType:'application/json'});
      if(violations.length)axeFindings.push({id,violations});
    }
    const attachment = `${id}.png`;
    await info.attach(attachment, {body: await page.screenshot({animations:'disabled', fullPage:false}), contentType:'image/png'});
    cells.push({id, route:page.url().replace('http://127.0.0.1:3259',''), role:id.startsWith('SH-V07')?'employee':id.startsWith('SH-V08')?'manager':'hr_admin', engine:info.project.use.browserName, version:browser.version(), viewport:page.viewportSize(), expected, actual:'DOM assertions completed; image requires separate visual review', screenshot:attachment, visual:'NOT RUN'});
    if (/^SH-V0[2356]\.(default|filled)$/.test(id)) {
      const save=page.locator('form button[type="submit"]').last();await save.scrollIntoViewIfNeeded();await expect(save).toBeInViewport();
      await info.attach(`${id}.actions.png`,{body:await page.screenshot({animations:'disabled',fullPage:false}),contentType:'image/png'});
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  }
  try {
    await page.goto('/hr-admin/shifts'); await expect(page.getByRole('heading',{name:'Shifts',exact:true})).toBeVisible();
    await capture('SH-V01.populated','Catalog and permitted create action render');
    await page.getByPlaceholder('Shift name, code, weekly off').fill('p5-no-such-shift');
    await expect(page.getByText('No shifts match the current filters.')).toBeVisible(); await capture('SH-V01.no-match','Truthful no-match, clear filters reachable');
    await page.getByRole('button',{name:'Clear filters',exact:true}).click();
    await page.getByRole('button',{name:'Inspect',exact:true}).first().click();
    const detail=page.getByRole('complementary',{name:'Shift detail',exact:true}); await expect(detail).toBeVisible(); await capture('SH-V01.inspect','Detail identifies selected shift and Edit/Close actions');
    await detail.getByRole('button',{name:'Edit shift',exact:true}).click(); await expect(page.getByRole('dialog')).toBeVisible(); await capture('SH-V01.edit-modal','Existing values in editable modal');
    await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('button',{name:'Create shift',exact:true}).click(); await capture('SH-V01.create-modal','Create modal fields, header, and scrollable actions');
    await page.getByRole('dialog').getByRole('button',{name:'Create shift',exact:true}).click();
    await expect(page.getByLabel('Code',{exact:true})).toBeFocused(); await capture('SH-V01.required','Required empty code receives focus');
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/hr-admin/shifts/new'); await expect(page.getByRole('heading',{name:'Create shift',exact:true})).toBeVisible(); await capture('SH-V02.default','Standalone create form and navigation');
    await page.getByLabel('Code',{exact:true}).fill('p5-visual'); await page.getByLabel('Name',{exact:true}).fill('Synthetic visual only'); await capture('SH-V02.filled','Filled values and weekly-off controls');
    await page.goto(`/hr-admin/shifts/${fixture.manifest.attendance.shift_id}/edit`); await expect(page.getByRole('heading',{name:'Edit shift',exact:true,level:1})).toBeVisible(); await capture('SH-V03.default','Standalone edit populated from live API');
    await page.goto('/hr-admin/employee-shift-assignments'); await expect(page.getByRole('heading',{name:'Shift assignments',exact:true})).toBeVisible(); await capture('SH-V04.populated','Assignments, filters, import and governance disclosures');
    await page.getByRole('button',{name:'Inspect',exact:true}).first().click();
    await expect(page.getByRole('complementary',{name:'Shift assignment detail',exact:true})).toBeVisible(); await capture('SH-V04.inspect','Selected assignment details and effective dates');
    const csv=page.getByLabel('Shift assignment CSV data');await csv.scrollIntoViewIfNeeded();await capture('SH-V04.import-preview','CSV template and guarded preview/commit actions');
    await csv.fill('invalid,header\nsynthetic,row');await page.getByRole('button',{name:'Preview shift import',exact:true}).click();await expect(page.getByText(/CSV is missing required columns/)).toBeVisible();await capture('SH-V04.import-rejected','Invalid CSV rejected before business writes');
    await page.getByRole('button',{name:'Preview schedule',exact:true}).click();await expect(page.getByText('Choose both an employee and a start date to inspect resolved shift coverage.')).toBeVisible();await capture('SH-V04.resolution-preview','Missing preview scope produces correction feedback');
    await page.getByRole('heading',{name:'Shift assignments',exact:true}).scrollIntoViewIfNeeded();
    const assignment=await page.request.get('/api/hr-admin/employee-shift-assignments'); expect(assignment.ok()).toBeTruthy(); const payload=await assignment.json(); const item=(payload.items ?? payload.results ?? payload)[0]; expect(item.id).toBeTruthy();
    await page.getByRole('button',{name:'Create assignment',exact:true}).first().click(); await expect(page.getByRole('dialog')).toBeVisible(); await capture('SH-V04.create-modal','Employee lookup, shift and effective dates in modal');
    await page.getByRole('dialog').getByRole('button',{name:'Create assignment',exact:true}).click(); await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible(); await expect(page.getByRole('dialog').getByRole('button',{name:'Create assignment',exact:true})).toBeEnabled(); await capture('SH-V04.validation','Required assignment validation remains visible');
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/hr-admin/employee-shift-assignments/new'); await expect(page.getByRole('heading',{name:'Create shift assignment',exact:true})).toBeVisible(); await capture('SH-V05.default','Standalone assignment form, lookup and date fields');
    await page.goto(`/hr-admin/employee-shift-assignments/${item.id}/edit`); await expect(page.getByRole('heading',{name:'Edit shift assignment',exact:true,level:1})).toBeVisible(); await capture('SH-V06.default','Standalone edit with populated employee and dates');
    for(const [role,path,id] of [['employee','/ess/attendance','SH-V07.own'],['manager','/mss/approvals?queue=attendance','SH-V08.reportee']] as const){
      const person=workspacePersona(fixture,role); expect((await page.request.post('/api/auth/login',{data:{identifier:person.username,password:person.password}})).status()).toBe(200);
      await page.goto(path);await expect(page.locator('main').last()).toBeVisible();await capture(id,'Permitted bounded role view with correct navigation');
    }
  expect(axeFindings).toEqual([]);
  } finally {await info.attach('form-axe-findings',{body:JSON.stringify(axeFindings,null,2),contentType:'application/json'});await info.attach('coverage-cells',{body:JSON.stringify(cells,null,2),contentType:'application/json'});}
});

test('Shift controlled pending and failure states',async({page,browser},info)=>{
  const actor=workspacePersona(fixture,'hr_admin');
  expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
  const cells:object[]=[];
  async function capture(id:string,expected:string){
    if(id==='SH-V04.read-error-retry')await page.getByRole('alert').first().scrollIntoViewIfNeeded();
    await info.attach(`${id}.png`,{body:await page.screenshot({fullPage:false,animations:'disabled'}),contentType:'image/png'});
    cells.push({id,route:page.url().replace('http://127.0.0.1:3259',''),role:'hr_admin',engine:info.project.use.browserName,version:browser.version(),viewport:page.viewportSize(),expected,actual:'asserted controlled fault; separate visual review required',visual:'NOT RUN',faultInjection:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  }
  try{
    await page.goto('/hr-admin/shifts');await page.getByRole('button',{name:'Create shift',exact:true}).click();
    const dialog=page.getByRole('dialog');await dialog.getByLabel('Code',{exact:true}).fill('p5-controlled-error');await dialog.getByLabel('Name',{exact:true}).fill('P5 retained input');
    let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});
    await page.route('**/api/hr-admin/shifts',async route=>{if(route.request().method()==='POST'){await gate;await route.fulfill({status:400,json:{code:['P5 controlled duplicate rejection.']}})}else await route.continue()});
    await dialog.getByRole('button',{name:'Create shift',exact:true}).click();await expect(dialog.getByRole('button',{name:'Saving...',exact:true})).toBeDisabled();await capture('SH-V01.pending','Submit disabled while controlled request is pending');
    release();await expect(dialog.getByText('P5 controlled duplicate rejection.')).toBeVisible();await expect(dialog.getByLabel('Name',{exact:true})).toHaveValue('P5 retained input');await capture('SH-V01.server-error','Rejected write feedback retains input; no fake success');
    await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);
    await page.goto('/hr-admin/employee-shift-assignments');
    let releaseRead!:()=>void;const readGate=new Promise<void>(resolve=>{releaseRead=resolve});
    await page.route('**/api/hr-admin/employee-shift-assignments/workspace?*',async route=>{await readGate;await route.fulfill({status:503,json:{detail:'P5 controlled unavailable read.'}})});
    await page.getByRole('button',{name:'Apply filters',exact:true}).click();await expect(page.locator('[data-local-update-hydrated][aria-busy="true"]')).toHaveCount(1);await capture('SH-V04.loading','Committed read exposes pending state');
    releaseRead();await expect(page.getByText('Assignment update failed.')).toBeVisible();await capture('SH-V04.read-error-retry','Read failure with Retry; last confirmed data explicitly retained');
    await page.unroute('**/api/hr-admin/employee-shift-assignments/workspace?*');await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByText('Assignment update failed.')).toHaveCount(0);
    await page.goto('/hr-admin/employee-shift-assignments?q=p5-no-match-at-all');await expect(page.getByRole('table')).not.toContainText('QA-EMP-001');await capture('SH-V04.no-match','Server no-match state preserves committed search');
  }finally{await info.attach('coverage-cells',{body:JSON.stringify(cells,null,2),contentType:'application/json'});}
});


test('invalid Shift CSV reports error severity without success',async({page},info)=>{
  const actor=workspacePersona(fixture,'hr_admin');
  expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
  await page.goto('/hr-admin/employee-shift-assignments');
  await page.getByLabel('Shift assignment CSV data').fill('invalid,header\nsynthetic,row');
  await page.getByRole('button',{name:'Preview shift import',exact:true}).click();
  const message=page.getByText(/CSV is missing required columns/);await expect(message).toBeVisible();await message.scrollIntoViewIfNeeded();
  await info.attach('invalid-csv-feedback',{body:await page.screenshot({fullPage:false}),contentType:'image/png'});
  await expect(page.getByRole('alert').filter({hasText:/CSV is missing required columns/})).toBeVisible();
  await expect(page.getByText('Shift import update completed.',{exact:true})).toHaveCount(0);
});

test('Shift field validation preserves identity and correction focus', async ({page}, info) => {
  const actor=workspacePersona(fixture,'hr_admin');
  expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).ok()).toBeTruthy();
  await page.goto('/hr-admin/employee-shift-assignments');
  await page.getByRole('button',{name:'Create assignment',exact:true}).first().click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Create assignment',exact:true}).click();
  const employee=dialog.getByLabel('Employee',{exact:true});
  await expect(employee).toBeFocused();
  for(const label of ['Employee','Base shift','Effective from']) {
    const field=dialog.getByLabel(label,{exact:true});
    await expect(field).toHaveAttribute('aria-invalid','true');
    const id=await field.getAttribute('aria-describedby');expect(id).toBeTruthy();
    await expect(page.locator(`[id="${id}"]`)).toContainText(label);
  }
  await info.attach('required-fields.png',{body:await page.screenshot(),contentType:'image/png'});
  await dialog.getByLabel('Effective from',{exact:true}).focus();
  await info.attach('required-date.png',{body:await page.screenshot(),contentType:'image/png'});
  await dialog.getByText('Effective from: Enter an effective from date.',{exact:true}).scrollIntoViewIfNeeded();
  await info.attach('required-date-error.png',{body:await page.screenshot(),contentType:'image/png'});
  await dialog.getByRole('alert').scrollIntoViewIfNeeded();
  await info.attach('required-summary-actions.png',{body:await page.screenshot(),contentType:'image/png'});
  await employee.focus();
  await expect(employee.locator('option')).not.toHaveCount(1);
  await employee.selectOption(fixture.manifest.credentials.manager_b.employee_id);
  await expect(employee).toHaveAttribute('aria-invalid','false');await expect(employee).toBeFocused();
  await dialog.getByLabel('Base shift',{exact:true}).selectOption(fixture.manifest.attendance.shift_id);
  await dialog.getByLabel('Effective from',{exact:true}).fill('2045-01-02');
  await dialog.getByLabel('Effective to',{exact:true}).fill('2045-01-01');
  await dialog.getByRole('button',{name:'Create assignment',exact:true}).click();
  await expect(dialog.getByLabel('Effective to',{exact:true})).toBeFocused();
  await expect(dialog.getByText('Effective to: Must be on or after Effective from.')).toBeVisible();
  await dialog.getByLabel('Effective to',{exact:true}).fill('2045-01-03');
  let serverErrors:Record<string,string[]>={shift_id:['Synthetic server field rejection.']};
  await page.route('**/api/hr-admin/employee-shift-assignments',async route=>{
    if(route.request().method()==='POST') await route.fulfill({status:400,json:serverErrors});else await route.continue();
  });
  await dialog.getByRole('button',{name:'Create assignment',exact:true}).click();
  await expect(dialog.getByLabel('Base shift',{exact:true})).toBeFocused();
  await expect(dialog.getByText('Base shift: Synthetic server field rejection.')).toBeVisible();
  await expect(dialog.getByRole('alert')).toHaveCount(1);
  await info.attach('server-field-rejection.png',{body:await page.screenshot(),contentType:'image/png'});
  await dialog.getByLabel('Base shift',{exact:true}).selectOption('');
  await dialog.getByLabel('Base shift',{exact:true}).selectOption(fixture.manifest.attendance.shift_id);
  await dialog.getByLabel('Assignment mode',{exact:true}).selectOption('weekly_rotation');
  await dialog.getByLabel('Step 1 shift',{exact:true}).selectOption(fixture.manifest.attendance.shift_id);
  serverErrors={config_snapshot:['Synthetic rotation configuration rejection.']};
  await dialog.getByRole('button',{name:'Create assignment',exact:true}).click();
  const rotation=dialog.getByRole('group',{name:'Rotation design',exact:true});
  await expect(rotation).toBeFocused();
  await expect(rotation).toHaveAttribute('aria-invalid','true');
  await expect(dialog.getByText('Rotation design: Synthetic rotation configuration rejection.')).toBeVisible();
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
  const violations=await page.evaluate(async()=> (window as unknown as {axe:{run:(context:Document,options:object)=>Promise<{violations:unknown[]}>}}).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}).then(r=>r.violations));
  await info.attach('rotation-validation.axe',{body:JSON.stringify(violations),contentType:'application/json'});
  expect(violations).toEqual([]);
  await info.attach('rotation-field-rejection.png',{body:await page.screenshot(),contentType:'image/png'});
  await dialog.getByLabel('Rotation anchor date',{exact:true}).fill('2045-01-02');
  await expect(rotation).toHaveAttribute('aria-invalid','false');
  await expect(dialog.getByLabel('Rotation anchor date',{exact:true})).toBeFocused();
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(dialog).toHaveCount(0);
});

test('Shift CSV empty preview permission network and template feedback',async({page},info)=>{
  const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).ok()).toBeTruthy();
  await page.goto('/hr-admin/employee-shift-assignments');
  const workbench=page.getByTestId('employee-shift-assignment-import-workbench');
  const csv=workbench.getByLabel('Shift assignment CSV data');
  const headers='employee_code,shift_name,assignment_kind,effective_from,effective_to,is_primary,rotation_anchor_date';
  const preview=workbench.getByRole('button',{name:'Preview shift import',exact:true});
  await csv.fill(headers+'\n');await preview.click();
  await expect(workbench.getByRole('alert')).toContainText('at least one shift assignment row');
  await expect(workbench.getByRole('button',{name:'Commit ready shift rows'})).toBeDisabled();
  await info.attach('empty-csv.png',{body:await page.screenshot(),contentType:'image/png'});
  for(const failure of ['permission','network'] as const){
    await page.route('**/api/hr-admin/employees/option-search?**',async route=>failure==='permission'?route.fulfill({status:403,json:{detail:'Synthetic permission denial'}}):route.abort('connectionfailed'));
    await csv.fill(headers+'\nunknown-p6,Day,fixed,2046-01-01,2046-01-02,true,');await preview.click();
    await expect(workbench.getByRole('alert')).toContainText('Employee lookup failed');
    await expect(workbench.locator('.notice--success')).toHaveCount(0);
    await info.attach(`csv-${failure}.png`,{body:await page.screenshot(),contentType:'image/png'});
    await page.unroute('**/api/hr-admin/employees/option-search?**');
  }
  await workbench.getByRole('button',{name:'Load sample template'}).click();
  await expect(workbench.getByRole('alert')).toHaveCount(0);
  await preview.click();await expect(workbench.getByRole('status')).toContainText('No assignments have been created');
  await expect(workbench.locator('.notice--success')).toHaveCount(0);
  await csv.fill(headers+'\n');await expect(workbench.getByRole('button',{name:'Commit ready shift rows'})).toBeDisabled();
  const downloadPromise=page.waitForEvent('download');await workbench.getByRole('link',{name:'Download template'}).click();
  const download=await downloadPromise;expect(download.suggestedFilename()).toBe('employee-shift-assignment-import-template.csv');expect(await download.failure()).toBeNull();
  await info.attach('template-download-observation',{body:JSON.stringify({name:download.suggestedFilename(),browserDownloadEvent:true,automationTransferFailure:null,deviceSaveCompletion:'not observable; no application saved-success message'}),contentType:'application/json'});
});

test('Shift CSV commit feedback matches rejected and durable accepted rows',async({page},info)=>{
  const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).ok()).toBeTruthy();
  await retainShiftMutationEvidence(page,info,fixture.manifest.tenant.id,actor.username);
  await page.goto('/hr-admin/employee-shift-assignments');
  const workbench=page.getByTestId('employee-shift-assignment-import-workbench');
  const shifts=await (await page.request.get('/api/hr-admin/shifts')).json();
  const shift=(shifts.items??shifts.results??shifts).find((item:{id:string})=>item.id===fixture.manifest.attendance.shift_id);expect(shift).toBeTruthy();
  const code=fixture.manifest.credentials.manager_b.employee_code;
  await workbench.getByLabel('Shift assignment CSV data').fill(`employee_code,shift_name,assignment_kind,effective_from,effective_to,is_primary,rotation_anchor_date\n${code},${shift.name},fixed,2046-01-01,2046-01-02,true,`);
  const preview=workbench.getByRole('button',{name:'Preview shift import',exact:true});
  const commit=workbench.getByRole('button',{name:'Commit ready shift rows',exact:true});
  await preview.click();await expect(commit).toBeEnabled();
  await page.route('**/api/hr-admin/employee-shift-assignments',async route=>route.request().method()==='POST'?route.fulfill({status:403,json:{detail:'Synthetic create permission denial'}}):route.continue());
  await commit.click();await expect(workbench.getByRole('alert')).toContainText('Some shift rows failed');
  await expect(workbench.locator('.notice--success')).toHaveCount(0);await expect(workbench.getByText('Synthetic create permission denial',{exact:true})).toBeVisible();
  await workbench.getByRole('alert').scrollIntoViewIfNeeded();
  await info.attach('csv-commit-denied.png',{body:await page.screenshot(),contentType:'image/png'});
  await page.unroute('**/api/hr-admin/employee-shift-assignments');
  await preview.click();await expect(commit).toBeEnabled();
  const response=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/api/hr-admin/employee-shift-assignments');
  await commit.click();expect((await response).status()).toBe(201);
  await expect(workbench.getByRole('status')).toContainText('Ready rows were created');
  await expect(workbench.locator('.notice--success')).toContainText('Shift assignments created');
  await expect(commit).toBeDisabled();
  await workbench.locator('.notice--success').scrollIntoViewIfNeeded();
  await info.attach('csv-commit-confirmed.png',{body:await page.screenshot(),contentType:'image/png'});
});

test('Shift duplicate server validation identifies Code without losing input',async({page},info)=>{
  const actor=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).ok()).toBeTruthy();
  await retainShiftMutationEvidence(page,info,fixture.manifest.tenant.id,actor.username);
  const payload=await (await page.request.get('/api/hr-admin/shifts')).json();const shift=(payload.items??payload.results??payload)[0];
  await page.goto('/hr-admin/shifts');await page.getByRole('button',{name:'Create shift',exact:true}).click();
  const dialog=page.getByRole('dialog');const code=dialog.getByLabel('Code',{exact:true});
  await code.fill(shift.code);await dialog.getByLabel('Name',{exact:true}).fill('P6 retained duplicate input');
  const rejected=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/hr-admin/shifts');
  await dialog.getByRole('button',{name:'Create shift',exact:true}).click();
  expect((await rejected).status()).toBe(400);
  await expect(code).toBeFocused();await expect(code).toHaveAttribute('aria-invalid','true');
  const id=await code.getAttribute('aria-describedby');await expect(page.locator(`[id="${id}"]`)).toContainText('Code:');
  await expect(dialog.getByLabel('Name',{exact:true})).toHaveValue('P6 retained duplicate input');
  await expect(dialog.getByRole('alert')).toHaveCount(1);
  await info.attach('shift-duplicate-field.png',{body:await page.screenshot(),contentType:'image/png'});
  await code.fill('p6-corrected');await expect(code).toHaveAttribute('aria-invalid','false');await expect(code).toBeFocused();
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
});
