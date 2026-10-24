import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,workspacePlatformPersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const inventory=JSON.parse(readFileSync('../docs/ui/hrms-ui-ux-route-inventory.json','utf8')) as {routes:Array<{route:string;workspace:string}>};
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
const roles:Record<string,'hr_admin'|'employee'|'manager'|'tenant_admin'>={'hr-admin':'hr_admin',ess:'employee',mss:'manager','tenant-admin':'tenant_admin'};
for(const entry of inventory.routes.filter(r=>!r.route.includes('[')&&(r.workspace in roles||r.workspace==='platform-admin'))){
 test(`screen ${entry.route}`,async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const persona=entry.workspace==='platform-admin'?workspacePlatformPersona(fixture):workspacePersona(fixture,roles[entry.workspace]);
  expect((await page.request.post('/api/auth/login',{data:{identifier:persona.username,password:persona.password}})).status()).toBe(200);
  const response=await page.goto(entry.route);expect(response?.status()).toBe(200);
  await expect(page.locator('main h1')).toHaveCount(1);await expect(page.locator('main h1')).toBeVisible();
  await expect(page.locator('.accerio-shell')).toBeVisible();
  await expect(page.locator('main.accerio-page')).toBeVisible();
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:900});
   await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),{message:`document overflow: ${entry.route} at ${width}`}).toBeTruthy();
   if(width===390){
    for(const region of await page.locator('main .workspace-table-region').all()){
     if(!await region.isVisible())continue;
     await expect(region).toHaveAttribute('tabindex','0');
     if(await region.evaluate(el=>el.scrollWidth>el.clientWidth)){
      await region.evaluate(el=>{el.scrollLeft=0});await region.focus();await region.press('ArrowRight');
      expect(await region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
      await region.press('ArrowLeft');
     }
    }
   }
   if(width===1440||width===390)await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/screens/${info.project.name}-${entry.route.slice(1).replaceAll('/','-')}-${width}.png`,fullPage:true});
  }
  expect(errors).toEqual([]);
 });
}
