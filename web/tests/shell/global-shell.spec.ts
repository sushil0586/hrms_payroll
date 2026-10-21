import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{test.setTimeout(180000);fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{const p=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:p.username,password:p.password}})).ok()).toBeTruthy()});
test('desktop shell and contextual navigation',async({page},info)=>{
 await page.setViewportSize({width:1440,height:1000});
 for(const route of ['employees','attendance-records','leave-policies']){
  await page.goto('/hr-admin/'+route);await expect(page.locator('.accerio-shell')).toBeVisible();
  await expect(page.locator('.app-sidebar__brand strong')).toHaveText('Accerio');
  expect(await page.locator('.brand-mark').evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
  expect((await page.locator('.app-sidebar').boundingBox())!.width).toBe(224);
  await expect(page.getByRole('contentinfo',{name:'Workspace footer'})).toBeAttached();
  await page.screenshot({path:`../docs/qa/evidence/hr-admin-global-shell/${info.project.name}-${route}-desktop.png`,fullPage:true});
 }
 const input=page.getByRole('searchbox',{name:'Workspace search'});await input.fill('Employees');
 await expect(page.locator('.workspace-search__panel')).toBeVisible();await input.press('Escape');
 await expect(page.locator('.workspace-search__panel')).toBeHidden();
});
test('tablet and mobile menu keyboard and real destination',async({page},info)=>{
 for(const width of [768,390,320]){
  await page.setViewportSize({width,height:844});await page.goto('/hr-admin/employees');
  await expect(page.locator('.app-sidebar')).toBeHidden();
  const menu=page.locator('.mobile-workspace-nav summary');await menu.focus();await menu.press('Enter');
  const panel=page.locator('.mobile-workspace-nav__panel');await expect(panel).toBeVisible();
  const box=(await panel.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
  await menu.press('Escape');await expect(panel).toBeHidden();await expect(menu).toBeFocused();
  await menu.press('Enter');await Promise.all([page.waitForURL('**/hr-admin/attendance-operations',{waitUntil:'load'}),panel.locator('a[href="/hr-admin/attendance-operations"]').click()]);await expect(panel).toBeHidden();
  await expect(page).toHaveURL(/\/hr-admin\/attendance-operations/);
  await expect(page.getByRole('heading',{name:'Attendance operations',exact:true})).toBeVisible();
  await page.screenshot({path:`../docs/qa/evidence/hr-admin-global-shell/${info.project.name}-${width}.png`,fullPage:true});
 }
});
test('employee cannot acquire HR shell',async({page})=>{
 await page.request.post('/api/auth/logout');const p=workspacePersona(fixture,'employee');
 expect((await page.request.post('/api/auth/login',{data:{identifier:p.username,password:p.password}})).ok()).toBeTruthy();
 await page.goto('/hr-admin/employees');await expect(page).not.toHaveURL(/\/hr-admin\/employees/);await expect(page.locator('.accerio-shell')).toHaveCount(0);
 expect((await page.request.get('/api/hr-admin/employees')).status()).toBe(403);
});
test('keyboard search, neighboring workspaces and sign out',async({page})=>{
 await page.goto('/hr-admin/employees');
 const input=page.getByRole('searchbox',{name:'Workspace search'});await input.fill('Employees');await expect(page.locator('.workspace-search__panel')).toBeVisible();await input.press('Escape');await page.keyboard.press('Control+k');await expect(input).toBeFocused();
 await input.fill('Attendance');await input.press('Enter');await expect(page).toHaveURL(/\/hr-admin\/attendance/);
 for(const path of ['/ess','/mss/approvals']){await page.goto(path);await expect(page.locator('.accerio-workspace')).toBeVisible();await expect(page.locator('.accerio-shell')).toHaveCount(0)}
 await page.goto('/hr-admin/employees');await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page).toHaveURL(/\/login/);
});
test('shell automated accessibility and reduced motion',async({page},info)=>{
 await page.goto('/hr-admin/employees');await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const results=await page.evaluate(async()=>{
  const axe=(window as unknown as {axe:{run:(context:object,options:object)=>Promise<{violations:unknown[]}>}}).axe;
  return axe.run({include:[['.app-sidebar'],['.app-topbar'],['.workspace-shell-footer']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});
 });
 await info.attach('shell-axe',{body:JSON.stringify(results,null,2),contentType:'application/json'});expect(results.violations).toEqual([]);
 await page.emulateMedia({reducedMotion:'reduce'});
 expect(await page.locator('.app-sidebar summary').first().evaluate(el=>parseFloat(getComputedStyle(el).transitionDuration))).toBeLessThanOrEqual(0.001);
});
