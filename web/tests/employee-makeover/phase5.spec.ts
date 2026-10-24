import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import {createHash} from 'node:crypto';
import { provisionIsolatedQaWorkspace, cleanupIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from '../helpers/isolated-qa-workspace';
let fixture: IsolatedQaWorkspace;
let errors: string[];
const root=path.resolve(__dirname,'../../../docs/qa/evidence/employee-makeover-phase5-2026-10-22');
const kinds=['employee','bank','manager'] as const;
type Kind=typeof kinds[number];
const testId=(kind:Kind)=>kind==='employee'?'employee-import-workbench':`employee-${kind}-import-workbench`;
const panel=(page:Page,kind:Kind)=>page.getByTestId(testId(kind));
const employeeId=()=>fixture.manifest.credentials.employee.employee_id;
const employeeCode=()=>fixture.manifest.credentials.employee.employee_code;
const managerCode=()=>fixture.manifest.credentials.manager_b.employee_code;
let serial=0;
function csv(kind:Kind,tag:string,two=false){
 serial++;
 if(kind==='employee'){
 const headers='employee_code,first_name,middle_name,last_name,preferred_name,work_email,personal_email,phone_number,employment_status,date_of_birth,date_of_joining,probation_end_date,confirmation_date,legal_entity,branch,location,business_unit,department,cost_center,designation,grade,employment_type,reporting_manager_code';
 const row=(suffix:string)=>{const vals=Array(23).fill('');vals[0]=`P5-${tag}-${serial}-${suffix}`;vals[1]='Synthetic';vals[8]='active';return vals.join(',')};
 return headers+'\n'+row('a')+(two?'\n'+row('b'):'');
 }
 if(kind==='bank')return 'employee_code,account_holder_name,bank_name,account_number,ifsc_code,branch_name,is_primary\n'+`${employeeCode()},Synthetic Employee,${tag},998877665544,HDFC0001234,QA Branch,true`+(two?`\n${managerCode()},Synthetic Manager,${tag} Other,998877665599,HDFC0001234,QA Branch,false`:'');
 return 'employee_code,reporting_manager_code,effective_date,reason\n'+`${employeeCode()},${managerCode()},2026-10-22,${tag}`+(two?`\n${fixture.manifest.credentials.hr_checker.employee_code},${managerCode()},2026-10-22,${tag} Other`:'');
}
async function open(page:Page,kind:Kind){
 await page.goto('/hr-admin/employees?sort=-name&page_size=5');
 await page.locator('#employee-imports > details > summary').click();
 await panel(page,kind).locator(':scope > summary').click();
 await expect(panel(page,kind).getByRole('textbox',{name:'CSV data',exact:true})).toBeEnabled();
}
async function preview(page:Page,kind:Kind,text:string){const p=panel(page,kind);await p.getByRole('textbox',{name:'CSV data',exact:true}).fill(text);await p.getByRole('button',{name:'Preview import',exact:true}).click();await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false')}
function mutation(url:string,method:string,kind:Kind){return kind==='employee'?url.endsWith('/api/hr-admin/employees')&&method==='POST':kind==='bank'?url.includes('/bank-accounts')&&method==='POST':/\/api\/hr-admin\/employees\/[^/]+$/.test(url)&&method==='PATCH'}
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{errors=[];page.on('pageerror',e=>errors.push(e.message));const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200)});
test.afterEach(()=>expect(errors).toEqual([]));

