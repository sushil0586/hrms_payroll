import {expect,test} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info);const output=await promisify(execFile)(process.env.HRMS_QA_PYTHON!,[path.resolve(__dirname,'tenant-timezone.py'),fixture.manifestPath]);await info.attach('owned-negative-offset-tenant',{body:output.stdout,contentType:'application/json'})});
test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(fixture,info));
test('actual New York tenant MSS calendar date and SSR timestamp survive hydration and reload',async({page,browser},info)=>{
 const manager=workspacePersona(fixture,'manager');expect((await page.request.post('/api/auth/login',{data:{identifier:manager.username,password:manager.password}})).status()).toBe(200);
 const endpoint='/api/manager/approval-inbox?include_leave=0&include_history=0&regId='+fixture.manifest.fixtures.attendance_regularization_id;
 const detailResponse=await page.request.get(endpoint);expect(detailResponse.status()).toBe(200);const inbox=await detailResponse.json();expect(inbox.state).toBe('live');expect(inbox.summary.timezone).toBe('America/New_York');const payload=inbox.selectedRegularizationDetail;expect(payload).toBeTruthy();
 const date=payload.attendance_date;expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
 const expected=new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric'}).format(new Date(date+'T12:00:00Z'));
 const url='/mss/approvals?queue=attendance&regId='+fixture.manifest.fixtures.attendance_regularization_id;
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(url);await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');
  const row=page.locator('.detail-row').filter({has:page.locator('.detail-label',{hasText:/^Attendance Date$/})});await expect(row).toBeVisible();
  await row.scrollIntoViewIfNeeded();await info.attach('tenant-date-before-reload.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
  await expect(row).toContainText(expected);
  const applied=page.locator('.detail-row').filter({has:page.locator('.detail-label',{hasText:/^Applied At$/})});const before=(await applied.textContent())!.replace(/\s+/g,' ').trim();
  const response=await page.request.get(url);expect(response.status()).toBe(200);const html=await response.text();
  const server=await page.evaluate(html=>{const d=new DOMParser().parseFromString(html,'text/html');return [...d.querySelectorAll('.detail-row')].find(e=>e.querySelector('.detail-label')?.textContent?.trim()==='Applied At')?.textContent?.replace(/\s+/g,' ').trim()},html);
  expect(server).toBe(before.replace(/\s+/g,' ').trim());
  await page.reload();await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');await expect(row).toContainText(expected);expect((await applied.textContent())!.replace(/\s+/g,' ').trim()).toBe(before);
  await info.attach('tenant-date-parity',{body:JSON.stringify({date,expected,timeZone:'America/New_York',serverAppliedAt:server,hydratedAppliedAt:before,engine:info.project.use.browserName,version:browser.version(),viewport:page.viewportSize(),errors}),contentType:'application/json'});
  expect(errors.filter(e=>/hydration|didn't match|react error #418/i.test(e))).toEqual([]);
 }finally{await info.attach('tenant-date-final.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});await info.attach('page-errors',{body:JSON.stringify(errors),contentType:'application/json'})}
});
