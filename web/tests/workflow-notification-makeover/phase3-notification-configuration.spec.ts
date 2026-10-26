import { expect, test, type Page } from "@playwright/test";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, type IsolatedQaWorkspace, workspacePersona } from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;

async function login(page: Page, role: "hr_admin" | "employee" | "manager" = "hr_admin") {
  const persona = workspacePersona(workspace, role);
  expect((await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
}

test.beforeAll(async ({}, info) => { workspace = await provisionIsolatedQaWorkspace(info); });
test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

test("template and event validation focus the first invalid field and protect dirty forms", async ({ page }) => {
  await login(page);
  for (const [route, submit, selector] of [
    ["/hr-admin/notification-templates/new", "Create template", '[data-template-field="code"]'],
    ["/hr-admin/notification-events/new", "Create notification event", '[data-event-field="code"]'],
  ] as const) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: submit }).click();
    await expect(page.locator(selector)).toBeFocused();
    await page.locator(selector).fill("DIRTY");
    page.once("dialog", async (dialog) => { await dialog.dismiss(); });
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(route);
  }
});

test("template and event create/edit persist through their catalogs", async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  const templateName = `Phase 3 template ${stamp}`;
  await page.goto("/hr-admin/notification-templates/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-template-field="code"]').fill(`P3_${stamp}`);
  await page.locator('[data-template-field="name"]').fill(templateName);
  await page.locator('[data-template-field="body_template"]').fill("Hello {{ employee_name }}");
  await page.getByRole("button", { name: "Create template" }).click();
  await expect(page).toHaveURL("/hr-admin/notification-templates");
  const templateCard = page.locator("tr", { hasText: templateName });
  await expect(templateCard).toBeVisible();
  await templateCard.getByRole("link", { name: "Edit" }).click();
  await page.locator('[data-template-field="name"]').fill(`${templateName} edited`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(`${templateName} edited`, { exact: true })).toBeVisible();

  const eventName = `Phase 3 event ${stamp}`;
  await page.goto("/hr-admin/notification-events/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-event-field="code"]').fill(`P3_EVT_${stamp}`);
  await page.locator('[data-event-field="name"]').fill(eventName);
  await page.locator('[data-event-field="trigger_key"]').fill(`phase3.event.${stamp}`);
  await page.getByRole("button", { name: "Create notification event" }).click();
  await expect(page).toHaveURL("/hr-admin/notification-events");
  const eventCard = page.locator("tr", { hasText: eventName });
  await expect(eventCard).toBeVisible();
  await eventCard.getByRole("link", { name: "Edit" }).click();
  await page.locator('[data-event-field="name"]').fill(`${eventName} edited`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(`${eventName} edited`, { exact: true })).toBeVisible();
});

test("preview remains non-persistent while test send creates explicit evidence", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/notification-templates/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-template-field="code"]').fill("P3_PREVIEW");
  await page.locator('[data-template-field="name"]').fill("Phase 3 preview");
  await page.locator('[data-template-field="body_template"]').fill("Preview for {{ employee_name }}");
  await page.getByLabel("Test membership").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Rendered output" })).toBeVisible();
  await expect(page.getByText(/Test notification created/)).toHaveCount(0);
  await page.getByRole("button", { name: "Send test" }).click();
  await expect(page.getByText(/Test notification created; delivery is not yet confirmed/)).toBeVisible();
});

test("malformed save and delivery responses retain operator input", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/notification-templates/new", { waitUntil: "domcontentloaded" });
  await page.locator('[data-template-field="code"]').fill("P3_MALFORMED");
  await page.locator('[data-template-field="name"]').fill("Retained notification template");
  await page.locator('[data-template-field="body_template"]').fill("Retained body");
  await page.route("**/api/hr-admin/notification-templates", (route) => route.fulfill({ status: 200, contentType: "text/plain", body: "unreadable" }));
  await page.getByRole("button", { name: "Create template" }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("unreadable response");
  await expect(page.locator('[data-template-field="name"]')).toHaveValue("Retained notification template");
  await page.unroute("**/api/hr-admin/notification-templates");

  await page.goto("/hr-admin/notification-delivery", { waitUntil: "domcontentloaded" });
  const card = page.locator('[data-channel-config="email"]');
  const sender = card.getByPlaceholder(/notifications@/);
  await sender.fill("retained@example.test");
  await page.route("**/api/hr-admin/notification-channel-configs/*", (route) => route.fulfill({ status: 200, contentType: "text/plain", body: "unreadable" }));
  await card.getByRole("button", { name: /Save Email delivery settings/i }).click();
  await expect(card.locator('.notice[role="alert"]')).toContainText("unreadable response");
  await expect(sender).toHaveValue("retained@example.test");
});

test("employee and manager notification configuration writes are denied", async ({ page }) => {
  for (const role of ["employee", "manager"] as const) {
    await login(page, role);
    const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
    for (const endpoint of ["notification-templates", "notification-events"]) {
      const response = await page.request.post(`http://127.0.0.1:8001/api/v1/hr-admin/${endpoint}/`, { headers: { Authorization: `Token ${token}` }, data: {} });
      expect([403, 404]).toContain(response.status());
    }
  }
});

test("notification configuration pages remain responsive and pass selected axe scans", async ({ page }) => {
  await login(page);
  for (const route of ["/hr-admin/notifications-admin", "/hr-admin/notification-delivery", "/hr-admin/notification-templates", "/hr-admin/notification-events", "/hr-admin/notification-templates/new", "/hr-admin/notification-events/new"]) {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }).then((result) => result.violations));
    expect(violations).toEqual([]);
  }
});
