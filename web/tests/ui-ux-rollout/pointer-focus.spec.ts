import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,workspacePlatformPersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info);execFileSync(path.resolve('../.venv/bin/python'),['backend/manage.py','shell','-c',`from tests.fixtures.ui_ux_rollout import provider_dialogs; provider_dialogs(${JSON.stringify(fixture.manifestPath)})`],{cwd:path.resolve('..'),env:process.env})});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
for(const item of [
 {role:'manager',route:'/mss/approvals?queue=leave',button:'Review'},
 {role:'manager',route:'/mss/approvals?queue=attendance',button:'Review'},
 {role:'manager',route:'/mss/notifications',button:'Review notification'},
 {role:'employee',route:'/ess/leave',button:'Apply leave'},
 {role:'tenant_admin',route:'/tenant-admin/users',button:'Invite member'},
 {role:'tenant_admin',route:'/tenant-admin/users',button:'Update roles'},
 {role:'tenant_admin',route:'/tenant-admin/users',button:'Suspend'},
 {role:'tenant_admin',route:'/tenant-admin/roles',button:'Add role'},
 {role:'platform',route:'/platform-admin/tenants',button:'Create tenant'},
 {role:'platform',route:'/platform-admin/permissions',button:'Edit'},
 {role:'hr_admin',route:'/hr-admin/payroll-providers',button:'Configure provider'},
 {role:'hr_admin',route:'/hr-admin/payroll-providers?tab=mapping',button:'Edit rules'},
 {role:'hr_admin',route:'/hr-admin/launch-remediation',button:'Manage'},
] as const){
 test(`mouse return focus ${item.route} ${item.button}`,async({page})=>{
  const user=item.role==='platform'?workspacePlatformPersona(fixture):workspacePersona(fixture,item.role);
  expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
  await page.setViewportSize({width:390,height:700});await page.goto(item.route);
  const trigger=page.getByRole('button',{name:item.button,exact:true}).first();await expect(trigger).toBeEnabled();
  await page.locator('main h1').first().evaluate(el=>{(el as HTMLElement).tabIndex=-1;(el as HTMLElement).focus()});
  await trigger.click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await dialog.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
 });
}
