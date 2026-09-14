import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase PLF-5A TDS e-file readiness certification", () => {
  test("HR admin can certify TDS readiness gates, filters, package links, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const catalog = page.getByTestId("report-catalog-workspace");
    await catalog.getByRole("tab", { name: "Compliance" }).click();
    await catalog.getByPlaceholder("Search by report, field, or owner").fill("tds");
    const catalogRow = catalog.getByRole("row").filter({ hasText: "tds-efile-readiness" });
    await expect(catalogRow.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/hr-admin/reports/tds-efile-readiness");
    await catalogRow.getByRole("link", { name: "Open" }).click();

    await expectPageReady(page, "TDS E-file Readiness");
    const report = page.getByTestId("tds-efile-readiness-report");
    await expect(report).toBeVisible();

    for (const metric of ["Readiness", "Warnings", "Blocked gates", "TDS artifacts"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric })).toBeVisible();
    }

    for (const column of ["Gate", "Area", "Status", "Owner", "Signal", "Evidence", "Source", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const gate of ["TDS component setup", "Employer TAN registration", "Form 24Q filing calendar", "Employee PAN coverage", "Tax declaration lock", "Challan and deduction evidence", "Provider filing route"]) {
      await expect(report.getByText(gate)).toBeVisible();
    }

    await expect(report.getByLabel("Readiness status")).toBeVisible();
    await expect(report.getByLabel("Gate area")).toBeVisible();
    await report.getByLabel("Search gates").fill("no-such-tds-gate");
    await expect(report.getByText("No TDS readiness gates match the selected filters.")).toBeVisible();
    await report.getByLabel("Search gates").fill("");

    await report.getByLabel("Readiness status").selectOption("Blocked");
    await expect(report.locator(".report-catalog-summary").getByText(/gates/)).toBeVisible();
    await report.getByLabel("Readiness status").selectOption("All");
    await report.getByLabel("Gate area").selectOption("Provider");
    await expect(report.getByText("Provider filing route")).toBeVisible();
    await report.getByLabel("Gate area").selectOption("All");

    await expect(report.getByRole("link", { name: "Download TDS e-file package" })).toHaveAttribute("href", "/api/hr-admin/reports/tds-efile-package");
    const packageResponse = await page.request.get("/api/hr-admin/reports/tds-efile-package");
    expect([200, 400]).toContain(packageResponse.status());
    if (packageResponse.status() === 200) {
      expect(packageResponse.headers()["x-hrms-report-key"]).toBe("tds-efile-package");
      expect(packageResponse.headers()["x-hrms-package-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    } else {
      const payload = await packageResponse.json();
      expect(payload.detail).toBe("TDS e-file package is not ready.");
      expect(payload.blocking_reasons.length).toBeGreaterThan(0);
    }

    await expect(report.getByRole("link", { name: "Package manifest" })).toHaveAttribute("href", "/api/hr-admin/reports/tds-efile-package?format=manifest");
    await expect(report.getByLabel("TDS readiness pagination")).toBeVisible();
    await expect(report.locator("code").first()).toBeVisible();

    await report.locator("tbody tr").filter({ hasText: "Provider filing route" }).getByRole("link", { name: "Open" }).click();
    await expectPageReady(page, "Provider Filing Receipts");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access TDS e-file readiness report", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/tds-efile-readiness", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("tds-efile-readiness-report")).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /Run payroll, compliance, and employee operations/ })).toBeVisible();
  });
});
