import { expect, type Page, type TestInfo, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant admin console", () => {
  async function captureTenantAdminStep(page: Page, testInfo: TestInfo, name: string) {
    await testInfo.attach(name, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }

  async function expectDashboardPreviewCertified(page: Page) {
    const dashboardPreview = page.getByTestId("tenant-setup-guide");
    await expect(dashboardPreview).toBeVisible();
    await expect(dashboardPreview.getByText("Recently Added Users", { exact: true })).toBeVisible();
    await expect(dashboardPreview.getByRole("heading", { name: "User Management" })).toBeVisible();
    await expect(dashboardPreview.getByRole("link", { name: "View all users" })).toBeVisible();
    await expect(dashboardPreview.getByText("Roles & Permissions", { exact: true })).toBeVisible();
    await expect(dashboardPreview.getByRole("heading", { name: "Access design" })).toBeVisible();
    await expect(dashboardPreview.getByRole("link", { name: "Manage all roles" })).toBeVisible();
    await expect(dashboardPreview.getByText("Permission Matrix", { exact: true })).toBeVisible();
  }

  test("shows account, seats, configuration, and commercial evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin");
    await expectPageReady(page, "Account Control Center");
    await expect(page.getByRole("main").getByText("Tenant Status", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Configuration Setup", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Active Users", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Plan & Billing", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("tenant-admin-control-center")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Items that need your attention" })).toBeVisible();
    await expect(page.getByTestId("tenant-next-action")).toBeVisible();
    await expect(page.getByTestId("tenant-next-action").getByText("Priority", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Complete these key items to ensure smooth operation." })).toBeVisible();
    await expect(
      page.getByTestId("tenant-next-action").getByText("Confirm company profile", { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByTestId("tenant-next-action").getByRole("link").first()).toBeVisible();
    await expectDashboardPreviewCertified(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies focused user management page and member controls", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/users");
    await expectPageReady(page, "Tenant User Management");
    await expect(page.getByRole("main").getByText("User Directory", { exact: true })).toBeVisible();
    await expect(page.getByText("Search, review, invite, activate, suspend, revoke, and update roles without leaving the tenant workspace.")).toBeVisible();
    await expect(page.getByRole("main").getByText("Security", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Last updated", { exact: true })).toBeVisible();
    const inviteButton = page.getByRole("main").getByRole("button", { name: "Invite member" });
    await expect(inviteButton).toBeVisible();
    await inviteButton.click();
    const inviteDialog = page.getByRole("dialog", { name: "Invite tenant member" });
    await expect(inviteDialog).toBeVisible();
    await expect(inviteDialog.getByLabel("Email")).toBeVisible();
    await expect(inviteDialog.getByLabel("Username")).toBeVisible();
    await expect(inviteDialog.getByLabel("First name")).toBeVisible();
    await expect(inviteDialog.getByLabel("Last name")).toBeVisible();
    await expect(inviteDialog.getByLabel("Status")).toBeVisible();
    await expect(inviteDialog.getByLabel("Employee")).toBeVisible();
    await expect(inviteDialog.getByLabel("HR Admin")).toBeVisible();
    await expect(inviteDialog.getByRole("checkbox", { name: "Manager", exact: true })).toBeVisible();
    await expect(inviteDialog.getByText("Email is required.")).toBeVisible();
    await expect(inviteDialog.getByRole("button", { name: "Invite member", exact: true })).toBeDisabled();
    await inviteDialog.getByLabel("Email").fill("invalid-email");
    await expect(inviteDialog.getByText("Enter a valid work email address.")).toBeVisible();
    await inviteDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(inviteDialog).toHaveCount(0);
    const updateButton = page.getByRole("main").getByRole("button", { name: "Update roles" }).first();
    await expect(updateButton).toBeVisible();
    await updateButton.click();
    const updateDialog = page.getByRole("dialog", { name: "Update tenant member roles" });
    await expect(updateDialog).toBeVisible();
    await expect(updateDialog.getByRole("heading", { name: "Update roles" })).toBeVisible();
    await expect(updateDialog.getByLabel("Update roles", { exact: true })).toBeVisible();
    await expect(updateDialog.getByRole("button", { name: "Update roles", exact: true })).toBeEnabled();
    await updateDialog.getByRole("button", { name: "Cancel" }).click();
    await expect(updateDialog).toHaveCount(0);
    const memberRows = page.locator(".tenant-membership-row");
    const initialRowCount = await memberRows.count();
    expect(initialRowCount).toBeLessThanOrEqual(8);
    await expect(page.getByRole("main").getByLabel("Search members")).toBeVisible();
    await expect(page.getByLabel("Member pagination")).toBeVisible();
    const firstMemberEmail = (await memberRows.first().locator("span").first().innerText()).trim();
    await page.getByRole("main").getByLabel("Search members").fill(firstMemberEmail);
    await expect(memberRows).toHaveCount(1);
    await expect(memberRows.first()).toContainText(firstMemberEmail);
    await page.getByRole("main").getByLabel("Search members").fill("no-member-matches-this-query");
    await expect(page.getByText("No members match the current search.")).toBeVisible();
    await page.getByRole("main").getByLabel("Search members").clear();
    await expect(memberRows.first()).toBeVisible();
    const nextPage = page.getByLabel("Member pagination").getByRole("button", { name: "Next" });
    if (await nextPage.isEnabled().catch(() => false)) {
      const firstPageText = (await memberRows.first().innerText()).replace(/\s+/g, "");
      await nextPage.click();
      await expect
        .poll(async () => (await memberRows.first().innerText()).replace(/\s+/g, ""))
        .not.toBe(firstPageText);
      await expect(page.getByLabel("Member pagination").getByRole("button", { name: "Previous" })).toBeEnabled();
      await page.getByLabel("Member pagination").getByRole("button", { name: "Previous" }).click();
      await expect.poll(async () => (await memberRows.first().innerText()).replace(/\s+/g, "")).toBe(firstPageText);
    }
    await expect(page.getByRole("main").getByText("Role coverage", { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("certifies user management invite and access lifecycle", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/tenant-admin/users");
    await expectPageReady(page, "Tenant User Management");
    const stamp = Date.now();
    const email = `ta.lifecycle.${stamp}@example.test`;
    const username = `ta.lifecycle.${stamp}`;

    await page.getByRole("main").getByRole("button", { name: "Invite member" }).click();
    const inviteDialog = page.getByRole("dialog", { name: "Invite tenant member" });
    await expect(inviteDialog).toBeVisible();
    await inviteDialog.getByLabel("Email").fill(email);
    await inviteDialog.getByLabel("Username").fill(username);
    await inviteDialog.getByLabel("First name").fill("TA");
    await inviteDialog.getByLabel("Last name").fill("Lifecycle");
    await inviteDialog.getByLabel("Status").selectOption("invited");
    await expect(inviteDialog.getByRole("button", { name: "Invite member", exact: true })).toBeEnabled();
    const inviteResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/memberships") && response.request().method() === "POST",
      { timeout: 20_000 }
    );
    await inviteDialog.getByRole("button", { name: "Invite member", exact: true }).click();
    await expect((await inviteResponse).ok()).toBeTruthy();

    const createdRow = page.locator(".tenant-membership-row").filter({ hasText: email }).first();
    await expect(createdRow).toBeVisible({ timeout: 20_000 });
    await expect(createdRow.locator(".record-chip").filter({ hasText: "Invited" })).toBeVisible();
    await captureTenantAdminStep(page, testInfo, "01-invited-member-row");

    await page.getByRole("main").getByRole("button", { name: "Invite member" }).click();
    const duplicateDialog = page.getByRole("dialog", { name: "Invite tenant member" });
    await duplicateDialog.getByLabel("Email").fill(email);
    await duplicateDialog.getByLabel("Username").fill(username);
    await expect(duplicateDialog.getByRole("button", { name: "Invite member", exact: true })).toBeEnabled();
    const duplicateResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/memberships") && response.request().method() === "POST",
      { timeout: 20_000 }
    );
    await duplicateDialog.getByRole("button", { name: "Invite member", exact: true }).click();
    expect((await duplicateResponse).status()).toBe(400);
    await expect(duplicateDialog.getByText(/already belongs|already in use/i)).toBeVisible({ timeout: 20_000 });
    await duplicateDialog.getByRole("button", { name: "Cancel" }).click();
    await captureTenantAdminStep(page, testInfo, "02-duplicate-member-validation");

    await createdRow.getByRole("button", { name: "Activate" }).click();
    const activateDialog = page.getByRole("dialog", { name: "Activate tenant member" });
    await expect(activateDialog).toBeVisible();
    await activateDialog.getByLabel("Change note").fill("Activate disposable lifecycle member.");
    const activateResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/memberships/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await activateDialog.getByRole("button", { name: "Activate", exact: true }).click();
    await expect((await activateResponse).ok()).toBeTruthy();
    await expect(createdRow.locator(".record-chip").filter({ hasText: "Active" })).toBeVisible({ timeout: 20_000 });

    await createdRow.getByRole("button", { name: "Suspend" }).click();
    const suspendDialog = page.getByRole("dialog", { name: "Suspend tenant member" });
    await expect(suspendDialog).toBeVisible();
    await expect(suspendDialog.getByText("Suspended members lose access until reactivated.")).toBeVisible();
    await suspendDialog.getByLabel("Change note").fill("Suspend disposable lifecycle member.");
    const suspendResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/memberships/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await suspendDialog.getByRole("button", { name: "Suspend", exact: true }).click();
    await expect((await suspendResponse).ok()).toBeTruthy();
    await expect(createdRow.locator(".record-chip").filter({ hasText: "Suspended" })).toBeVisible({
      timeout: 20_000,
    });
    await captureTenantAdminStep(page, testInfo, "03-suspended-member-row");

    await createdRow.getByRole("button", { name: "Activate" }).click();
    const reactivateDialog = page.getByRole("dialog", { name: "Activate tenant member" });
    await reactivateDialog.getByLabel("Change note").fill("Reactivate disposable lifecycle member.");
    const reactivateResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/memberships/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await reactivateDialog.getByRole("button", { name: "Activate", exact: true }).click();
    await expect((await reactivateResponse).ok()).toBeTruthy();
    await expect(createdRow.locator(".record-chip").filter({ hasText: "Active" })).toBeVisible({ timeout: 20_000 });

    await createdRow.getByRole("button", { name: "Revoke" }).click();
    const revokeDialog = page.getByRole("dialog", { name: "Revoke tenant member" });
    await expect(revokeDialog).toBeVisible();
    await expect(revokeDialog.getByText("Revoked members lose access and remain visible in audit history.")).toBeVisible();
    await revokeDialog.getByLabel("Change note").fill("Revoke disposable lifecycle member after test.");
    const revokeResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/memberships/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await revokeDialog.getByRole("button", { name: "Revoke", exact: true }).click();
    await expect((await revokeResponse).ok()).toBeTruthy();
    await expect(createdRow.locator(".record-chip").filter({ hasText: "Revoked" })).toBeVisible({ timeout: 20_000 });
    await captureTenantAdminStep(page, testInfo, "04-revoked-member-row");
    await expectNoHorizontalOverflow(page);
  });

  test("denies tenant membership mutations without tenant-admin authority", async ({ page }) => {
    await page.context().clearCookies();
    const unauthenticatedInvite = await page.request.post("/api/tenant-admin/memberships", {
      data: {
        username: `ta.unauth.${Date.now()}`,
        email: `ta.unauth.${Date.now()}@example.test`,
        membership_status: "invited",
        role_ids: ["00000000-0000-4000-8000-000000000000"],
      },
    });
    expect([401, 403]).toContain(unauthenticatedInvite.status());

    await gotoAuthenticated(page, "/ess", employee);
    const employeeInvite = await page.request.post("/api/tenant-admin/memberships", {
      data: {
        username: `ta.employee.${Date.now()}`,
        email: `ta.employee.${Date.now()}@example.test`,
        membership_status: "invited",
        role_ids: ["00000000-0000-4000-8000-000000000000"],
      },
    });
    expect([401, 403, 404]).toContain(employeeInvite.status());

    const employeePatch = await page.request.patch("/api/tenant-admin/memberships/00000000-0000-4000-8000-000000000000", {
      data: { action: "suspend", note: "Employee role should not mutate tenant memberships." },
    });
    expect([401, 403, 404]).toContain(employeePatch.status());
  });

  test("shows tenant membership audit evidence after lifecycle actions", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/tenant-admin/trust-audit?event_group=tenant_admin&page_size=50");
    await expectPageReady(page, "Tenant Trust Audit");
    await expect(page.getByRole("main").getByText("Audit events", { exact: true })).toBeVisible();
    for (const eventType of [
      "Tenant Membership Invited",
      "Tenant Membership Activated",
      "Tenant Membership Suspended",
      "Tenant Membership Revoked",
    ]) {
      await expect(page.getByRole("main").getByText(eventType).first()).toBeVisible();
    }
    await expect(page.getByRole("main").getByText("saas.tenant_admin.membership_mutation.v1").first()).toBeVisible();
    await captureTenantAdminStep(page, testInfo, "05-tenant-membership-audit-ledger");
    const auditResponse = await page.request.get("/api/tenant-admin/trust-audit?event_group=tenant_admin&page_size=50");
    expect(auditResponse.ok()).toBeTruthy();
    const auditPayload = await auditResponse.json();
    const eventTypes = auditPayload.events.map((event: { event_type: string }) => event.event_type);
    expect(eventTypes).toContain("tenant_membership_invited");
    expect(eventTypes).toContain("tenant_membership_activated");
    expect(eventTypes).toContain("tenant_membership_suspended");
    expect(eventTypes).toContain("tenant_membership_revoked");
    await expectNoHorizontalOverflow(page);
  });

  test("certifies focused plan page and change request lifecycle", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/plan");
    await expectPageReady(page, "Plan & Billing");
    const requestTitle = `PW Test plan change ${Date.now()}`;
    await expect(page.getByRole("main").getByText("Commercial profile", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Usage evidence", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Change requests", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Billing and configuration queue" })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Type")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Title")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Target ref")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Description")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Payload")).toBeVisible();
    const submitRequest = page.getByRole("main").getByRole("button", { name: "Submit request" });
    await expect(submitRequest).toBeVisible();
    await expect(submitRequest).toBeDisabled();
    await expect(page.getByText("Title is required.")).toBeVisible();
    await page.getByRole("main").getByLabel("Title").fill(requestTitle);
    await page.getByRole("main").getByLabel("Payload").fill("{");
    await expect(page.getByText("Payload must be valid JSON.")).toBeVisible();
    await expect(submitRequest).toBeDisabled();
    await page.getByRole("main").getByLabel("Target ref").fill("subscription.plan.enterprise");
    await page.getByRole("main").getByLabel("Description").fill("Browser-created disposable tenant admin plan change.");
    await page.getByRole("main").getByLabel("Payload").fill("{\n  \"subscription_plan\": \"enterprise\"\n}");
    await expect(submitRequest).toBeEnabled();
    const createResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/change-requests") && response.request().method() === "POST",
      { timeout: 20_000 }
    );
    await submitRequest.click();
    await expect((await createResponse).ok()).toBeTruthy();

    const createdRequest = page.locator(".tenant-change-request-row").filter({ hasText: requestTitle }).first();
    await expect(createdRequest).toBeVisible({ timeout: 20_000 });
    await expect(createdRequest.getByText("Submitted")).toBeVisible();
    await expect(createdRequest.getByLabel("Decision note")).toBeVisible();
    await expect(createdRequest.getByText("Required for approve, reject, or apply.")).toBeVisible();
    await expect(createdRequest.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(createdRequest.getByRole("button", { name: "Reject" })).toBeDisabled();
    await expect(createdRequest.getByRole("button", { name: "Cancel" })).toBeEnabled();
    await expect(createdRequest.getByRole("button", { name: "Mark applied" })).toBeDisabled();

    const approvalNote = "Approved during browser CRUD verification.";
    const approvalNoteInput = createdRequest.getByLabel("Decision note");
    await approvalNoteInput.fill(approvalNote);
    await expect(approvalNoteInput).toHaveValue(approvalNote);
    await expect(createdRequest.getByRole("button", { name: "Approve" })).toBeEnabled();
    await expect(createdRequest.getByRole("button", { name: "Reject" })).toBeEnabled();
    const approveResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/change-requests/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await createdRequest.getByRole("button", { name: "Approve" }).click();
    await expect((await approveResponse).ok()).toBeTruthy();
    await expect(createdRequest.getByText("Approved")).toBeVisible({ timeout: 20_000 });
    await expect(createdRequest.getByRole("button", { name: "Mark applied" })).toBeEnabled();

    const appliedNote = "Applied after browser CRUD verification.";
    const appliedNoteInput = createdRequest.getByLabel("Decision note");
    await appliedNoteInput.fill(appliedNote);
    await expect(appliedNoteInput).toHaveValue(appliedNote);
    const applyResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/change-requests/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await createdRequest.getByRole("button", { name: "Mark applied" }).click();
    await expect((await applyResponse).ok()).toBeTruthy();
    await expect(createdRequest.getByText("Applied")).toBeVisible({ timeout: 20_000 });
    await expectNoHorizontalOverflow(page);
  });

  test("certifies focused support access page and support lifecycle", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/support-access");
    await expectPageReady(page, "Support Access");
    const supportReason = `Browser support lifecycle ${Date.now()}`;
    const revokeReason = `Browser support revoke ${Date.now()}`;
    const supportAccessForm = page.getByTestId("tenant-support-access-form");
    await expect(supportAccessForm.getByText("Support access", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scoped support grants" })).toBeVisible();
    const supportAgentInput = supportAccessForm.getByRole("textbox", { name: "Support agent" });
    const durationInput = supportAccessForm.getByLabel("Duration");
    const reasonInput = supportAccessForm.getByLabel("Reason");
    await expect(supportAgentInput).toBeVisible();
    await expect(durationInput).toBeVisible();
    await expect(reasonInput).toBeVisible();
    await expect(supportAccessForm.getByLabel("Account posture")).toBeVisible();
    await expect(supportAccessForm.getByText("Support agent is required.")).toBeVisible();
    await expect(supportAccessForm.getByText("Reason is required.")).toBeVisible();
    const requestButton = page.getByRole("main").getByRole("button", { name: "Request access" });
    await expect(requestButton).toBeVisible();
    await expect(requestButton).toBeDisabled();

    await durationInput.fill("0");
    await expect(supportAccessForm.getByText(/Duration must be between 1 and/)).toBeVisible();
    await expect(requestButton).toBeDisabled();
    await durationInput.fill("30");
    await supportAgentInput.fill("support.agent");
    await reasonInput.fill(supportReason);
    await expect(requestButton).toBeEnabled();
    const createResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants") && response.request().method() === "POST",
      { timeout: 20_000 }
    );
    await requestButton.click();
    await expect((await createResponse).ok()).toBeTruthy();

    const createdGrant = page.locator(".tenant-support-access-row").filter({ hasText: supportReason }).first();
    await expect(createdGrant).toBeVisible({ timeout: 20_000 });
    await expect(createdGrant.getByText("Requested")).toBeVisible();
    await expect(createdGrant.getByText("Required for approve, reject, or revoke.")).toBeVisible();
    await expect(createdGrant.getByRole("button", { name: "Approve" })).toBeDisabled();
    await createdGrant.getByLabel("Decision note").fill("Approved for browser support lifecycle verification.");
    await expect(createdGrant.getByRole("button", { name: "Approve" })).toBeEnabled();
    const approveResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await createdGrant.getByRole("button", { name: "Approve" }).click();
    await expect((await approveResponse).ok()).toBeTruthy();
    await expect(createdGrant.getByText("Approved")).toBeVisible({ timeout: 20_000 });
    await expect(createdGrant.getByRole("button", { name: "Start session" })).toBeEnabled();

    await createdGrant.getByLabel("Session ref").fill(`support-session-browser-${Date.now()}`);
    const startResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await createdGrant.getByRole("button", { name: "Start session" }).click();
    await expect((await startResponse).ok()).toBeTruthy();
    await expect(createdGrant.getByText("Active")).toBeVisible({ timeout: 20_000 });
    await expect(createdGrant.getByRole("button", { name: "End session" })).toBeEnabled();
    const endResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await createdGrant.getByRole("button", { name: "End session" }).click();
    await expect((await endResponse).ok()).toBeTruthy();
    await expect(createdGrant.getByText("Ended")).toBeVisible({ timeout: 20_000 });

    await supportAgentInput.fill("support.agent");
    await reasonInput.fill(revokeReason);
    const revokeCreateResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants") && response.request().method() === "POST",
      { timeout: 20_000 }
    );
    await requestButton.click();
    await expect((await revokeCreateResponse).ok()).toBeTruthy();
    const revokeGrant = page.locator(".tenant-support-access-row").filter({ hasText: revokeReason }).first();
    await expect(revokeGrant).toBeVisible({ timeout: 20_000 });
    await expect(revokeGrant.getByRole("button", { name: "Revoke" })).toBeDisabled();
    await revokeGrant.getByLabel("Decision note").fill("Revoked during browser support lifecycle verification.");
    await expect(revokeGrant.getByRole("button", { name: "Revoke" })).toBeEnabled();
    const revokeResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await revokeGrant.getByRole("button", { name: "Revoke" }).click();
    await expect((await revokeResponse).ok()).toBeTruthy();
    await expect(revokeGrant.getByText("Revoked")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "What support can access" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("certifies focused tenant settings page", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/settings");
    await expectPageReady(page, "Tenant Settings");
    await expect(page.getByRole("main").getByText("Tenant account", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Governance checks", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Configuration health", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Tenant identifiers are platform-governed.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("keeps guided setup usable on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/tenant-admin");
    await expectPageReady(page, "Account Control Center");
    await expectDashboardPreviewCertified(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies tenant setup workbench navigation and readiness areas", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/setup");
    await expectPageReady(page, "Tenant Setup Guide");
    await expect(page.getByRole("navigation").getByRole("link", { name: /Setup Guide/ })).toBeVisible();
    await expect(page.getByTestId("tenant-setup-workbench")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start master setup" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to console" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Setup areas" })).toBeVisible();
    for (const area of [
      "Company profile",
      "Organization masters",
      "Users and access",
      "Payroll foundation",
      "Security and audit",
    ]) {
      const row = page.locator(".tenant-setup-area").filter({ hasText: area }).first();
      await expect(row).toBeVisible();
      await expect(row.locator(".readiness-badge")).toBeVisible();
      await expect(row.getByRole("link")).toBeVisible();
    }
    for (const guardrail of [
      "Create legal entities before branches and cost centers.",
      "Map each branch to a legal entity and location.",
      "Map departments to business units where reporting depends on BU.",
      "Map designations to grades before employee onboarding.",
      "Create pay calendars, pay groups, and salary components before payroll run setup.",
    ]) {
      await expect(page.getByText(guardrail, { exact: true })).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });
});
