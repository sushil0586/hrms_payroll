import { createHash } from "crypto";
import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const manifestCases = [
  {
    key: "challan-reconciliation",
    route: "/hr-admin/reports/challan-reconciliation",
    heading: "Challan Reconciliation",
    exportPath: "/api/hr-admin/reports/challan-reconciliation?sort=status",
  },
  {
    key: "statutory-filing-status",
    route: "/hr-admin/reports/statutory-filing-status",
    heading: "Statutory Filing Status",
    exportPath: "/api/hr-admin/reports/statutory-filing-status?sort=artifacts",
  },
  {
    key: "provider-filing-receipts",
    route: "/hr-admin/reports/provider-filing-receipts",
    heading: "Provider Filing Receipts",
    exportPath: "/api/hr-admin/reports/provider-filing-receipts?sort=callbacks",
  },
];

test.describe("Phase R4-J compliance export manifest certification", () => {
  for (const item of manifestCases) {
    test(`HR admin can verify ${item.key} CSV export manifest`, async ({ page }) => {
      await gotoAuthenticated(page, item.route, hrAdmin);
      await expectPageReady(page, item.heading);

      const csvResponse = await page.request.get(item.exportPath);
      expect(csvResponse.status()).toBe(200);
      const csvBody = await csvResponse.text();
      const csvChecksum = createHash("sha256").update(csvBody).digest("hex");
      expect(csvResponse.headers()["x-hrms-report-checksum"]).toBe(csvChecksum);

      const manifestResponse = await page.request.get(`${item.exportPath}&format=manifest`);
      expect(manifestResponse.status()).toBe(200);
      expect(manifestResponse.headers()["content-type"]).toContain("application/json");
      expect(manifestResponse.headers()["x-hrms-report-key"]).toBe(item.key);
      expect(manifestResponse.headers()["x-hrms-report-checksum"]).toBe(csvChecksum);

      const manifest = await manifestResponse.json();
      expect(manifest.report_key).toBe(item.key);
      expect(manifest.export_schema_version).toBe("hrms.report.export.manifest.v1");
      expect(manifest.csv_checksum_sha256).toBe(csvChecksum);
      expect(manifest.row_count).toBe(Number(csvResponse.headers()["x-hrms-source-row-count"]));
      expect(manifest.filters.sort).toBeTruthy();
      expect(manifest.source_endpoints).toContain("/hr-admin/payroll-statutory-setup/");
      expect(manifest.source_endpoints).toContain("/hr-admin/payroll-finance-handoff-setup/");
      expect(Array.isArray(manifest.evidence_columns)).toBe(true);
    });
  }

  test("employee cannot download compliance export manifests", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    for (const item of manifestCases) {
      const response = await page.request.get(`${item.exportPath}&format=manifest`);
      expect([401, 403]).toContain(response.status());
      const serialized = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
      expect(serialized).not.toContain("token");
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("secret");
    }
  });
});
