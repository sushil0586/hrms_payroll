import { expect, test } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

test("employee CSV import acknowledges commit, blocks duplicates, and recovers after failure", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    await gotoAuthenticated(page, "/hr-admin/employees#employee-imports", workspacePersona(workspace, "hr_admin"));
    await page.locator("#employee-imports details > summary").click();
    const workbench = page.getByTestId("employee-import-workbench");
    await workbench.getByRole("button", { name: "Load sample template" }).click();
    const csv = await workbench.getByRole("textbox", { name: "CSV data" }).inputValue();
    await workbench.getByRole("button", { name: "Preview import" }).click();
    const commit = workbench.getByRole("button", { name: "Commit ready rows" });
    await expect(commit).toBeEnabled();

    let attempts = 0;
    await page.route("**/api/hr-admin/employees", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.abort("connectionfailed");
    });

    const startedAt = Date.now();
    await commit.click();
    const pending = workbench.getByRole("button", { name: "Committing employee rows" });
    await expect(pending).toBeDisabled({ timeout: 500 });
    const acknowledgementMs = Date.now() - startedAt;
    await pending.click({ force: true });
    await expect(pending).not.toBeVisible();
    await expect(workbench.getByRole("alert")).toContainText("Some employee rows failed");
    expect(attempts).toBe(1);
    await expect(workbench.getByRole("textbox", { name: "CSV data" })).toHaveValue(csv);

    await workbench.getByRole("button", { name: "Preview import" }).click();
    await expect(workbench.getByRole("button", { name: "Commit ready rows" })).toBeEnabled();
    await testInfo.attach("employee-import-recovery.json", {
      body: Buffer.from(JSON.stringify({ acknowledgementMs, delayMs: 2_000, attempts, csvPreserved: true }, null, 2)),
      contentType: "application/json",
    });
    console.info(`l6a-import-recovery ${JSON.stringify({ acknowledgementMs, attempts })}`);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("attendance import preview reports delayed lookup failure and retries without losing CSV", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    await gotoAuthenticated(page, "/hr-admin/attendance-records?page_size=10", workspacePersona(workspace, "hr_admin"));
    const workbench = page.getByTestId("attendance-record-import-workbench");
    const employeeCode = "L6C-LOOKUP-ONLY";
    const csv = [
      "employee_code,attendance_date,status,source,shift_name,check_in_at,check_out_at,work_duration_hours,overtime_hours,late_minutes,early_exit_minutes,is_regularized,is_locked,notes",
      `${employeeCode},2026-04-03,present,manual,,2026-04-03T09:00:00+05:30,2026-04-03T18:00:00+05:30,8.00,0.00,0,0,false,false,L6C retained preview row`,
    ].join("\n");
    const csvInput = workbench.getByRole("textbox", { name: "Attendance CSV data" });
    await csvInput.fill(csv);
    let attempts = 0;
    await page.route("**/api/hr-admin/employees/option-search?*", async (route) => {
      attempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      await route.abort("connectionfailed");
    });

    const startedAt = Date.now();
    await workbench.getByRole("button", { name: "Preview attendance import" }).click();
    const pending = workbench.getByRole("button", { name: "Resolving employee codes" });
    await expect(pending).toHaveAttribute("aria-busy", "true", { timeout: 500 });
    const acknowledgementMs = Date.now() - startedAt;
    await pending.click({ force: true });
    await expect(workbench.getByRole("alert")).toContainText("Employee lookup failed");
    expect(attempts).toBe(1);
    await expect(csvInput).toHaveValue(csv);
    await expect(workbench.getByRole("button", { name: "Preview attendance import" })).toBeEnabled();

    await page.unroute("**/api/hr-admin/employees/option-search?*");
    await page.route("**/api/hr-admin/employees/option-search?*", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          items: [{ id: workspace.manifest.credentials.employee.employee_id, employee_code: employeeCode, name: "Lookup Employee" }],
          total_count: 1,
        }),
        contentType: "application/json",
        status: 200,
      });
    });
    await workbench.getByRole("button", { name: "Preview attendance import" }).click();
    await expect(workbench.getByText("Preview ready. Commit ready attendance rows after checking blocked rows.")).toBeVisible();
    await page.unroute("**/api/hr-admin/employees/option-search?*");
    await testInfo.attach("attendance-preview-recovery.json", {
      body: Buffer.from(JSON.stringify({ acknowledgementMs, attempts, delayMs: 2_000, csvPreserved: true, retrySucceeded: true }, null, 2)),
      contentType: "application/json",
    });
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
