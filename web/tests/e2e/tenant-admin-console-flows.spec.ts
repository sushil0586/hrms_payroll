import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant admin console", () => {
  test("shows account, seats, configuration, and commercial evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin");
    await expectPageReady(page, "Tenant Admin Console");
    const requestTitle = `PW Test plan change ${Date.now()}`;
    await expect(page.getByRole("main").getByText("Account posture", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Northstar Foods" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Governance checks", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Role coverage", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Configuration health", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Member mutations", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Employee")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("HR Admin")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Manager")).toBeVisible();
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
    await expect(page.getByRole("main").getByText("Support access", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scoped support grants" })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Support agent")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Duration")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Reason")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Account posture")).toBeVisible();
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
});
