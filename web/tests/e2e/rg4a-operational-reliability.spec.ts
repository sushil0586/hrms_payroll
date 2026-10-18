import { expect, test, type Route } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function browserFetch(page: import("@playwright/test").Page, url: string) {
  return page.evaluate(async (requestUrl) => {
    const response = await fetch(requestUrl, { credentials: "same-origin" });
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    };
  }, url);
}

async function fulfillCsv(route: Route, delayMs: number, body: string) {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  if (route.request().isNavigationRequest()) return;
  await route.fulfill({
    status: 200,
    body,
    contentType: "text/csv",
    headers: { "content-disposition": 'attachment; filename="report.csv"' },
  }).catch(() => undefined);
}

test.describe("RG-4A operational reliability", () => {
  test.describe.configure({ mode: "serial" });

  test("report export cancels a stale filtered request and downloads only the latest result", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    const requests: string[] = [];
    let downloadCount = 0;
    page.on("download", () => { downloadCount += 1; });

    try {
      await gotoAuthenticated(page, "/hr-admin/reports/leave-balance", workspacePersona(workspace, "hr_admin"));
      await page.route("**/api/hr-admin/reports/leave-balance?**", async (route) => {
        const url = new URL(route.request().url());
        requests.push(url.search);
        if (url.searchParams.get("q") === "LATEST") {
          return fulfillCsv(route, 750, "employee_code,balance\nLATEST,10\n");
        }
        return fulfillCsv(route, 2_000, "employee_code,balance\nSTALE,99\n");
      });

      const exportLink = page.getByRole("link", { name: "Export filtered CSV" });
      await exportLink.click();
      await expect(page.getByRole("link", { name: "Preparing download" })).toBeVisible({ timeout: 500 });

      await page.getByRole("searchbox", { name: "Search leave" }).fill("LATEST");
      await expect(exportLink).toHaveAttribute("href", /q=LATEST/);
      await expect(exportLink).toHaveAccessibleName("Export filtered CSV");

      const downloadEvent = page.waitForEvent("download");
      await exportLink.click();
      const download = await downloadEvent;
      expect(await download.createReadStream()).not.toBeNull();
      await page.waitForTimeout(2_100);

      expect(downloadCount).toBe(1);
      expect(requests.some((query) => !query.includes("q=LATEST"))).toBeTruthy();
      expect(requests.some((query) => query.includes("q=LATEST"))).toBeTruthy();
      await expect(exportLink).not.toHaveAttribute("aria-busy", "true");
      await expect(page.getByRole("alert").filter({ hasText: /\S/ })).toHaveCount(0);

      await testInfo.attach("async-download-race.json", {
        body: Buffer.from(JSON.stringify({ requests, downloadCount, staleDelayMs: 2_000, latestDelayMs: 750 }, null, 2)),
        contentType: "application/json",
      });
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });

  test("workforce CSV, manifest, and export audit reconcile inside one tenant", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await gotoAuthenticated(page, "/hr-admin/reports/workforce", workspacePersona(workspace, "hr_admin"));

      const csvResponse = await browserFetch(page, "/api/hr-admin/reports/workforce?sort=name");
      expect(csvResponse.status).toBe(200);
      expect(csvResponse.headers["x-hrms-report-key"]).toBe("workforce");
      const checksum = csvResponse.headers["x-hrms-report-checksum"];
      const sourceRowCount = Number(csvResponse.headers["x-hrms-source-row-count"]);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
      const csv = csvResponse.body;
      expect(csv).toContain("employee_code");
      expect(csv.trim().split("\n").length - 1).toBe(sourceRowCount);

      const manifestResponse = await browserFetch(page, "/api/hr-admin/reports/workforce?sort=name&format=manifest");
      expect(manifestResponse.status).toBe(200);
      const manifest = JSON.parse(manifestResponse.body);
      expect(manifest.row_count).toBe(sourceRowCount);
      expect(manifest.csv_checksum_sha256).toBe(checksum);
      expect(manifest.filters.sort).toBe("name");

      const auditResponse = await browserFetch(page, "/api/hr-admin/reports/export-audits?report_key=workforce");
      expect(auditResponse.status).toBe(200);
      const audit = JSON.parse(auditResponse.body);
      expect(audit.items.some((item: { export_type: string; row_count: number; checksum_sha256: string }) =>
        item.export_type === "csv" && item.row_count === sourceRowCount && item.checksum_sha256 === checksum)).toBeTruthy();
      expect(audit.items.some((item: { export_type: string; row_count: number; checksum_sha256: string }) =>
        item.export_type === "manifest" && item.row_count === sourceRowCount && item.checksum_sha256 === checksum)).toBeTruthy();

      await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
      const denied = await browserFetch(page, "/api/hr-admin/reports/workforce?sort=name");
      expect([401, 403]).toContain(denied.status);

      await testInfo.attach("workforce-export-reconciliation.json", {
        body: Buffer.from(JSON.stringify({ sourceRowCount, checksum, auditCount: audit.items.length, deniedStatus: denied.status }, null, 2)),
        contentType: "application/json",
      });
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });
});
