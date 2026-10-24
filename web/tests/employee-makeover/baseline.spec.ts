import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('capture Employee Management phase 1 baseline without business writes',async({page})=>{
 const root='../docs/qa/evidence/employee-makeover-phase1-2026-10-22';
 const user=workspacePersona(fixture,'hr_admin');
 expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 const id=fixture.manifest.credentials.employee.employee_id;
 const states=[
  {name:'directory',url:'/hr-admin/employees'},
  {name:'selected-detail',url:`/hr-admin/employees?employeeId=${id}`,focus:'.employee-detail-drawer'},
  {name:'advanced-filters',url:'/hr-admin/employees?managerView=managers'},
  {name:'no-matches',url:'/hr-admin/employees?q=unmatched-phase1'},
  {name:'create-dialog',url:'/hr-admin/employees?create=1'},
  {name:'edit-dialog',url:`/hr-admin/employees?employeeId=${id}&action=edit`},
  {name:'access-dialog',url:`/hr-admin/employees?employeeId=${id}&action=access`},
  {name:'bank-dialog',url:`/hr-admin/employees?employeeId=${id}&action=bank`},
  {name:'create-page',url:'/hr-admin/employees/new'},
  {name:'edit-page',url:`/hr-admin/employees/${id}/edit`},
  {name:'access-page',url:`/hr-admin/employees/${id}/access`},
  {name:'bank-page',url:`/hr-admin/employees/${id}/bank-accounts`},
  {name:'imports',url:'/hr-admin/employees',focus:'#employee-imports'},
 ];
 const observations=[];
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:width===1440?1000:844});
  for(const state of states){
   const errors:string[]=[];const onError=(error:Error)=>errors.push(error.message);page.on('pageerror',onError);
   const response=await page.goto(state.url);expect(response?.status()).toBe(200);await expect(page.locator('main h1').first()).toBeVisible();
   if(state.name.endsWith('-dialog'))await expect(page.getByRole('dialog')).toBeVisible();
   if(state.focus){if(state.name==='imports')await page.locator('#employee-imports details').evaluateAll(items=>items.forEach(el=>(el as HTMLDetailsElement).open=true));await page.locator(state.focus).scrollIntoViewIfNeeded()}
   await page.screenshot({path:`${root}/${state.name}-${width}.png`});
   observations.push({state:state.name,routePattern:state.url.replaceAll(id,'[employeeId]'),width,...await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,headings:[...document.querySelectorAll('main h1,main h2')].map(el=>el.textContent),dialogs:document.querySelectorAll('[role=dialog]').length})),pageErrors:errors});
   page.off('pageerror',onError);expect(errors).toEqual([]);
  }
 }
 for(const width of [1024,768]){await page.setViewportSize({width,height:1000});await page.goto('/hr-admin/employees');await expect(page.locator('main h1')).toBeVisible();await page.screenshot({path:`${root}/directory-${width}.png`})}
 writeFileSync(`${root}/observations.json`,JSON.stringify({scope:'Chromium baseline captures only; no mutation or full interaction/accessibility certification.',observations},null,2)+'\n');
});
