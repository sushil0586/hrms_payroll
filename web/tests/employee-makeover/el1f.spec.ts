import {expect,test,type Page} from '@playwright/test';
import {cleanupIsolatedQaWorkspace,provisionIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';

test.describe.configure({mode:'serial'});
let fixture:IsolatedQaWorkspace;

async function login(page:Page,identifier:string,password:string){
 await page.context().clearCookies();
 await page.goto('/login');
 await page.getByLabel('Username or email').fill(identifier);
 await page.getByLabel('Password').fill(password);
 const authenticated=page.waitForResponse(response=>response.url().endsWith('/api/auth/login')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'Sign in'}).click();
 const response=await authenticated;
 expect(response.status()).toBe(200);
 await expect(page).not.toHaveURL(/\/login/,{timeout:15_000});
 return (await response.json()).user;
}

async function loginPersona(page:Page,role:'hr_admin'|'employee'){
 const persona=workspacePersona(fixture,role);
 await login(page,persona.username,persona.password);
}

test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});

test('ELC-033/034/035/040 provisions dual ESS-manager access and revokes it in a fresh session',async({page},info)=>{
 await loginPersona(page,'hr_admin');
 const employeeResponse=await page.request.post('/api/hr-admin/employees',{data:{
  employee_code:`EL1F-${info.project.name}`,
  first_name:'Access',
  last_name:'Certification',
  work_email:`el1f-${info.project.name}@example.invalid`,
  employment_status:'active',
 }});
 expect(employeeResponse.status()).toBe(201);
 const employee=await employeeResponse.json();
 const username=`el1f-${info.project.name}`;
 const password='Certification@123';

 await page.goto(`/hr-admin/employees/${employee.id}/access`);
 const access=page.locator('.employee-access-form');
 await access.locator('[name=username]').fill(username);
 await access.locator('[name=email]').fill(`el1f-${info.project.name}@example.invalid`);
 await access.locator('[name=password]').fill(password);
 await access.locator('[name=must_change_password]').uncheck();
 const roles=access.getByRole('group',{name:'Tenant roles'});
 const employeeRoleCheckbox=roles.locator('label').filter({hasText:/Employee/}).first().getByRole('checkbox');
 await employeeRoleCheckbox.check();
 await roles.locator('label').filter({hasText:/Manager/}).first().getByRole('checkbox').check();
 page.once('dialog',dialog=>dialog.accept());
 const created=page.waitForResponse(response=>response.url().endsWith(`/api/hr-admin/employees/${employee.id}/access`)&&response.request().method()==='POST');
 await access.getByRole('button',{name:'Create access',exact:true}).click();
 expect((await created).status()).toBe(201);

 let user=await login(page,username,password);
 expect(user.workspace_access.ess).toBe(true);
 expect(user.workspace_access.mss).toBe(true);
 await page.goto('/ess/profile');
 await expect(page.getByRole('main')).toBeVisible();
 await page.goto('/mss');
 await expect(page.getByRole('main')).toBeVisible();

 await loginPersona(page,'hr_admin');
 await page.goto(`/hr-admin/employees/${employee.id}/access`);
 const editAccess=page.locator('.employee-access-form');
 const editRoles=editAccess.getByRole('group',{name:'Tenant roles'});
 await expect(editRoles.locator('label').filter({hasText:/Employee/}).first().getByRole('checkbox')).toBeChecked();
 await editRoles.locator('label').filter({hasText:/Manager/}).first().getByRole('checkbox').uncheck();
 page.once('dialog',dialog=>dialog.accept());
 const revoked=page.waitForResponse(response=>response.url().endsWith(`/api/hr-admin/employees/${employee.id}/access`)&&response.request().method()==='PATCH');
 await editAccess.getByRole('button',{name:'Update access',exact:true}).click();
 expect((await revoked).status()).toBe(200);

 user=await login(page,username,password);
 expect(user.workspace_access.ess).toBe(true);
 expect(user.workspace_access.mss).toBe(false);
});

test('ELC-033 access modal closes with a fixed directory success receipt',async({page})=>{
 await loginPersona(page,'hr_admin');
 const employeeId=fixture.manifest.credentials.employee.employee_id;
 await page.goto(`/hr-admin/employees?employeeId=${employeeId}&action=access&page_size=5&sort=-name`);
 const form=page.locator('.employee-access-form');
 await form.locator('[name=display_name]').fill('EL1F Access Receipt');
 page.once('dialog',dialog=>dialog.accept());
 const saved=page.waitForResponse(response=>response.url().endsWith(`/api/hr-admin/employees/${employeeId}/access`)&&response.request().method()==='PATCH');
 await form.getByRole('button',{name:'Update access',exact:true}).click();
 expect((await saved).status()).toBe(200);
 await expect(form).toHaveCount(0);
 await expect(page.getByRole('status').filter({hasText:'Employee access updated.'})).toBeVisible();
});

test('ELC-041 bank modal persists a masked account and leaves a fixed directory success receipt',async({page},info)=>{
 await loginPersona(page,'hr_admin');
 const employeeId=fixture.manifest.credentials.employee.employee_id;
 await page.goto(`/hr-admin/employees?employeeId=${employeeId}&action=bank&page_size=5&sort=-name`);
 const form=page.locator('.employee-bank-account-form');
 await page.getByRole('button',{name:'New account',exact:true}).click();
 await form.locator('[name=account_holder_name]').fill('Synthetic Employee');
 await form.locator('[name=bank_name]').fill(`EL1F ${info.project.name} Bank`);
 await form.locator('[name=account_number]').fill(`99001122${info.project.name==='chromium'?'01':info.project.name==='firefox'?'02':'03'}`);
 await form.locator('[name=ifsc_code]').fill('HDFC0001234');
 await form.locator('[name=branch_name]').fill('Certification Branch');
 const saved=page.waitForResponse(response=>response.url().endsWith(`/api/hr-admin/employees/${employeeId}/bank-accounts`)&&response.request().method()==='POST');
 await form.getByRole('button',{name:'Create account',exact:true}).click();
 expect((await saved).status()).toBe(201);
 await expect(form).toHaveCount(0);
 await expect(page.getByRole('status').filter({hasText:'Employee bank account saved.'})).toBeVisible();
 const accounts=await (await page.request.get(`/api/hr-admin/employees/${employeeId}/bank-accounts`)).json();
 const account=accounts.find((item:{bank_name:string})=>item.bank_name===`EL1F ${info.project.name} Bank`);
 expect(account).toBeTruthy();
 expect(account.account_number).toMatch(/^99001122/);
});
