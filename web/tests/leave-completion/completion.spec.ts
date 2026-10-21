import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const repo=path.resolve(__dirname,'../../..');
const evidence=process.env.LEAVE_COMPLETION_EVIDENCE_DIR ?? path.join(repo,'docs/qa/evidence/leave-completion-phase1/feature');
let fixture:IsolatedQaWorkspace;
let data:{dated_id:string;dated_code:string;needle_id:string;policy_name:string;type_code:string;exact_id:string;exact_code:string;employee_code:string;hr_code:string;today:string};
let errors:string[];
test.beforeAll(async({browser},info)=>{
 mkdirSync(evidence,{recursive:true});writeFileSync(path.join(evidence,info.project.name+'-browser.json'),JSON.stringify({engine:browser.browserType().name(),version:browser.version(),platform:process.platform,arch:process.arch,node:process.version},null,2));
 fixture=await provisionIsolatedQaWorkspace(info);
 const code=`import runpy,json; module=runpy.run_path(${JSON.stringify(path.join(repo,'docs/qa/evidence/leave-completion-phase1/browser-fixture.py'))}); print(json.dumps(module['prepare'](${JSON.stringify(fixture.manifestPath)})))`;
 data=JSON.parse(execFileSync(path.join(repo,'.venv/bin/python'),['backend/manage.py','shell','-c',code],{cwd:repo,env:process.env,encoding:'utf8'}).trim().split('\n').at(-1)!);
});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture);});
test.beforeEach(async({page})=>{errors=[];page.on('pageerror',error=>errors.push(error.message));});
test.afterEach(()=>expect(errors).toEqual([]));
async function login(page:Page,role:'employee'|'hr_admin') {const actor=workspacePersona(fixture,role);expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);}
async function backend(page:Page,url:string) {const token=(await page.context().cookies()).find(c=>c.name==='hrms_access_token')?.value;const r=await page.request.get(`${process.env.HRMS_API_BASE_URL}${url}`,{headers:{Authorization:`Token ${token}`}});expect(r.status()).toBe(200);return r.json();}
async function commitAssignments(page:Page) {
 const terminal=page.waitForResponse(response=>response.request().method()==='POST'&&/\/api\/hr-admin\/leave-policy-assignments\/bulk-import\/?$/.test(response.url())&&![301,302,307,308].includes(response.status()));
 await page.getByRole('button',{name:'Commit ready assignment rows'}).click();
 const response=await terminal;expect(response.status()).toBe(201);expect(await response.finished()).toBeNull();
}
async function completeLeaveDocument(page:Page, action:()=>Promise<unknown>) {
 const terminal=page.waitForResponse(response=>response.request().isNavigationRequest()&&new URL(response.url()).pathname==='/ess/leave'&&![301,302,307,308].includes(response.status()));
 await action();
 const document=await terminal;expect(document.status()).toBe(200);expect(await document.finished()).toBeNull();
}
async function applyMonth(page:Page) {
 await completeLeaveDocument(page,()=>page.getByRole('button',{name:'Apply month',exact:true}).click());
}
async function capture(page:Page,label:string) {
 mkdirSync(path.join(evidence,'screenshots'),{recursive:true});
 await page.screenshot({path:path.join(evidence,'screenshots',`${test.info().project.name}-${label}.png`),fullPage:true});
 await page.addScriptTag({content:readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});
 const scan=await page.evaluate(async()=> (window as unknown as {axe:{run:(root:unknown,opts:unknown)=>Promise<{violations:unknown[]}>}}).axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));
 writeFileSync(path.join(evidence,`${test.info().project.name}-${label}-axe.json`),JSON.stringify(scan,null,2));expect(scan.violations).toEqual([]);
}

