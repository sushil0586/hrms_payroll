import { expect, type Page, type TestInfo, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant admin console", () => {
  async function captureTenantAdminStep(page: Page, testInfo: TestInfo, name: string) {
    await testInfo.attach(name, {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  }

  async function expectSetupGuideCertified(page: Page) {
    const setupGuide = page.getByTestId("tenant-setup-guide");
    await expect(setupGuide).toBeVisible();
    await expect(setupGuide.getByText("Guided setup", { exact: true })).toBeVisible();
    await expect(setupGuide.getByRole("heading", { name: "Tenant launch guide" })).toBeVisible();
    await expect(setupGuide.getByText(/% complete/)).toBeVisible();
    await expect(setupGuide.getByText(/of 5 launch steps complete/)).toBeVisible();
    for (const step of [
      "Confirm company profile",
      "Invite workspace owners",
      "Resolve launch checks",
      "Publish operating configuration",
      "Validate audit evidence",
    ]) {
      const setupStep = setupGuide.locator(".tenant-setup-step").filter({ hasText: step }).first();
      await expect(setupStep).toBeVisible();
      await expect(setupStep.locator(".readiness-badge")).toBeVisible();
      await expect(setupStep.getByRole("link")).toBeVisible();
    }
    for (const action of ["Review account", "Manage users", "Open security", "Open setup", "Open audit"]) {
      await expect(setupGuide.getByRole("link", { name: action })).toBeVisible();
    }
  }

  test("shows account, seats, configuration, and commercial evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin");
    await expectPageReady(page, "Tenant Admin Console");
    await expect(page.getByRole("main").getByText("Account posture", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("tenant-admin-control-center")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next best actions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Readiness snapshot" })).toBeVisible();
    for (const control of ["Users", "Plan", "Support", "Audit"]) {
      await expect(page.getByTestId("tenant-admin-control-center").getByText(control, { exact: true })).toBeVisible();
    }
    for (const link of ["Manage users", "Review plan", "Open support", "Review audit", "Review blockers"]) {
      await expect(page.getByTestId("tenant-admin-control-center").getByRole("link", { name: link })).toBeVisible();
    }
    await expectSetupGuideCertified(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies focused user management page and member controls", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/users");
    await expectPageReady(page, "Tenant User Management");
    await expect(page.getByRole("main").getByText("Member mutations", { exact: true })).toBeVisible();
    await expect(page.getByText("Invite users and update roles from focused dialogs.")).toBeVisible();
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
    await expect(page.getByRole("main").getByRole("button", { name: "Suspend" }).first()).toBeVisible();
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
    await expect(createdRow.getByText("Invited")).toBeVisible();
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
    await expect(createdRow.getByText("Active")).toBeVisible({ timeout: 20_000 });

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
    await expect(createdRow.getByText("Suspended")).toBeVisible({ timeout: 20_000 });
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
    await expect(createdRow.getByText("Active")).toBeVisible({ timeout: 20_000 });

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
    await expect(createdRow.getByText("Revoked")).toBeVisible({ timeout: 20_000 });
    await captureTenantAdminStep(page, testInfo, "04-revoked-member-row");
    await expectNoHorizontalOverflow(page);
  });

  test("certifies focused plan page and change request lifecycle", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/plan");
    await expectPageReady(page, "Plans And Subscription");
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
    await page.getByRole("main").getByLabel("Title").fill(requestTitle);
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
    await expect(createdRequest.getByRole("button", { name: "Approve" })).toBeEnabled();
    await expect(createdRequest.getByRole("button", { name: "Reject" })).toBeEnabled();
    await expect(createdRequest.getByRole("button", { name: "Cancel" })).toBeEnabled();
    await expect(createdRequest.getByRole("button", { name: "Mark applied" })).toBeDisabled();

    const approvalNote = "Approved during browser CRUD verification.";
    const approvalNoteInput = createdRequest.getByLabel("Decision note");
    await approvalNoteInput.fill(approvalNote);
    await expect(approvalNoteInput).toHaveValue(approvalNote);
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

  test("certifies focused support access page and support controls", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/support-access");
    await expectPageReady(page, "Support Access");
    const supportAccessForm = page.getByTestId("tenant-support-access-form");
    await expect(supportAccessForm.getByText("Support access", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scoped support grants" })).toBeVisible();
    await expect(supportAccessForm.getByRole("textbox", { name: "Support agent" })).toBeVisible();
    await expect(supportAccessForm.getByLabel("Duration")).toBeVisible();
    await expect(supportAccessForm.getByLabel("Reason")).toBeVisible();
    await expect(supportAccessForm.getByLabel("Account posture")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Request access" })).toBeVisible();
    const supportSessionButton = page.getByRole("main").getByRole("button", { name: "Start session" }).first();
    if (await supportSessionButton.isVisible().catch(() => false)) {
      await expect(supportSessionButton).toBeVisible();
      await expect(page.getByRole("main").getByRole("button", { name: "Revoke" }).first()).toBeVisible();
    }
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
    await expectPageReady(page, "Tenant Admin Console");
    await expectSetupGuideCertified(page);
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
