import {expect,test,type Page,type TestInfo} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {cleanupIsolatedQaWorkspace,provisionIsolatedQaWorkspace,workspacePersona,type IsolatedQaWorkspace} from '../helpers/isolated-qa-workspace';
const exec=promisify(execFile);
let workspace:IsolatedQaWorkspace;
test.beforeAll(async({},info)=>{workspace=await provisionIsolatedQaWorkspace(info);});
test.afterAll(async({},info)=>cleanupIsolatedQaWorkspace(workspace,info));
async function sql(info:TestInfo,phase:string){const {stdout}=await exec(process.env.HRMS_QA_PYTHON!,['web/tests/stabilization-wfb1/reconcile.py',workspace.manifestPath,workspace.seedRef,phase],{env:process.env});await info.attach(`postgresql-${phase}`,{body:stdout,contentType:'application/json'});return JSON.parse(stdout);}
async function capture(page:Page,info:TestInfo,id:string){await page.evaluate(()=>document.fonts.ready);if(id==='B1-list'){await page.getByRole('region',{name:'Employee shift assignments, scroll for more columns',exact:true}).scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}await info.attach(`${id}.png`,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});}
async function axe(page:Page,info:TestInfo,id:string){await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const result=await page.evaluate(async()=>await (window as unknown as{axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run());await info.attach(id,{body:JSON.stringify(result.violations),contentType:'application/json'});expect(result.violations).toEqual([]);}
test('B1-07 lifecycle confirmation, validation, cancel/end, retained history and feedback',async({page,browser},info)=>{
 const actor=workspacePersona(workspace,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:actor.username,password:actor.password}})).status()).toBe(200);
 const fixture=await sql(info,'prepare');
 await page.goto('/hr-admin/employee-shift-assignments?page_size=100');
 await expect(page.getByRole('region',{name:'Employee shift assignments, scroll for more columns',exact:true})).toBeVisible();
 await capture(page,info,'B1-list');await axe(page,info,'axe-list');
 const row=page.getByRole('row').filter({hasText:'B1 Future Synthetic'});await row.getByRole('button',{name:'Inspect',exact:true}).click();
 const detail=page.getByRole('complementary',{name:'Shift assignment detail',exact:true});const trigger=detail.getByRole('button',{name:'Cancel future assignment',exact:true});await trigger.click();
 let dialog=page.getByRole('dialog',{name:'Cancel future assignment',exact:true});await capture(page,info,'B1-cancel-confirm');
 for(const key of ['Tab','Shift+Tab']){for(let i=0;i<12;i++){await page.keyboard.press(key);expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);}}
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();await trigger.click();dialog=page.getByRole('dialog',{name:'Cancel future assignment',exact:true});
 await dialog.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await expect(dialog.getByLabel('Reason',{exact:true})).toBeFocused();await expect(dialog.getByText('Enter a reason.',{exact:true})).toBeVisible();await capture(page,info,'B1-validation');
 await dialog.getByLabel('Reason',{exact:true}).fill('Synthetic approved future cancellation');await dialog.getByRole('checkbox').check();await axe(page,info,'axe-dialog');
 // A real second editor changes the version while this confirmation is open.
 const updated=await page.request.patch(`/api/hr-admin/employee-shift-assignments/${fixture.future_id}`,{data:{expected_updated_at:fixture.future_version,effective_to:fixture.future_end}});expect(updated.status()).toBe(200);
 const stale=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/employee-shift-assignments/${fixture.future_id}`));await dialog.getByRole('button',{name:'Confirm cancellation',exact:true}).click();expect((await stale).status()).toBe(409);await expect(dialog.getByRole('alert')).toContainText('changed after you opened it');await capture(page,info,'B1-stale-error');await dialog.getByRole('button',{name:'Keep assignment',exact:true}).click();
 await page.reload();await expect(page.getByRole('region',{name:'Employee shift assignments, scroll for more columns',exact:true})).toBeVisible();await row.getByRole('button',{name:'Inspect',exact:true}).click();await detail.getByRole('button',{name:'Cancel future assignment',exact:true}).click();dialog=page.getByRole('dialog',{name:'Cancel future assignment',exact:true});await dialog.getByLabel('Reason',{exact:true}).fill('Synthetic approved future cancellation');await dialog.getByRole('checkbox').check();
 const accepted=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/employee-shift-assignments/${fixture.future_id}`));await dialog.getByRole('button',{name:'Confirm cancellation',exact:true}).click();expect((await accepted).status()).toBe(200);await expect(dialog).toHaveCount(0);await expect(page.locator('.action-toast')).toContainText('Future assignment cancelled.');await capture(page,info,'B1-cancel-success');await page.getByRole('button',{name:'Dismiss notification',exact:true}).click();
 await expect(row).toContainText('cancelled');await expect(detail.getByRole('button',{name:'Lifecycle unavailable',exact:true})).toBeDisabled();
 const activeRow=page.getByRole('row').filter({hasText:'B1 Active Synthetic'});await activeRow.getByRole('button',{name:'Inspect',exact:true}).click();await detail.getByRole('button',{name:'End assignment',exact:true}).click();dialog=page.getByRole('dialog',{name:'End assignment',exact:true});await dialog.getByLabel('Last working date',{exact:true}).fill(fixture.last_day);await dialog.getByLabel('Reason',{exact:true}).fill('Synthetic approved active end');await dialog.getByRole('checkbox').check();await capture(page,info,'B1-end-confirm');
 const ended=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith(`/employee-shift-assignments/${fixture.active_id}`));await dialog.getByRole('button',{name:'Confirm end',exact:true}).click();expect((await ended).status()).toBe(200);await expect(dialog).toHaveCount(0);await expect(page.locator('.action-toast')).toContainText(`Assignment ends after ${fixture.last_day}.`);await capture(page,info,'B1-end-success');
 await sql(info,'after');await info.attach('browser-identity',{body:JSON.stringify({engine:info.project.use.browserName,version:browser.version(),viewport:page.viewportSize()}),contentType:'application/json'});
});
