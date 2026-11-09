import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
let workspace: IsolatedQaWorkspace;
test.beforeAll(async ({}, info) => { workspace = await provisionIsolatedQaWorkspace(info); });
test.afterAll(async ({}, info) => cleanupIsolatedQaWorkspace(workspace, info));
async function login(page: Page, role: "hr_admin" | "employee" | "manager") {
  const actor = workspacePersona(workspace, role);
  expect((await page.request.post("/api/auth/login", { data: { identifier: actor.username, password: actor.password } })).status()).toBe(200);
}
async function screenshot(page: Page, info: TestInfo, name: string) {
  await info.attach(name, { body: await page.screenshot({ fullPage: false, animations: "disabled" }), contentType: "image/png" });
}
test("sidebar names across shared role shells", async ({ page }, info) => {
  for (const [role, routes] of [["hr_admin", ["/hr-admin/shifts", "/hr-admin/employee-shift-assignments"]], ["employee", ["/ess/attendance"]], ["manager", ["/mss/approvals?queue=attendance"]]] as const) {
    await login(page, role);
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator("main:not([aria-busy=\"true\"])").last()).toBeVisible();
      const menu = page.locator("summary").filter({ hasText: /^Menu$/ });
      if (await menu.isVisible()) await menu.click();
      const links = page.locator("a.nav-item:visible, a.mobile-workspace-nav__link:visible");
      await expect.poll(() => links.count()).toBeGreaterThan(0);
      for (const link of await links.all()) {
        const label = (await link.locator("strong").textContent())!.trim();
        await expect(link).toHaveAccessibleName(new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\s|$)`));
      }
      await screenshot(page, info, `${role}-${route.replaceAll("/", "_")}-navigation`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
    }
  }
});
test.beforeEach(async ({ browser }, info) => {
  await info.attach("browser-runtime", { body: JSON.stringify({ engine: info.project.use.browserName, version: browser.version(), viewport: info.project.use.viewport, project: info.project.name }), contentType: "application/json" });
});
test("sidebar full-document accessibility including open mobile navigation", async ({ page }, info) => {
  const findings: unknown[] = [];
  for (const [role, routes] of [["hr_admin", ["/hr-admin/shifts", "/hr-admin/employee-shift-assignments"]], ["employee", ["/ess/attendance"]], ["manager", ["/mss/approvals?queue=attendance"]]] as const) {
    await login(page, role);
    for (const route of routes) {
      await page.goto(route); await expect(page.locator("main:not([aria-busy=\"true\"])").last()).toBeVisible();
      const menu = page.locator("summary").filter({ hasText: /^Menu$/ }); if (await menu.isVisible()) await menu.click();
      await expect.poll(() => page.locator("a.nav-item:visible, a.mobile-workspace-nav__link:visible").count()).toBeGreaterThan(0);
      await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => (window as unknown as { axe: { run: (context: Document, options: object) => Promise<{ violations: unknown[] }> } }).axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } }).then(r => r.violations));
      await info.attach(`${role}-${route.replaceAll("/", "_")}-axe`, { body: JSON.stringify(violations, null, 2), contentType: "application/json" });
      await screenshot(page, info, `${role}-axe-navigation`);
      if (violations.length) findings.push({ role, route, violations });
    }
  }
  expect(findings).toEqual([]);
});

for (const [kind, route, action] of [["shift", "/hr-admin/shifts", "Create shift"], ["assignment", "/hr-admin/employee-shift-assignments", "Create assignment"]] as const) {
  test(`modal ${kind} containment, reverse traversal, background isolation, Escape and restoration`, async ({ page }, info) => {
    await login(page, "hr_admin"); await page.goto(route);
    const trigger = page.getByRole("button", { name: action, exact: true }).first();
    const triggerElement = await trigger.elementHandle();
    if (!triggerElement) throw new Error("Modal trigger is missing");
    await trigger.click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
    await screenshot(page, info, `${kind}-open`);
    const traversal: unknown[] = [];
    try {
      for (const key of ["Tab", "Shift+Tab"] as const) for (let step = 0; step < 45; step++) {
        await page.keyboard.press(key);
        traversal.push(await page.evaluate(({ key, step }) => ({ key, step, tag: document.activeElement?.tagName, type: document.activeElement?.getAttribute("type"), inside: !!document.activeElement?.closest('[role="dialog"]') }), { key, step }));
        await expect.poll(() => dialog.evaluate(d => d.contains(document.activeElement)), { timeout: 1000 }).toBe(true);
      }
      await triggerElement.evaluate(el => el.focus());
      await expect.poll(() => dialog.evaluate(d => d.contains(document.activeElement))).toBe(true);
      const save = dialog.getByRole("button", { name: action, exact: true }); await save.scrollIntoViewIfNeeded(); await expect(save).toBeInViewport();
      await screenshot(page, info, `${kind}-reachable-footer`);
      await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
      // Cancel/close must remain operable after a second open.
      await trigger.click(); await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: /^Close / }).click(); await expect(dialog).toHaveCount(0); await expect(trigger).toBeFocused();
    } finally { await info.attach(`${kind}-focus-traversal`, { body: JSON.stringify(traversal, null, 2), contentType: "application/json" }); }
  });
}

test('navigation selected hover focus and color-scheme contracts',async({page},info)=>{
  const observations:unknown[]=[];
  for(const role of ['hr_admin','employee','manager'] as const){
    await login(page,role);await page.goto(role==='hr_admin'?'/hr-admin/shifts':role==='employee'?'/ess/attendance':'/mss/approvals?queue=attendance');
    await expect(page.locator('.accerio-shell')).toBeVisible();
    if(role==='hr_admin')await expect(page.locator('[data-local-update-hydrated="true"]').first()).toBeVisible();
    const menu=page.locator('summary').filter({hasText:/^Menu$/});if(await menu.isVisible())await menu.click();
    const links=page.locator('a.mobile-workspace-nav__link:visible, a.nav-item:visible');await expect.poll(()=>links.count()).toBeGreaterThan(0);
    const active=links.locator(':scope[aria-current="page"]').first();
    const target=await active.count()?active:links.first();
    for(const scheme of ['light','dark'] as const){
      await page.emulateMedia({colorScheme:scheme});
      for(const state of ['default','hover','focus'] as const){
        if(state==='hover')await target.hover();if(state==='focus')await target.focus();
        const colors=await target.evaluate(el=>{
          const child=el.querySelector('small') as HTMLElement|null;
          return {foreground:child?getComputedStyle(child).color:null,background:getComputedStyle(el).backgroundColor,outline:getComputedStyle(el).outlineColor,disabled:el.getAttribute('aria-disabled'),text:el.querySelector('strong')?.textContent};
        });
        observations.push({role,scheme,state,colors});
        if((page.viewportSize()?.width??1440)<=768)expect(colors.foreground).toBe('rgb(86, 97, 118)');
      }
    }
    await screenshot(page,info,`${role}-navigation-focused`);
  }
  await info.attach('navigation-state-colors',{body:JSON.stringify({observations,note:'Current application has one palette; prefers-color-scheme does not introduce a separate supported dark theme. Disabled controls are recorded separately by rendered-state inspection.'},null,2),contentType:'application/json'});
});
