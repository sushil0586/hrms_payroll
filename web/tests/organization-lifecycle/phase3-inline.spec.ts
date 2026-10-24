import {test,expect} from '@playwright/test';
import {readFileSync,appendFileSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve(__dirname,'../../../docs/qa/evidence/organization-lifecycle-phase3-2026-10-23');
test('deliberate inline inspection keeps the register full width and returns focus',async({page},info)=>{
 const fixture=JSON.parse(readFileSync(process.env.QA_LIFECYCLE_MANIFEST!,'utf8'));expect((await page.request.post('/api/auth/login',{data:{identifier:fixture.credentials.hr_admin.username,password:'Password@123'}})).status()).toBe(200);
 for(const width of [1440,320]){
  await page.setViewportSize({width,height:width===320?600:900});await page.goto('/hr-admin/lifecycle',{waitUntil:'domcontentloaded'});await expect(page.locator('[data-hydrated]')).toHaveAttribute('data-hydrated','true');await expect(page.locator('.lifecycle-detail-drawer')).toHaveCount(0);const trigger=page.getByRole('button',{name:'Inspect',exact:true}).first();await trigger.click();const detail=page.locator('.lifecycle-detail-drawer');await expect(detail).toBeFocused();const boxes=await page.evaluate(()=>({table:document.querySelector('.lifecycle-directory-table-wrap')!.getBoundingClientRect().width,detail:document.querySelector('.lifecycle-detail-drawer')!.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth}));expect(boxes.detail).toBeGreaterThanOrEqual(boxes.table-4);expect(boxes.overflow).toBe(false);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(root,`${info.project.name}-inline-detail-${width}.png`),fullPage:true});await detail.getByRole('button',{name:'Close',exact:true}).click();await expect(detail).toHaveCount(0);await expect(trigger).toBeFocused();appendFileSync(path.join(root,'inline-proofs.jsonl'),JSON.stringify({browser:info.project.name,width,...boxes,focus_return:true})+'\n');
 }
});
