import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase 7C attendance derivation exceptions report certification", () => {
  test("HR admin can certify derivation filters, export evidence, manifest, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/attendance-derivation-exceptions", hrAdmin);
    await expectPageReady(page, "Attendance Derivation Exceptions Report");

    const report = page.getByTestId("attendance-derivation-exceptions-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Derivation", "Schedule", "Work time", "Payroll impact", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Derivation exceptions", "Payroll impacting", "Warnings", "Leave collisions"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, status, reason, warning");
    await search.fill("no-such-attendance-derivation-exception");
    await expect(report.getByText("No attendance derivation exception rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Derived status", "Risk", "Department", "Payroll impact", "Leave collision"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No attendance derivation exception rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["risk", "date", "employee", "status", "late", "lop"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No attendance derivation exception rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort").selectOption("risk");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/attendance-derivation-exceptions\?.*sort=risk/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("attendance-derivation-exceptions");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("attendance_record_id");
    expect(filteredExportBody).toContain("derived_status");
    expect(filteredExportBody).toContain("payroll_impacting");
    expect(filteredExportBody).toContain("exception_risk");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.source_endpoints).toContain("/hr-admin/attendance-records/");
    expect(manifest.evidence_columns).toContain("attendance_record_id");
    expect(manifest.evidence_columns).toContain("derived_status");
    expect(manifest.evidence_columns).toContain("payroll_impacting");
    expect(manifest.evidence_columns).toContain("exception_risk");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access attendance derivation exceptions report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");

    await page.goto("/hr-admin/reports/attendance-derivation-exceptions", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("attendance-derivation-exceptions-report")).toHaveCount(0);

    const csvResponse = await page.request.get("/api/hr-admin/reports/attendance-derivation-exceptions?sort=risk");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/attendance-derivation-exceptions?sort=risk&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
