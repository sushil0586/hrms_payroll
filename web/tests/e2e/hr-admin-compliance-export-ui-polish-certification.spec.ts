import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("HR Admin compliance and export audit UI polish certification", () => {
  test("compliance hub has clear filters, priority exports, print view, empty state, and mobile layout", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/compliance", hrAdmin);
    await expectPageReady(page, "Compliance Reports");

    const hub = page.getByTestId("compliance-hub-workspace");
    await expect(hub).toBeVisible();
    await expect(hub.getByRole("heading", { name: "Statutory report evidence" })).toBeVisible();
    await expect(hub.getByRole("link", { name: "Export audit history" })).toHaveAttribute("href", "/hr-admin/reports/export-audits");
    await expect(hub.getByRole("button", { name: "Print hub" })).toBeVisible();
    await expect(hub.locator(".report-filter-panel")).toBeVisible();

    await hub.getByLabel("Active group").selectOption("provider");
    await expect(hub.getByText("Provider filing receipts report")).toBeVisible();
    await expect(hub.getByText("Challan reconciliation report")).toHaveCount(0);

    await hub.getByRole("tab", { exact: true, name: "All" }).click();
    await hub.getByPlaceholder("Search statutory, challan, provider, TDS...").fill("tds");
    await expect(hub.getByText("TDS e-file readiness report")).toBeVisible();
    await expect(hub.getByText("Provider filing receipts report")).toHaveCount(0);

    await hub.getByPlaceholder("Search statutory, challan, provider, TDS...").fill("no-such-compliance-report");
    await expect(hub.getByText("No compliance reports match the selected filters.")).toBeVisible();
    await hub.getByRole("button", { name: "Clear filters" }).click();
    await expect(hub.getByText("Provider filing receipts report")).toBeVisible();
    await expect(hub.getByText("Statutory deduction summary")).toBeVisible();

    await expect(hub.getByRole("link", { name: "Export blocked items" })).toHaveAttribute("href", /provider-filing-receipts.*delivery_status/);
    await expect(hub.getByRole("link", { name: "Blocked manifest" })).toHaveAttribute("href", /provider-filing-receipts.*format=manifest/);
    await expect(hub.getByRole("link", { name: "Export overdue filings" })).toHaveAttribute("href", /statutory-filing-status.*due_status/);
    await expect(hub.getByRole("link", { name: "Overdue manifest" })).toHaveAttribute("href", /statutory-filing-status.*format=manifest/);

    await page.emulateMedia({ media: "print" });
    await expect(hub.locator(".report-filter-panel")).toBeHidden();
    await expect(hub.getByRole("button", { name: "Print hub" })).toBeHidden();
    await expect(hub.getByRole("link", { name: "Export blocked items" })).toBeHidden();
    await page.emulateMedia({ media: "screen" });

    await page.setViewportSize({ width: 390, height: 820 });
    await expect(hub.locator(".report-command-panel")).toBeVisible();
    await expect(hub.locator(".report-filter-panel")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("export audit history has stable filters, reset, print view, mobile layout, and retry recovery", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/reports/compliance", hrAdmin);
    await expectPageReady(page, "Compliance Reports");

    for (const path of [
      "/api/hr-admin/reports/provider-filing-receipts?sort=status",
      "/api/hr-admin/reports/provider-filing-receipts?sort=status&format=manifest",
      "/api/hr-admin/reports/statutory-filing-status?sort=due_status",
    ]) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
      expect(response.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    }

    await page.goto("/hr-admin/reports/export-audits", { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Export Audit History");

    const workspace = page.getByTestId("report-export-audit-workspace");
    await expect(workspace.getByRole("heading", { name: "Report download audit trail" })).toBeVisible();
    await expect(workspace.getByRole("button", { name: "Refresh history" })).toBeVisible();
    await expect(workspace.getByRole("button", { name: "Print audit" })).toBeVisible();
    await expect(workspace.locator(".report-filter-panel")).toBeVisible();
    await expect(workspace.getByText(/Showing/)).toBeVisible();

    await workspace.getByLabel("Export type").selectOption("manifest");
    await expect(workspace.getByText("Manifest").first()).toBeVisible();

    const searchInput = workspace.getByPlaceholder("Search report, checksum, filters, request");
    await searchInput.fill("");
    await searchInput.pressSequentially("provider");
    await expect(searchInput).toHaveValue("provider");
    await workspace.getByRole("button", { name: "Clear filters" }).click();
    await expect(searchInput).toHaveValue("");
    await expect(workspace.getByLabel("Export type")).toHaveValue("All");

    await page.route("**/api/hr-admin/reports/export-audits**", async (route) => {
      await route.fulfill({ contentType: "application/json", status: 200, body: JSON.stringify({ count: 0, items: [] }) });
    });
    await workspace.getByRole("button", { name: "Refresh history" }).click();
    await expect(workspace.getByText("No export audit records match the selected filters.")).toBeVisible();
    await page.unroute("**/api/hr-admin/reports/export-audits**");
    await workspace.getByRole("button", { name: "Refresh history" }).click();
    await expect(workspace.getByText(/Showing/)).toBeVisible();

    await page.emulateMedia({ media: "print" });
    await expect(workspace.locator(".report-filter-panel")).toBeHidden();
    await expect(workspace.getByRole("button", { name: "Print audit" })).toBeHidden();
    await page.emulateMedia({ media: "screen" });

    await page.setViewportSize({ width: 390, height: 820 });
    await expect(workspace.locator(".report-command-panel")).toBeVisible();
    await expect(workspace.locator(".report-filter-panel")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.route("**/api/hr-admin/reports/export-audits**", async (route) => {
      await route.fulfill({ contentType: "application/json", status: 503, body: JSON.stringify({ detail: "Audit history unavailable" }) });
    });
    await page.goto("/hr-admin/reports/export-audits", { waitUntil: "domcontentloaded" });
    const failedWorkspace = page.getByTestId("report-export-audit-workspace");
    await expect(failedWorkspace.getByText("Blocked status")).toBeVisible();
    await expect(failedWorkspace.getByRole("button", { name: "Retry loading" })).toBeVisible();

    await page.unroute("**/api/hr-admin/reports/export-audits**");
    await failedWorkspace.getByRole("button", { name: "Retry loading" }).click();
    await expect(failedWorkspace.getByText("Ready status")).toBeVisible();
    await expect(failedWorkspace.getByText(/Showing/)).toBeVisible();
  });
});
