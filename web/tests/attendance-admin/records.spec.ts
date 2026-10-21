import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {readFileSync,writeFileSync,rmSync} from 'node:fs';
const repoRoot=path.resolve(__dirname,'../../..');
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace,foreign:IsolatedQaWorkspace;
let closedId:string;
const faultFile=path.join(repoRoot,"docs/qa/evidence/hr-admin-standardization/a1/load-fault.json");
test.beforeAll(async({},info)=>{test.setTimeout(180000);fixture=await provisionIsolatedQaWorkspace(info);execFileSync(path.join(repoRoot,'.venv/bin/python'),[path.join(repoRoot,'docs/qa/evidence/hr-admin-standardization/a1/seed.py'),fixture.manifestPath],{env:process.env,cwd:repoRoot});closedId=JSON.parse(readFileSync(fixture.manifestPath,"utf8")).a1.closed_id;foreign=await provisionIsolatedQaWorkspace({...info,title:"foreign-attendance",workerIndex:info.workerIndex} as typeof info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(foreign);await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{const p=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:p.username,password:p.password}})).status()).toBe(200)});
test.afterEach(()=>{rmSync(faultFile,{force:true})});
const toolbar=(p:Page)=>p.getByTestId('attendance-records-toolbar');
const status=(p:Page)=>toolbar(p).getByRole('combobox',{name:/^Status/});
async function start(p:Page){await p.goto('/hr-admin/attendance-records?page_size=10');await expect(p.getByRole('heading',{name:'Attendance records',exact:true}).first()).toBeVisible()}
async function apply(p:Page){await toolbar(p).getByRole('button',{name:'Apply filters',exact:true}).click();await expect(p).toHaveURL(/status=absent/)}
test('HA-F01 history restores committed controls and results',async({page})=>{
 await start(page);await status(page).selectOption('absent');await apply(page);await expect(page.locator('.attendance-directory-table tbody tr')).toHaveCount(10);
 await toolbar(page).getByText('Clear filters',{exact:true}).click();await expect(page).not.toHaveURL(/status=absent/);
 await page.goBack();await expect(page).toHaveURL(/status=absent/);await expect(status(page)).toHaveValue('absent');
});
test('HA-F02 scope change removes hidden bulk selections',async({page})=>{
 await start(page);const row=page.locator('.attendance-directory-table tbody tr').filter({hasText:'Present'}).first();await row.getByRole('checkbox').check();
 await status(page).selectOption('absent');await apply(page);await expect(toolbar(page).getByRole('button',{name:'Set status (0)',exact:true})).toBeDisabled();await expect(page.locator('.attendance-directory-table input:checked')).toHaveCount(0);
});
test('HA-F03 pagination ignores unapplied draft filters',async({page})=>{
 await start(page);await status(page).selectOption('absent');await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page).toHaveURL(/page=2/);await expect(page).not.toHaveURL(/status=absent/);
});
const table=(p:Page)=>p.getByRole('table',{name:'Attendance records',exact:true});
const dataRows=(p:Page)=>table(p).locator('tbody tr[data-record-id]');
const filterForm=(p:Page)=>p.getByRole('form',{name:'Attendance filters'});
async function readRecord(p:Page,id:string|null){const response=await p.request.get('/api/hr-admin/attendance-records?page_size=100');expect(response.status()).toBe(200);const record=(await response.json()).items.find((item:{id:string})=>item.id===id);expect(record).toBeTruthy();return record}


test('page size retains committed scope, clears selection and normalizes invalid page',async({page})=>{
 await start(page);await dataRows(page).first().getByRole('checkbox').check();await status(page).selectOption('absent');
 const pager=page.getByRole('form',{name:'Attendance pagination'});await pager.getByRole('combobox').selectOption('25');await pager.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(page).not.toHaveURL(/status=absent/);await expect(status(page)).toHaveValue('');await expect(dataRows(page)).toHaveCount(25);await expect(toolbar(page).getByRole('button',{name:'Set status (0)',exact:true})).toBeDisabled();
 await page.goto('/hr-admin/attendance-records?page=999&page_size=10');await expect(page).toHaveURL(/page=3/);await expect(dataRows(page)).toHaveCount(7);
});