for(const kind of kinds){
 test(`${kind} preview errors, source invalidation, template upload and focus`,async({page},info)=>{
  await page.setViewportSize({width:390,height:844});await open(page,kind);const p=panel(page,kind);await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeDisabled();
  await p.getByRole('button',{name:'Preview import',exact:true}).click();await expect(p.getByRole('alert')).toContainText('at least one');await expect(p.getByRole('alert')).toBeFocused();await expect(p.getByRole('alert')).not.toHaveClass(/notice--success/);
  await preview(page,kind,csv(kind,info.project.name+' input'));await expect(p.locator('tbody tr')).toHaveCount(1);await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeEnabled();
  const textarea=p.getByRole('textbox',{name:'CSV data',exact:true});await textarea.fill('bad headers\ninvalid');await expect(p.locator('tbody tr')).toHaveCount(0);await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeDisabled();await expect(textarea).toBeFocused();
  page.once('dialog',d=>d.accept());await p.getByLabel('Upload CSV',{exact:true}).setInputFiles({name:'synthetic.csv',mimeType:'text/csv',buffer:Buffer.from(csv(kind,'upload'))});await expect(p.locator('.notice[role="status"]')).toContainText('File loaded');await p.getByRole('button',{name:'Preview import',exact:true}).click();await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false');await expect(p.locator('tbody tr')).toHaveCount(1);
  await page.screenshot({path:`${root}/${info.project.name}-${kind}-preview-390.png`});
 });
 test(`${kind} real commit preserves receipts and does not replay saved rows`,async({page},info)=>{
  await open(page,kind);const p=panel(page,kind);const input=csv(kind,`${info.project.name} real`);await preview(page,kind,input);
  let writes=0;page.on('request',request=>{if(mutation(request.url(),request.method(),kind))writes++});
  page.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'Commit ready rows',exact:true}).click();expect(writes).toBe(0);
  page.once('dialog',d=>d.accept());const response=page.waitForResponse(r=>mutation(r.url(),r.request().method(),kind));await p.getByRole('button',{name:'Commit ready rows',exact:true}).click();const savedResponse=await response;expect(savedResponse.status()).toBe(kind==='manager'?200:201);const saved=await savedResponse.json();await expect(p.locator('.notice[role="status"]')).toContainText('Import complete');await expect(p.locator('.notice[role="status"]')).toBeFocused();await expect(p.locator('tbody')).toContainText('Saved');expect(writes).toBe(1);
  if(kind==='employee'){const current=await page.request.get(`/api/hr-admin/employees/${saved.id}`);expect((await current.json()).employee_code).toBe(saved.employee_code)}
  if(kind==='manager'){const current=await page.request.get(`/api/hr-admin/employees/${employeeId()}`);expect((await current.json()).reporting_manager_id).toBe(fixture.manifest.credentials.manager_b.employee_id)}
  if(kind==='bank'){const current=await (await page.request.get(`/api/hr-admin/employees/${employeeId()}/bank-accounts`)).json();const rows=Array.isArray(current)?current:current.results;expect(rows.filter((r:{is_primary:boolean})=>r.is_primary)).toHaveLength(1);expect(rows.find((r:{id:string})=>r.id===saved.id).is_primary).toBe(true);await expect(p.locator('table')).not.toContainText('998877665544')}
  await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false');await page.screenshot({path:`${root}/${info.project.name}-${kind}-committed.png`});const history=await (await page.request.get(`/api/hr-admin/import-batches?source_hash=${createHash('sha256').update(input).digest('hex')}`)).json();expect(history.items.some((r:{status:string;created_count:number})=>r.status==='committed'&&r.created_count===1)).toBe(true);await p.getByRole('textbox',{name:'CSV data',exact:true}).fill(input+'\n');await expect(p.getByRole('region',{name:'Earlier row receipts'})).toContainText('Saved');await p.getByRole('button',{name:'Preview import',exact:true}).click();await expect(p.locator('tbody')).toContainText('Saved');await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeDisabled();expect(writes).toBe(1);
  await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false');await page.screenshot({path:`${root}/${info.project.name}-${kind}-saved.png`});
 });
 test(`${kind} pending locks source and actions, then rejection preserves draft`,async({page})=>{
  await open(page,kind);const p=panel(page,kind);const input=csv(kind,'rejected');await preview(page,kind,input);let release!:()=>void;const gate=new Promise<void>(r=>release=r);let writes=0;
  await page.route('**/api/hr-admin/employees**',async route=>{if(!mutation(route.request().url(),route.request().method(),kind))return route.continue();writes++;await gate;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({detail:'Synthetic row rejected.'})})});
  page.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Commit ready rows',exact:true}).click();await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','true');await expect(p.getByRole('textbox',{name:'CSV data',exact:true})).toBeDisabled();await expect(p.getByRole('button',{name:'Preview import',exact:true})).toBeDisabled();await expect(p.getByLabel('Upload CSV',{exact:true})).toBeDisabled();await expect(p.getByRole('button',{name:'Committing rows',exact:true})).toBeDisabled();release();await expect(p.getByRole('alert')).toContainText('Batch finished');await expect(p.getByRole('alert')).toBeFocused();await expect(p.getByRole('textbox',{name:'CSV data',exact:true})).toHaveValue(input);expect(writes).toBe(1);await expect(p.locator('tbody')).toContainText('Synthetic row rejected.');
 });
 test(`${kind} uncertain write stops later rows and cannot be replayed by preview`,async({page},info)=>{
  await open(page,kind);const p=panel(page,kind);await preview(page,kind,csv(kind,'uncertain',true));await expect(p.locator('tbody tr')).toHaveCount(2);let writes=0;
  await page.route('**/api/hr-admin/employees**',route=>{if(!mutation(route.request().url(),route.request().method(),kind))return route.continue();writes++;return route.abort('failed')});
  page.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Commit ready rows',exact:true}).click();await expect(p.getByRole('alert')).toContainText('outcome unconfirmed');await expect(p.getByRole('alert')).toBeFocused();await expect(p.locator('tbody')).toContainText('No automatic retry');expect(writes).toBe(1);await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeDisabled();await p.getByRole('button',{name:'Preview import',exact:true}).click();await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeDisabled();expect(writes).toBe(1);await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false');await page.screenshot({path:`${root}/${info.project.name}-${kind}-unconfirmed.png`});
 });
 test(`${kind} mixed local validation and missing history receipt are truthful`,async({page})=>{
  await open(page,kind);const p=panel(page,kind);let text=csv(kind,'mixed',true);text=text+'\n'+(kind==='employee'?',,,,,,,,active,,,,,,,,,,,,,,':kind==='bank'?'UNKNOWN,,,,,,true':'UNKNOWN,UNKNOWN,not-a-date,');
  await page.route('**/api/hr-admin/import-batches',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));await preview(page,kind,text);await expect(p.locator('tbody tr')).toHaveCount(3);await expect(p.getByRole('alert').filter({hasText:'Preview ready'})).toContainText('1 blocked');await expect(p.getByRole('alert').filter({hasText:'Import history needs checking'})).toBeVisible();await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeEnabled();
 });
}

