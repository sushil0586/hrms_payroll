import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant admin console", () => {
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
    for (const action of ["Review account", "Manage members", "Open security", "Open setup", "Open audit"]) {
      await expect(setupGuide.getByRole("link", { name: action })).toBeVisible();
    }
  }

  test("shows account, seats, configuration, and commercial evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin");
    await expectPageReady(page, "Tenant Admin Console");
    const requestTitle = `PW Test plan change ${Date.now()}`;
    await expect(page.getByRole("main").getByText("Account posture", { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId("tenant-admin-control-center")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Owner command queue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Readiness snapshot" })).toBeVisible();
    for (const control of ["Governance blockers", "Seat usage", "Change queue", "Support access"]) {
      await expect(page.getByTestId("tenant-admin-control-center").getByText(control, { exact: true })).toBeVisible();
    }
    for (const link of ["Review security", "Manage members", "Open queue", "Audit access", "Open trust audit"]) {
      await expect(page.getByTestId("tenant-admin-control-center").getByRole("link", { name: link })).toBeVisible();
    }
    await expectSetupGuideCertified(page);
    await expect(page.getByRole("heading", { name: "Northstar Foods" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Governance checks", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Role coverage", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Configuration health", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Member mutations", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Employee")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("HR Admin")).toBeVisible();
    await expect(page.getByRole("main").getByRole("checkbox", { name: "Manager", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Invite member" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Update roles" }).first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Suspend" }).first()).toBeVisible();
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
    await expect(page.getByRole("main").getByText("Usage evidence", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Commercial audit", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Workspaces" })).toBeVisible();
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
