import { test, expect } from '@playwright/test';
import { provisionIsolatedQaWorkspace, cleanupIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from '../helpers/isolated-qa-workspace';
const evidenceRoot = process.env.HRMS_MASTER_EVIDENCE_ROOT ?? '../docs/qa/evidence/ui-ux-rollout-2026-10-22';
let fixture: IsolatedQaWorkspace;
test.beforeAll(async ({}, info) => { fixture = await provisionIsolatedQaWorkspace(info); });
test.afterAll(async () => { await cleanupIsolatedQaWorkspace(fixture); });
for (const item of [
  {role:'manager' as const, route:'/mss', title:'Manager dashboard'},
  {role:'manager' as const, route:'/mss/approvals?queue=attendance', title:'Manager approvals'},
  {role:'employee' as const, route:'/ess/attendance', title:'Attendance'},
]) {
  test(`shared attendance presentation ${item.route}`, async ({page}, info) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    expect((await page.request.post('/api/auth/login', {data:{identifier:workspacePersona(fixture,item.role).username,password:'Password@123'}})).status()).toBe(200);
    await page.goto(item.route);
    await expect(page.locator('main h1')).toContainText(item.title);
    await expect(page.locator('main.accerio-page')).toBeVisible();
    for (const width of [1440,768,390,320]) {
      await page.setViewportSize({width,height:900});
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      await page.screenshot({path:`${evidenceRoot}/${info.project.name}-${item.route.startsWith('/ess')?'ess-attendance':item.route.includes('approvals')?'mss-attendance':'mss-dashboard'}-${width}.png`,fullPage:true});
    }
    if (item.route === '/mss') {
      await expect(page.getByRole('link',{name:'Open exceptions',exact:true})).toHaveCount(0);
      await expect(page.getByRole('link',{name:'Open attendance queue',exact:true})).toHaveAttribute('href','/mss/approvals?queue=attendance');
      const region=page.getByRole('region',{name:'Manager actions table'});
      await region.focus(); await expect(region).toBeFocused();
      if (await region.evaluate(el=>el.scrollWidth>el.clientWidth)) { await region.press('ArrowRight'); expect(await region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0); }
    }
    if (item.route === '/ess/attendance') {
      await page.getByRole('link',{name:'List',exact:true}).click();
      await expect(page).toHaveURL(/view=list/);
      await page.reload(); await expect(page).toHaveURL(/view=list/);
      await page.getByRole('link',{name:'Calendar',exact:true}).click();
      await expect(page).toHaveURL(/view=calendar/);
    }
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    const axe=await page.evaluate(async()=>await (window as unknown as {axe:{run:(context:object)=>Promise<{violations:unknown[]}>}}).axe.run({include:[['main']]}));
    await info.attach('axe',{body:JSON.stringify(axe),contentType:'application/json'});
    expect(axe.violations).toEqual([]);
    expect(errors).toEqual([]);
  });
}
