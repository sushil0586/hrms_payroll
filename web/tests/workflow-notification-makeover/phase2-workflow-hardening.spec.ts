import { expect, test, type Browser, type Page } from "@playwright/test";

import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, type IsolatedQaWorkspace, workspacePersona } from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;
let foreignWorkspace: IsolatedQaWorkspace;
let foreignTemplateId = "";

async function login(page: Page, role: "hr_admin" | "employee" | "manager" = "hr_admin") {
  const persona = workspacePersona(workspace, role);
  expect((await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  await page.context().setExtraHTTPHeaders(token ? { Authorization: `Token ${token}` } : {});
}

async function createTemplateForWorkspace(browser: Browser, target: IsolatedQaWorkspace) {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3285" });
  const persona = workspacePersona(target, "hr_admin");
  expect((await context.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
  const token = (await context.cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  const stamp = Date.now();
  const response = await context.request.post("http://127.0.0.1:8001/api/v1/hr-admin/workflow-templates/", {
    headers: { Authorization: `Token ${token}` },
    data: { code: `FOREIGN_${stamp}`, name: "Foreign workflow", module: "leave", trigger_key: `foreign.${stamp}`, status: "active", version: 1, condition_snapshot: {}, steps: [{ step_order: 1, name: "Review", mode: "sequential", actor_type: "manager" }] },
  });
  expect(response.status()).toBe(201);
  const id = (await response.json() as { id: string }).id;
  await context.close();
  return id;
}

test.beforeAll(async ({ browser }, info) => {
  workspace = await provisionIsolatedQaWorkspace(info);
  foreignWorkspace = await provisionIsolatedQaWorkspace(info);
  foreignTemplateId = await createTemplateForWorkspace(browser, foreignWorkspace);
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
  await cleanupIsolatedQaWorkspace(foreignWorkspace);
});

test("employee and manager writes are denied", async ({ page }) => {
  for (const role of ["employee", "manager"] as const) {
    await login(page, role);
    const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
    for (const endpoint of ["workflow-templates", "workflow-template-assignments"]) {
      const response = await page.request.post(`http://127.0.0.1:8001/api/v1/hr-admin/${endpoint}/`, { headers: { Authorization: `Token ${token}` }, data: {} });
      expect([403, 404]).toContain(response.status());
    }
  }
});

test("stale and foreign template IDs render the unavailable page", async ({ page }) => {
  await login(page);
  for (const id of ["00000000-0000-4000-8000-000000000000", foreignTemplateId]) {
    await page.goto(`/hr-admin/workflow-templates/${id}/edit`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /page could not be found/i })).toBeVisible();
  }
});

test("5xx and malformed save responses retain template input", async ({ page }) => {
  await login(page);
  for (const mode of ["5xx", "malformed"] as const) {
    await page.goto("/hr-admin/workflow-templates/new", { waitUntil: "domcontentloaded" });
    await page.locator('[data-workflow-field="code"]').fill(`SAFE_${mode}`);
    await page.locator('[data-workflow-field="name"]').fill(`Retained ${mode}`);
    await page.locator('[data-workflow-field="trigger_key"]').fill(`safe.${mode}`);
    await page.locator('[data-workflow-field="steps.0.name"]').fill("Review");
    await page.route("**/api/hr-admin/workflow-templates", (route) => mode === "5xx"
      ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Temporarily unavailable." }) })
      : route.fulfill({ status: 200, contentType: "text/plain", body: "unreadable" }));
    await page.getByRole("button", { name: "Create workflow template" }).click();
    await expect(page.locator('.notice[role="alert"]')).toBeVisible();
    await expect(page.locator('[data-workflow-field="name"]')).toHaveValue(`Retained ${mode}`);
    await page.unroute("**/api/hr-admin/workflow-templates");
  }
});

test("duplicate submit produces one write request", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/workflow-templates/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-workflow-field="code"]').fill("DUPLICATE_GUARD");
  await page.locator('[data-workflow-field="name"]').fill("Duplicate guard");
  await page.locator('[data-workflow-field="trigger_key"]').fill("duplicate.guard");
  await page.locator('[data-workflow-field="steps.0.name"]').fill("Review");
  let writes = 0;
  await page.route("**/api/hr-admin/workflow-templates", async (route) => { writes += 1; await new Promise((resolve) => setTimeout(resolve, 300)); await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Controlled failure." }) }); });
  const submit = page.getByRole("button", { name: "Create workflow template" });
  await submit.dblclick();
  await expect(page.locator('.notice[role="alert"]')).toBeVisible();
  expect(writes).toBe(1);
});

test("exact duplicate assignment scope returns actionable conflict feedback", async ({ page, browser }) => {
  const templateId = await createTemplateForWorkspace(browser, workspace);
  await login(page);
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  const url = "http://127.0.0.1:8001/api/v1/hr-admin/workflow-template-assignments/";
  const options = { headers: { Authorization: `Token ${token}` }, data: { template_id: templateId, priority: 100, is_active: true } };
  expect((await page.request.post(url, options)).status()).toBe(201);
  const duplicate = await page.request.post(url, options);
  expect(duplicate.status()).toBe(400);
  await expect(duplicate.json()).resolves.toMatchObject({ non_field_errors: [expect.stringContaining("exact organization scope")] });
});

test("workflow pages remain responsive and pass selected WCAG A/AA scans", async ({ page }) => {
  await login(page);
  for (const route of ["/hr-admin/workflows", "/hr-admin/workflow-templates", "/hr-admin/workflow-template-assignments", "/hr-admin/workflow-templates/new"]) {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }).then((result) => result.violations));
    expect(violations).toEqual([]);
  }
});