test('complete-history search finds an older off-page request; query survives pagination refresh and browser history',async({page})=>{
 await login(page,'employee');await page.goto('/ess/leave');
 const table=page.getByRole('table',{name:'Leave request history'});
 await expect(table.locator('tbody tr')).toHaveCount(10);
 const search=page.getByRole('textbox',{name:'Search leave history'});await search.fill('Needle beyond first page');await completeLeaveDocument(page,()=>search.press('Enter'));
 await expect(page).toHaveURL(/q=Needle/);await expect(table.locator('tbody tr')).toHaveCount(1);
 await table.getByRole('button',{name:/View/}).click();await expect(page.getByRole('dialog')).toContainText('Needle beyond first page');await page.keyboard.press('Escape');
 await page.reload();await expect(search).toHaveValue('Needle beyond first page');
 await completeLeaveDocument(page,()=>page.getByRole('link',{name:'Clear filters',exact:true}).click());await expect(table.locator('tbody tr')).toHaveCount(10);
 await page.goBack();await expect(search).toHaveValue('Needle beyond first page');await expect(table.locator('tbody tr')).toHaveCount(1);
 await page.goto('/ess/leave?q=Global+filler');await expect(table.locator('tbody tr')).toHaveCount(10);
 await completeLeaveDocument(page,()=>page.getByRole('link',{name:'Next',exact:true}).click());await expect(page).toHaveURL(/page=2/);await expect(page).toHaveURL(/q=Global/);await expect(search).toHaveValue('Global filler');
 await page.reload();await expect(table.locator('tbody tr')).toHaveCount(10);
});

test('type and overlapping date filters are global and invalid ranges preserve editable controls',async({page})=>{
 await login(page,'employee');await page.goto('/ess/leave?page=3');
 const f=page.getByRole('form',{name:'Leave history filters'});
 await expect(f.getByRole('combobox',{name:'Type',exact:true})).toHaveAccessibleName('Type');
 await f.getByRole('combobox',{name:'Type',exact:true}).selectOption(data.type_code);
 await f.getByLabel('From date').fill('2026-01-17');await f.getByLabel('Through date').fill('2026-01-18');
 await completeLeaveDocument(page,()=>f.getByRole('button',{name:'Apply filters'}).click());
 await expect(page).toHaveURL(/page=1/);await expect(page.getByRole('table',{name:'Leave request history'}).locator('tbody tr')).toHaveCount(1);
 await expect(f.getByLabel('From date')).toHaveValue('2026-01-17');
 await f.getByLabel('From date').fill('2026-10-22');await f.getByLabel('Through date').fill('2026-10-21');
 await f.getByRole('button',{name:'Apply filters'}).click();await expect(f.getByLabel('Through date')).toBeFocused();await expect(f.getByRole('alert')).toContainText('cannot be earlier');
 await f.getByLabel('Through date').fill('2026-10-23');await expect(f.getByRole('alert')).toHaveCount(0);
 await page.goto('/ess/leave?date_from=2026-02-30');await expect(page.getByRole('main').getByRole('alert')).toContainText('valid dates');
 await completeLeaveDocument(page,()=>page.getByRole('link',{name:'Clear filters'}).click());await expect(page.getByRole('heading',{name:'Leave',exact:true})).toBeVisible();
});

