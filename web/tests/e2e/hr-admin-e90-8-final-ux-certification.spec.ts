import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const desktopRoutes = [
  { path: "/hr-admin", heading: "HR Control Center" },
  { path: "/hr-admin/attendance-records?page_size=10", heading: "Attendance records" },
  { path: "/hr-admin/leave-requests?page_size=10", heading: "Leave Requests" },
  { path: "/hr-admin/employee-shift-assignments?page_size=10", heading: "Shift assignments" },
  { path: "/hr-admin/shift-roster-templates?page_size=10&rollout_page_size=3", heading: "Roster templates" },
  { path: "/hr-admin/payroll-inputs", heading: "Payroll Inputs" },
  { path: "/hr-admin/payroll-review", heading: "Payroll Review" },
  { path: "/hr-admin/reports", heading: "Reports" },
  { path: "/hr-admin/reports/payroll-input-exceptions", heading: "Payroll Input Exceptions" },
  { path: "/hr-admin/leave-policy-assignments?page_size=10", heading: "Leave assignments" },
];

const mobileRoutes = [
  { path: "/hr-admin", heading: "HR Control Center" },
  { path: "/hr-admin/leave-requests?page_size=10", heading: "Leave Requests" },
  { path: "/hr-admin/payroll-review", heading: "Payroll Review" },
  { path: "/hr-admin/reports/payroll-input-exceptions", heading: "Payroll Input Exceptions" },
];

async function expectCompactHrAdminPage(page: Page, heading: string) {
  await expect(page.locator("main.shell").first()).toBeVisible();
  await expect(page.locator("main.hr-admin-compact-ui").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe("E90-8 final HR Admin compact UX certification", () => {
  test("desktop route sweep keeps HR Admin modules compact and overflow-free", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of desktopRoutes) {
      await gotoAuthenticated(page, route.path, hrAdmin);
      await expectCompactHrAdminPage(page, route.heading);
    }
  });

  test("mobile route sweep keeps representative HR Admin modules usable", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of mobileRoutes) {
      await gotoAuthenticated(page, route.path, hrAdmin);
      await expectCompactHrAdminPage(page, route.heading);
      await expect(page.locator("header .mobile-workspace-nav summary").first()).toBeVisible();
    }
  });

  test("representative report export remains available from compact report pages", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/payroll-input-exceptions", hrAdmin);
    await expectCompactHrAdminPage(page, "Payroll Input Exceptions");

    const response = await page.request.get("/api/hr-admin/reports/payroll-input-exceptions?sort=risk");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["x-hrms-report-key"]).toBe("payroll-input-exceptions");

    const manifestResponse = await page.request.get("/api/hr-admin/reports/payroll-input-exceptions?sort=risk&format=manifest");
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.report_key).toBe("payroll-input-exceptions");
  });
});
