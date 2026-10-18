import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { mssLeaveReviewDialogName } from "../helpers/modal-stability";
import { gotoAuthenticated, type Persona } from "../helpers/staging-auth";

async function authenticatedPage(context: BrowserContext, path: string, persona: Persona) {
  const page = await context.newPage();
  await gotoAuthenticated(page, path, persona);
  return page;
}

async function backendGet(page: Page, path: string) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const apiBase = process.env.PLAYWRIGHT_BACKEND_URL ?? process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8018/api/v1";
  return page.request.get(`${apiBase.replace(/\/$/, "")}${path}`, {
    headers: { Authorization: `Token ${token}` },
  });
}

async function backendPost(page: Page, path: string, data: unknown, headers: Record<string, string> = {}) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  const apiBase = process.env.PLAYWRIGHT_BACKEND_URL ?? process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8018/api/v1";
  return page.request.post(`${apiBase.replace(/\/$/, "")}${path}`, {
    data,
    headers: { Authorization: `Token ${token}`, ...headers },
  });
}

async function openLeaveReview(page: Page, leaveRequestId: string) {
  await expectPageReady(page, "Manager approvals");
  const row = page.locator(".approval-table-row, .approval-card, tr").filter({ hasText: leaveRequestId }).first();
  const review = (await row.count())
    ? row.getByRole("button", { name: "Review" })
    : page.getByRole("button", { name: "Review" }).first();
  await review.click();
  const dialog = page.getByRole("dialog", { name: mssLeaveReviewDialogName });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("DD-WF-004 failed decision and browser refresh preserve the current step for a safe retry", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const manager = workspacePersona(workspace, "manager");
  const leaveRequestId = workspace.manifest.fixtures.leave_request_id;
  const decisionNote = `DD7 retry ${workspace.seedRef}`;

  try {
    await gotoAuthenticated(page, "/mss/approvals?queue=leave", manager);
    let dialog = await openLeaveReview(page, leaveRequestId);
    await dialog.getByLabel("Decision note").fill(decisionNote);

    const approvePath = `**/api/manager/leave-requests/${leaveRequestId}/approve`;
    await page.route(approvePath, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Synthetic upstream interruption." }),
      });
    }, { times: 1 });
    await dialog.getByRole("button", { name: "Approve request" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Synthetic upstream interruption.");
    await expect(dialog.getByLabel("Decision note")).toHaveValue(decisionNote);

    await page.reload({ waitUntil: "domcontentloaded" });
    dialog = await openLeaveReview(page, leaveRequestId);
    await dialog.getByLabel("Decision note").fill(decisionNote);
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes(`/api/manager/leave-requests/${leaveRequestId}/approve`) && response.request().method() === "POST",
    );
    await dialog.getByRole("button", { name: "Approve request" }).dblclick();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    await expect(dialog.locator(".notice--success")).toContainText("Request approved.");
    const approvedPayload = await response.json() as { id: string; status: string; workflow_reference: string };
    expect(approvedPayload).toMatchObject({ id: leaveRequestId, status: "approved" });

    const pending = await backendGet(page, "/manager/leave-requests/pending/?page_size=100");
    expect(pending.status()).toBe(200);
    const pendingPayload = await pending.json() as { items: Array<{ id: string }> };
    expect(pendingPayload.items.some((item) => item.id === leaveRequestId)).toBe(false);

    await testInfo.attach("dd7-retry-recovery.json", {
      body: Buffer.from(JSON.stringify({
        leaveRequestId,
        failedStatus: 503,
        retryStatus: response.status(),
        persisted: approvedPayload,
        remainsInPendingQueue: false,
      }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("DD-WF-008 browser role revocation immediately blocks an already-open MSS decision and direct API retry", async ({ browser }, testInfo) => {
  test.setTimeout(5 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const managerContext = await browser.newContext();
  const tenantAdminContext = await browser.newContext();
  const manager = workspacePersona(workspace, "manager");
  const tenantAdmin = workspacePersona(workspace, "tenant_admin");
  const leaveRequestId = workspace.manifest.fixtures.leave_request_id;

  try {
    const managerPage = await authenticatedPage(managerContext, "/mss/approvals?queue=leave", manager);
    const managerDialog = await openLeaveReview(managerPage, leaveRequestId);
    await managerDialog.getByLabel("Decision note").fill(`Stale queued decision ${workspace.seedRef}`);

    const adminPage = await authenticatedPage(tenantAdminContext, "/tenant-admin/roles", tenantAdmin);
    await expectPageReady(adminPage, "Roles & Permissions");
    await adminPage.getByLabel("Search roles").fill("manager");
    const managerRole = adminPage.locator(".tenant-role-row").filter({ hasText: "manager" }).first();
    await expect(managerRole).toContainText("Manager");
    await managerRole.getByRole("button", { name: "Edit" }).click();
    const roleDialog = adminPage.getByRole("dialog", { name: "Update tenant role" });
    await roleDialog.getByRole("tab", { name: "Leave" }).click();
    const approvePermission = roleDialog.getByRole("checkbox", { name: /^Approve leave requests\b/i });
    await expect(approvePermission).toBeChecked();
    await approvePermission.uncheck();
    const roleUpdate = adminPage.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/roles/") && response.request().method() === "PATCH",
    );
    await roleDialog.getByRole("button", { name: "Update role" }).click();
    expect((await roleUpdate).status()).toBe(200);
    await expect(adminPage.getByRole("status").filter({ hasText: "Role updated successfully." })).toBeVisible();

    const deniedResponse = managerPage.waitForResponse(
      (response) => response.url().includes(`/api/manager/leave-requests/${leaveRequestId}/approve`) && response.request().method() === "POST",
    );
    await managerDialog.getByRole("button", { name: "Approve request" }).click();
    const browserDenial = await deniedResponse;
    expect(browserDenial.status()).toBe(403);
    await expect(managerDialog.getByRole("alert")).toContainText(/leave\.requests\.approve|permission/i);
    await expect(managerDialog.getByLabel("Decision note")).toHaveValue(`Stale queued decision ${workspace.seedRef}`);

    const directDenial = await backendPost(
      managerPage,
      `/manager/leave-requests/${leaveRequestId}/approve/`,
      { comment: "Direct retry after role revocation." },
      { "Idempotency-Key": `dd7-revoked-${workspace.seedRef}` },
    );
    expect(directDenial.status()).toBe(403);
    const detail = await backendGet(managerPage, `/manager/leave-requests/${leaveRequestId}/`);
    expect(detail.status()).toBe(200);
    const detailPayload = await detail.json() as { id: string; status: string };
    expect(detailPayload).toMatchObject({ id: leaveRequestId, status: "pending" });

    await testInfo.attach("dd7-role-revocation.json", {
      body: Buffer.from(JSON.stringify({
        leaveRequestId,
        browserDecisionStatus: browserDenial.status(),
        directDecisionStatus: directDenial.status(),
        persistedStatus: detailPayload.status,
      }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await managerContext.close();
    await tenantAdminContext.close();
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