test('combined filters, date validation, refresh, empty and reset',async({page})=>{
 await start(page);const f=filterForm(page);await f.getByText('More filters',{exact:true}).click();
 await f.getByRole('combobox',{name:'Source',exact:true}).selectOption('manual');await f.getByRole('combobox',{name:'Shift',exact:true}).selectOption(fixture.manifest.attendance.shift_id);
 await f.getByRole('combobox',{name:'Lock state',exact:true}).selectOption('open');await f.getByRole('combobox',{name:'Regularization',exact:true}).selectOption('not_regularized');
 await f.getByLabel('From date',{exact:true}).fill('2032-03-03');await f.getByLabel('To date',{exact:true}).fill('2032-03-02');await f.getByRole('button',{name:'Apply filters',exact:true}).click();
 await expect(f.getByRole('alert')).toHaveText('From date must be on or before to date.');await expect(f.getByLabel('To date',{exact:true})).toBeFocused();
 await f.getByLabel('To date',{exact:true}).fill('2032-03-03');await f.getByRole('checkbox',{name:'Late rows only',exact:true}).check();await f.getByRole('button',{name:'Apply filters',exact:true}).click();
 await expect(dataRows(page)).toHaveCount(1);await expect(dataRows(page)).toContainText('10 min late');await page.reload();await expect(f.getByLabel('From date',{exact:true})).toHaveValue('2032-03-03');
 await f.getByRole('textbox',{name:'Search',exact:true}).fill('no-synthetic-match');await f.getByRole('textbox',{name:'Search',exact:true}).press('Enter');await expect(page.getByText('No attendance rows match the current filters.',{exact:true})).toBeVisible();
 await f.getByRole('link',{name:'Clear filters',exact:true}).click();await expect(dataRows(page)).toHaveCount(25);
 await page.goto('/hr-admin/attendance-records?from_date=2032-02-31');await expect(toolbar(page).getByRole('alert')).toContainText('valid calendar date');await expect(table(page)).toHaveCount(0);
});

test('bulk request contains only visible selected IDs and handles transport retry',async({page})=>{
 await start(page);const old=await dataRows(page).first().getAttribute('data-record-id');await dataRows(page).first().getByRole('checkbox').check();
 await status(page).selectOption('absent');await apply(page);await expect(toolbar(page).getByRole('button',{name:'Set status (0)',exact:true})).toBeDisabled();
 const row=dataRows(page).first();const id=await row.getAttribute('data-record-id');expect(id).not.toBe(old);await row.getByRole('checkbox').check();
 let fail=true;const sent:string[][]=[];
 await page.route('**/api/hr-admin/attendance-records/bulk-actions',async route=>{sent.push(route.request().postDataJSON().record_ids);if(fail)await route.abort('connectionfailed');else await route.continue()});
 await toolbar(page).getByRole('button',{name:'Lock',exact:true}).click();await expect(toolbar(page).getByRole('alert')).toContainText('Unable to reach the server');expect(sent[0]).toEqual([id]);fail=false;
 await toolbar(page).getByRole('button',{name:'Lock',exact:true}).click();await expect(toolbar(page).locator('.notice[role="status"]')).toContainText('1 attendance records updated');expect(sent[1]).toEqual([id]);
 await expect(toolbar(page).getByRole('button',{name:'Set status (0)',exact:true})).toBeDisabled();
 await expect.poll(async()=>{return (await readRecord(page,id)).is_locked}).toBe(true);
 await expect(page.locator(`tr[data-record-id="${id}"]`)).toContainText('Locked');
});

