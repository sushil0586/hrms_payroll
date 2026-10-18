import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

test("RG3A DDG-F-007 preserves a closed attendance snapshot after a policy edit", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const hrAdmin = workspacePersona(workspace, "hr_admin");
  const employee = workspace.manifest.credentials.employee;
  const attendanceDate = "2029-03-15";

  try {
    await gotoAuthenticated(page, "/hr-admin/attendance-records", hrAdmin);
    await expectPageReady(page, "Attendance records");
    const importWorkbench = page.getByTestId("attendance-record-import-workbench");
    const csv = [
      "employee_code,attendance_date,status,source,shift_name,check_in_at,check_out_at,work_duration_hours,overtime_hours,late_minutes,early_exit_minutes,is_regularized,is_locked,notes",
      `${employee.employee_code},${attendanceDate},present,import,QA Day,${attendanceDate}T09:00:00+05:30,${attendanceDate}T18:00:00+05:30,8.00,0.00,0,0,false,false,RG3A historical snapshot`,
    ].join("\n");
    await importWorkbench.getByLabel("Attendance CSV data").fill(csv);
    await importWorkbench.getByRole("button", { name: "Preview attendance import" }).click();
    await expect(importWorkbench.getByText("1 ready")).toBeVisible();
    await importWorkbench.getByRole("button", { name: "Commit ready attendance rows" }).click();
    await expect(importWorkbench.getByText("Commit complete. Open Time to Payroll to verify attendance exceptions.")).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/attendance-close", hrAdmin);
    await expectPageReady(page, "Monthly attendance close");
    await page.getByLabel("Period start").fill("2029-03-01");
    await page.getByLabel("Period end").fill("2029-03-31");
    const [reconcileResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/hr-admin/attendance-closes") && response.request().method() === "POST"),
      page.getByRole("button", { name: "Reconcile period" }).click(),
    ]);
    expect(reconcileResponse.status()).toBe(201);
    const reconciled = await reconcileResponse.json() as { id: string; snapshot_hash: string; reconciliation_snapshot: unknown };
    const closeCard = page.locator("article.record-card").filter({ hasText: "2029-03-01 to 2029-03-31" });
    await expect(closeCard).toContainText("1 employees");
    await closeCard.getByRole("button", { name: "Submit" }).click();
    await expect(page.locator("p.notice[role=status]")).toContainText("submitted confirmed");
    await closeCard.getByRole("button", { name: "Approve" }).click();
    await expect(page.locator("p.notice[role=status]")).toContainText("approved confirmed");
    await closeCard.getByRole("button", { name: "Close period" }).click();
    await expect(page.locator("p.notice[role=status]")).toContainText("closed confirmed");

    const beforeResponse = await requestWithBrowserSession(page, `/api/hr-admin/attendance-closes/${reconciled.id}`);
    expect(beforeResponse.status).toBe(200);
    const before = JSON.parse(beforeResponse.body) as { status: string; snapshot_hash: string; reconciliation_snapshot: unknown };
    expect(before.status).toBe("closed");
    expect(before.snapshot_hash).toBe(reconciled.snapshot_hash);

    await gotoAuthenticated(page, `/hr-admin/attendance-policies/${workspace.manifest.attendance.policy_id}/edit`, hrAdmin);
    await expectPageReady(page, "Edit attendance policy");
    const lateMinutes = page.getByLabel("Late mark after minutes");
    const originalLateMinutes = Number(await lateMinutes.inputValue());
    await lateMinutes.fill(String(originalLateMinutes + 1));
    const [policyResponse] = await Promise.all([
      page.waitForResponse((response) => response.url().includes(`/api/hr-admin/attendance-policies/${workspace.manifest.attendance.policy_id}`) && response.request().method() === "PATCH"),
      page.getByRole("button", { name: "Save changes" }).click(),
    ]);
    expect(policyResponse.ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-policies$/);

    const afterResponse = await requestWithBrowserSession(page, `/api/hr-admin/attendance-closes/${reconciled.id}`);
    expect(afterResponse.status).toBe(200);
    const after = JSON.parse(afterResponse.body) as { status: string; snapshot_hash: string; reconciliation_snapshot: unknown };
    expect(after.status).toBe("closed");
    expect(after.snapshot_hash).toBe(before.snapshot_hash);
    expect(after.reconciliation_snapshot).toEqual(before.reconciliation_snapshot);

    await testInfo.attach("rg3a-attendance-history-evidence.json", {
      body: Buffer.from(JSON.stringify({ close_id: reconciled.id, before, after, policy_id: workspace.manifest.attendance.policy_id }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