test('calendar counts complete filtered history across leap month and selected-day pagination on keyboard',async({page})=>{
 await login(page,'employee');await page.goto('/ess/leave?q=Calendar+complete&month=2024-02');
 const calendar=page.getByRole('region',{name:'Leave request calendar'});await expect(calendar.getByRole('link')).toHaveCount(29);
 const leap=calendar.getByRole('link',{name:'2024-02-29: 14 requests',exact:true});await leap.focus();await completeLeaveDocument(page,()=>page.keyboard.press('Enter'));
 await expect(page).toHaveURL(/day=2024-02-29/);await expect(calendar.getByRole('link',{name:'2024-02-29: 14 requests',exact:true})).toHaveAttribute('aria-current','date');
 await expect(page.getByRole('region',{name:'Selected leave day'})).toContainText('14 matching requests');
 const table=page.getByRole('table',{name:'Leave request history'});await expect(table.locator('tbody tr')).toHaveCount(10);
 await completeLeaveDocument(page,()=>page.getByRole('link',{name:'Next',exact:true}).click());await expect(table.locator('tbody tr')).toHaveCount(4);await expect(calendar.getByRole('link',{name:'2024-02-29: 14 requests',exact:true})).toBeVisible();
 await completeLeaveDocument(page,()=>page.getByRole('link',{name:'Clear selected day'}).click());await page.getByLabel('Calendar month',{exact:true}).fill('2024-03');await applyMonth(page);await expect(calendar.getByRole('link')).toHaveCount(31);await expect(calendar.getByRole('link',{name:'2024-03-01: 14 requests',exact:true})).toBeVisible();
 for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(width===1440) expect(await page.getByRole('form',{name:'Leave history filters'}).evaluate(node=>node.getBoundingClientRect().height)).toBeLessThan(220);
 await expect(page.getByRole('form',{name:'Leave history filters'}).locator('.workspace-filter-fields')).toHaveCSS('display','contents');await capture(page,'calendar-'+width);}
 await page.emulateMedia({reducedMotion:'reduce'});expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
});

test('balance import resolves a filtered-out employee exactly, blocks fuzzy codes and safely retries lookup reads',async({page})=>{
 await login(page,'hr_admin');await page.goto('/hr-admin/leave-balances?q=no-visible-balances');await page.getByText('Import balance actions',{exact:true}).click();
 const box=page.getByLabel('Leave balance CSV data');
 const csv=(code:string)=>`employee_code,leave_policy_name,action,units,effective_date,reason\n${code},${data.policy_name},credit_adjustment,0.50,${data.today},Phase1 exact off-page credit`;
 await box.fill(csv(data.employee_code+'-missing'));let writes=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/api/hr-admin/leave-balances/actions'))writes++;});
 await page.getByRole('button',{name:'Preview leave import',exact:true}).click();await expect(page.getByRole('table',{name:'Leave balance import results'})).toContainText('must exactly match');await expect(page.getByRole('button',{name:'Commit ready leave rows'})).toBeDisabled();expect(writes).toBe(0);
 await box.fill(csv(data.employee_code));await expect(page.getByRole('table',{name:'Leave balance import results'})).toHaveCount(0);
 await page.route('**/api/hr-admin/employees/option-search?*',r=>r.fulfill({status:503,json:{detail:'Lookup unavailable'}}),{times:1});
 await page.getByRole('button',{name:'Preview leave import',exact:true}).click();await expect(page.getByRole('alert').filter({hasText:'Import needs attention'})).toContainText('Employee lookup failed');await expect(box).toHaveValue(csv(data.employee_code));
 await page.getByRole('button',{name:'Preview leave import',exact:true}).click();await expect(page.getByRole('table',{name:'Leave balance import results'})).toContainText('ready');
 const before=await backend(page,`/hr-admin/leave-balances/?employee_id=${fixture.manifest.credentials.employee.employee_id}`);
 await page.getByRole('button',{name:'Commit ready leave rows'}).click();await expect(page.getByRole('table',{name:'Leave balance import results'})).toContainText('created');
 const after=await backend(page,`/hr-admin/leave-balances/?employee_id=${fixture.manifest.credentials.employee.employee_id}`);
 const old=before.items.find((b:{leave_policy_id:string})=>b.leave_policy_id===fixture.manifest.leave.policy_id);const current=after.items.find((b:{id:string})=>b.id===old.id);
 expect(Number(current.closing_balance)).toBe(Number(old.closing_balance)+0.5);expect(writes).toBe(1);
 await page.setViewportSize({width:390,height:844});await capture(page,'off-page-balance-import');
});

