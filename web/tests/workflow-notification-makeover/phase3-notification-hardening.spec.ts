import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, type IsolatedQaWorkspace, workspacePersona } from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;
let foreignWorkspace: IsolatedQaWorkspace;
let foreignTemplateId = "";
let foreignEventId = "";

async function login(page: Page) {
  const persona = workspacePersona(workspace, "hr_admin");
  expect((await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
}

async function tokenFor(page: Page) {
  return (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
}

async function apiPost(request: APIRequestContext, token: string, endpoint: string, data: Record<string, unknown>) {
  return request.post(`http://127.0.0.1:8001/api/v1/hr-admin/${endpoint}/`, {
    headers: { Authorization: `Token ${token}` },
    data,
  });
}

async function createForeignRecords(browser: Browser) {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3285" });
  const persona = workspacePersona(foreignWorkspace, "hr_admin");
  expect((await context.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
  const token = (await context.cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  const stamp = Date.now();
  const template = await apiPost(context.request, token, "notification-templates", {
    code: `FOREIGN_TEMPLATE_${stamp}`, name: "Foreign notification template", channel: "in_app", status: "active", body_template: "Foreign body", metadata_template: {},
  });
  expect(template.status()).toBe(201);
  foreignTemplateId = (await template.json() as { id: string }).id;
  const event = await apiPost(context.request, token, "notification-events", {
    code: `FOREIGN_EVENT_${stamp}`, name: "Foreign notification event", module: "leave", trigger_key: `foreign.event.${stamp}`, audience_type: "employee", channel: "in_app", template_id: foreignTemplateId, is_active: true, priority: "normal", delivery_delay_minutes: 0, recipient_snapshot: {},
  });
  expect(event.status()).toBe(201);
  foreignEventId = (await event.json() as { id: string }).id;
  await context.close();
}

test.beforeAll(async ({ browser }, info) => {
  workspace = await provisionIsolatedQaWorkspace(info);
  foreignWorkspace = await provisionIsolatedQaWorkspace(info);
  await createForeignRecords(browser);
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
  await cleanupIsolatedQaWorkspace(foreignWorkspace);
});

test("delivery settings persist while credential-shaped provider keys are rejected", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/notification-delivery", { waitUntil: "domcontentloaded" });
  const card = page.locator('[data-channel-config="email"]');
  const senderAddress = card.getByLabel("From email");
  await senderAddress.fill("phase3-hardening@example.test");
  await card.getByRole("button", { name: /Save Email delivery settings/i }).click();
  await expect(card.getByRole("status")).toContainText("Saved");
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-channel-config="email"]').getByLabel("From email")).toHaveValue("phase3-hardening@example.test");

  const token = await tokenFor(page);
  const configs = await page.request.get("http://127.0.0.1:8001/api/v1/hr-admin/notification-channel-configs/", { headers: { Authorization: `Token ${token}` } });
  const email = (await configs.json() as Array<{ id: string; channel: string }>).find((item) => item.channel === "email");
  expect(email).toBeTruthy();
  const secretWrite = await page.request.patch(`http://127.0.0.1:8001/api/v1/hr-admin/notification-channel-configs/${email!.id}/`, {
    headers: { Authorization: `Token ${token}` }, data: { provider_config: { api_token: "must-not-be-stored" } },
  });
  expect(secretWrite.status()).toBe(400);
  expect(JSON.stringify(await secretWrite.json())).toContain("deployment environment variables");
});

test("duplicate codes and invalid template dependencies return actionable validation", async ({ page }) => {
  await login(page);
  const token = await tokenFor(page);
  const stamp = Date.now();
  const templateData = { code: `P3_DUP_${stamp}`, name: "Duplicate template", channel: "in_app", status: "active", body_template: "Body", metadata_template: {} };
  expect((await apiPost(page.request, token, "notification-templates", templateData)).status()).toBe(201);
  const duplicateTemplate = await apiPost(page.request, token, "notification-templates", templateData);
  expect(duplicateTemplate.status()).toBe(400);
  expect(JSON.stringify(await duplicateTemplate.json())).toContain("code and channel already exists");

  const eventData = { code: `P3_EVT_DUP_${stamp}`, name: "Duplicate event", module: "leave", trigger_key: `duplicate.${stamp}`, audience_type: "employee", channel: "in_app", is_active: false, priority: "normal", delivery_delay_minutes: 0, recipient_snapshot: {} };
  expect((await apiPost(page.request, token, "notification-events", eventData)).status()).toBe(201);
  const duplicateEvent = await apiPost(page.request, token, "notification-events", eventData);
  expect(duplicateEvent.status()).toBe(400);
  expect(JSON.stringify(await duplicateEvent.json())).toContain("event with this code already exists");

  const draftTemplate = await apiPost(page.request, token, "notification-templates", { code: `P3_DRAFT_${stamp}`, name: "Draft dependency", channel: "in_app", status: "draft", body_template: "Body", metadata_template: {} });
  const draftId = (await draftTemplate.json() as { id: string }).id;
  const inactiveDependency = await apiPost(page.request, token, "notification-events", { ...eventData, code: `P3_INACTIVE_${stamp}`, template_id: draftId, is_active: true });
  expect(inactiveDependency.status()).toBe(400);
  expect(JSON.stringify(await inactiveDependency.json())).toContain("requires an active template");
  const channelMismatch = await apiPost(page.request, token, "notification-events", { ...eventData, code: `P3_MISMATCH_${stamp}`, channel: "email", template_id: draftId, is_active: false });
  expect(channelMismatch.status()).toBe(400);
  expect(JSON.stringify(await channelMismatch.json())).toContain("channel must match");
});

test("stale and foreign template and event IDs render the standard unavailable page", async ({ page }) => {
  await login(page);
  const stale = "00000000-0000-4000-8000-000000000000";
  for (const route of [
    `/hr-admin/notification-templates/${stale}/edit`, `/hr-admin/notification-templates/${foreignTemplateId}/edit`,
    `/hr-admin/notification-events/${stale}/edit`, `/hr-admin/notification-events/${foreignEventId}/edit`,
  ]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /page could not be found/i })).toBeVisible();
  }
});

test("5xx and aborted writes retain operator input", async ({ page }) => {
  await login(page);
  for (const mode of ["5xx", "abort"] as const) {
    await page.goto("/hr-admin/notification-templates/new", { waitUntil: "domcontentloaded" });
    await page.locator('[data-template-field="code"]').fill(`P3_SAFE_${mode}`);
    await page.locator('[data-template-field="name"]').fill(`Retained ${mode}`);
    await page.locator('[data-template-field="body_template"]').fill("Retained body");
    await page.route("**/api/hr-admin/notification-templates", (route) => mode === "5xx"
      ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Temporarily unavailable." }) })
      : route.abort("failed"));
    await page.getByRole("button", { name: "Create template" }).click();
    await expect(page.locator('.notice[role="alert"]')).toBeVisible();
    await expect(page.locator('[data-template-field="name"]')).toHaveValue(`Retained ${mode}`);
    await page.unroute("**/api/hr-admin/notification-templates");
  }
});

test("double submit produces one notification template write", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/notification-templates/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-template-field="code"]').fill("P3_DOUBLE_GUARD");
  await page.locator('[data-template-field="name"]').fill("Double submit guard");
  await page.locator('[data-template-field="body_template"]').fill("Body");
  let writes = 0;
  await page.route("**/api/hr-admin/notification-templates", async (route) => {
    writes += 1;
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Controlled failure." }) });
  });
  await page.getByRole("button", { name: "Create template" }).dblclick();
  await expect(page.locator('.notice[role="alert"]')).toBeVisible();
  expect(writes).toBe(1);
});

test("invalid preview data is explained and preview actions remain reachable at short height", async ({ page }) => {
  await login(page);
  await page.setViewportSize({ width: 1024, height: 360 });
  await page.goto("/hr-admin/notification-templates/new", { waitUntil: "domcontentloaded" });
  const samplePayload = page.getByLabel("Sample payload JSON");
  await samplePayload.fill("{ invalid json");
  const preview = page.getByRole("button", { name: "Preview", exact: true });
  await preview.scrollIntoViewIfNeeded();
  await expect(preview).toBeVisible();
  await preview.click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Sample payload must be valid JSON");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
