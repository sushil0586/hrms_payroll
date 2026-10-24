import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,workspacePlatformPersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{
 fixture=await provisionIsolatedQaWorkspace(info);
 execFileSync(path.resolve('../.venv/bin/python'),['backend/manage.py','shell','-c',`from tests.fixtures.ui_ux_rollout import provider_dialogs; provider_dialogs(${JSON.stringify(fixture.manifestPath)})`],{cwd:path.resolve('..'),env:process.env});
});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
for(const item of [
 {role:'tenant_admin',route:'/tenant-admin/roles',button:'Create role',dialog:'Create tenant role'},
 {role:'platform',route:'/platform-admin/permissions',button:'Edit',dialog:'Edit platform permission'},
 {role:'manager',route:'/mss/notifications',button:'Review notification',dialog:/Notification detail for/},
 {role:'hr_admin',route:'/hr-admin/payroll-providers',button:'Configure provider',dialog:'Configure provider connection'},
 {role:'hr_admin',route:'/hr-admin/payroll-providers',button:'Edit rules',dialog:/ui-render-only rule builder/},
 {role:'hr_admin',route:'/hr-admin/launch-remediation',button:'Manage',dialog:'Manage blocker'},
] as const){
 test(`shared modal ${item.route} ${item.button}`,async({page},info)=>{
  const persona=item.role==='platform'?workspacePlatformPersona(fixture):workspacePersona(fixture,item.role);
  expect((await page.request.post('/api/auth/login',{data:{identifier:persona.username,password:persona.password}})).status()).toBe(200);
  await page.setViewportSize({width:390,height:640});await page.goto(item.route+(item.button==='Edit rules'?'?tab=mapping':''));
  const trigger=page.getByRole('button',{name:item.role==='tenant_admin'?'Add role':item.button,exact:true}).first();await trigger.focus();await trigger.press('Enter');
  const dialog=page.getByRole('dialog',{name:item.dialog,exact:typeof item.dialog==='string'});await expect(dialog).toBeVisible();await expect(dialog).toHaveClass(/hr-admin-action-modal/);
  for(let n=0;n<16;n++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBeTruthy()}
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/modal-${info.project.name}-${item.role}-${item.button.replaceAll(' ','-')}.png`,fullPage:true});
  await dialog.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
 });
}
