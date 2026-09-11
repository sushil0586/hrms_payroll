import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R2-D lifecycle aging and SLA report certification", () => {
  test("HR admin can certify lifecycle aging filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/lifecycle-aging", hrAdmin);
    await expectPageReady(page, "Lifecycle Aging and SLA Report");

    const report = page.getByTestId("lifecycle-aging-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Lifecycle", "Age", "SLA", "Owner", "Evidence", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Aging records", "Overdue items", "Escalations", "High SLA risk"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, owner, workflow, SLA");
    await search.fill("no-such-lifecycle-aging-row");
    await expect(report.getByText("No lifecycle aging rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Lifecycle type", "Status", "Owner", "Age bucket", "SLA risk", "Escalation"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No lifecycle aging rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["overdue", "age", "employee", "type", "owner", "escalation"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No lifecycle aging rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort").selectOption("overdue");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/lifecycle-aging\?.*sort=overdue/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("lifecycle-aging");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    expect(filteredExportResponse.headers()["x-hrms-source-row-count"]).toMatch(/^\d+$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("employee_code");
    expect(filteredExportBody).toContain("age_bucket");
    expect(filteredExportBody).toContain("sla_risk");
    expect(filteredExportBody).toContain("days_overdue");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("lifecycle-aging");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.source_endpoints).toContain("/hr-admin/lifecycle-queue/");
    expect(manifest.evidence_columns).toContain("age_bucket");
    expect(manifest.evidence_columns).toContain("sla_risk");
    expect(manifest.evidence_columns).toContain("days_overdue");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=lifecycle-aging");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.length).toBeGreaterThanOrEqual(2);
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "csv")).toBeTruthy();
    expect(auditPayload.items.some((item: { export_type: string }) => item.export_type === "manifest")).toBeTruthy();
    expect(auditPayload.items[0].source_endpoints).toContain("/hr-admin/lifecycle-queue/");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expect(report.getByRole("button", { name: "Previous" })).toBeVisible();
    await expect(report.getByRole("button", { name: "Next" })).toBeVisible();

    const openLink = report.getByRole("link", { name: "Open" }).first();
    if ((await openLink.count()) > 0) {
      await expect(openLink).toHaveAttribute("href", /\/hr-admin\//);
      await openLink.click();
      await expect(page).toHaveURL(/\/hr-admin\//);
      await expectNoHorizontalOverflow(page);
    } else {
      await expect(report.getByText("No lifecycle aging rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access lifecycle aging report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/lifecycle-aging", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("lifecycle-aging-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/lifecycle-aging?sort=overdue");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/lifecycle-aging?sort=overdue&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
