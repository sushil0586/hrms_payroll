import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase PLF-5E LWF readiness certification", () => {
  test("HR admin can certify LWF readiness gates, filters, package links, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const catalog = page.getByTestId("report-catalog-workspace");
    await catalog.getByRole("tab", { name: "Compliance" }).click();
    await catalog.getByPlaceholder("Search by report, field, or owner").fill("labour welfare fund");
    const catalogRow = catalog.getByRole("row").filter({ hasText: "lwf-readiness" });
    await expect(catalogRow.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/hr-admin/reports/lwf-readiness");
    await gotoAuthenticated(page, "/hr-admin/reports/lwf-readiness", hrAdmin);

    await expectPageReady(page, "LWF Readiness");
    const report = page.getByTestId("lwf-readiness-report");
    await expect(report).toBeVisible();

    for (const metric of ["Readiness", "Warnings", "Blocked gates", "LWF artifacts"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric })).toBeVisible();
    }
    for (const column of ["Gate", "Area", "Status", "Owner", "Signal", "Evidence", "Source", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }
    for (const gate of ["Labour Welfare Fund component setup", "Employee LWF state coverage", "Employer LWF registration", "LWF return filing calendar", "LWF deduction artifact evidence", "Provider LWF return route"]) {
      await expect(report.getByText(gate)).toBeVisible();
    }

    await report.getByLabel("Search gates").fill("no-such-lwf-gate");
    await expect(report.getByText("No Labour Welfare Fund readiness gates match the selected filters.")).toBeVisible();
    await report.getByLabel("Search gates").fill("");
    await report.getByLabel("Readiness status").selectOption("Blocked");
    await expect(report.locator(".report-catalog-summary").getByText(/gates/)).toBeVisible();
    await report.getByLabel("Readiness status").selectOption("All");
    await report.getByLabel("Gate area").selectOption("Provider");
    await expect(report.getByText("Provider LWF return route")).toBeVisible();
    await report.getByLabel("Gate area").selectOption("All");

    await expect(report.getByRole("link", { name: "Download LWF package" })).toHaveAttribute("href", "/api/hr-admin/reports/lwf-package");
    const packageResponse = await page.request.get("/api/hr-admin/reports/lwf-package");
    expect([200, 400]).toContain(packageResponse.status());
    if (packageResponse.status() === 200) {
      expect(packageResponse.headers()["x-hrms-report-key"]).toBe("lwf-package");
      expect(packageResponse.headers()["x-hrms-package-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    } else {
      const payload = await packageResponse.json();
      expect(payload.detail).toBe("Labour Welfare Fund package is not ready.");
      expect(payload.blocking_reasons.length).toBeGreaterThan(0);
    }

    const manifestResponse = await page.request.get("/api/hr-admin/reports/lwf-package?format=manifest");
    expect([200, 400]).toContain(manifestResponse.status());
    if (manifestResponse.status() === 200) {
      const manifest = await manifestResponse.json();
      expect(manifest.report_key).toBe("lwf-package");
      expect(manifest.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    await expect(report.getByLabel("Labour Welfare Fund readiness pagination")).toBeVisible();
    await expect(report.locator("code").first()).toBeVisible();

    await report.locator("tbody tr").filter({ hasText: "Provider LWF return route" }).getByRole("link", { name: "Open" }).click();
    await expectPageReady(page, "Provider Filing Receipts");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access LWF readiness report", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");
    await page.goto("/hr-admin/reports/lwf-readiness", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("lwf-readiness-report")).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: /Run payroll, compliance, and employee operations/ })).toBeVisible();
  });
});
