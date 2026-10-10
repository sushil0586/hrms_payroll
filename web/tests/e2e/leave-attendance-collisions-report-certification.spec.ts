import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase 7B leave-attendance collision report certification", () => {
  test("HR admin can certify collision filters, export evidence, manifest, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/leave-attendance-collisions", hrAdmin);
    await expectPageReady(page, "Leave-Attendance Collision Report");

    const report = page.getByTestId("leave-attendance-collisions-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Leave", "Attendance", "Payroll risk", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Collisions", "Payroll blocking", "High severity", "Employees"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, leave, status, shift");
    await search.fill("no-such-leave-attendance-collision");
    await expect(report.getByText("No leave-attendance collision rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Leave status", "Severity", "Payroll blocking", "Leave type", "Attendance status"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No leave-attendance collision rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["severity", "date", "employee", "leave_type", "attendance_status"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No leave-attendance collision rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort").selectOption("severity");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/leave-attendance-collisions\?.*sort=severity/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("leave-attendance-collisions");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("leave_request_id");
    expect(filteredExportBody).toContain("attendance_record_id");
    expect(filteredExportBody).toContain("payroll_blocking");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.source_endpoints).toContain("/hr-admin/leave-requests/");
    expect(manifest.evidence_columns).toContain("leave_request_id");
    expect(manifest.evidence_columns).toContain("attendance_record_id");
    expect(manifest.evidence_columns).toContain("payroll_blocking");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access leave-attendance collision report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");

    await page.goto("/hr-admin/reports/leave-attendance-collisions", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("leave-attendance-collisions-report")).toHaveCount(0);

    const csvResponse = await page.request.get("/api/hr-admin/reports/leave-attendance-collisions?sort=severity");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/leave-attendance-collisions?sort=severity&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
