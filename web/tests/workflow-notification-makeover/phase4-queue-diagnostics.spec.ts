import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, type IsolatedQaWorkspace, workspacePersona } from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;
let foreignWorkspace: IsolatedQaWorkspace;
let foreignNotificationId = "";

async function login(page: Page, role: "hr_admin" | "employee" | "manager" = "hr_admin") {
  const persona = workspacePersona(workspace, role);
  expect((await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
}

async function createNotification(context: BrowserContext, suffix: string, processNow = false) {
  const token = (await context.cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const headers = { Authorization: `Token ${token}` };
  const optionsResponse = await context.request.get("http://127.0.0.1:8001/api/v1/hr-admin/notification-options/", { headers });
  expect(optionsResponse.ok(), `options status ${optionsResponse.status()}`).toBeTruthy();
  const options = await optionsResponse.json() as { memberships: Array<{ id: string }> };
  const membership = options.memberships[0];
  expect(membership).toBeTruthy();
  const response = await context.request.post("http://127.0.0.1:8001/api/v1/hr-admin/notification-templates/test-send/", {
    headers,
    data: {
      channel: "in_app", subject_template: "", title_template: `Phase 4 ${suffix}`,
      body_template: `Queue evidence for ${suffix}.`, metadata_template: { source: "phase4" },
      sample_payload: { employee_name: "Riya Sharma" }, membership_id: membership.id, process_now: processNow,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json() as { test_notification: { id: string } }).test_notification.id;
}

async function createFailedNotification(page: Page, suffix: string) {
  const id = await createNotification(page.context(), suffix);
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  const response = await page.request.patch(`http://127.0.0.1:8001/api/v1/hr-admin/notifications/${id}/`, {
    headers: { Authorization: `Token ${token}` },
    data: { status: "failed", priority: "high", read_at: null, title: `Phase 4 failed ${suffix}`, subject: `Recovery ${suffix}` },
  });
  expect(response.ok(), `notification patch status ${response.status()}`).toBeTruthy();
  return id;
}

async function createForeignNotification(browser: Browser) {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:3285" });
  const persona = workspacePersona(foreignWorkspace, "hr_admin");
  expect((await context.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
  foreignNotificationId = await createNotification(context, "foreign");
  await context.close();
}

test.beforeAll(async ({ browser }, info) => {
  workspace = await provisionIsolatedQaWorkspace(info);
  foreignWorkspace = await provisionIsolatedQaWorkspace(info);
  await createForeignNotification(browser);
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(workspace);
  await cleanupIsolatedQaWorkspace(foreignWorkspace);
});

test("queue commits every supported filter and restores state through reload and history", async ({ page }) => {
  await login(page);
  await createNotification(page.context(), `filters-${Date.now()}`);
  await page.goto("/hr-admin/notifications", { waitUntil: "domcontentloaded" });
  const toolbar = page.getByRole("region", { name: "Notification queue toolbar" });
  await toolbar.getByLabel("Search").fill("history-scope");
  await toolbar.getByLabel("Status").selectOption("failed");
  await toolbar.getByLabel("Channel").selectOption("in_app");
  await toolbar.getByLabel("Priority").selectOption("high");
  await toolbar.getByLabel("Audience type").selectOption("membership");
  await toolbar.getByLabel("Retry state").selectOption("retry_ready");
  await toolbar.getByLabel("Module").selectOption("leave");
  await toolbar.getByLabel("Subject type").selectOption("notification_template_preview");
  await toolbar.getByLabel("Rows per page").selectOption("10");
  await toolbar.getByLabel("Search").press("Enter");
  await expect(page).toHaveURL(/q=history-scope/);
  for (const fragment of ["status=failed", "channel=in_app", "priority=high", "audience_type=membership", "retry_state=retry_ready", "module=leave", "subject_type=notification_template_preview", "page_size=10"]) expect(page.url()).toContain(fragment);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(toolbar.getByLabel("Search")).toHaveValue("history-scope");
  await toolbar.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/notifications$/);
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(toolbar.getByLabel("Search")).toHaveValue("history-scope");
  await expect(toolbar.getByLabel("Retry state")).toHaveValue("retry_ready");
});

test("review retains committed queue scope and retry reports current evidence", async ({ page }) => {
  await login(page);
  const suffix = `single-${Date.now()}`;
  await createFailedNotification(page, suffix);
  const scope = `/hr-admin/notifications?q=${suffix}&status=failed&page_size=10`;
  await page.goto(scope, { waitUntil: "domcontentloaded" });
  const reviewHref = await page.getByRole("link", { name: "Review", exact: true }).getAttribute("href");
  expect(reviewHref).toContain("return_to=");
  await page.goto(reviewHref!, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/return_to=/);
  await expect(page.getByRole("heading", { name: "Delivery log" })).toBeVisible();
  await expect(page.getByText("Payload", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retry delivery" }).click();
  await expect(page.getByText(/Retry request completed\. Current status:/).first()).toBeVisible();
  await page.getByRole("link", { name: "Back to queue" }).click();
  await expect(page).toHaveURL(new RegExp(`/hr-admin/notifications\\?q=${suffix}&status=failed&page=1&page_size=10$`));
  await expect(page.getByTestId("notification-queue-toolbar").getByLabel("Search")).toHaveValue(suffix);
});

test("bulk retry discloses selected outcomes and prevents duplicate requests", async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  await createFailedNotification(page, `bulk-${stamp}-one`);
  await createFailedNotification(page, `bulk-${stamp}-two`);
  await page.goto(`/hr-admin/notifications?q=bulk-${stamp}&status=failed&retry_state=retry_ready&page_size=10`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Select page").check();
  const retry = page.getByRole("button", { name: /Retry selected \(2\)/ });
  let writes = 0;
  await page.route("**/api/hr-admin/notifications/bulk-retry", async (route) => {
    writes += 1;
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  await retry.dblclick();
  await expect(page.getByText(/Retry processed for 2 notification\(s\)/)).toBeVisible();
  expect(writes).toBe(1);
});

test("failed and unreadable queue mutations retain selection and review choices", async ({ page }) => {
  await login(page);
  const suffix = `recovery-${Date.now()}`;
  const id = await createFailedNotification(page, suffix);
  await page.goto(`/hr-admin/notifications?q=${suffix}&retry_state=retry_ready`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Select page").check();
  await page.route("**/api/hr-admin/notifications/bulk-retry", (route) => route.fulfill({ status: 200, contentType: "text/plain", body: "unreadable" }));
  await page.getByRole("button", { name: /Retry selected \(1\)/ }).click();
  await expect(page.getByTestId("notification-queue-toolbar").getByRole("alert")).toContainText("unreadable response");
  await expect(page.getByLabel("Select page")).toBeChecked();
  await page.unroute("**/api/hr-admin/notifications/bulk-retry");

  await page.getByText("Details and quick review").click();
  const review = page.locator(".inline-review-panel");
  await review.getByLabel("Priority").selectOption("normal");
  await page.route(`**/api/hr-admin/notifications/${id}`, (route) => route.abort("failed"));
  await review.getByRole("button", { name: "Save review" }).click();
  await expect(review.getByRole("alert")).toContainText("Unable to reach the server");
  await expect(review.getByLabel("Priority")).toHaveValue("normal");
});

test("stale and foreign review IDs are unavailable and non-admin personas are denied", async ({ page }) => {
  await login(page);
  for (const id of ["00000000-0000-4000-8000-000000000000", foreignNotificationId]) {
    await page.goto(`/hr-admin/notifications/${id}/review`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /page could not be found/i })).toBeVisible();
  }
  for (const role of ["employee", "manager"] as const) {
    await login(page, role);
    const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
    const response = await page.request.get("http://127.0.0.1:8001/api/v1/hr-admin/notifications/", { headers: { Authorization: `Token ${token}` } });
    expect(response.status()).toBe(403);
  }
});

test("diagnostic drilldowns preserve supported scope", async ({ page }) => {
  await login(page);
  await page.goto("/hr-admin/notification-diagnostics", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "Retry ready" }).first().click();
  await expect(page).toHaveURL(/retry_state=retry_ready/);
  await expect(page.getByLabel("Retry state")).toHaveValue("retry_ready");
  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Channel diagnostics" })).toBeVisible();
});

test("queue, review and diagnostics remain responsive and pass selected accessibility scans", async ({ page }) => {
  await login(page);
  const id = await createFailedNotification(page, `responsive-${Date.now()}`);
  for (const route of ["/hr-admin/notifications", `/hr-admin/notifications/${id}/review`, "/hr-admin/notification-diagnostics"]) {
    await page.setViewportSize({ width: 320, height: 480 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (window as unknown as { axe: { run: (root: Element, options: object) => Promise<{ violations: unknown[] }> } }).axe.run(document.querySelector("main")!, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }).then((result) => result.violations));
    expect(violations).toEqual([]);
  }
});
