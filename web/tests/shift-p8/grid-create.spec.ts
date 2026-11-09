import {expect,test,type Page,type TestInfo,type Locator} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
import {retainShiftMutationEvidence} from '../shift-pilot/database-evidence';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(fixture,info));
async function login(page:Page){const a=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:a.username,password:a.password}})).status()).toBe(200)}
async function capture(page:Page,info:TestInfo,id:string,dialog?:Locator){
 const frames:string[]=[];
 await page.evaluate(()=>document.fonts.ready);
 if(dialog){
  const steps=await dialog.evaluate(root=>{const el=[...root.querySelectorAll<HTMLElement>('*')].find(e=>e.scrollHeight>e.clientHeight+4&&['auto','scroll'].includes(getComputedStyle(e).overflowY));if(!el)return[0];const max=el.scrollHeight-el.clientHeight,step=Math.max(100,el.clientHeight-80);return [...new Set([...Array.from({length:Math.ceil(max/step)+1},(_,i)=>Math.min(max,i*step)),max])];});
  for(let i=0;i<steps.length;i++){
   await dialog.evaluate((root,top)=>{const el=[...root.querySelectorAll<HTMLElement>('*')].find(e=>e.scrollHeight>e.clientHeight+4&&['auto','scroll'].includes(getComputedStyle(e).overflowY));if(el)el.scrollTop=top;},steps[i]);
   const name=`${id}.modal-${i}.png`;await info.attach(name,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});frames.push(name);
  }
  await dialog.getByRole('button',{name:'Cancel',exact:true}).scrollIntoViewIfNeeded();const footer=id+'.modal-footer.png';await info.attach(footer,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});frames.push(footer);
 }else{
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));const name=id+'.png';await info.attach(name,{body:await page.screenshot({fullPage:true,animations:'disabled'}),contentType:'image/png'});frames.push(name);
 }
 await info.attach(id+'.cell',{body:JSON.stringify({id,route:new URL(page.url()).pathname,engine:info.project.use.browserName,viewport:page.viewportSize(),frames,visual:'NOT RUN until each native frame reviewed',at:new Date().toISOString()}),contentType:'application/json'});
}
test('all horizontal grid columns and assignment create validation visual states',async({page},info)=>{
 await login(page);
 for(const [route,label,id]of[['/hr-admin/shifts','Shifts, scroll for more columns','SH-V01.populated'],['/hr-admin/employee-shift-assignments','Employee shift assignments, scroll for more columns','SH-V04.populated']]as const){
  await page.goto(route);await expect(page.locator('[data-local-update-hydrated="true"]').first()).toBeVisible();const region=page.getByRole('region',{name:label});
  const stops=await region.evaluate(el=>{const max=el.scrollWidth-el.clientWidth,step=Math.max(80,el.clientWidth-80);return [...new Set([...Array.from({length:Math.ceil(max/step)+1},(_,i)=>Math.min(max,i*step)),max])]});
  for(let n=0;n<stops.length;n++){await region.evaluate((el,left)=>{el.scrollLeft=left},stops[n]);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));await capture(page,info,id+'.columns-'+n);}
  await info.attach(id+'.columns.cell',{body:JSON.stringify({id,viewport:page.viewportSize(),positions:stops,visual:'NOT RUN until every native horizontal frame inspected'}),contentType:'application/json'});
 }
 await page.getByRole('button',{name:'Create assignment',exact:true}).first().click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await capture(page,info,'SH-V04.create-modal',dialog);
 await dialog.getByRole('button',{name:'Create assignment',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText('Review the highlighted fields');await expect(dialog.getByText('Employee: Choose an employee.',{exact:true})).toBeVisible();await capture(page,info,'SH-V04.validation',dialog);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Inspect',exact:true}).first().click();await page.getByRole('complementary',{name:'Shift assignment detail',exact:true}).getByRole('button',{name:'Edit assignment',exact:true}).click();await capture(page,info,'SH-V04.edit-modal',page.getByRole('dialog'));await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
 await info.attach('scope',{body:JSON.stringify({businessWrites:false,gridCapture:'All overlapping horizontal stops; actual screenshots require independent review.',required:'Actual existing form validation, no response mock.'}),contentType:'application/json'});
});
