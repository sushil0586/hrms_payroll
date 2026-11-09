import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { provisionIsolatedQaWorkspace, cleanupIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from '../helpers/isolated-qa-workspace';
import { formatWorkspaceDate, formatWorkspaceDateTime } from '../../src/lib/ui/date-time-format';
let workspace: IsolatedQaWorkspace;
const events = new WeakMap<TestInfo, object[]>();
test.beforeAll(async ({}, info) => { workspace = await provisionIsolatedQaWorkspace(info); });
test.afterAll(async ({}, info) => cleanupIsolatedQaWorkspace(workspace, info));
test.beforeEach(async ({ page, browser }, info) => {
  const health: object[] = []; events.set(info, health);
  page.on('pageerror', e => health.push({ at: new Date().toISOString(), route: page.url(), kind: 'pageerror', message: e.message }));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') health.push({ at: new Date().toISOString(), route: page.url(), kind: m.type(), message: m.text() }); });
  await info.attach('runtime', { body: JSON.stringify({ engine: info.project.use.browserName, version: browser.version(), viewport: page.viewportSize(), at: new Date().toISOString() }), contentType: 'application/json' });
});
test.afterEach(async ({}, info) => { await info.attach('browser-health', { body: JSON.stringify(events.get(info), null, 2), contentType: 'application/json' }); });
async function login(page: Page, role: 'hr_admin' | 'manager') {
  const actor = workspacePersona(workspace, role);
  expect((await page.request.post('/api/auth/login', { data: { identifier: actor.username, password: actor.password } })).status()).toBe(200);
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(() => document.fonts.ready);
  await info.attach(`${name}.png`, { body: await page.screenshot({ animations: 'disabled', fullPage: true }), contentType: 'image/png' });
  await info.attach(`${name}-time`, { body: JSON.stringify({ at: new Date().toISOString(), route: new URL(page.url()).pathname + new URL(page.url()).search }), contentType: 'application/json' });
}
async function axe(page: Page, info: TestInfo, name: string) {
  await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
  const violations = await page.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } }).then((r: any) => r.violations));
  await info.attach(`${name}-axe`, { body: JSON.stringify(violations, null, 2), contentType: 'application/json' });
  expect(violations).toEqual([]);
}
for (const kind of ['shift', 'assignment'] as const) test(`${kind} no-match after keyboard horizontal scroll and clear`, async ({ page }, info) => {
  await login(page, 'hr_admin');
  await page.goto(kind === 'shift' ? '/hr-admin/shifts' : '/hr-admin/employee-shift-assignments');
  const region = page.getByRole('region', { name: kind === 'shift' ? 'Shifts, scroll for more columns' : 'Employee shift assignments, scroll for more columns' });
  await expect(region).toBeVisible();
  const search = page.getByPlaceholder(kind === 'shift' ? 'Shift name, code, weekly off' : 'Employee, code, shift, scope');
  const text = kind === 'shift' ? 'No shifts match the current filters.' : 'No shift assignments match these filters.';
  const message = page.getByText(text, { exact: true });
  const status = page.getByRole('status').filter({ has: message });
  await region.focus(); for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight');
  const before = await region.evaluate(el => ({ scroll: el.scrollLeft, width: el.clientWidth, full: el.scrollWidth }));
  if (before.full > before.width + 1) expect(before.scroll).toBeGreaterThan(0);
  await search.fill('p8-no-such-record');
  if (kind === 'assignment') await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(message).toBeVisible(); await expect(status).toHaveAttribute('aria-live', 'polite'); await expect(status).toHaveAttribute('aria-atomic', 'true');
  expect(await message.evaluate(el => !!el.closest('[role="region"]'))).toBe(false);
  const geometry = await message.evaluate(el => { const range = document.createRange(); range.selectNodeContents(el); return { glyphs: [...range.getClientRects()].map(r => ({ left:r.left,right:r.right,top:r.top,bottom:r.bottom })), viewport: innerWidth, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
  expect(geometry.overflow).toBe(false); for (const r of geometry.glyphs) { expect(r.left).toBeGreaterThanOrEqual(0); expect(r.right).toBeLessThanOrEqual(geometry.viewport); }
  await info.attach('scroll-and-glyphs', { body: JSON.stringify({ before, geometry }, null, 2), contentType: 'application/json' });
  await capture(page, info, `${kind}-no-match-after-keyboard`); await axe(page, info, `${kind}-empty`);
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click(); await expect(message).toHaveCount(0);
  await expect(region.getByRole('row').nth(1)).toBeVisible(); await region.focus(); await page.keyboard.press('ArrowLeft');
  await capture(page, info, `${kind}-clear-restored`);
  expect(events.get(info)).toEqual([]);
});

test('MSS deterministic timestamps initial hydration reload queues and focus', async ({ page, context }, info) => {
  await login(page, 'manager');
  const writes: string[] = []; page.on('request', r => { if (r.method() !== 'GET' && new URL(r.url()).pathname.startsWith('/api/manager/')) writes.push(r.method() + ' ' + new URL(r.url()).pathname); });
  for (const queue of ['attendance','leave','history']) {
    const route = `/mss/approvals?queue=${queue}`;
    const response = await page.request.get(route); expect(response.ok()).toBe(true);
    const html = await response.text();
    await info.attach(`${queue}-ssr-text`, { body: JSON.stringify({ route, renderedTimestamps: [...html.matchAll(/\d{2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} [ap]m/g)].map(m => m[0]) }), contentType: 'application/json' });
    await page.goto(route); await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');
    const before = await page.locator('main[data-hydrated]').innerText();
    await page.reload(); await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');
    expect(await page.locator('main[data-hydrated]').innerText()).toBe(before);
    await capture(page, info, `mss-${queue}-hydrated-reload`);
    if (queue === 'attendance') {
      const trigger = page.getByRole('button', { name:'Review', exact:true }).first(); await trigger.click(); const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
      for (const key of ['Tab','Shift+Tab']) for (let n=0;n<12;n++) { await page.keyboard.press(key); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true); }
      await capture(page,info,'mss-review-focus'); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
      await axe(page,info,'mss-attendance');
      await page.getByRole('navigation',{name:'Approval views'}).getByRole('link',{name:/History/}).click(); await expect(page).toHaveURL(/queue=history/); await page.goBack(); await expect(page).toHaveURL(/queue=attendance/);
    }
  }
  const values = ['2026-11-07T00:00:00Z','2026-11-07T12:00:00Z','2028-02-29T23:59:00Z','2026-03-08T06:59:00Z','2026-03-08T07:00:00Z','2026-11-01T05:59:00Z','2026-11-01T06:00:00Z','2026-11-07',null,undefined,'invalid'];
  const cases = ['UTC','Asia/Kolkata','America/New_York'].flatMap(zone => values.map(value => ({ zone, value, date:formatWorkspaceDate(value,zone), dateTime:formatWorkspaceDateTime(value,zone) })));
  const source = `${formatWorkspaceDate.toString()};${formatWorkspaceDateTime.toString()}`;
  const actual = await page.evaluate(({ source, cases }) => { const fn = new Function('cases', `${source};return cases.map(c => ({...c,date:formatWorkspaceDate(c.value,c.zone),dateTime:formatWorkspaceDateTime(c.value,c.zone)}))`); return fn(cases); }, { source, cases });
  expect(actual).toEqual(cases); await info.attach('formatter-node-browser-boundaries',{body:JSON.stringify(cases,null,2),contentType:'application/json'});
  expect(writes).toEqual([]); expect(events.get(info)).toEqual([]);
});

test('missing eligible Shift loading read failure retry empty and assignment empty states', async ({ page }, info) => {
  await login(page,'hr_admin'); await page.goto('/hr-admin/shifts');
  await page.getByRole('button',{name:'Create shift',exact:true}).click(); const dialog=page.getByRole('dialog');
  await dialog.getByLabel('Code',{exact:true}).fill('p8-ui-only'); await dialog.getByLabel('Name',{exact:true}).fill('P8 controlled UI only');
  // Explicit UI-only response simulation: no application/backend persistence claim.
  await page.route('**/api/hr-admin/shifts',async route=>route.request().method()==='POST'?route.fulfill({status:201,json:{id:'00000000-0000-4000-8000-000000000008'}}):route.continue());
  let release!:()=>void; const gate=new Promise<void>(resolve=>{release=resolve});
  await page.route('**/api/hr-admin/shifts/workspace',async route=>{await gate;await route.fulfill({status:503,json:{detail:'P8 controlled unavailable catalog read.'}})});
  await dialog.getByRole('button',{name:'Create shift',exact:true}).click();
  await expect(page.locator('[data-local-update-hydrated][aria-busy="true"]').first()).toBeVisible(); await capture(page,info,'SH-V01.loading'); await dialog.locator('form button[type="submit"]').scrollIntoViewIfNeeded(); await capture(page,info,'SH-V01.loading.actions');
  release(); await expect(page.getByText('Shift update failed.',{exact:true})).toBeVisible(); await capture(page,info,'SH-V01.read-error-retry'); await dialog.locator('form button[type="submit"]').scrollIntoViewIfNeeded(); await capture(page,info,'SH-V01.read-error-retry.actions');
  await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.unroute('**/api/hr-admin/shifts/workspace');
  await page.route('**/api/hr-admin/shifts/workspace',route=>route.fulfill({status:200,json:{items:[],state:'live'}}));
  await page.getByRole('button',{name:'Retry',exact:true}).click(); await expect(page.getByText('Shift update failed.',{exact:true})).toHaveCount(0);
  await expect(page.getByText('No shifts match the current filters.',{exact:true})).toBeVisible(); await capture(page,info,'SH-V01.empty'); await axe(page,info,'shift-empty');
  await page.goto('/hr-admin/employee-shift-assignments');
  await page.route('**/api/hr-admin/employee-shift-assignments/workspace?*',route=>route.fulfill({status:200,json:{items:[],total_count:0,total_pages:1,page:1,page_size:25,state:'live'}}));
  await page.getByRole('button',{name:'Apply filters',exact:true}).click(); await expect(page.getByText('No shift assignments match these filters.',{exact:true})).toBeVisible(); await capture(page,info,'SH-V04.empty'); await axe(page,info,'assignment-empty');
  await info.attach('controlled-state-scope',{body:JSON.stringify({uiOnly:true,backendWritePerformed:false,source:'explicit Playwright route responses',states:['SH-V01.loading','SH-V01.read-error-retry','SH-V01.empty','SH-V04.empty']}),contentType:'application/json'});
});

test('MSS actual SSR selected Applied At matches hydrated detail', async ({ page }, info) => {
  await login(page,'manager');
  const records:object[]=[];
  try {
    for(const queue of ['attendance','leave']) {
      const route=`/mss/approvals?queue=${queue}`;
      const response=await page.request.get(route);expect(response.ok()).toBe(true);const html=await response.text();
      const serverRows=await page.evaluate(markup=>{
        const document=new DOMParser().parseFromString(markup,'text/html');
        return [...document.querySelectorAll('.detail-row')].filter(row=>row.querySelector('.detail-label')?.textContent?.trim()==='Applied At').map(row=>row.querySelector('.detail-value')?.textContent?.trim());
      },html);
      expect(serverRows).toHaveLength(1);const ssr=serverRows[0]!;expect(ssr).toMatch(/^\d{2} [A-Z][a-z]{2} \d{4}, \d{1,2}:\d{2} [ap]m$/);
      await page.goto(route);await expect(page.locator('main[data-hydrated]')).toHaveAttribute('data-hydrated','true');
      const client=page.locator('.detail-row').filter({has:page.locator('.detail-label',{hasText:/^Applied At$/})}).locator('.detail-value');
      await expect(client).toHaveText(ssr);await capture(page,info,`${queue}-actual-hydrated-detail`);
      records.push({route,ssr,hydrated:await client.innerText(),serverSource:'HTTP response HTML parsed inertly; hidden streaming row text, no JS-disabled visual acceptance',at:new Date().toISOString()});
    }
    expect(events.get(info)).toEqual([]);
  } finally {await info.attach('actual-SSR-hydration-equality',{body:JSON.stringify(records,null,2),contentType:'application/json'});}
});
