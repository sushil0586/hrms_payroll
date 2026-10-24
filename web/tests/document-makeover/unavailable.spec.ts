import {test,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'../../../docs/qa/evidence/document-makeover-phase1-followup-2026-10-22');
const fixture=JSON.parse(readFileSync('/tmp/hrms-doc-followup-context.json','utf8'));
test('document-read outage baseline with healthy authentication',async({page})=>{
 const notes=[];
 for(const [role,url,heading] of [['hr_admin','/hr-admin/documents','HR admin could not load the current workspace'],['employee','/ess/documents','Employee information is unavailable']]){
  const user=fixture.a.credentials[role];expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:'Password@123'}})).status()).toBe(200);
  const r=await page.goto(url,{waitUntil:'domcontentloaded'});await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible({timeout:30000});await expect(page.getByRole('button',{name:/Retry/})).toBeEnabled();await page.screenshot({path:path.join(root,'unavailable-'+role+'.png')});notes.push({role,path:url,status:r?.status(),heading,scope:'Document reads return synthetic 503 through owned proxy; authentication/session forwarded to healthy backend.'});
 }
 writeFileSync(path.join(root,'unavailable-observations.json'),JSON.stringify(notes,null,2)+'\n');
});
