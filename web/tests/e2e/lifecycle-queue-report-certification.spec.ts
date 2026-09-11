import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R2-C lifecycle queue report certification", () => {
  test("HR admin can certify lifecycle queue filters, pagination, export evidence, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/lifecycle-queue", hrAdmin);
    await expectPageReady(page, "Lifecycle Queue Report");

    const report = page.getByTestId("lifecycle-queue-report");
    await expect(report).toBeVisible();
    for (const column of ["Employee", "Lifecycle", "Owner", "Dates", "Attention", "Documents", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Lifecycle records", "High risk", "Owner gaps", "Document blockers"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search employee, owner, workflow, notes");
    await search.fill("no-such-lifecycle-queue-row");
    await expect(report.getByText("No lifecycle queue rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Lifecycle type", "Status", "Owner", "Lifecycle attention", "Document attention"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No lifecycle queue rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["employee", "type", "status", "owner", "due_date", "attention"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No lifecycle queue rows/).first()).toBeVisible();
    }

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/lifecycle-queue\?.*sort=attention/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("lifecycle-queue");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    expect(filteredExportResponse.headers()["x-hrms-source-row-count"]).toMatch(/^\d+$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("employee_code");
    expect(filteredExportBody).toContain("workflow_reference");
    expect(filteredExportBody).toContain("lifecycle_risk");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("lifecycle-queue");
    const manifest = await manifestResponse.json();
    expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
    expect(manifest.source_endpoints).toContain("/hr-admin/lifecycle-queue/");
    expect(manifest.evidence_columns).toContain("employee_code");
    expect(manifest.evidence_columns).toContain("workflow_reference");
    expect(manifest.evidence_columns).toContain("lifecycle_risk");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=lifecycle-queue");
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
      await expect(report.getByText("No lifecycle queue rows match the selected filters.")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("employee cannot access lifecycle queue report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/lifecycle-queue", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("lifecycle-queue-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const csvResponse = await page.request.get("/api/hr-admin/reports/lifecycle-queue?sort=attention");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/lifecycle-queue?sort=attention&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