test('responsive import hierarchy, keyboard scroll, and scoped accessibility',async({page},info)=>{
 test.setTimeout(240000);
 for(const width of [1440,1024,768,390,320])for(const kind of kinds){
  await page.setViewportSize({width,height:width===320?568:844});await open(page,kind);const p=panel(page,kind);await preview(page,kind,csv(kind,'Responsive '+('Long detail '.repeat(12))));await expect(p.getByRole('textbox',{name:'CSV data',exact:true})).toHaveCSS('min-height','160px');await p.locator(':scope > summary').scrollIntoViewIfNeeded();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();if(info.project.name==='chromium')await page.screenshot({path:`${root}/${kind}-${width}-top.png`});
  const footer=p.locator('.employee-import-panel__actions');await footer.scrollIntoViewIfNeeded();await expect.poll(()=>footer.locator('button').evaluateAll(buttons=>buttons.every(b=>b.scrollWidth<=b.clientWidth+1&&b.getBoundingClientRect().left>=0&&b.getBoundingClientRect().right<=innerWidth))).toBeTruthy();if(info.project.name==='chromium')await page.screenshot({path:`${root}/${kind}-${width}-review.png`});
  if(width===320){const region=p.getByRole('region',{name:/preview$/});await region.focus();await page.keyboard.press('ArrowRight');await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await page.keyboard.press('ArrowLeft');await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBe(0)}
  if(width===390){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const scan=await page.evaluate(async selector=>{const axe=(window as unknown as {axe:{run:(c:object,o:object)=>Promise<{violations:unknown[]}>}}).axe;return axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})},`[data-testid="${testId(kind)}"]`);await info.attach(`${kind}-axe`,{body:JSON.stringify(scan),contentType:'application/json'});expect(scan.violations).toEqual([])}
 }
});
test('employee persona cannot see imports or mutate employee records',async({page})=>{
 const user=workspacePersona(fixture,'employee');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);await page.goto('/hr-admin/employees');await expect(page.locator('#employee-imports')).toHaveCount(0);
 for(const [url,method] of [['/api/hr-admin/employees','POST'],[`/api/hr-admin/employees/${employeeId()}/bank-accounts`,'POST'],[`/api/hr-admin/employees/${employeeId()}`,'PATCH']]){const r=await page.request.fetch(url,{method,data:{first_name:'Denied'}});expect(r.status()).toBe(403)}
});

