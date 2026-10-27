import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { mssLeaveReviewDialogName } from "../helpers/modal-stability";

async function loginThroughBrowser(page: Page, username: string, password: string) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username or email").fill(username);
  await page.getByLabel("Password").fill(password);
  const authenticated = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/login");
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await authenticated).status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function backendGet(page: Page, path: string) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const backendUrl = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://127.0.0.1:8018/api/v1";
  return page.request.get(`${backendUrl}${path}`, { headers: { Authorization: `Token ${token}` } });
}

test("DD-SS-005/008 session and connection recovery preserve the ESS leave draft and one mutation", async ({ page, context }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const employee = workspacePersona(workspace, "employee");
  const reason = `DD6 recovery ${workspace.seedRef}`;
  let leavePostCount = 0;

  try {
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/api/me/leave-requests")) leavePostCount += 1;
    });
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await page.getByRole("button", { name: "Apply leave" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Apply leave" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Start date").fill("2026-11-17");
    await dialog.getByLabel("End date").fill("2026-11-17");
    await dialog.getByLabel("Reason for leave").fill(reason);

    let abortOnce = true;
    await page.route("**/api/me/leave-requests", async (route) => {
      if (abortOnce) {
        abortOnce = false;
        await route.abort("connectionreset");
        return;
      }
      await route.continue();
    });
    const submit = dialog.getByRole("button", { name: "Submit leave" });
    await submit.click();
    await expect(dialog.getByText(/Unable to reach the server\. We could not confirm the outcome\./)).toBeVisible();
    await expect(dialog.getByLabel("Reason for leave")).toHaveValue(reason);
    await page.unroute("**/api/me/leave-requests");

    const logout = await page.request.post("/api/auth/logout");
    expect(logout.ok()).toBeTruthy();
    const rejectedSession = page.waitForResponse((response) => response.url().includes("/api/me/leave-requests") && response.request().method() === "POST");
    await submit.click();
    expect((await rejectedSession).status()).toBe(401);
    await expect(dialog.getByText(/Your session has expired\. Sign in again/)).toBeVisible();
    await expect(dialog.getByLabel("Reason for leave")).toHaveValue(reason);

    const relogin = await context.newPage();
    await loginThroughBrowser(relogin, employee.username, employee.password);
    await expect(relogin.getByRole("heading", { name: "My workspace" })).toBeVisible();
    await relogin.close();

    const recoveredResponse = page.waitForResponse((response) => response.url().includes("/api/me/leave-requests") && response.request().method() === "POST");
    await submit.click();
    expect((await recoveredResponse).status()).toBe(201);
    await expect(dialog).toBeHidden();
    const requests = await backendGet(page, "/me/leave-requests/?page_size=100");
    expect(requests.status()).toBe(200);
    const payload = await requests.json() as { items: Array<{ id: string; reason: string; status: string }> };
    const matching = payload.items.filter((item) => item.reason === reason);
    expect(matching).toHaveLength(1);
    expect(matching[0].status).toMatch(/pending|partially_approved|approved/);
    expect(leavePostCount).toBe(3);

    await testInfo.attach("dd6-session-offline-recovery.json", {
      body: Buffer.from(JSON.stringify({ leavePostCount, leaveRequest: matching[0], tenantId: workspace.manifest.tenant.id }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("DD-SS-008 committed leave with a lost response replays its canonical success", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const employee = workspacePersona(workspace, "employee");
  const reason = `DD6 lost response ${workspace.seedRef}`;

  try {
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");
    await page.getByRole("button", { name: "Apply leave" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Apply leave" });
    await dialog.getByLabel("Start date").fill("2026-11-19");
    await dialog.getByLabel("End date").fill("2026-11-19");
    await dialog.getByLabel("Reason for leave").fill(reason);

    let committedStatus = 0;
    await page.route("**/api/me/leave-requests", async (route) => {
      const response = await route.fetch();
      committedStatus = response.status();
      await route.abort("connectionreset");
    });
    const submit = dialog.getByRole("button", { name: "Submit leave" });
    await submit.click();
    await expect(dialog.getByText(/Unable to reach the server\. We could not confirm the outcome\./)).toBeVisible();
    expect(committedStatus).toBe(201);
    await expect(dialog.getByLabel("Reason for leave")).toHaveValue(reason);
    await page.unroute("**/api/me/leave-requests");

    const replayResponsePromise = page.waitForResponse((response) => response.url().includes("/api/me/leave-requests") && response.request().method() === "POST");
    await submit.click();
    const replayResponse = await replayResponsePromise;
    expect(replayResponse.status()).toBe(201);
    await expect(dialog).toBeHidden();

    const requests = await backendGet(page, "/me/leave-requests/?page_size=100");
    expect(requests.status()).toBe(200);
    const payload = await requests.json() as { items: Array<{ id: string; reason: string }> };
    const matching = payload.items.filter((item) => item.reason === reason);
    expect(matching).toHaveLength(1);
    await testInfo.attach("dd6-lost-response-boundary.json", {
      body: Buffer.from(JSON.stringify({ committedStatus, replayStatus: replayResponse.status(), persistedCount: matching.length, replayOutcome: "canonical-success" }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("DD-SS-006/007 manager retains tenant-scoped ESS and MSS contexts on compact accessible UI", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const manager = workspacePersona(workspace, "manager");

  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await loginThroughBrowser(page, manager.username, manager.password);
    await page.goto("/workspace-access", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/mss\/approvals/);

    const session = await backendGet(page, "/auth/session/");
    expect(session.status()).toBe(200);
    const sessionPayload = await session.json() as {
      default_membership: { tenant_id: string; role_codes: string[] };
      workspace_access: { ess: boolean; mss: boolean; hr_admin: boolean; tenant_admin: boolean };
    };
    expect(sessionPayload.default_membership.tenant_id).toBe(workspace.manifest.tenant.id);
    expect(sessionPayload.default_membership.role_codes).toContain("manager");
    expect(sessionPayload.workspace_access).toMatchObject({ ess: true, mss: true, hr_admin: false, tenant_admin: false });

    await page.goto("/ess", { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "My workspace");
    await expect(page.getByRole("link", { name: "MSS" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/mss/approvals?queue=leave", { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Manager approvals");
    const review = page.getByRole("button", { name: "Review" }).first();
    await review.focus();
    await expect(review).toBeFocused();
    await review.press("Enter");
    const dialog = page.getByRole("dialog", { name: mssLeaveReviewDialogName });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog.getByLabel("Decision note")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(review).toBeFocused();
    expect(await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

    const managerQueue = await backendGet(page, "/manager/leave-requests/pending/?page_size=25");
    expect(managerQueue.status()).toBe(200);
    const queuePayload = await managerQueue.json() as { items: Array<{ employee_code: string }> };
    expect(queuePayload.items.some((item) => item.employee_code === workspace.manifest.credentials.employee.employee_code)).toBe(true);

    await testInfo.attach("dd6-multi-context-evidence.json", {
      body: Buffer.from(JSON.stringify({ session: sessionPayload, queue: queuePayload.items }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
