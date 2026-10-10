import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase 7D roster rollout audit report certification", () => {
  test("HR admin can certify roster rollout filters, export evidence, manifest, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/roster-rollout-audit", hrAdmin);
    await expectPageReady(page, "Roster Rollout Audit Report");

    const report = page.getByTestId("roster-rollout-audit-report");
    await expect(report).toBeVisible();
    for (const column of ["Template", "Pattern", "Rollout window", "Scope", "Result", "Risk", "Actions"]) {
      await expect(report.getByRole("columnheader", { name: column })).toBeVisible();
    }

    for (const metric of ["Rollouts", "Created assignments", "Skipped rows", "Medium/high risk"]) {
      await expect(report.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    const search = report.getByPlaceholder("Search template, pattern, scope, summary");
    await search.fill("no-such-roster-rollout");
    await expect(report.getByText("No roster rollout audit rows match the selected filters.")).toBeVisible();
    await search.fill("");

    for (const label of ["Rollout status", "Assignment kind", "Template status", "Primary state", "Risk"]) {
      const control = report.getByLabel(label);
      const optionCount = await control.locator("option").count();
      if (optionCount > 1) {
        await control.selectOption({ index: 1 });
        await expect(report.getByText(/Showing|No roster rollout audit rows/).first()).toBeVisible();
        await control.selectOption("All");
      }
    }

    for (const sort of ["created", "risk", "template", "window", "completion"]) {
      await report.getByLabel("Sort").selectOption(sort);
      await expect(report.getByText(/Showing|No roster rollout audit rows/).first()).toBeVisible();
    }
    await report.getByLabel("Sort").selectOption("created");

    const filteredExportLink = report.getByRole("link", { name: "Export filtered CSV" });
    await expect(filteredExportLink).toHaveAttribute("href", /\/api\/hr-admin\/reports\/roster-rollout-audit\?.*sort=created/);
    const filteredExportHref = await filteredExportLink.getAttribute("href");
    expect(filteredExportHref).toBeTruthy();
    const filteredExportResponse = await page.request.get(filteredExportHref ?? "");
    expect(filteredExportResponse.status()).toBe(200);
    expect(filteredExportResponse.headers()["content-type"]).toContain("text/csv");
    expect(filteredExportResponse.headers()["x-hrms-report-key"]).toBe("roster-rollout-audit");
    expect(filteredExportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const filteredExportBody = await filteredExportResponse.text();
    expect(filteredExportBody).toContain("rollout_id");
    expect(filteredExportBody).toContain("pattern_type");
    expect(filteredExportBody).toContain("completion_rate");
    expect(filteredExportBody).toContain("rollout_risk");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifestResponse = await page.request.get(manifestHref ?? "");
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.source_endpoints).toContain("/hr-admin/shift-roster-rollouts/");
    expect(manifest.source_endpoints).toContain("/hr-admin/shift-roster-templates/");
    expect(manifest.evidence_columns).toContain("rollout_id");
    expect(manifest.evidence_columns).toContain("pattern_type");
    expect(manifest.evidence_columns).toContain("rollout_risk");

    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access roster rollout audit report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");

    await page.goto("/hr-admin/reports/roster-rollout-audit", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("roster-rollout-audit-report")).toHaveCount(0);

    const csvResponse = await page.request.get("/api/hr-admin/reports/roster-rollout-audit?sort=created");
    expect([401, 403]).toContain(csvResponse.status());
    const manifestResponse = await page.request.get("/api/hr-admin/reports/roster-rollout-audit?sort=created&format=manifest");
    expect([401, 403]).toContain(manifestResponse.status());
  });
});