test('assignment import detects an off-page existing pair and creates only the exact target among hundreds of similar codes',async({page})=>{
 await login(page,'hr_admin');await page.goto('/hr-admin/leave-policy-assignments?q=no-visible-assignments');await page.getByText('Assignment governance tools',{exact:true}).click();
 const box=page.getByLabel('Leave policy assignment CSV data');const table=page.getByRole('table',{name:'Leave assignment import results'});
 const csv=(code:string)=>`employee_code,leave_policy_name,effective_from,effective_to,priority,is_active\n${code},${data.policy_name},${data.today},,999,true`;
 let writes=0;page.on('request',r=>{if(r.method()==='POST'&&/\/api\/hr-admin\/leave-policy-assignments\/bulk-import\/?$/.test(r.url()))writes++;});
 await page.route('**/api/hr-admin/import-batches',route=>route.abort(),{times:1});
 await box.fill(csv(data.employee_code));await page.getByRole('button',{name:'Preview assignment import'}).click();await expect(table).toContainText('ambiguous active route');await expect(page.getByRole('alert').filter({hasText:'import-batch audit could not be confirmed'})).toBeVisible();await expect(page.getByRole('button',{name:'Commit ready assignment rows'})).toBeDisabled();expect(writes).toBe(0);
 await box.fill(csv(data.exact_code));await expect(table).toHaveCount(0);
 await page.getByRole('button',{name:'Preview assignment import'}).click();await expect(table).toContainText('ready');
 await commitAssignments(page);await expect(table).toContainText('created');expect(writes).toBe(1);
 const rows=await backend(page,`/hr-admin/leave-policy-assignments/?employee_id=${data.exact_id}&leave_policy_id=${fixture.manifest.leave.policy_id}`);expect(rows.total_count).toBe(1);
 const lookup=await page.request.get('/api/hr-admin/employees/option-search?employee_code=PHASE1-EXAC');expect(lookup.status()).toBe(200);expect((await lookup.json()).total_count).toBe(0);
 await page.setViewportSize({width:768,height:900});await capture(page,'exact-assignment-import');
 await login(page,'employee');expect((await page.request.get('/api/hr-admin/employees/option-search?employee_code='+data.exact_code)).status()).toBe(403);expect((await page.request.get('/api/hr-admin/leave-policy-assignments?employee_id='+data.exact_id)).status()).toBe(403);
});

test('shared exact-code lookup keeps attendance and shift import previews safe without committing records',async({page})=>{
 await login(page,'hr_admin');
 let writes=0;page.on('request',r=>{if(r.method()==='POST'&&(/\/api\/hr-admin\/attendance-records\/?$/.test(r.url())||/\/api\/hr-admin\/employee-shift-assignments\/?$/.test(r.url())))writes++;});
 await page.goto('/hr-admin/employee-shift-assignments');await page.route('**/api/hr-admin/import-batches',route=>route.abort(),{times:1});
 const options=await backend(page,'/hr-admin/policy-workbench-options/?include=shifts');expect(options.shifts.length).toBeGreaterThan(0);
 await page.getByLabel('Shift assignment CSV data').fill(`employee_code,shift_name,assignment_kind,effective_from,effective_to,is_primary,rotation_anchor_date\nPHASE1-EXAC,${options.shifts[0].name},fixed,${data.today},,false,`);
 await page.getByRole('button',{name:'Preview shift import',exact:true}).click();
 await expect(page.getByTestId('employee-shift-assignment-import-workbench')).toContainText('Employee code must match an existing employee');
 await page.goto('/hr-admin/attendance-records');await page.getByText('Attendance import tools',{exact:true}).click();const box=page.getByLabel('Attendance CSV data');
 const headers=(await box.inputValue()).trim().split('\n')[0].split(',');const values:Record<string,string>={employee_code:'PHASE1-EXAC',attendance_date:data.today,status:'present',source:'manual',work_duration_hours:'8',overtime_hours:'0',late_minutes:'0',early_exit_minutes:'0',is_regularized:'false',is_locked:'false'};
 await box.fill(headers.join(',')+'\n'+headers.map(key=>values[key]??'').join(','));await page.getByRole('button',{name:'Preview attendance import',exact:true}).click();
 await expect(page.getByTestId('attendance-record-import-workbench').getByRole('region',{name:'Attendance records, scroll for more columns'})).toContainText('Employee code must match an existing employee');expect(writes).toBe(0);
});

