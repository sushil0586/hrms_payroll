import { expect, test } from "@playwright/test";
import { loginIfRequired } from "../helpers/staging-auth";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  resolveEmployeeById,
} from "../helpers/isolated-qa-workspace";

test.describe.configure({ mode: "serial" });

test("isolated workspace resolves deterministic employee and policy fixtures", async ({ page }, testInfo) => {
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    const hrAdmin = workspace.manifest.credentials.hr_admin;
    await loginIfRequired(page, { username: hrAdmin.username, password: "Password@123" }, "/hr-admin/employees");

    const employee = await resolveEmployeeById(page.request, workspace.manifest.credentials.employee.employee_id);
    expect(employee.employee_code).toBe(workspace.manifest.credentials.employee.employee_code);

    for (const [path, expectedText] of [
      ["/hr-admin/payroll-setup", "QA Monthly"],
      ["/hr-admin/leave-policies", "QA Casual 2026"],
      ["/hr-admin/attendance-policies", "QA Attendance"],
    ] as const) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(expectedText, { exact: true }).first()).toBeVisible();
    }

    expect(Object.values(workspace.manifest.checks).every(Boolean)).toBeTruthy();
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
