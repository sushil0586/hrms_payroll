import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;let errors:string[]=[];
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test.beforeEach(async({page})=>{errors=[];page.on('pageerror',e=>errors.push(e.message));const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200)});
test.afterEach(()=>expect(errors).toEqual([]));
test('uncontrolled master dialog retains its dirty confirmation',async({page})=>{
 await page.goto('/hr-admin/employees?create=1&page_size=5');const f=page.locator('.employee-master-form');await f.locator('[name=first_name]').fill('Kept draft');page.once('dialog',d=>d.dismiss());await page.keyboard.press('Escape');await expect(f.locator('[name=first_name]')).toHaveValue('Kept draft');page.once('dialog',d=>d.accept());await f.getByRole('button',{name:'Cancel',exact:true}).click();await expect(f).toHaveCount(0);await expect(page).toHaveURL(/page_size=5/);
});
test('master dialog retains its existing busy close policy',async({page})=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.goto(`/hr-admin/employees?employeeId=${id}&action=edit`);const f=page.locator('.employee-master-form');await f.locator('[name=preferred_name]').fill('Kept pending');await f.getByRole('navigation',{name:'Employee form progress'}).getByRole('button',{name:/Review$/}).click();let release!:()=>void;const gate=new Promise<void>(r=>release=r);await page.route(`**/api/hr-admin/employees/${id}`,async route=>{if(route.request().method()!=='PATCH')return route.continue();await gate;await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({first_name:['Synthetic rejection.']})})});await f.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('button',{name:'Close Edit employee',exact:true})).toBeDisabled();await page.keyboard.press('Escape');await expect(f).toBeVisible();release();await expect(f.locator('[name=first_name]')).toBeFocused();
});
test('directory actions open and close master, access and bank dialogs in employee context',async({page},info)=>{
 const id=fixture.manifest.credentials.employee.employee_id;await page.setViewportSize({width:390,height:844});
 for(const action of [{key:'edit',label:'Edit',title:'Edit employee'},{key:'access',label:'Manage access',title:'Manage access'},{key:'bank',label:'Manage bank accounts',title:'Manage bank accounts'}]){
  await page.goto(`/hr-admin/employees?employeeId=${id}&page_size=5`);const detail=page.locator('.employee-detail-drawer');await expect(detail).toContainText('Esha Employee');if(action.key!=='edit')await detail.getByText('Actions',{exact:true}).click();await detail.getByRole('link',{name:action.key==='edit'?'Edit':new RegExp(`^${action.label}`),exact:action.key==='edit'}).click();const dialog=page.getByRole('dialog',{name:action.title,exact:true});await expect(dialog).toBeVisible();await page.screenshot({path:`../docs/qa/evidence/employee-makeover-phase4-2026-10-22/${info.project.name}-regression-${action.key}-390.png`});await dialog.getByRole('button',{name:`Close ${action.title}`,exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page).toHaveURL(/page_size=5/);await expect(page).not.toHaveURL(/action=/);
 }
});

test('role validation focuses correction and backend rejects an invalid role without changing grants',async({page})=>{
 const id=fixture.manifest.credentials.employee.employee_id;const before=await (await page.request.get(`/api/hr-admin/employees/${id}/access`)).json();await page.goto(`/hr-admin/employees?employeeId=${id}&action=access`);const f=page.locator('.employee-access-form');const roles=f.getByRole('group',{name:'Tenant roles'}).getByRole('checkbox');await expect(roles.first()).toBeVisible();await expect(roles.first()).toBeEnabled();for(const role of await roles.all())await role.uncheck();await expect(f.locator('.employee-maintenance-context')).toContainText('0 selected roles');await f.getByRole('button',{name:'Update access',exact:true}).click();await expect(roles.first()).toBeFocused();await expect(roles.first()).toHaveAttribute('aria-describedby','access-error-role_ids');await roles.first().check();await expect(roles.first()).toHaveAttribute('aria-invalid','false');
 const rejected=await page.request.patch(`/api/hr-admin/employees/${id}/access`,{data:{role_ids:['00000000-0000-0000-0000-000000000000']}});expect(rejected.status()).toBe(400);const after=await (await page.request.get(`/api/hr-admin/employees/${id}/access`)).json();expect(after.role_ids).toEqual(before.role_ids);
});

test('standalone and dialog tasks keep employee code and name visible',async({page},info)=>{
 const id=fixture.manifest.credentials.employee.employee_id;const code=fixture.manifest.credentials.employee.employee_code;await page.setViewportSize({width:320,height:568});
 for(const kind of ['access','bank'])for(const entry of ['page','dialog']){
  await page.goto(entry==='page'?`/hr-admin/employees/${id}/${kind==='access'?'access':'bank-accounts'}`:`/hr-admin/employees?employeeId=${id}&action=${kind}`);
  const header=entry==='page'?page.locator('.page-intro'):page.getByRole('dialog').locator('.hr-admin-action-modal__header');await expect(header).toContainText(code);await expect(header).toContainText('Esha Employee');
  if(entry==='dialog'&&kind==='access'){const first=page.locator('.employee-access-form [name=username]');await expect(first).toBeInViewport()}
  await page.screenshot({path:`../docs/qa/evidence/employee-makeover-phase4-2026-10-22/${info.project.name}-identity-${kind}-${entry}-320.png`});
 }
});

test('bank reset keeps the selected account and discards only a confirmed draft',async({page})=>{
 const id=fixture.manifest.credentials.employee.employee_id;const seeded=await page.request.post(`/api/hr-admin/employees/${id}/bank-accounts`,{data:{account_holder_name:'Synthetic reset owner',bank_name:'Reset baseline bank',account_number:'998800001122',ifsc_code:'HDFC0001234',is_primary:false}});expect(seeded.status()).toBe(201);
 for(const entry of ['page','dialog']){
  await page.goto(entry==='page'?`/hr-admin/employees/${id}/bank-accounts`:`/hr-admin/employees?employeeId=${id}&action=bank`);const f=page.locator('.employee-bank-account-form');await expect(f.locator('[name=bank_name]')).toHaveValue('Reset baseline bank');await f.locator('[name=bank_name]').fill('Uncommitted name');page.once('dialog',d=>d.dismiss());await f.getByRole('button',{name:'Reset changes',exact:true}).click();await expect(f.locator('[name=bank_name]')).toHaveValue('Uncommitted name');page.once('dialog',d=>d.accept());await f.getByRole('button',{name:'Reset changes',exact:true}).click();await expect(f.locator('[name=bank_name]')).toHaveValue('Reset baseline bank');await expect(f.locator('[name=account_holder_name]')).toBeFocused();await expect(f.getByRole('button',{name:'Reset changes',exact:true})).toBeDisabled();
 }
});
