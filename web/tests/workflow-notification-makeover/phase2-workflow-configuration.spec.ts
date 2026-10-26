import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;

async function login(page: Page) {
  const persona = workspacePersona(workspace, "hr_admin");
  const response = await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } });
  expect(response.status()).toBe(200);
}

test.beforeAll(async ({ browser }, info) => {
  workspace = await provisionIsolatedQaWorkspace(info);
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3285" });
  const request = context.request;
  const persona = workspacePersona(workspace, "hr_admin");
  expect((await request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
  const token = (await context.cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const headers = { Authorization: `Token ${token}` };
  const stamp = Date.now();
  const template = await request.post("http://127.0.0.1:8001/api/v1/hr-admin/workflow-templates/", { headers, data: {
    code: `WN_P2_${stamp}`, name: "Phase 2 workflow template", module: "leave", trigger_key: `wn.phase2.${stamp}`,
    status: "active", version: 1, condition_snapshot: {}, steps: [{ step_order: 1, name: "Manager review", mode: "sequential", actor_type: "manager" }],
  } });
  expect(template.status()).toBe(201);
  const templateId = (await template.json() as { id: string }).id;
  expect((await request.post("http://127.0.0.1:8001/api/v1/hr-admin/workflow-template-assignments/", { headers, data: { template_id: templateId, priority: 702, is_active: true } })).status()).toBe(201);
  await context.close();
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("template and assignment catalogs commit filters, recover no-match, and preserve history", async ({ page }) => {
  await login(page);
  for (const [route, message] of [
    ["/hr-admin/workflow-templates?q=phase2-no-match&module=leave&status=active", "No templates match the current filters."],
    ["/hr-admin/workflow-template-assignments?q=phase2-no-match&module=leave&state=active", "No assignments match the current filters."],
  ] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    const href = await page.getByRole("link", { name: "Clear filters" }).first().getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Phase 2 workflow template", { exact: true }).first()).toBeVisible();
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/q=phase2-no-match/);
  }
});

test("template validation focuses the first invalid field and step order is keyboard-operable", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/workflow-templates/new", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Create workflow template" }).click();
  await expect(page.locator('[data-workflow-field="code"]')).toBeFocused();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Review the highlighted");

  const names = page.locator('[data-workflow-field$=".name"]');
  await names.first().fill("First review");
  await page.getByRole("button", { name: "Add step" }).click();
  await names.nth(1).fill("Second review");
  await page.getByRole("button", { name: "Move step 2 up" }).click();
  await expect(names.first()).toHaveValue("Second review");
  await expect(names.nth(1)).toHaveValue("First review");
});

test("dirty template and assignment editors keep the operator on the page when discard is declined", async ({ page }) => {
  await login(page);
  for (const [route, field] of [
    ["/hr-admin/workflow-templates/new", page.locator('[data-workflow-field="name"]')],
    ["/hr-admin/workflow-template-assignments/new", page.locator('[data-assignment-field="priority"]')],
  ] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await field.fill("9");
    page.once("dialog", async (dialog) => { expect(dialog.type()).toBe("confirm"); await dialog.dismiss(); });
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(route);
  }
});

test("template save failure retains input and provides recoverable feedback", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/workflow-templates/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-workflow-field="code"]').fill("FAILURE_SAFE");
  await page.locator('[data-workflow-field="name"]').fill("Retained workflow input");
  await page.locator('[data-workflow-field="trigger_key"]').fill("workflow.failure.safe");
  await page.locator('[data-workflow-field="steps.0.name"]').fill("Manager review");
  await page.route("**/api/hr-admin/workflow-templates", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Create workflow template" }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("service did not respond");
  await expect(page.locator('[data-workflow-field="name"]')).toHaveValue("Retained workflow input");
  await expect(page.getByRole("button", { name: "Create workflow template" })).toBeEnabled();
});

test("assignment validation focuses template selection", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/workflow-template-assignments/new", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Create assignment" }).click();
  await expect(page.locator('[data-assignment-field="template_id"]')).toBeFocused();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Review the highlighted");
});

test("template create and edit persist through the catalog", async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const createdName = `Persisted workflow ${stamp}`;
  const editedName = `${createdName} edited`;
  await page.goto("/hr-admin/workflow-templates/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-workflow-field="code"]').fill(`PERSIST_${stamp}`);
  await page.locator('[data-workflow-field="name"]').fill(createdName);
  await page.locator('[data-workflow-field="trigger_key"]').fill(`workflow.persist.${stamp}`);
  await page.locator('[data-workflow-field="steps.0.name"]').fill("Manager approval");
  await page.getByRole("button", { name: "Create workflow template" }).click();
  await expect(page).toHaveURL("/hr-admin/workflow-templates");
  const card = page.locator("article", { hasText: createdName });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "Edit" }).click();
  await page.locator('[data-workflow-field="name"]').fill(editedName);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/hr-admin/workflow-templates");
  await expect(page.getByText(editedName, { exact: true })).toBeVisible();
});

test("assignment create and edit persist through the catalog", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/workflow-template-assignments/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-assignment-field="template_id"]').selectOption({ label: "Phase 2 workflow template" });
  await page.locator('[data-assignment-field="priority"]').fill("811");
  await page.getByRole("button", { name: "Create assignment" }).click();
  await expect(page).toHaveURL("/hr-admin/workflow-template-assignments");
  const card = page.locator("article", { hasText: "Phase 2 workflow template" }).filter({ hasText: "811" });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "Edit" }).click();
  await page.locator('[data-assignment-field="priority"]').fill("812");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL("/hr-admin/workflow-template-assignments");
  await expect(page.locator("article", { hasText: "Phase 2 workflow template" }).filter({ hasText: "812" })).toBeVisible();
});
