import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace, foreign:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{test.setTimeout(180000);fixture=await provisionIsolatedQaWorkspace(info);foreign=await provisionIsolatedQaWorkspace({...info,title:'foreign-directory'} as typeof info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(foreign);await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{const p=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:p.username,password:p.password}})).status()).toBe(200)});
const rows=(page:import('@playwright/test').Page)=>page.getByRole('table',{name:'Employee directory',exact:true}).locator('tbody tr');
const filters=(page:import('@playwright/test').Page)=>page.getByRole('form',{name:'Directory filters'});
async function ready(page:import('@playwright/test').Page){await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();await expect(page.locator('.workspace-filter-form')).toBeVisible()}
test('search, committed history, refresh and empty reset',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);const form=filters(page);
 await form.getByLabel('Search',{exact:true}).fill('Esha');await form.getByLabel('Search',{exact:true}).press('Enter');await expect(page).toHaveURL(/q=Esha/);await expect(rows(page)).toHaveCount(1);
 await page.reload();await expect(form.getByLabel('Search',{exact:true})).toHaveValue('Esha');
 await form.getByRole('link',{name:'Reset',exact:true}).click();await expect(rows(page)).toHaveCount(6);
 await page.goBack();await expect(form.getByLabel('Search',{exact:true})).toHaveValue('Esha');await expect(rows(page)).toHaveCount(1);
 await form.getByLabel('Search',{exact:true}).fill('No-match-synthetic');await form.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByText('No employees in this view.',{exact:true})).toBeVisible();
 await form.getByRole('link',{name:'Reset',exact:true}).click();await expect(rows(page)).toHaveCount(6);
});
test('combined department, status, manager and readiness filters',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);const f=filters(page);
 await f.getByRole('combobox',{name:'Department',exact:true}).selectOption({label:'QA People'});await f.getByRole('combobox',{name:'Status',exact:true}).selectOption('active');
 await f.getByText('More filters',{exact:true}).click();await f.getByRole('combobox',{name:'Manager review',exact:true}).selectOption('managers');await f.getByRole('combobox',{name:'Readiness',exact:true}).selectOption('ready');await f.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(rows(page)).toHaveCount(1);await expect(rows(page)).toContainText('Manav');await expect(f.getByRole('combobox',{name:'Manager review',exact:true})).toHaveValue('managers');await expect(page.getByText('4 active filters',{exact:false})).toBeVisible();
 await f.getByRole('combobox',{name:'Status',exact:true}).selectOption('inactive');await f.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByText('No employees in this view.',{exact:true})).toBeVisible();
});
test('sorting, pagination and unapplied draft isolation',async({page})=>{
 await page.goto('/hr-admin/employees?page_size=5');await ready(page);await expect(rows(page)).toHaveCount(5);
 const f=filters(page);await f.getByRole('combobox',{name:'Sort by',exact:true}).selectOption('-name');await f.getByRole('button',{name:'Apply',exact:true}).click();await expect(rows(page).first()).toContainText('Tanvi');
 await f.getByLabel('Search',{exact:true}).fill('unsaved draft');await page.getByRole('link',{name:'Next',exact:true}).click();await expect(page).toHaveURL(/page=2/);await expect(page).not.toHaveURL(/unsaved/);await expect(rows(page)).toHaveCount(1);await expect(f.getByLabel('Search',{exact:true})).toHaveValue('');
 await page.getByRole('form',{name:'Directory pagination'}).getByRole('combobox').selectOption('10');await page.getByRole('form',{name:'Directory pagination'}).getByRole('button',{name:'Apply',exact:true}).click();await expect(rows(page)).toHaveCount(6);await expect(page).toHaveURL(/sort=-name/);
 await page.goto('/hr-admin/employees?page=999&page_size=5');await expect(rows(page)).toHaveCount(1);
});
test('detail retry and selection clears with committed scope',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);
 const target=fixture.manifest.credentials.employee.employee_id;let fail=true;
 await page.route(`**/api/hr-admin/employees/${target}`,route=>fail?route.fulfill({status:503,json:{detail:'Synthetic detail interruption'}}):route.continue());
 await page.locator(`tr[data-employee-id="${target}"] .employee-directory-table__identity`).click();await expect(page.locator('.employee-detail-drawer').getByRole('alert')).toContainText('Synthetic detail interruption');fail=false;
 await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.locator('.employee-detail-drawer')).toContainText('Esha');
 await filters(page).getByLabel('Search',{exact:true}).fill(fixture.manifest.credentials.manager.employee_code);await filters(page).getByRole('button',{name:'Apply',exact:true}).click();await expect(rows(page)).toHaveCount(1);await expect(page.locator('.employee-detail-drawer')).toHaveCount(0);
});
test('responsive table keyboard, menu and screenshots',async({page},info)=>{
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto('/hr-admin/employees');await ready(page);await expect(rows(page)).toHaveCount(6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  const region=page.getByRole('region',{name:'Employee directory, scroll for more columns'});await expect(region).toBeVisible();await region.focus();await expect(region).toBeFocused();
  if(width<600){for(const control of await filters(page).getByRole('combobox').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44 - 0.01);await region.press('ArrowRight');expect(await region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await region.press('ArrowLeft')}
  await page.screenshot({path:`../docs/qa/evidence/hr-admin-standardization/attendance-family/screenshots-neighbors/${info.project.name}-${width}.png`,fullPage:true});
 }
});
test('create modal preserves keyboard close and return',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);await page.getByRole('link',{name:'New employee',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog).toContainText('Create employee');await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBeTruthy();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await ready(page);await page.getByRole('link',{name:'New employee',exact:true}).click();await expect(dialog).toBeVisible();await dialog.locator('input:not([type=hidden])').first().fill('Unsaved synthetic draft');page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');await expect(dialog).toBeVisible();page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);
});
test('real API ownership and employee role rejection',async({page})=>{
 expect((await page.request.get(`/api/hr-admin/employees/${foreign.manifest.credentials.employee.employee_id}`)).status()).toBe(404);
 expect((await page.request.get('/api/hr-admin/employees')).status()).toBe(200);
 await page.request.post('/api/auth/logout');const p=workspacePersona(fixture,'employee');expect((await page.request.post('/api/auth/login',{data:{identifier:p.username,password:p.password}})).status()).toBe(200);
 expect((await page.request.get('/api/hr-admin/employees')).status()).toBe(403);await page.goto('/hr-admin/employees');await expect(page).not.toHaveURL(/\/hr-admin\/employees/);
});
test('automated accessibility of shared page patterns',async({page},info)=>{
 await page.goto('/hr-admin/employees');await ready(page);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const result=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(c:object,o:object)=>Promise<{violations:unknown[]}>}}).axe;return axe.run({include:[['.workspace-page-header'],['.workspace-filter-form'],['.workspace-table-region']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})});
 await info.attach('patterns-axe',{body:JSON.stringify(result,null,2),contentType:'application/json'});expect(result.violations).toEqual([]);
});
test('neighboring page headers and shared shell remain compatible',async({page})=>{
 for(const path of ['/hr-admin/attendance-records','/hr-admin/leave-policies','/ess','/mss/approvals']){
  await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();await expect(page.locator('.workspace-page-header')).toHaveCount(path==='/hr-admin/attendance-records'?1:0);
  if(path.startsWith('/hr-admin'))await expect(page.locator('.accerio-shell')).toBeVisible();else await expect(page.locator('.accerio-workspace')).toBeVisible();
 }
});
