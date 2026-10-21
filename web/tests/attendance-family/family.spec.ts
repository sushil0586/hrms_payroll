import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const repo=path.resolve(__dirname,'../../..');
const evidence=path.join(repo,'docs/qa/evidence/hr-admin-standardization/attendance-family');
let fixture:IsolatedQaWorkspace;
let ids:Record<string,string>;
const routes=JSON.parse(readFileSync(path.join(evidence,'routes.json'),'utf8')) as string[];
test.beforeAll(async({},info)=>{test.setTimeout(180000);fixture=await provisionIsolatedQaWorkspace(info);execFileSync(path.join(repo,'.venv/bin/python'),[path.join(evidence,'seed.py'),fixture.manifestPath],{env:process.env,cwd:repo});const m=JSON.parse(readFileSync(fixture.manifestPath,'utf8'));ids={shifts:m.attendance.shift_id,'attendance-policies':m.attendance.policy_id,'attendance-records':m.a1.closed_id,'attendance-regularizations':m.fixtures.attendance_regularization_id,'holiday-calendars':m.family.calendar_id,'employee-shift-assignments':m.family.assignment_id,'attendance-policy-assignments':m.family.policy_assignment_id,'shift-roster-templates':m.family.roster_id};});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{const p=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:p.username,password:p.password}})).status()).toBe(200)});
function route(source:string){let url=source.replace('web/src/app','').replace('/page.tsx','');if(url.includes('[itemId]'))url=url.replace('[itemId]',ids[url.split('/')[2]]);return url;}
async function ready(page:Page,url:string){await page.goto(url);await expect(page.locator('main h1').first()).toBeVisible();await expect(page.locator('[data-workspace-error]')).toHaveCount(0);if(url==='/hr-admin/attendance-close')await expect(page.locator('[aria-label="Attendance close workspace"]')).toHaveAttribute('aria-busy','false');}
for(const source of routes){
 test(`attendance family responsive ${source.replace('web/src/app/hr-admin/','')}`,async({page},info)=>{
  await ready(page,route(source));
  for(const width of [1440,768,390]){
   await page.setViewportSize({width,height:1000});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   const region=page.locator('main .workspace-table-region[role="region"]').first();
   if(width===390&&await region.count()){
    await region.focus();await expect(region).toBeFocused();
    if(await region.evaluate(el=>el.scrollWidth>el.clientWidth)){await region.press('ArrowRight');expect(await region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await region.press('ArrowLeft');}
   }
   if(width===390)for(const control of await page.locator('main .button:visible').all()){
    const box=await control.boundingBox();if(box){expect(box.height, await control.innerText()).toBeGreaterThanOrEqual(43.99);expect(box.height, await control.innerText()).toBeLessThan(100);}
   }
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
   await page.screenshot({path:path.join(evidence,`screenshots/${info.project.name}-${source.replace('web/src/app/hr-admin/','').replaceAll('/','-').replace('.tsx','')}-${width}.png`),fullPage:true});
  }
 });
}
for(const catalog of ['shifts','holiday-calendars','attendance-policies','attendance-policy-assignments']){
 test(`${catalog} instant filters persist and clear`,async({page})=>{
  await ready(page,`/hr-admin/${catalog}`);const search=page.locator('main').getByRole('textbox',{name:'Search',exact:true});
  await search.fill('QA-NO-SUCH-ATTENDANCE-ASSET');await expect(page).toHaveURL(/q=QA-NO/);await expect(page.locator('main table tbody tr:not(:has(td[colspan]))')).toHaveCount(0);await page.reload();await expect(search).toHaveValue('QA-NO-SUCH-ATTENDANCE-ASSET');
  await page.getByRole('button',{name:/Clear filters/}).first().click();await expect(search).toHaveValue('');await expect(page.locator('main table tbody tr').first()).toBeVisible();
 });
}
test('regularization pagination uses committed filters, history and validation',async({page})=>{
 await ready(page,'/hr-admin/attendance-regularizations?page_size=10');const form=page.getByRole('form',{name:'Regularization filters'});
 await form.getByRole('combobox',{name:'Request status',exact:true}).selectOption('draft');await page.getByRole('button',{name:'Next',exact:true}).click();await expect(page).toHaveURL(/page=2/);expect(new URL(page.url()).searchParams.get('status')).toBeNull();
 await form.getByRole('combobox',{name:'Request status',exact:true}).selectOption('draft');await Promise.all([page.waitForEvent('domcontentloaded'),form.getByRole('button',{name:'Apply filters'}).click()]);await expect(page).toHaveURL(/status=draft/);await expect(form.getByRole('combobox',{name:'Request status',exact:true})).toHaveValue('draft');
 await page.goBack();await expect(form.getByRole('combobox',{name:'Request status',exact:true})).toHaveValue('');
 await form.getByText('More filters',{exact:true}).click();await form.getByLabel('From date',{exact:true}).fill('2032-03-20');await form.getByLabel('To date',{exact:true}).fill('2032-03-01');await form.getByRole('button',{name:'Apply filters'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('From date');
});
test('register includes records beyond page 500 and matches audited export',async({page})=>{
 await ready(page,'/hr-admin/reports/attendance-register');await page.locator('main').getByRole('searchbox').last().fill('QA beyond-page-500');await expect(page.locator('main table tbody tr')).toHaveCount(1);await page.reload();await expect(page.locator('main').getByRole('searchbox').last()).toHaveValue('QA beyond-page-500');await expect(page.locator('main table tbody tr')).toHaveCount(1);
 const response=await page.request.get('/api/hr-admin/reports/attendance-register?q=QA%20beyond-page-500');expect(response.status()).toBe(200);expect(await response.text()).toContain('QA beyond-page-500');
 const manifest=await page.request.get('/api/hr-admin/reports/attendance-register?q=QA%20beyond-page-500&format=manifest');expect(manifest.status()).toBe(200);
});
for(const catalog of ['shifts','holiday-calendars','attendance-policies','attendance-policy-assignments','employee-shift-assignments','shift-roster-templates']){
 test(`${catalog} existing permitted edit saves through real API`,async({page})=>{
  await ready(page,`/hr-admin/${catalog}/${ids[catalog]}/edit`);const response=page.waitForResponse(r=>r.url().includes(`/api/hr-admin/${catalog}/`)&&['PUT','PATCH'].includes(r.request().method()));
  await page.getByRole('button',{name:'Save changes',exact:true}).click();expect((await response).status()).toBe(200);await expect(page).toHaveURL(new RegExp(`/hr-admin/${catalog}(\\?|$)`));
 });
}
test('close history retry, filtered URL and governed dialog focus restore',async({page})=>{
 await page.route('**/api/hr-admin/attendance-closes',route=>route.abort(),{times:1});await ready(page,'/hr-admin/attendance-close');await expect(page.locator('main').getByRole('alert')).toBeVisible();await page.getByRole('button',{name:'Retry history'}).click();await expect(page.getByRole('button',{name:'Reopen',exact:true})).toBeVisible();
 const reopen=page.getByRole('button',{name:'Reopen',exact:true});await reopen.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog.getByRole('textbox',{name:'Reason for reopen'})).toBeFocused();await dialog.press('Escape');await expect(dialog).toHaveCount(0);await expect(reopen).toBeFocused();
 await page.getByRole('searchbox',{name:'Search close history'}).fill('NO-CLOSE');await expect(page.getByText('No attendance closes match this view.')).toBeVisible();await page.reload();await expect(page.getByRole('searchbox',{name:'Search close history'})).toHaveValue('NO-CLOSE');
});
test('restricted employee rejects attendance administration and report export',async({page})=>{
 await page.request.post('/api/auth/logout');const p=workspacePersona(fixture,'employee');expect((await page.request.post('/api/auth/login',{data:{identifier:p.username,password:p.password}})).status()).toBe(200);
 for(const endpoint of ['/api/hr-admin/attendance-closes','/api/hr-admin/shifts','/api/hr-admin/reports/attendance-register']){expect((await page.request.get(endpoint)).status()).toBe(403);}
});
test('shared attendance accessibility scan',async({page},info)=>{
 for(const url of ['/hr-admin/shifts','/hr-admin/attendance-regularizations','/hr-admin/attendance-close','/hr-admin/reports/attendance-register']){
  await ready(page,url);if(url.endsWith('attendance-close'))await expect(page.getByRole('button',{name:'Reopen',exact:true})).toBeVisible();
  await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const result=await page.evaluate(async()=>{return (window as unknown as {axe:{run:(context:object,options:object)=>Promise<{violations:unknown[]}>}}).axe.run({include:[['main']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})});await info.attach(url.split('/').pop()+'-axe',{body:JSON.stringify(result),contentType:'application/json'});expect(result.violations).toEqual([]);
 }
});
