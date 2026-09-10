import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-H compliance report hub certification", () => {
  test("HR admin can use the compliance report hub cards, metrics, exports, and drilldowns", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports", hrAdmin);
    await expectPageReady(page, "Reports");
    await expect(page.getByRole("link", { name: "Compliance hub" })).toHaveAttribute("href", "/hr-admin/reports/compliance");
    await Promise.all([
      page.waitForURL(/\/hr-admin\/reports\/compliance/),
      page.getByRole("link", { name: "Compliance hub" }).click(),
    ]);

    await expectPageReady(page, "Compliance Reports");
    const hub = page.getByTestId("compliance-report-hub");
    await expect(hub).toBeVisible();
    const workspace = page.getByTestId("compliance-hub-workspace");
    await expect(workspace).toBeVisible();

    for (const metric of ["Filing calendars", "Statutory artifacts", "Provider callbacks", "Provider retries"]) {
      await expect(hub.locator(".metric-tile").filter({ hasText: metric })).toBeVisible();
    }

    for (const report of [
      "Statutory deduction summary",
      "Challan reconciliation report",
      "Statutory filing status report",
      "Provider filing receipts report",
      "TDS e-file readiness report",
    ]) {
      await expect(hub.getByText(report)).toBeVisible();
    }

    const tabCases = [
      { tab: "Deductions", visible: "Statutory deduction summary", hidden: "Provider filing receipts report" },
      { tab: "Filing & Challans", visible: "Challan reconciliation report", hidden: "TDS e-file readiness report" },
      { tab: "Provider Evidence", visible: "Provider filing receipts report", hidden: "Statutory filing status report" },
      { tab: "TDS Package", visible: "TDS e-file readiness report", hidden: "Challan reconciliation report" },
      { tab: "All", visible: "Provider filing receipts report", hidden: "" },
    ];
    for (const item of tabCases) {
      await workspace.getByRole("tab", { exact: true, name: item.tab }).click();
      await expect(workspace.getByRole("tab", { exact: true, name: item.tab })).toHaveAttribute("aria-selected", "true");
      await expect(workspace.getByText(item.visible)).toBeVisible();
      if (item.hidden) {
        await expect(workspace.getByText(item.hidden)).toHaveCount(0);
      }
    }

    for (const hubExport of [
      { name: "Export blocked items", manifestName: "Blocked manifest", key: "provider-filing-receipts", filter: "delivery_status" },
      { name: "Export overdue filings", manifestName: "Overdue manifest", key: "statutory-filing-status", filter: "due_status" },
    ]) {
      const link = workspace.getByRole("link", { name: hubExport.name });
      await expect(link).toHaveAttribute("href", new RegExp(`/api/hr-admin/reports/${hubExport.key}\\?.*${hubExport.filter}`));
      const response = await page.request.get((await link.getAttribute("href")) ?? "");
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/csv");
      expect(response.headers()["x-hrms-report-key"]).toBe(hubExport.key);
      expect(response.headers()["x-hrms-report-filters"]).toContain(hubExport.filter);
      expect(response.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);

      const manifestLink = workspace.getByRole("link", { name: hubExport.manifestName });
      await expect(manifestLink).toHaveAttribute("href", new RegExp(`/api/hr-admin/reports/${hubExport.key}\\?.*${hubExport.filter}.*format=manifest`));
      const manifestResponse = await page.request.get((await manifestLink.getAttribute("href")) ?? "");
      expect(manifestResponse.status()).toBe(200);
      expect(manifestResponse.headers()["content-type"]).toContain("application/json");
      expect(manifestResponse.headers()["x-hrms-report-key"]).toBe(hubExport.key);
      const manifest = await manifestResponse.json();
      expect(manifest.csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(JSON.stringify(manifest.filters)).toContain(hubExport.filter);
    }

    const exportLink = hub.locator(".compliance-hub-card").filter({ hasText: "Provider filing receipts report" }).getByRole("link", { name: "Export" });
    await expect(exportLink).toHaveAttribute("href", "/api/hr-admin/reports/provider-filing-receipts");
    const exportResponse = await page.request.get((await exportLink.getAttribute("href")) ?? "");
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()["content-type"]).toContain("text/csv");
    expect(exportResponse.headers()["x-hrms-report-key"]).toBe("provider-filing-receipts");
    expect(exportResponse.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const manifestLink = hub.locator(".compliance-hub-card").filter({ hasText: "Provider filing receipts report" }).getByRole("link", { name: "Manifest" });
    await expect(manifestLink).toHaveAttribute("href", "/api/hr-admin/reports/provider-filing-receipts?format=manifest");
    const manifestResponse = await page.request.get((await manifestLink.getAttribute("href")) ?? "");
    expect(manifestResponse.status()).toBe(200);
    expect(manifestResponse.headers()["content-type"]).toContain("application/json");
    expect(manifestResponse.headers()["x-hrms-report-key"]).toBe("provider-filing-receipts");

    const openLink = hub.locator(".compliance-hub-card").filter({ hasText: "Challan reconciliation report" }).getByRole("link", { name: "Open" });
    await expect(openLink).toHaveAttribute("href", "/hr-admin/reports/challan-reconciliation");
    await openLink.click();
    await expectPageReady(page, "Challan Reconciliation");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access compliance report hub", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/compliance", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("compliance-report-hub")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();
  });
});
