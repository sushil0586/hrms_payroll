import {test,expect} from '@playwright/test';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona,workspacePlatformPersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
let fixture:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{fixture=await provisionIsolatedQaWorkspace(info)});
test.afterAll(async()=>{await cleanupIsolatedQaWorkspace(fixture)});
test('tenant shared invite dialog keeps dirty values and restores keyboard focus',async({page},info)=>{
 const user=workspacePersona(fixture,'tenant_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 await page.setViewportSize({width:320,height:568});await page.goto('/tenant-admin/users');
 const trigger=page.getByRole('button',{name:'Invite member',exact:true});await trigger.focus();await trigger.press('Enter');
 const dialog=page.getByRole('dialog',{name:'Invite tenant member',exact:true});await expect(dialog).toBeVisible();
 const email=dialog.getByRole('textbox',{name:'Email',exact:true});await expect(email).toBeFocused();
 await email.fill('draft@example.test');
 page.once('dialog',async confirmation=>{await confirmation.dismiss()});await dialog.press('Escape');
 await expect(dialog).toBeVisible();await expect(email).toHaveValue('draft@example.test');
 for(let n=0;n<12;n++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBeTruthy()}
 await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/${info.project.name}-tenant-invite-320.png`,fullPage:true});
 page.once('dialog',async confirmation=>{await confirmation.accept()});await dialog.press('Escape');
 await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
});
test('tenant role update uses real mutation and blocks closing while pending',async({page})=>{
 const user=workspacePersona(fixture,'tenant_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 await page.goto('/tenant-admin/users');const trigger=page.getByRole('button',{name:'Update roles',exact:true}).first();await trigger.focus();await trigger.press('Enter');
 const dialog=page.getByRole('dialog',{name:'Update tenant member roles',exact:true});await expect(dialog).toBeVisible();
 let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve});
 await page.route('**/api/tenant-admin/memberships/*',async route=>{await gate;await route.continue()});
 const started=page.waitForRequest(r=>r.method()==='PATCH'&&r.url().includes('/api/tenant-admin/memberships/'));
 await dialog.getByRole('button',{name:'Update roles',exact:true}).click();await started;
 await expect(dialog).toHaveAttribute('aria-busy','true');await dialog.press('Escape');await expect(dialog).toBeVisible();
 const response=page.waitForResponse(r=>r.request().method()==='PATCH'&&r.url().includes('/api/tenant-admin/memberships/'));
 release();expect((await response).status()).toBe(200);await expect(dialog).toHaveCount(0);
});
test('platform create uses shared short-height dialog and keyboard containment',async({page},info)=>{
 const user=workspacePlatformPersona(fixture);expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
 await page.setViewportSize({width:320,height:568});await page.goto('/platform-admin/tenants');
 const trigger=page.getByRole('button',{name:'Create tenant',exact:true}).first();await trigger.focus();await trigger.press('Enter');
 const dialog=page.getByRole('dialog',{name:'Create platform tenant',exact:true});await expect(dialog).toBeVisible();
 for(let n=0;n<18;n++){await page.keyboard.press('Tab');expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBeTruthy()}
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:`../docs/qa/evidence/ui-ux-rollout-2026-10-22/${info.project.name}-platform-create-320.png`,fullPage:true});
 await dialog.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
});
