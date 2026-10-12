import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady, expectSummaryMetric } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase PLF-5B PF ECR readiness certification", () => {
  test("HR admin can certify PF ECR readiness gates, filters, package links, and drilldowns", async ({ page }) => {
    test.setTimeout(90_000);
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");

    const catalog = page.getByTestId("report-catalog-workspace");
    await catalog.getByRole("tab", { name: "Compliance" }).click();
    await catalog.getByPlaceholder("Search by report, field, or owner").fill("pf");
    const catalogRow = catalog.getByRole("row").filter({ hasText: "pf-ecr-readiness" });
    await expect(catalogRow.getByRole("link", { name: "Open" })).toHaveAttribute("href", "/hr-admin/reports/pf-ecr-readiness");
    await gotoAuthenticated(page, "/hr-admin/reports/pf-ecr-readiness", hrAdmin);

    await expectPageReady(page, "PF ECR Readiness");
    const report = page.getByTestId("pf-ecr-readiness-report");
    await expect(report).toBeVisible();

    for (const metric of ["Readiness", "Warnings", "Blocked gates", "PF artifacts"]) {
      await expectSummaryMetric(report, metric);
    }

    for (const column of ["Gate", "Area", "Status", "Owner", "Signal", "Evidence", "Source", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const gate of ["PF component setup", "Employer EPFO registration", "PF ECR filing calendar", "Employee UAN coverage", "PF member ID coverage", "PF wage and deduction evidence", "Provider ECR route"]) {
      await expect(report.getByText(gate)).toBeVisible();
    }

    const search = report.getByLabel("Search gates");
    await search.fill("no-such-pf-gate");
    await expect(search).toHaveValue("no-such-pf-gate");
    await expect(report.getByLabel("PF readiness pagination")).toBeVisible();
    await search.fill("");

    await report.getByLabel("Readiness status").selectOption("Blocked");
    await expect(report.locator(".report-catalog-summary").getByText(/gates/)).toBeVisible();
    await report.getByLabel("Readiness status").selectOption("All");
    await report.getByLabel("Gate area").selectOption("Provider");
    await expect(report.getByText("Provider ECR route")).toBeVisible();
    await report.getByLabel("Gate area").selectOption("All");

    await expect(report.getByRole("link", { name: "Download PF ECR package" })).toHaveAttribute("href", "/api/hr-admin/reports/pf-ecr-package");
    const packageResponse = await page.request.get("/api/hr-admin/reports/pf-ecr-package");
    expect([200, 400]).toContain(packageResponse.status());
    if (packageResponse.status() === 200) {
      expect(packageResponse.headers()["x-hrms-report-key"]).toBe("pf-ecr-package");
      expect(packageResponse.headers()["x-hrms-package-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    } else {
      const payload = await packageResponse.json();
      expect(payload.detail).toBe("PF ECR package is not ready.");
      expect(payload.blocking_reasons.length).toBeGreaterThan(0);
    }

    const manifestResponse = await page.request.get("/api/hr-admin/reports/pf-ecr-package?format=manifest");
    expect([200, 400]).toContain(manifestResponse.status());
    if (manifestResponse.status() === 200) {
      const manifest = await manifestResponse.json();
      expect(manifest.report_key).toBe("pf-ecr-package");
      expect(manifest.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    }
    await expect(report.getByLabel("PF readiness pagination")).toBeVisible();
    await expect(report.locator("code").first()).toBeVisible();

    const providerRouteLink = report.locator("tbody tr").filter({ hasText: "Provider ECR route" }).getByRole("link", { name: "Open" });
    await expect(providerRouteLink).toHaveAttribute("href", "/hr-admin/reports/provider-filing-receipts");
    await gotoAuthenticated(page, "/hr-admin/reports/provider-filing-receipts", hrAdmin);
    await expectPageReady(page, "Provider Filing Receipts");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access PF ECR readiness report", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");

    await page.goto("/hr-admin/reports/pf-ecr-readiness", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page).not.toHaveURL(/\/hr-admin\/reports\/pf-ecr-readiness/);
    await expect(page.getByTestId("pf-ecr-readiness-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /PF ECR Readiness/i })).toHaveCount(0);
  });
});
