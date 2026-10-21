import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { provisionIsolatedQaWorkspace, cleanupIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from '../helpers/isolated-qa-workspace';
const repo = path.resolve(__dirname, '../../..');
const evidence = process.env.PHASE2_EVIDENCE_DIR!;
let workspace: IsolatedQaWorkspace;
let details: { assignment_id: string; type_id: string };
let errors: string[];
function django(code: string) { return execFileSync(path.join(repo, '.venv/bin/python'), ['backend/manage.py', 'shell', '-c', code], { cwd: repo, env: process.env, encoding: 'utf8' }).trim().split('\n').at(-1)!; }
test.beforeAll(async ({ browser }, info) => {
  mkdirSync(path.join(evidence, 'screenshots'), { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
  django(`import runpy; m=runpy.run_path('docs/qa/evidence/leave-completion-phase2/visual-fixture.py'); m['prepare'](${JSON.stringify(workspace.manifestPath)})`);
  details = JSON.parse(django(`import json; from apps.leave_management.models import LeavePolicy; p=LeavePolicy.objects.get(pk='${workspace.manifest.leave.policy_id}'); print(json.dumps({'type_id':str(p.leave_type_id),'assignment_id':str(p.assignments.first().pk)}))`));
  writeFileSync(path.join(evidence, `${info.project.name}-browser.json`), JSON.stringify({ engine: browser.browserType().name(), version: browser.version(), platform: process.platform, arch: process.arch }, null, 2));
});
test.afterAll(async () => { await cleanupIsolatedQaWorkspace(workspace); });
test.beforeEach(({ page }) => { errors = []; page.on('pageerror', e => errors.push(e.message)); });
test.afterEach(() => expect(errors).toEqual([]));
async function login(page: Page, role: 'hr_admin' | 'employee' | 'manager' | 'tenant_admin') {
  const actor = workspacePersona(workspace, role);
  expect((await page.request.post('/api/auth/login', { data: { identifier: actor.username, password: actor.password } })).status()).toBe(200);
}
async function navigation(page: Page, pathname: string, action: () => Promise<unknown>) {
  const terminal = page.waitForResponse(r => r.request().isNavigationRequest() && new URL(r.url()).pathname === pathname && ![301, 302, 307, 308].includes(r.status()));
  await action(); const response = await terminal; expect(response.status()).toBe(200); expect(await response.finished()).toBeNull();
}
async function capture(page: Page, label: string, fullScan = false) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(evidence, 'screenshots', `${test.info().project.name}-${label}.png`), fullPage: !label.includes('dialog') });
  await page.addScriptTag({ content: readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8') });
  const result = await page.evaluate(async full => (window as unknown as { axe: { run: (r: unknown, o: unknown) => Promise<{ violations: unknown[]; incomplete: { id: string }[] }> } }).axe.run(full ? document : document.querySelector('[role="dialog"]') ?? document.querySelector('main'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }), fullScan);
  writeFileSync(path.join(evidence, `${test.info().project.name}-${label}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]);
  expect(result.incomplete.filter(rule => rule.id === 'aria-prohibited-attr')).toEqual([]);
}

test('HR Leave catalogs reports and year controls share compact headers and responsive surfaces', async ({ page }) => {
  await login(page, 'hr_admin');
  for (const route of ['leave-requests', 'leave-balances', 'leave-types', 'leave-policies', 'leave-policy-assignments', 'leave-year', 'reports/leave-balance', 'reports/leave-attendance-collisions', 'holiday-calendars']) {
    await page.goto('/hr-admin/' + route); await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toHaveCSS('font-size', '18px');
    for (const width of [1440, 390]) { await page.setViewportSize({ width, height: 900 }); await capture(page, `hr-${route.replaceAll('/', '-')}-${width}`, route === 'leave-requests'); }
  }
});

test('create and edit forms keep every field and reachable actions in the shared family', async ({ page }) => {
  await login(page, 'hr_admin');
  for (const [route, id] of [['leave-types', details.type_id], ['leave-policies', workspace.manifest.leave.policy_id], ['leave-policy-assignments', details.assignment_id]]) {
    for (const suffix of ['new', `${id}/edit`]) {
      await page.goto(`/hr-admin/${route}/${suffix}`); await expect(page.getByRole('main').getByRole('heading', { level: 1 })).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.locator('main form').first()).toBeVisible();
      if (route === 'leave-policies') { for (const summary of await page.locator('.form-section-card__summary').all()) { const box = (await summary.boundingBox())!; const copy = (await summary.locator(':scope > span').first().boundingBox())!; expect(copy.width / box.width).toBeGreaterThan(0.7); expect(box.height).toBeLessThan(240); } }
      await capture(page, `form-${route}-${suffix === 'new' ? 'new' : 'edit'}-390`);
      const submit = page.locator('main form button[type="submit"]').last(); await expect(submit).toBeEnabled(); await submit.focus(); await expect(submit).toBeFocused();
    }
  }
});

test('ESS MSS and Tenant Admin consume one shell header footer and responsive page language', async ({ page }) => {
  for (const [role, route, heading] of [['employee', '/ess/leave', 'Leave'], ['manager', '/mss/approvals?queue=leave', 'Manager approvals'], ['tenant_admin', '/tenant-admin/leave-year', 'Leave-year control']] as const) {
    await login(page, role); await page.goto(route); await expect(page.getByRole('heading', { name: heading, exact: true })).toHaveCSS('font-size', '18px');
    await expect(page.locator('.app-shell')).toHaveClass(/accerio-shell/); await expect(page.getByRole('contentinfo', { name: 'Workspace footer' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('button', { name: 'Sign out', exact: true })).toHaveCount(0);
    for (const width of [1440, 768, 320]) { await page.setViewportSize({ width, height: 900 }); await capture(page, `${role}-${width}`, true); }
    if (role === 'tenant_admin') { await page.getByText('Menu', { exact: true }).click(); await expect(page.getByRole('link', { name: /Leave Years/ }).filter({ visible: true })).toBeVisible(); }
  }
});

test('mobile pagination remains compact named keyboard-operable and preserves committed filters', async ({ page }) => {
  await login(page, 'employee'); await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/ess/leave?q=Global+filler');
  const actions = page.locator('.pagination-bar__actions'); await expect(actions.getByRole('button', { name: 'First', exact: true })).toBeDisabled();
  expect((await actions.boundingBox())!.height).toBeLessThanOrEqual(100);
  const next = actions.getByRole('link', { name: 'Next', exact: true }); await next.focus(); await navigation(page, '/ess/leave', () => page.keyboard.press('Enter'));
  await expect(page).toHaveURL(/page=2/); await expect(page).toHaveURL(/q=Global/); await expect(page.getByRole('table', { name: 'Leave request history' }).locator('tbody tr')).toHaveCount(10);
  await capture(page, 'pagination-320');
});

test('manager scroll ownership dialog focus containment restoration and short viewport actions', async ({ page }) => {
  await login(page, 'manager'); await page.setViewportSize({ width: 320, height: 568 }); await page.goto('/mss/approvals?queue=leave');
  const scroll = page.getByRole('region', { name: 'Pending leave requests, scroll for more columns', exact: true }); await scroll.focus(); await page.keyboard.press('ArrowRight'); await expect.poll(() => scroll.evaluate(n => n.scrollLeft)).toBeGreaterThan(0); await expect(scroll).toBeFocused(); await page.keyboard.press('ArrowLeft'); await expect.poll(() => scroll.evaluate(n => n.scrollLeft)).toBe(0);
  const trigger = page.getByRole('button', { name: 'Review', exact: true }).last(); await trigger.focus(); await page.keyboard.press('Enter'); const dialog = page.getByRole('dialog'); await expect(dialog).toHaveAttribute('aria-modal', 'true');
  const note = dialog.getByLabel('Decision note'); await note.fill('Synthetic focus review only');
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); await expect.poll(() => dialog.evaluate(n => n.contains(document.activeElement))).toBe(true); }
  const approve = dialog.getByRole('button', { name: 'Approve request', exact: true }); await approve.focus(); await expect(approve).toBeFocused();
  const box = await approve.boundingBox(); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  await capture(page, 'mss-dialog-320'); page.once('dialog', async prompt => { expect(prompt.type()).toBe('confirm'); expect(prompt.message()).toBe('Discard unsaved changes?'); await prompt.dismiss(); }); await page.keyboard.press('Escape'); await expect(dialog).toBeVisible(); await expect(note).toHaveValue('Synthetic focus review only'); page.once('dialog', async prompt => { expect(prompt.message()).toBe('Discard unsaved changes?'); await prompt.accept(); }); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 320, height: 360 }); await trigger.focus(); await page.keyboard.press('Enter'); await expect(dialog).toBeVisible(); await dialog.getByRole('button', { name: 'Approve request', exact: true }).focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab'); const shortAction = await dialog.getByRole('button', { name: 'Approve request', exact: true }).boundingBox(); expect(shortAction!.y).toBeGreaterThanOrEqual(0); expect(shortAction!.y + shortAction!.height).toBeLessThanOrEqual(360); await capture(page, 'mss-dialog-short'); await page.keyboard.press('Escape');
});

test('import tools keep native disabled actions distinct and compact without submitting business rows', async ({ page }) => {
  await login(page, 'hr_admin'); await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/hr-admin/leave-policy-assignments?q=no-visible-assignments');
  await page.getByText('Assignment governance tools', { exact: true }).click();
  const commit = page.getByRole('button', { name: 'Commit ready assignment rows' }); const preview = page.getByRole('button', { name: 'Preview assignment import' });
  await expect(commit).toBeDisabled(); await expect(preview).toBeEnabled();
  expect(await commit.evaluate(n => getComputedStyle(n).backgroundColor)).not.toBe(await preview.evaluate(n => getComputedStyle(n).backgroundColor));
  await expect(page.getByLabel('Leave policy assignment CSV data')).toBeEditable(); await capture(page, 'assignment-tools-390');
  await page.setViewportSize({ width: 768, height: 900 }); expect((await page.locator('.page-intro__actions').boundingBox())!.height).toBeLessThanOrEqual(44); expect((await page.locator('.organization-import-actions').boundingBox())!.height).toBeLessThan(220); await capture(page, 'assignment-tools-768');
});

test('policy dialog supports small and short viewports with keyboard close and reduced motion', async ({ page }) => {
  await login(page, 'hr_admin'); await page.setViewportSize({ width: 320, height: 568 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/hr-admin/leave-policies?leavePolicyModal=create');
  const dialog = page.getByRole('dialog', { name: 'Create leave policy' }); await expect(dialog).toBeVisible();
  const submit = dialog.getByRole('button', { name: 'Create leave policy', exact: true }); await expect(submit).toBeEnabled(); await submit.focus();
  const box = await submit.boundingBox(); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y + box!.height).toBeLessThanOrEqual(568);
  await capture(page, 'policy-dialog-320'); await page.setViewportSize({ width: 320, height: 360 }); await submit.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); const shortSubmit = await submit.boundingBox(); expect(shortSubmit!.y).toBeGreaterThanOrEqual(0); expect(shortSubmit!.y + shortSubmit!.height).toBeLessThanOrEqual(360); await capture(page, 'policy-dialog-short'); await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
});
