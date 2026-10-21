import {test,expect} from '@playwright/test';
import path from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import {provisionIsolatedQaWorkspace,cleanupIsolatedQaWorkspace,workspacePersona} from '../helpers/isolated-qa-workspace';
test('leave type filter and small-screen keyboard review actions',async({page},info)=>{
 test.setTimeout(180000);const fixture=await provisionIsolatedQaWorkspace(info);
 const evidence=process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT ? path.join(process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_ROOT,"applications") : process.env.HR_ADMIN_LEAVE_QA_EVIDENCE_DIR ?? path.resolve(__dirname,'../../../docs/qa/evidence/hr-admin-standardization/leave-applications');
 try {
  const user=workspacePersona(fixture,'hr_admin');expect((await page.request.post('/api/auth/login',{data:{identifier:user.username,password:user.password}})).status()).toBe(200);
  await page.setViewportSize({width:390,height:667});await page.goto('/hr-admin/leave-requests');const filters=page.getByRole('form',{name:'Leave request filters',exact:true});const type=filters.getByRole('combobox',{name:'Leave type',exact:true});await expect(type).toBeEnabled();const code=await type.locator('option').nth(1).getAttribute('value');expect(code).toBeTruthy();await type.selectOption(code!);await filters.getByRole('button',{name:'Apply filters'}).click();await expect.poll(()=>new URL(page.url()).searchParams.get('leave_type_code')).toBe(code);await expect(page.getByRole('table',{name:'Leave requests'}).locator('tbody tr')).toHaveCount(1);
  await page.getByRole('link',{name:/Inspect leave request/}).focus();await page.keyboard.press('Enter');const review=page.getByRole('link',{name:'Review',exact:true});await review.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog',{name:'Review leave request'});await expect(dialog.getByLabel('Decision note')).toBeFocused();
  const note=dialog.getByLabel('Decision note');await expect.poll(()=>note.evaluate(el=>{const b=el.getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)===el;})).toBe(true);
  mkdirSync(path.join(evidence,'screenshots'),{recursive:true});await page.screenshot({path:path.join(evidence,'screenshots',`${info.project.name}-390-note.png`)});
  for(const action of ['Approve','Reject']){const button=dialog.getByRole('button',{name:action,exact:true});await button.scrollIntoViewIfNeeded();await expect(button).toBeInViewport();await button.focus();await expect(button).toBeFocused();}
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);mkdirSync(path.join(evidence,'screenshots'),{recursive:true});await page.screenshot({path:path.join(evidence,'screenshots',`${info.project.name}-390-review.png`),fullPage:false});await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(review).toBeFocused();
 } finally {await cleanupIsolatedQaWorkspace(fixture);writeFileSync(path.join(evidence,`${info.project.name}-mobile-cleanup.json`),JSON.stringify({verified_absent:true}));}
});
