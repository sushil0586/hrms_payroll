import { expect, test } from "@playwright/test";

import { expectPageReady } from "../../tests/helpers/assertions";
import { expectLiveWorkspace, loginAs } from "../helpers/auth";
import { getLiveApiToken, liveApiGet } from "../helpers/live-api";

type ManagerLeaveApprovalListResponse = {
  items: Array<{
    id: string;
    status: string;
    employee_name: string;
    workflow_reference: string;
  }>;
  total_count: number;
};

type WorkflowTraceListResponse = {
  items: Array<{
    id: string;
    status: string;
    subject_identifier: string;
    employee_code: string;
    current_step_name: string;
    timeline: Array<{
      action: string;
      actor_identifier: string;
      detail: string;
    }>;
  }>;
  total_count: number;
};

test.describe.serial("live backend auth and role access", () => {
  test("unauthenticated HR admin access redirects to login", async ({ page }) => {
    await page.goto("/hr-admin");
    await expect(page).toHaveURL(/\/login$/);
    await expectPageReady(page, "Sign in");
  });

  test("HR admin can sign in and open the live HR workspace", async ({ page }) => {
    await loginAs(page, "hrAdmin");
    await page.goto("/hr-admin");
    await expectPageReady(page, "Control center");
    await expectLiveWorkspace(page, "Live workspace");
  });

  test("employee can use ESS but is redirected away from HR admin", async ({ page }) => {
    await loginAs(page, "employee");
    await expectLiveWorkspace(page, "Live ESS");

    await page.goto("/hr-admin");
    await expect(page).toHaveURL(/\/$/);
    await expectPageReady(page, "Choose your workspace");
    await expect(page.getByText(/HR admin restricted/i)).toBeVisible();
  });

  test("manager can open MSS approvals and persist a live rejection into workflow trace", async ({ page }) => {
    const managerToken = await getLiveApiToken("manager");
    const hrAdminToken = await getLiveApiToken("hrAdmin");
    const pendingBefore = await liveApiGet<ManagerLeaveApprovalListResponse>(
      "/manager/leave-requests/pending/?page=1&page_size=5",
      managerToken,
    );
    expect(pendingBefore.total_count).toBeGreaterThan(0);
    const target = pendingBefore.items[0];

    await loginAs(page, "manager");
    await page.goto(`/mss/approvals?queue=leave&leaveId=${target.id}`);
    await expectPageReady(page, "Manager inbox");
    await expectLiveWorkspace(page, "Live MSS");
    await expect(page.getByRole("heading", { name: "Leave approval detail" })).toBeVisible();
    await expect(page.getByText(target.employee_name).first()).toBeVisible();

    const rejectButton = page.getByRole("button", { name: /Reject request|Reject cancellation/ });
    await expect(rejectButton).toBeEnabled();
    await page.getByLabel("Decision note").fill("Live browser regression check.");

    const decisionResponse = page.waitForResponse((response) =>
      /\/api\/manager\/leave-requests\/.+\/reject$/.test(response.url()) && response.request().method() === "POST",
    );
    await rejectButton.click();
    await expect((await decisionResponse).ok()).toBeTruthy();
    await expect(page.getByText("Action saved.")).toBeVisible();

    const pendingAfter = await liveApiGet<ManagerLeaveApprovalListResponse>(
      "/manager/leave-requests/pending/?page=1&page_size=10",
      managerToken,
    );
    expect(pendingAfter.items.some((item) => item.id === target.id)).toBe(false);

    const trace = await liveApiGet<WorkflowTraceListResponse>(
      `/hr-admin/workflow-traces/?module=leave&q=${target.id}&page=1&page_size=5`,
      hrAdminToken,
    );
    expect(trace.total_count).toBe(1);
    expect(trace.items[0]).toMatchObject({
      status: "rejected",
      subject_identifier: target.id,
      employee_code: "EMP-0042",
    });
    expect(trace.items[0].timeline.some((event) => event.action === "reject" && event.detail === "Live browser regression check.")).toBe(true);
  });
});