test('closed-period bulk denial is actionable and preserves historical status',async({page})=>{
 await page.goto('/hr-admin/attendance-records?from_date=2030-01-01&to_date=2030-01-31');await expect(dataRows(page)).toHaveCount(1);await dataRows(page).first().getByRole('checkbox').check();
 const response=page.waitForResponse(r=>r.url().endsWith('/api/hr-admin/attendance-records/bulk-actions')&&r.request().method()==='POST');await toolbar(page).getByRole('button',{name:'Unlock',exact:true}).click();expect((await response).status()).toBe(400);
 await expect(toolbar(page).getByRole('alert')).toContainText('attendance period is closed');const record=await readRecord(page,closedId);expect(record.is_locked).toBe(true);expect(record.status).toBe('present');
});

test('ownership rejection and read-only attendance role',async({page})=>{
 const foreignList=await page.request.get('/api/hr-admin/attendance-records?page_size=100');const ids=(await foreignList.json()).items.map((x:{id:string})=>x.id);
 const loginForeign=await page.context().browser()!.newContext({baseURL:'http://127.0.0.1:3201'});const user=workspacePersona(foreign,'hr_admin');expect((await loginForeign.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);const foreignId=(await (await loginForeign.request.get('/api/hr-admin/attendance-records?page_size=10')).json()).items[0].id;await loginForeign.close();
 expect(ids).not.toContain(foreignId);expect((await page.request.patch(`/api/hr-admin/attendance-records/${foreignId}`,{data:{notes:'Forbidden synthetic cross-tenant change'}})).status()).toBe(404);const scoped=await page.request.post('/api/hr-admin/attendance-records/bulk-actions',{data:{action:'lock',record_ids:[foreignId]}});expect(scoped.status()).toBe(200);expect((await scoped.json()).updated_count).toBe(0);
 await page.request.post('/api/auth/logout');const p=workspacePersona(fixture,'hr_checker');expect((await page.request.post('/api/auth/login',{data:{identifier:p.username,password:p.password}})).status()).toBe(200);
 await start(page);await expect(toolbar(page).getByText('Read-only attendance view.',{exact:true})).toBeVisible();await expect(table(page).getByRole('checkbox')).toHaveCount(0);expect((await page.request.post('/api/hr-admin/attendance-records/bulk-actions',{data:{action:'lock',record_ids:[closedId]}})).status()).toBe(403);
});

test('server load failure, honest error and retry',async({page},info)=>{
 writeFileSync(faultFile,JSON.stringify({q:fixture.manifest.credentials.employee.employee_code}));await page.goto(`/hr-admin/attendance-records?q=${fixture.manifest.credentials.employee.employee_code}`);
 await expect(page.getByRole('heading',{name:'Attendance records could not be loaded',exact:true})).toBeVisible();await page.screenshot({path:`../docs/qa/evidence/hr-admin-standardization/a1/${info.project.name}-error.png`,fullPage:true});await page.getByRole('button',{name:'Retry workspace',exact:true}).click();await expect(table(page)).toBeVisible();await expect(dataRows(page).first()).toContainText('QA-EMP-001');
});

test('responsive renders, keyboard table scrolling and inspection',async({page},info)=>{
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await start(page);await expect(dataRows(page)).toHaveCount(10);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  const region=page.getByRole('region',{name:'Attendance records, scroll for more columns'});await region.focus();await expect(region).toBeFocused();
  if(width<600){await region.press('ArrowRight');expect(await region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await region.press('ArrowLeft');for(const control of await filterForm(page).getByRole('combobox').all())expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(43.99)}
  expect((await toolbar(page).getByRole('button',{name:'Select page',exact:true}).boundingBox())!.height).toBeLessThan(65);
  await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
  await page.screenshot({path:`../docs/qa/evidence/hr-admin-standardization/a1/${info.project.name}-${width}.png`,fullPage:true});
 }
 await dataRows(page).first().getByRole('button',{name:'Inspect',exact:true}).press('Enter');await expect(page.getByRole('complementary',{name:'Attendance record detail',exact:true})).toBeVisible();
 await page.getByRole('complementary',{name:'Attendance record detail',exact:true}).getByRole('button',{name:'Close',exact:true}).click();await expect(page.getByRole('complementary',{name:'Attendance record detail',exact:true})).toHaveCount(0);
});

test('automated accessibility and neighboring employee ESS queues',async({page},info)=>{
 await start(page);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const result=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(c:object,o:object)=>Promise<{violations:unknown[]}>}}).axe;return axe.run({include:[['.workspace-page-header'],['[data-testid="attendance-records-toolbar"]'],['.workspace-table-region'],['.workspace-pagination']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})});await info.attach('attendance-axe',{body:JSON.stringify(result,null,2),contentType:'application/json'});expect(result.violations).toEqual([]);
 for(const href of ['/hr-admin/employees','/hr-admin/attendance-regularizations','/ess/attendance','/mss/approvals']){await page.goto(href);await expect(page.locator('main h1').first()).toBeVisible()}
});