for(const kind of kinds)test(`${kind} real partial batch retains success while a later rejection is correctable`,async({page},info)=>{
 await open(page,kind);const p=panel(page,kind);const input=csv(kind,`${info.project.name} partial`,true);await preview(page,kind,input);let writes=0;let savedId='';
 await page.route('**/api/hr-admin/employees**',async route=>{
  if(!mutation(route.request().url(),route.request().method(),kind))return route.continue();writes++;
  if(writes===1){const r=await route.fetch();expect(r.status()).toBe(kind==='manager'?200:201);savedId=(await r.json()).id;return route.fulfill({response:r})}
  return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({detail:'Second row rejected for correction.'})});
 });
 page.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Commit ready rows',exact:true}).click();await expect(p.getByRole('alert')).toContainText('1 saved; 1 blocked or rejected');await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false');expect(writes).toBe(2);expect(savedId).not.toBe('');await page.screenshot({path:`${root}/${info.project.name}-${kind}-partial.png`});
 await p.getByRole('button',{name:'Preview import',exact:true}).click();await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false');await expect(p.locator('tbody tr').first()).toContainText('Saved');await expect(p.locator('tbody tr').nth(1)).toContainText('ready');expect(writes).toBe(2);
});
for(const status of [500,200])test(`employee incomplete ${status} receipt halts without a retry`,async({page})=>{
 await open(page,'employee');const p=panel(page,'employee');await preview(page,'employee',csv('employee',`incomplete-${status}`,true));let writes=0;
 await page.route('**/api/hr-admin/employees',route=>{if(route.request().method()!=='POST')return route.continue();writes++;return route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===500?{detail:'Synthetic server failure'}:{})})});
 page.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Commit ready rows',exact:true}).click();await expect(p.getByRole('alert')).toContainText('outcome unconfirmed');await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeDisabled();expect(writes).toBe(1);
});
test('clipboard and file-read failures preserve the existing CSV',async({page})=>{
 await open(page,'bank');const p=panel(page,'bank');const input=csv('bank','preserved');await p.getByRole('textbox',{name:'CSV data',exact:true}).fill(input);
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Synthetic clipboard failure')}}});File.prototype.text=async()=>{throw new Error('Synthetic file read failure')}});
 await p.getByRole('button',{name:'Copy template',exact:true}).click();await expect(p.getByRole('alert')).toContainText('Template could not be copied');await expect(p.getByRole('textbox',{name:'CSV data',exact:true})).toHaveValue(input);
 page.once('dialog',d=>d.accept());await p.getByLabel('Upload CSV',{exact:true}).setInputFiles({name:'broken.csv',mimeType:'text/csv',buffer:Buffer.from('invalid')});await expect(p.getByRole('alert')).toContainText('File could not be read');await expect(p.getByRole('textbox',{name:'CSV data',exact:true})).toHaveValue(input);await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false');
});

test('ambiguous manager names are blocked and employee codes disambiguate both imports',async({page},info)=>{
 const names={first_name:'Same',last_name:'Manager',employment_status:'active'};
 const codes=[`P5-SAME-A-${info.project.name}`,`P5-SAME-B-${info.project.name}`];
 for(const code of codes)expect((await page.request.post('/api/hr-admin/employees',{data:{...names,employee_code:code}})).status()).toBe(201);
 for(const kind of ['employee','manager'] as const){
  await open(page,kind);let text=csv(kind,'ambiguous');
  if(kind==='employee')text=text.replace(/\n([^\n]+)$/,(_,row:string)=>'\n'+row+ 'Same Manager');else text=text.replace(managerCode(),'Same Manager');
  await preview(page,kind,text);const p=panel(page,kind);await expect(p.locator('tbody')).toContainText('unambiguous');await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeDisabled();
  await preview(page,kind,text.replace('Same Manager',codes[0]));await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeEnabled();
 }
});

test('filtered directory keeps full import employee lookup and secondary tools',async({page})=>{
 await page.goto('/hr-admin/employees?q=Esha&sort=-name&page_size=5');await expect(page.locator('#employee-imports > details')).not.toHaveAttribute('open','');await page.locator('#employee-imports > details > summary').click();
 for(const kind of kinds)await expect(panel(page,kind)).not.toHaveAttribute('open','');
 await panel(page,'bank').locator(':scope > summary').click();await preview(page,'bank',csv('bank','Outside matching scope').replace(employeeCode(),managerCode()));await expect(panel(page,'bank').getByRole('button',{name:'Commit ready rows',exact:true})).toBeEnabled();await expect(page).toHaveURL(/q=Esha/);await expect(page).toHaveURL(/page_size=5/);
});

test('sample replacement can be cancelled and requires a fresh preview',async({page})=>{
 for(const kind of kinds){
  await open(page,kind);const p=panel(page,kind);const text=csv(kind,'Keep draft');await preview(page,kind,text);page.once('dialog',d=>d.dismiss());await p.getByRole('button',{name:'Load sample template',exact:true}).click();await expect(p.getByRole('textbox',{name:'CSV data',exact:true})).toHaveValue(text);await expect(p.locator('tbody tr')).toHaveCount(1);
  page.once('dialog',d=>d.accept());await p.getByRole('button',{name:'Load sample template',exact:true}).click();await expect(p.getByRole('textbox',{name:'CSV data',exact:true})).not.toHaveValue(text);await expect(p.locator('tbody tr')).toHaveCount(0);await expect(p.getByRole('button',{name:'Commit ready rows',exact:true})).toBeDisabled();await p.getByRole('button',{name:'Preview import',exact:true}).click();await expect(p.locator('[aria-busy]').first()).toHaveAttribute('aria-busy','false');await expect(p.locator('tbody tr')).not.toHaveCount(0);
 }
});