test('a superseded history navigation cannot replace the latest committed query',async({page})=>{
 await login(page,'employee');await page.goto('/ess/leave');
 let release!:()=>void;let seen!:()=>void;
 const held=new Promise<void>(resolve=>release=resolve);const intercepted=new Promise<void>(resolve=>seen=resolve);
 await page.route('**/ess/leave?q=Global*',async route=>{seen();await held;await route.continue().catch(()=>{});},{times:1});
 const older=page.goto('/ess/leave?q=Global+filler').catch(error=>String(error));
 await intercepted;
 try{await page.goto('/ess/leave?q=Needle');}finally{release();}
 await older;await expect(page).toHaveURL(/q=Needle/);await expect(page.getByRole('textbox',{name:'Search leave history'})).toHaveValue('Needle');
 await expect(page.getByRole('table',{name:'Leave request history'}).locator('tbody tr')).toHaveCount(1);
});


test('CSV validation does not truncate priorities or round units, and dated assignments follow backend policy',async({page})=>{
 await login(page,'hr_admin');await page.goto('/hr-admin/leave-policy-assignments');await page.getByText('Assignment governance tools',{exact:true}).click();
 const box=page.getByLabel('Leave policy assignment CSV data');const table=page.getByRole('table',{name:'Leave assignment import results'});let businessWrites=0;
 page.on('request',r=>{if(r.method()==='POST'&&(/\/api\/hr-admin\/leave-policy-assignments\/bulk-import$/.test(r.url())||r.url().endsWith('/api/hr-admin/leave-balances/actions')))businessWrites++;});
 const csv=(priority:string,active='true',from=data.today)=>`employee_code,leave_policy_name,effective_from,effective_to,priority,is_active\n${data.dated_code},${data.policy_name},${from},,${priority},${active}`;
 for(const priority of ['2.5','2bad']){await box.fill(csv(priority));await page.getByRole('button',{name:'Preview assignment import'}).click();await expect(table).toContainText('positive whole number');await expect(page.getByRole('button',{name:'Commit ready assignment rows'})).toBeDisabled();}
 await box.fill(csv('777','flase'));await page.getByRole('button',{name:'Preview assignment import'}).click();await expect(table).toContainText('Active must be true or false');
 await box.fill(csv('777','true','2026-02-30'));await page.getByRole('button',{name:'Preview assignment import'}).click();await expect(table).toContainText('valid date in YYYY-MM-DD');expect(businessWrites).toBe(0);
 await box.fill(csv('777'));await page.getByRole('button',{name:'Preview assignment import'}).click();await expect(table).toContainText('ready');await expect(table).toContainText('Existing employee/policy assignment found');
 await commitAssignments(page);await expect(table).toContainText('created');expect(businessWrites).toBe(1);
 const saved=await backend(page,`/hr-admin/leave-policy-assignments/?employee_id=${data.dated_id}&leave_policy_id=${fixture.manifest.leave.policy_id}`);expect(saved.total_count).toBe(2);expect(saved.items.some((row:{effective_to:string})=>row.effective_to==='2026-06-30')).toBe(true);
 await page.goto('/hr-admin/leave-balances');await page.getByText('Import balance actions',{exact:true}).click();const balanceBox=page.getByLabel('Leave balance CSV data');
 for(const units of ['0.005','1.000']){await balanceBox.fill(`employee_code,leave_policy_name,action,units,effective_date,reason\n${data.employee_code},${data.policy_name},credit_adjustment,${units},${data.today},No rounding allowed`);await page.getByRole('button',{name:'Preview leave import',exact:true}).click();await expect(page.getByRole('table',{name:'Leave balance import results'})).toContainText('at most two decimal places');await expect(page.getByRole('button',{name:'Commit ready leave rows'})).toBeDisabled();}
 expect(businessWrites).toBe(1);
});
