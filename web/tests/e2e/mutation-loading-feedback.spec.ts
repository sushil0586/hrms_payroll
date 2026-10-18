import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

async function delayedJson(route: Route, delayMs: number, status: number, body: Record<string, unknown>) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  await route.fulfill({ body: JSON.stringify(body), contentType: "application/json", status });
}

async function firstOption(select: Locator) {
  const value = await select.locator("option:not([value=''])").first().getAttribute("value");
  if (!value) throw new Error("Expected an available select option.");
  await select.selectOption(value);
}

async function openEmployeeReview(page: Page, seedRef: string) {
  await page.getByLabel("Employee code").fill(`L3-${seedRef}`.slice(0, 24));
  await page.getByLabel("Employment status").selectOption("active");
  await page.getByLabel("First name").fill("Loading");
  await page.getByLabel("Last name").fill("Feedback");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Work email").fill(`${seedRef}@example.test`);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("button", { name: "Create employee" })).toBeVisible();
}

test.describe("Phase L3 mutation loading feedback", () => {
  test.describe.configure({ mode: "serial" });

  test("HR Admin, ESS, MSS, and Tenant Admin mutations report pending and recover safely", async ({ page }, testInfo) => {
    test.setTimeout(240_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    const feedbackMs: Record<string, number> = {};
    try {
      await gotoAuthenticated(page, "/hr-admin/employees/new", workspacePersona(workspace, "hr_admin"));
      await openEmployeeReview(page, workspace.seedRef);
      let employeeCalls = 0;
      await page.route("**/api/hr-admin/employees", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        employeeCalls += 1;
        await delayedJson(route, 750, 503, { detail: "Temporary employee service failure." });
      });
      const employeeSubmit = page.getByRole("button", { name: "Create employee" });
      const employeeStarted = Date.now();
      await employeeSubmit.click();
      const employeePending = page.getByRole("button", { name: "Creating employee" });
      await expect(employeePending).toHaveAttribute("aria-busy", "true", { timeout: 500 });
      feedbackMs.employee = Date.now() - employeeStarted;
      expect(feedbackMs.employee).toBeLessThan(500);
      await employeePending.click({ force: true }).catch(() => undefined);
      await expect(page.getByText("Save failed.")).toBeVisible();
      expect(employeeCalls).toBe(1);
      await expect(page.getByText(`L3-${workspace.seedRef}`.slice(0, 24), { exact: true }).first()).toBeVisible();
      await page.unroute("**/api/hr-admin/employees");

      await gotoAuthenticated(page, "/ess/leave", workspacePersona(workspace, "employee"));
      await page.getByRole("button", { name: "Apply leave" }).first().click();
      const leaveDialog = page.getByRole("dialog", { name: "Apply leave" });
      const leaveType = leaveDialog.getByLabel("Leave type");
      if (!(await leaveType.inputValue())) await firstOption(leaveType);
      const date = new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await leaveDialog.getByLabel("Start date").fill(date);
      await leaveDialog.getByLabel("End date").fill(date);
      await leaveDialog.getByLabel(/Reason for leave/i).fill("L3 delayed request retains this reason");
      if (await leaveDialog.getByText("Evidence required.").isVisible().catch(() => false)) {
        await leaveDialog.getByLabel("Evidence reference").fill("L3-EVIDENCE");
      }
      let leaveCalls = 0;
      await page.route("**/api/me/leave-requests", async (route) => {
        leaveCalls += 1;
        await delayedJson(route, 2_000, 503, { detail: "Temporary leave service failure." });
      });
      const leaveStarted = Date.now();
      await leaveDialog.getByRole("button", { name: "Submit leave" }).click();
      await expect(leaveDialog.getByRole("button", { name: "Submitting leave" })).toHaveAttribute("aria-busy", "true", { timeout: 500 });
      feedbackMs.leave = Date.now() - leaveStarted;
      await expect(leaveDialog.getByText("Submission failed.")).toBeVisible();
      expect(leaveCalls).toBe(1);
      await expect(leaveDialog.getByLabel(/Reason for leave/i)).toHaveValue("L3 delayed request retains this reason");
      await page.unroute("**/api/me/leave-requests");

      await gotoAuthenticated(page, "/mss/approvals?queue=leave", workspacePersona(workspace, "manager"));
      await page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).first().click();
      const approvalDialog = page.getByRole("dialog", { name: "Review leave approval" });
      let approvalCalls = 0;
      await page.route("**/api/manager/leave-requests/*/approve", async (route) => {
        approvalCalls += 1;
        await delayedJson(route, 750, 200, { status: "approved" });
      });
      const approvalStarted = Date.now();
      await approvalDialog.getByRole("button", { name: "Approve request" }).click();
      await expect(approvalDialog.getByRole("button", { name: "Approving request" })).toHaveAttribute("aria-busy", "true", { timeout: 500 });
      feedbackMs.approval = Date.now() - approvalStarted;
      await expect(approvalDialog.getByRole("button", { name: "Reject request" })).toBeDisabled();
      await expect(approvalDialog.getByText("Action saved.")).toBeVisible();
      expect(approvalCalls).toBe(1);
      await page.unroute("**/api/manager/leave-requests/*/approve");

      await gotoAuthenticated(page, "/tenant-admin/users", workspacePersona(workspace, "tenant_admin"));
      await page.getByRole("main").getByRole("button", { name: "Invite member" }).click();
      const inviteDialog = page.getByRole("dialog", { name: "Invite tenant member" });
      const inviteEmail = `${workspace.seedRef}.invite@example.test`;
      await inviteDialog.getByLabel("Email").fill(inviteEmail);
      await inviteDialog.getByLabel("Username").fill(`${workspace.seedRef}.invite`);
      let inviteCalls = 0;
      await page.route("**/api/tenant-admin/memberships", async (route) => {
        inviteCalls += 1;
        await delayedJson(route, 750, 503, { detail: "Temporary membership service failure." });
      });
      const inviteStarted = Date.now();
      await inviteDialog.getByRole("button", { name: "Invite member", exact: true }).click();
      await expect(inviteDialog.getByRole("button", { name: "Inviting member" })).toHaveAttribute("aria-busy", "true", { timeout: 500 });
      feedbackMs.membership = Date.now() - inviteStarted;
      await expect(inviteDialog.getByText("Temporary membership service failure.")).toBeVisible();
      expect(inviteCalls).toBe(1);
      await expect(inviteDialog.getByLabel("Email")).toHaveValue(inviteEmail);
      await expect(inviteDialog.getByRole("button", { name: "Invite member", exact: true })).toBeEnabled();
      await page.unroute("**/api/tenant-admin/memberships");
      await testInfo.attach("mutation-feedback-timings.json", {
        body: Buffer.from(JSON.stringify(feedbackMs, null, 2)),
        contentType: "application/json",
      });
      console.info(`l3-mutation-feedback ${JSON.stringify(feedbackMs)}`);
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });

  test("Platform Admin tenant creation exposes delayed failure and preserves form values", async ({ page }, testInfo) => {
    await gotoAuthenticated(page, "/platform-admin/tenants", platformAdmin);
    await page.locator("article").filter({ has: page.getByRole("heading", { name: "Create tenant" }) }).first().getByRole("button", { name: "Create tenant" }).click();
    const dialog = page.getByRole("dialog", { name: "Create platform tenant" });
    await dialog.getByLabel("Code", { exact: true }).fill("l3-feedback-only");
    await dialog.getByLabel("Name", { exact: true }).fill("L3 Feedback Only");
    let calls = 0;
    await page.route("**/api/platform/tenants", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      calls += 1;
      await delayedJson(route, 2_000, 503, { detail: "Temporary platform service failure." });
    });
    const startedAt = Date.now();
    await dialog.getByRole("button", { name: "Create tenant" }).click();
    await expect(dialog.getByRole("button", { name: "Creating tenant" })).toHaveAttribute("aria-busy", "true", { timeout: 500 });
    const feedbackMs = Date.now() - startedAt;
    await expect(page.getByRole("status").filter({ hasText: "Saving the platform change" })).toBeVisible();
    await expect(page.getByText("Temporary platform service failure.")).toBeVisible();
    expect(calls).toBe(1);
    await expect(dialog.getByLabel("Code", { exact: true })).toHaveValue("l3-feedback-only");
    await expect(dialog.getByRole("button", { name: "Create tenant" })).toBeEnabled();
    await testInfo.attach("platform-mutation-feedback.json", {
      body: Buffer.from(JSON.stringify({ delayMs: 2_000, feedbackMs }, null, 2)),
      contentType: "application/json",
    });
    console.info(`l3-platform-feedback ${JSON.stringify({ delayMs: 2_000, feedbackMs })}`);
  });
});
