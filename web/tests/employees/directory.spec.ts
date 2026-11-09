import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace, foreign:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{test.setTimeout(180000);fixture=await provisionIsolatedQaWorkspace(info);foreign=await provisionIsolatedQaWorkspace({...info,title:'foreign-directory'} as typeof info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(foreign);await cleanupIsolatedQaWorkspace(fixture)});
async function loginAs(page:import('@playwright/test').Page,persona:'hr_admin'|'employee'){
 const user=workspacePersona(fixture,persona),response=await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}});expect(response.status()).toBe(200);const token=(await page.context().cookies()).find(cookie=>cookie.name==='hrms_access_token')?.value;expect(token).toBeTruthy();await page.context().addCookies([{name:'hrms_access_token',value:token!,url:'http://127.0.0.1:3265',httpOnly:true,sameSite:'Lax'}]);await page.context().setExtraHTTPHeaders({Authorization:`Token ${token}`});
}
test.beforeEach(async({page})=>{await loginAs(page,'hr_admin')});
const rows=(page:import('@playwright/test').Page)=>page.getByRole('table',{name:'Employee directory',exact:true}).locator('tbody tr');
const filters=(page:import('@playwright/test').Page)=>page.getByRole('form',{name:'Directory filters'});
async function ready(page:import('@playwright/test').Page){await expect(page.getByRole('heading',{name:'Employees',exact:true})).toBeVisible();await expect(page.locator('.workspace-filter-form')).toBeVisible()}
test('search, committed history, refresh and empty reset',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);const form=filters(page);
 await form.getByLabel('Search',{exact:true}).fill('Esha');await form.getByLabel('Search',{exact:true}).press('Enter');await expect(page).toHaveURL(/q=Esha/);await expect(rows(page)).toHaveCount(1);
 await page.reload();await expect(form.getByLabel('Search',{exact:true})).toHaveValue('Esha');
 await form.getByRole('button',{name:'Reset',exact:true}).click();await expect(rows(page)).toHaveCount(6);
 await page.goBack();await expect(form.getByLabel('Search',{exact:true})).toHaveValue('Esha');await expect(rows(page)).toHaveCount(1);
 await form.getByLabel('Search',{exact:true}).fill('No-match-synthetic');await form.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByText('No employees match these filters.',{exact:true})).toBeVisible();await expect(page.locator('.pagination-panel')).toHaveCount(0);
 await form.getByRole('button',{name:'Reset',exact:true}).click();await expect(rows(page)).toHaveCount(6);
});
test('name and employee-code search support Enter and Apply',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);const form=filters(page),employee=fixture.manifest.credentials.employee;
 await form.getByLabel('Search',{exact:true}).fill(employee.employee_code.slice(0,-2));await form.getByRole('button',{name:'Apply',exact:true}).click();await expect(rows(page)).toContainText(employee.employee_code);
 await form.getByLabel('Search',{exact:true}).fill(employee.employee_code);await form.getByLabel('Search',{exact:true}).press('Enter');await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText(employee.employee_code);
 await form.getByLabel('Search',{exact:true}).fill('Esha');await form.getByRole('button',{name:'Apply',exact:true}).click();await expect(rows(page)).toHaveCount(1);await expect(rows(page).first()).toContainText('Esha');
});
test('combined department, status, manager and readiness filters',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);const f=filters(page);
 await f.getByRole('combobox',{name:'Department',exact:true}).selectOption({label:'QA People'});await f.getByRole('combobox',{name:'Status',exact:true}).selectOption('active');
 await f.getByRole('combobox',{name:'Manager review',exact:true}).selectOption('managers');await f.getByRole('combobox',{name:'Readiness',exact:true}).selectOption('ready');await f.getByRole('button',{name:'Apply',exact:true}).click();
 await expect(rows(page)).toHaveCount(1);await expect(rows(page)).toContainText('Manav');await expect(f.getByRole('combobox',{name:'Manager review',exact:true})).toHaveValue('managers');
 await expect.poll(()=>page.evaluate(()=>Object.fromEntries(new URL(location.href).searchParams))).toMatchObject({department:'QA People',status:'active',managerView:'managers',readiness:'ready'});
 await f.getByRole('combobox',{name:'Status',exact:true}).selectOption('inactive');await f.getByRole('button',{name:'Apply',exact:true}).click();await expect(page.getByText('No employees match these filters.',{exact:true})).toBeVisible();
});
test('sorting, pagination and unapplied draft isolation',async({page})=>{
 await page.goto('/hr-admin/employees?page_size=5');await ready(page);await expect(rows(page)).toHaveCount(5);
 const f=filters(page);await f.getByRole('combobox',{name:'Sort',exact:true}).selectOption('-name');await f.getByRole('button',{name:'Apply',exact:true}).click();await expect(rows(page).first()).toContainText('Tanvi');
 await f.getByLabel('Search',{exact:true}).fill('unsaved draft');await page.getByRole('link',{name:'Next',exact:true}).click();await expect(page).toHaveURL(/page=2/);await expect(page).not.toHaveURL(/unsaved/);await expect(rows(page)).toHaveCount(1);await expect(f.getByLabel('Search',{exact:true})).toHaveValue('');
 await f.getByRole('combobox',{name:'Rows',exact:true}).selectOption('10');await f.getByRole('button',{name:'Apply',exact:true}).click();await expect(rows(page)).toHaveCount(6);await expect(page).toHaveURL(/sort=-name/);
 await page.goto('/hr-admin/employees?page=999&page_size=5');await expect(rows(page)).toHaveCount(1);
});
test('every supported sort direction is stable and resets paging',async({page})=>{
 await page.goto('/hr-admin/employees?page=2&page_size=5');await ready(page);const form=filters(page);
 for(const option of ['name','-name','code','-code']){
  await form.getByRole('combobox',{name:'Sort',exact:true}).selectOption(option);await form.getByRole('button',{name:'Apply',exact:true}).click();await expect(page).not.toHaveURL(/page=2/);
  const values=await rows(page).locator('td:first-child').evaluateAll((cells,sort)=>cells.map(cell=>{const values=Array.from(cell.querySelectorAll('strong,small')).map(node=>node.textContent?.trim()||'');return String(sort).endsWith('code')?values[1]:values[0]}),option);
  const expected=[...values].sort((a,b)=>a.localeCompare(b,'en',{numeric:true,sensitivity:'base'}));if(option.startsWith('-'))expected.reverse();expect(values).toEqual(expected);
 }
});
test('directory refresh exposes one error, preserves confirmed rows, and retries',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);await expect(rows(page)).toHaveCount(6);let failures=0;
 await page.route('**/api/hr-admin/employees/workspace',route=>{if(route.request().method()!=='GET')return route.continue();if(failures++===0)return route.fulfill({status:503,json:{detail:'Synthetic directory interruption'}});return route.continue()});
 await page.getByRole('button',{name:'Refresh directory',exact:true}).click();const alert=page.locator('.notice[role="alert"]');await expect(alert).toContainText('Synthetic directory interruption');await expect(alert).toHaveCount(1);await expect(rows(page)).toHaveCount(6);await expect(page.getByText('No employees match these filters.',{exact:true})).toHaveCount(0);
 await alert.getByRole('button',{name:'Retry',exact:true}).click();await expect(alert).toHaveCount(0);await expect(rows(page)).toHaveCount(6);expect(failures).toBe(2);
});
test('detail retry and selection clears with committed scope',async({page},info)=>{
 await page.goto('/hr-admin/employees');await ready(page);
 const target=fixture.manifest.credentials.employee.employee_id;let fail=true;
 await page.route(`**/api/hr-admin/employees/workspace?employeeId=${target}*`,route=>fail?route.fulfill({status:503,json:{detail:'Synthetic detail interruption'}}):route.continue());
 await page.locator(`tr[data-employee-id="${target}"] .employee-directory-table__identity`).click();await expect(page.locator('.employee-detail-drawer').getByRole('alert')).toContainText('Synthetic detail interruption');await page.screenshot({path:`${process.env.EMPLOYEE_EVIDENCE_DIR || '../docs/qa/evidence/hr-admin-employees'}/${info.project.name}-detail-error.png`});fail=false;
 await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.locator('.employee-detail-drawer')).toContainText('Esha');
 await filters(page).getByLabel('Search',{exact:true}).fill(fixture.manifest.credentials.manager.employee_code);await filters(page).getByRole('button',{name:'Apply',exact:true}).click();await expect(rows(page)).toHaveCount(1);await expect(page).not.toHaveURL(/employeeId=/);await expect(page.locator('[data-selected-employee-id]')).toHaveAttribute('data-selected-employee-id','');await expect(page.locator('.employee-detail-drawer')).toHaveCount(0);
});
test('responsive table keyboard, menu and screenshots',async({page},info)=>{
 for(const width of [1440,768,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto('/hr-admin/employees');await ready(page);await expect(rows(page)).toHaveCount(6);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  const region=page.getByRole('region',{name:'Employee directory',exact:true});await expect(region).toBeVisible();await region.focus();await expect(region).toBeFocused();
  if(width<600){for(const control of await filters(page).getByRole('combobox').all()) expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44 - 0.01);await region.press('ArrowRight');expect(await region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);await region.press('ArrowLeft')}
  await page.screenshot({path:`${process.env.EMPLOYEE_EVIDENCE_DIR || '../docs/qa/evidence/hr-admin-employees'}/${info.project.name}-${width}.png`,fullPage:true});
 }
});
test('create modal preserves keyboard close and return',async({page})=>{
 await page.goto('/hr-admin/employees');await ready(page);await page.getByRole('button',{name:'New employee',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(dialog).toContainText('Create employee');await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBeTruthy();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await ready(page);await page.getByRole('button',{name:'New employee',exact:true}).click();await expect(dialog).toBeVisible();await dialog.locator('input:not([type=hidden])').first().fill('Unsaved synthetic draft');page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');await expect(dialog).toBeVisible();page.once('dialog',d=>d.accept());await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(dialog).toHaveCount(0);
});
test('real API ownership and employee role rejection',async({page})=>{
 expect((await page.request.get(`/api/hr-admin/employees/${foreign.manifest.credentials.employee.employee_id}`)).status()).toBe(404);
 const directoryResponse=await page.request.get('/api/hr-admin/employees');expect(directoryResponse.status()).toBe(200);const directoryBody=JSON.stringify(await directoryResponse.json());for(const privateField of ['account_number','bank_name','personal_email','date_of_birth'])expect(directoryBody).not.toContain(privateField);
 await page.request.post('/api/auth/logout');await loginAs(page,'employee');
 expect((await page.request.get('/api/hr-admin/employees')).status()).toBe(403);await page.goto('/hr-admin/employees');await expect(page).not.toHaveURL(/\/hr-admin\/employees/);
});
test('automated accessibility of shared page patterns',async({page},info)=>{
 await page.goto('/hr-admin/employees');await ready(page);await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
 const result=await page.evaluate(async()=>{const axe=(window as unknown as {axe:{run:(c:object,o:object)=>Promise<{violations:unknown[]}>}}).axe;return axe.run({include:[['.workspace-page-header'],['.workspace-filter-form'],['.workspace-table-region']]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})});
 await info.attach('patterns-axe',{body:JSON.stringify(result,null,2),contentType:'application/json'});expect(result.violations).toEqual([]);
});
test('neighboring page headers and shared shell remain compatible',async({page})=>{
 for(const path of ['/hr-admin/attendance-records','/hr-admin/leave-policies','/ess','/mss/approvals']){
  await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();await expect(page.locator('main .workspace-page-header, main .workspace-standard-header')).toHaveCount(1);
  await expect(page.locator('.accerio-shell')).toBeVisible();
 }
});
