import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
for(const route of ['/','/login','/forgot-password','/reset-password','/docs']){
 test(`standalone route ${route}`,async({page},info)=>{
  if(route==='/docs'){
   const user=workspacePersona(fixture,'employee');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
  }
  const response=await page.goto(route);expect(response?.status()).toBe(200);await expect(page.locator('main').first()).toBeVisible();if(route==='/docs')await expect(page.locator('main h1')).toHaveText('Accerio HRMS User Guide');
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/public-${info.project.name}-${route.replaceAll('/','')||'home'}-${width}.png`,fullPage:true});
  }
 });
}
test('support keeps an ungranted employee session denied in the shared standalone presentation',async({page},info)=>{
 const user=workspacePersona(fixture,'employee');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 await page.goto('/workspace-access');await expect(page).toHaveURL(/\/ess/);
 for(const route of ['/support','/support/domain-snapshot']){
  await page.goto(`${route}?tenant_code=${fixture.manifest.tenant.code}&session_ref=ungranted-ui-review`);
  await expect(page.locator('.accerio-standalone main.accerio-page')).toBeVisible();await expect(page.locator('main')).toContainText(/denied/i);
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:900});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
   await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/support-${info.project.name}-${route.includes('domain')?'domain':'console'}-${width}.png`,fullPage:true});
  }
 }
});
