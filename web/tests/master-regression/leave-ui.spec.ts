import {test, expect, type Page} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {
  provisionIsolatedQaWorkspace,
  cleanupIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from '../helpers/isolated-qa-workspace';

const repo = path.resolve(__dirname, '../../..');
const evidenceRoot = process.env.HRMS_MASTER_EVIDENCE_ROOT!;
const inventory = JSON.parse(readFileSync(path.join(repo, 'docs/ui/hrms-ui-ux-route-inventory.json'), 'utf8')) as {
  routes: Array<{route: string; evidence: string | null; workspace: string}>;
};
const staticRoutes = inventory.routes.filter((entry) =>
  entry.evidence === 'hrms-leave-phase2-design-certification.md' && !entry.route.includes('['),
);
const roles: Record<string, 'hr_admin' | 'employee' | 'manager' | 'tenant_admin'> = {
  'hr-admin': 'hr_admin', ess: 'employee', mss: 'manager', 'tenant-admin': 'tenant_admin',
};
let fixture: IsolatedQaWorkspace;
let dynamicRoutes: string[] = [];

test.beforeAll(async ({}, info) => {
  fixture = await provisionIsolatedQaWorkspace(info);
  const output = execFileSync(path.join(repo, '.venv/bin/python'), [
    'backend/manage.py', 'shell', '-c',
    `import json; from tests.fixtures.ui_ux_rollout import prepare; print(json.dumps(prepare(${JSON.stringify(fixture.manifestPath)})))`,
  ], {cwd: repo, env: process.env, encoding: 'utf8'});
  dynamicRoutes = JSON.parse(output.trim().split('\n').at(-1)!).filter((route: string) =>
    /^\/hr-admin\/leave-(types|policies|policy-assignments)\//.test(route),
  );
});
test.afterAll(async () => cleanupIsolatedQaWorkspace(fixture));

async function login(page: Page, role: 'hr_admin' | 'employee' | 'manager' | 'tenant_admin') {
  const persona = workspacePersona(fixture, role);
  expect((await page.request.post('/api/auth/login', {data: {identifier: persona.username, password: persona.password}})).status()).toBe(200);
}

async function verifyRoute(page: Page, route: string, project: string) {
  const response = await page.goto(route);
  expect(response?.status(), route).toBe(200);
  await expect(page.locator('main h1'), route).toHaveCount(1);
  await expect(page.locator('main h1'), route).toBeVisible();
  await expect(page.locator('main.accerio-page'), route).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({width, height: 900});
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), {message: `${route} overflow at ${width}`}).toBeTruthy();
    if (width === 390) {
      for (const region of await page.locator('main .workspace-table-region:visible').all()) {
        await expect(region).toHaveAttribute('tabindex', '0');
      }
    }
    if (width === 1440 || width === 390) {
      const name = route.slice(1).replaceAll('/', '-').replace(/[^a-z0-9-]/gi, '_');
      await page.screenshot({path: path.join(evidenceRoot, `${project}-${name}-${width}.png`), fullPage: true});
    }
  }
}

for (const entry of staticRoutes) {
  test(`Leave route ${entry.route}`, async ({page}, info) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await login(page, roles[entry.workspace]);
    await verifyRoute(page, entry.route, info.project.name);
    expect(errors).toEqual([]);
  });
}

test('Leave dynamic edit routes', async ({page}, info) => {
  await login(page, 'hr_admin');
  expect(dynamicRoutes).toHaveLength(3);
  for (const route of dynamicRoutes) await verifyRoute(page, route, info.project.name);
});

test('Leave shared dialogs restore keyboard focus', async ({page}) => {
  for (const item of [
    {role: 'employee' as const, route: '/ess/leave', trigger: 'Apply leave'},
    {role: 'manager' as const, route: '/mss/approvals?queue=leave', trigger: 'Review'},
  ]) {
    await page.request.post('/api/auth/logout');
    await login(page, item.role);
    await page.setViewportSize({width: 320, height: 568});
    await page.goto(item.route);
    const trigger = page.getByRole('button', {name: item.trigger, exact: true}).first();
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 12; index += 1) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBeTruthy();
    }
    await dialog.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test('Leave selected accessibility scans', async ({page}, info) => {
  for (const item of [
    {role: 'hr_admin' as const, route: '/hr-admin/leave-requests'},
    {role: 'hr_admin' as const, route: '/hr-admin/leave-policies'},
    {role: 'employee' as const, route: '/ess/leave'},
    {role: 'manager' as const, route: '/mss/approvals?queue=leave'},
    {role: 'tenant_admin' as const, route: '/tenant-admin/leave-year'},
  ]) {
    await page.request.post('/api/auth/logout');
    await login(page, item.role);
    await page.goto(item.route);
    await page.addScriptTag({path: require.resolve('axe-core/axe.min.js')});
    const result = await page.evaluate(async () => (window as unknown as {axe: {run: (context: object) => Promise<{violations: unknown[]}>}}).axe.run({include: [['main']]}));
    await info.attach(`axe-${item.route.replaceAll('/', '-')}`, {body: JSON.stringify(result), contentType: 'application/json'});
    expect(result.violations, item.route).toEqual([]);
  }
});
