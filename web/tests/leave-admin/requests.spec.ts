import {test,expect,type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const repo=path.resolve(__dirname,'../../..');
const seedEvidence=path.join(repo,'docs/qa/evidence/hr-admin-standardization/leave-applications');
const evidence=process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT ? path.join(process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT,"applications") : process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_DIR ?? seedEvidence;
let fixture:IsolatedQaWorkspace,foreign:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{test.setTimeout(180000);fixture=await provisionIsolatedQaWorkspace(info);foreign=await provisionIsolatedQaWorkspace(info);execFileSync(path.join(repo,'.venv/bin/python'),[path.join(seedEvidence,'seed.py'),fixture.manifestPath],{cwd:repo,env:process.env});});
test.afterAll(async({},info)=>{await cleanupIsolatedQaWorkspace(foreign);await cleanupIsolatedQaWorkspace(fixture);writeFileSync(path.join(evidence,`${info.project.name}-cleanup.json`),JSON.stringify({verified_absent:true}));});
test.beforeEach(async({page})=>{const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);});
const filters=(p:Page)=>p.getByRole('form',{name:'Leave request filters',exact:true});
const rows=(p:Page)=>p.getByRole('table',{name:'Leave requests',exact:true}).locator('tbody tr');
async function backendDetail(p:Page,id:string){const token=(await p.context().cookies()).find(cookie=>cookie.name==='hrms_access_token')?.value;return p.request.get(`${process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8052/api/v1"}/hr-admin/leave-requests/${id}/`,{headers:{Authorization:`Token ${token}`}});}
async function start(p:Page){await p.goto('/hr-admin/leave-requests?page_size=10');await expect(p.getByRole('heading',{name:'Leave Requests',exact:true})).toBeVisible();await expect(filters(p).getByLabel('Request status')).toBeEnabled();}
test('committed filters survive Enter, refresh and Back without dirty drafts',async({page})=>{
 await start(page);await expect(page.getByRole('complementary',{name:'Leave request detail'})).toHaveCount(0);
 await filters(page).getByLabel('Request status').selectOption('rejected');await filters(page).getByLabel('Search',{exact:true}).press('Enter');await expect(page).toHaveURL(/status=rejected/);await expect(rows(page)).toHaveCount(10);
 await filters(page).getByLabel('Request status').selectOption('pending');await page.getByRole('link',{name:'Next',exact:true}).click();await expect(page).toHaveURL(/page=2/);await expect(page).toHaveURL(/status=rejected/);await expect(filters(page).getByLabel('Request status')).toHaveValue('rejected');
 await page.reload();await expect(rows(page)).toHaveCount(10);await filters(page).getByRole('link',{name:'Clear filters'}).click();await expect(page).not.toHaveURL(/status=/);await page.goBack();await expect(filters(page).getByLabel('Request status')).toHaveValue('rejected');
});
test('page size excludes drafts and invalid page recovers safely',async({page})=>{
 await start(page);await filters(page).getByLabel('Search',{exact:true}).fill('unapplied-search');const pager=page.getByRole('form',{name:'Leave request pagination'});await pager.getByLabel('Rows').selectOption('25');const resizedDocument=page.waitForResponse(r=>r.request().isNavigationRequest()&&new URL(r.url()).pathname==='/hr-admin/leave-requests'&&![301,302,307,308].includes(r.status()));await pager.getByRole('button',{name:'Apply',exact:true}).click();const resized=await resizedDocument;expect(resized.status()).toBe(200);expect(await resized.finished()).toBeNull();await expect(rows(page)).toHaveCount(25);await expect(page).not.toHaveURL(/unapplied-search/);
 await page.goto('/hr-admin/leave-requests?page=999&page_size=10&status=rejected');await expect(page).toHaveURL(/page=4/);await expect(rows(page)).toHaveCount(2);
});
test('date validation, combined search, empty and reset',async({page})=>{
 await start(page);await filters(page).getByText('More filters',{exact:true}).click();await filters(page).getByLabel('From date').fill('2026-10-20');await filters(page).getByLabel('To date').fill('2026-09-01');await filters(page).getByRole('button',{name:'Apply filters'}).click();await expect(filters(page).getByRole('alert')).toHaveText('From date must be on or before to date.');await expect(filters(page).getByLabel('To date')).toBeFocused();
 await filters(page).getByLabel('From date').fill('2026-09-01');await filters(page).getByLabel('Search',{exact:true}).fill('QA leave pagination 00');await filters(page).getByRole('button',{name:'Apply filters'}).click();await expect(rows(page)).toHaveCount(1);await page.reload();await expect(filters(page).getByLabel('From date')).toHaveValue('2026-09-01');
 await filters(page).getByLabel('Search',{exact:true}).fill('no-match-qa');await filters(page).getByLabel('Search',{exact:true}).press('Enter');await expect(page.getByText('No leave requests match the current filters.',{exact:true})).toBeVisible();
 await page.goto('/hr-admin/leave-requests?from_date=2026-02-31');await expect(page.locator('main').getByRole('alert')).toContainText('valid calendar date');const resetDocument=page.waitForResponse(response=>response.request().isNavigationRequest()&&new URL(response.url()).pathname==='/hr-admin/leave-requests'&&![301,302,307,308].includes(response.status()));await page.getByRole('link',{name:'Clear filters'}).click();const reset=await resetDocument;expect(reset.status()).toBe(200);expect(await reset.finished()).toBeNull();await expect(rows(page)).toHaveCount(25);
});
test('explicit detail, approval modal keyboard validation and scope preservation',async({page})=>{
 await page.goto('/hr-admin/leave-requests?status=pending&page_size=10');await page.getByRole('link',{name:/Inspect leave request/}).first().click();const detail=page.getByRole('complementary',{name:'Leave request detail'});await expect(detail).toBeVisible();await expect(detail.getByText('Approval track',{exact:true})).toBeVisible();const review=detail.getByRole('link',{name:'Review',exact:true});await review.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Review leave request'});await expect(dialog).toBeVisible();await expect(dialog.getByLabel('Decision note')).toBeFocused();await dialog.getByRole('button',{name:'Approve',exact:true}).focus();await page.keyboard.press('Tab');await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);await dialog.getByLabel('Decision note').fill('');await dialog.getByRole('button',{name:'Reject',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('decision note is required');await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(page).toHaveURL(/status=pending/);await expect(detail).toBeVisible();await expect(review).toBeFocused();
 await detail.getByRole('link',{name:'Close',exact:true}).click();await expect(detail).toHaveCount(0);
});
test('authorized APIs reject foreign detail and employee administration',async({page})=>{
 const id=foreign.manifest.fixtures.leave_request_id;
 expect((await backendDetail(page,id)).status()).toBe(404);
 expect((await page.request.post(`/api/hr-admin/leave-requests/${id}/reject`,{data:{comment:'Unauthorized foreign request'}})).status()).toBe(404);
 const employee=workspacePersona(fixture,'employee');expect((await page.request.post('/api/auth/login',{data:{identifier:employee.username,password:employee.password}})).status()).toBe(200);
 expect((await page.request.get('/api/hr-admin/leave-requests')).status()).toBe(403);
 expect((await page.request.post(`/api/hr-admin/leave-requests/${fixture.manifest.fixtures.leave_request_id}/reject`,{data:{comment:'Not allowed'}})).status()).toBe(403);
});
test('responsive rendering, named keyboard scroll, axe and screenshots',async({page},info)=>{
 await start(page);await page.addScriptTag({content:readFileSync(require.resolve('axe-core/axe.min.js'),'utf8')});
 const violations=await page.evaluate(async()=>{const result=await (window as unknown as {axe:{run:(a:unknown,b:unknown)=>Promise<{violations:unknown[]}>}}).axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations;});writeFileSync(path.join(evidence,`${info.project.name}-axe.json`),JSON.stringify(violations,null,2));expect(violations).toEqual([]);
 mkdirSync(path.join(evidence,'screenshots'),{recursive:true});for(const width of [1440,768,390]){await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(evidence,'screenshots',`${info.project.name}-${width}.png`),fullPage:true});}
 const scroll=page.getByRole('region',{name:'Leave requests table scroll'});await scroll.focus();await page.keyboard.press('ArrowRight');await expect(scroll).toBeFocused();await expect.poll(()=>scroll.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await page.keyboard.press('ArrowLeft');
 await page.getByRole('link',{name:/Inspect leave request/}).first().click();await expect(page.getByRole('complementary',{name:'Leave request detail'})).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(evidence,'screenshots',`${info.project.name}-390-detail.png`),fullPage:true});
});
test('decision transport failure retains note and real retry updates request',async({page})=>{
 await page.goto(`/hr-admin/leave-requests?status=pending&selectedLeave=${fixture.manifest.fixtures.leave_request_id}&overrideLeave=${fixture.manifest.fixtures.leave_request_id}`);
 const dialog=page.getByRole('dialog',{name:'Review leave request'});await dialog.getByLabel('Decision note').fill('Synthetic QA rejection for UI retry verification');
 await page.route(`**/api/hr-admin/leave-requests/${fixture.manifest.fixtures.leave_request_id}/reject`,route=>route.abort(),{times:1});await dialog.getByRole('button',{name:'Reject',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Unable to reach the server');await expect(dialog.getByLabel('Decision note')).toHaveValue('Synthetic QA rejection for UI retry verification');
 await dialog.getByRole('button',{name:'Reject',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByRole('complementary',{name:'Leave request detail'}).getByText('Rejected',{exact:true}).first()).toBeVisible();
 const response=await backendDetail(page,fixture.manifest.fixtures.leave_request_id);expect(response.status()).toBe(200);expect((await response.json()).status).toBe('rejected');
});
test('neighboring Employees and Attendance retain responsive navigation',async({page})=>{
 for(const [route,title] of [['employees','Employees'],['attendance-records','Attendance records'],['attendance-regularizations','Regularizations']]){
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});await page.goto(`/hr-admin/${route}`);await expect(page.getByRole('heading',{name:title,exact:true}).first()).toBeVisible();await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
 }
});