test('permitted record edit keeps notes, timings and return navigation',async({page})=>{
 await start(page);const row=dataRows(page).first();const id=await row.getAttribute('data-record-id');const before=await readRecord(page,id);
 await row.getByRole('button',{name:'Inspect',exact:true}).click();const panel=page.getByRole('complementary',{name:'Attendance record detail',exact:true});await panel.getByRole('link',{name:'Edit record',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.getByRole('textbox',{name:'Notes',exact:true}).fill('A1 isolated attendance review');
 const submit=dialog.getByRole('button',{name:/Save/});await submit.click();await expect(dialog).toHaveCount(0);
 const after=await readRecord(page,id);expect(after.notes).toBe('A1 isolated attendance review');expect(after.check_in_at).toBe(before.check_in_at);expect(after.check_out_at).toBe(before.check_out_at);expect(after.work_duration_hours).toBe(before.work_duration_hours);
});

test('interrupted older document navigation cannot overwrite the new query',async({page})=>{
 await start(page);let release!:()=>void;let started!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});const observed=new Promise<void>(resolve=>{started=resolve});
 await page.route('**/hr-admin/attendance-records?*',async route=>{
  const url=new URL(route.request().url());if(url.searchParams.get('q')==='obsolete-synthetic-query'){started();await gate}await route.continue();
 });
 const old=page.goto('/hr-admin/attendance-records?q=obsolete-synthetic-query').then(()=>'',e=>String(e));await observed;
 try{await page.goto(`/hr-admin/attendance-records?q=${fixture.manifest.credentials.employee.employee_code}&status=present`);await expect(status(page)).toHaveValue('present')}finally{release()}
 const cancelled=await old;expect(cancelled).toMatch(/ERR_ABORTED|NS_BINDING_ABORTED|interrupted|cancelled|canceled/i);await expect(page).not.toHaveURL(/obsolete-synthetic-query/);await expect(dataRows(page).first()).toContainText('Present');
});

test('pending bulk action rejects duplicate activation',async({page})=>{
 await start(page);const row=dataRows(page).first();const id=await row.getAttribute('data-record-id');await row.getByRole('checkbox').check();
 let release!:()=>void;let ready!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve});const sent=new Promise<void>(resolve=>{ready=resolve});let count=0;
 await page.route('**/api/hr-admin/attendance-records/bulk-actions',async route=>{count++;const response=await route.fetch();ready();await gate;await route.fulfill({response})});
 await toolbar(page).getByRole('button',{name:'Lock',exact:true}).click();await sent;
 try{const pending=toolbar(page).getByRole('button',{name:'Locking records',exact:true});await expect(pending).toBeDisabled();await pending.evaluate((el:HTMLButtonElement)=>el.click());expect(count).toBe(1)}finally{release()}
 await expect(toolbar(page).locator('.notice[role="status"]')).toContainText('1 attendance records updated');expect(count).toBe(1);expect((await readRecord(page,id)).is_locked).toBe(true);
});
