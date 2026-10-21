import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona} from '../helpers/isolated-qa-workspace';
test('assignment checks are cancelled before mutation starts, not after navigation',async({page},info)=>{
 test.setTimeout(180000);const fixture=await provisionIsolatedQaWorkspace(info);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 let releaseCheck=()=>{},releaseSave=()=>{};const checkGate=new Promise<void>(resolve=>releaseCheck=resolve),saveGate=new Promise<void>(resolve=>releaseSave=resolve);let saved:Promise<import('@playwright/test').Response>|undefined;
 try{
  await page.addInitScript(()=>{const target=window as unknown as {leaveNetworkEvents:string[]};target.leaveNetworkEvents=[];const original=window.fetch.bind(window);window.fetch=(input,init)=>{const url=String(input);if(url.endsWith('/leave-policy-assignments/conflicts')){target.leaveNetworkEvents.push('check-start');init?.signal?.addEventListener('abort',()=>target.leaveNetworkEvents.push('check-abort'),{once:true});}if(url.endsWith('/api/hr-admin/leave-policy-assignments')&&init?.method==='POST')target.leaveNetworkEvents.push('save-start');return original(input,init);};});
  const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
  await page.route('**/api/hr-admin/leave-policy-assignments/conflicts',async route=>{await checkGate;await route.abort('aborted').catch(()=>{});});
  await page.route('**/api/hr-admin/leave-policy-assignments',async route=>{if(route.request().method()==='POST')await saveGate;await route.continue();});
  await page.goto('/hr-admin/leave-policy-assignments?leaveAssignmentModal=create');const dialog=page.getByRole('dialog');await dialog.getByLabel('Priority',{exact:true}).fill('934');await dialog.getByLabel('Effective from',{exact:true}).fill('2035-01-01');await dialog.getByLabel('Effective to',{exact:true}).fill('2035-12-31');const checking=page.waitForRequest(r=>r.url().endsWith('/conflicts'));await dialog.getByLabel('Leave policy',{exact:true}).selectOption(fixture.manifest.leave.policy_id);await checking;
  const saving=page.waitForRequest(r=>r.url().endsWith('/api/hr-admin/leave-policy-assignments')&&r.method()==='POST');saved=page.waitForResponse(r=>r.url().endsWith('/api/hr-admin/leave-policy-assignments')&&r.request().method()==='POST');await dialog.getByRole('button',{name:'Create assignment',exact:true}).click();await saving;
  const events=await page.evaluate(()=>(window as unknown as {leaveNetworkEvents:string[]}).leaveNetworkEvents);writeFileSync(path.resolve(__dirname,'../../../docs/qa/evidence/hr-admin-standardization/leave-final',info.project.name+'-assignment-lifetime.json'),JSON.stringify(events));expect(events).toEqual(['check-start','check-abort','save-start']);
  releaseCheck();releaseSave();expect((await saved).status()).toBe(201);await expect(dialog).toHaveCount(0);await expect(page.getByRole('form',{name:'Leave assignment filters',exact:true}).getByRole('button',{name:'Apply filters'})).toBeEnabled();await expect(page.getByRole('table',{name:'Leave assignments',exact:true})).toContainText('934');
 }finally{releaseCheck();releaseSave();await saved?.catch(()=>{});await page.unrouteAll({behavior:'wait'});await cleanupIsolatedQaWorkspace(fixture);}
 expect(errors).toEqual([]);
});
