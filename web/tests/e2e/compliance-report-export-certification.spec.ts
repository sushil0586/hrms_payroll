import { createHash } from "crypto";
import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const exportCases = [
  {
    key: "challan-reconciliation",
    route: "/hr-admin/reports/challan-reconciliation",
    heading: "Challan Reconciliation",
    searchPlaceholder: "Search filing, TAN, provider, artifact, hash",
    query: "",
    queryParam: "sort=",
    expectedHeader: "payment_status",
  },
  {
    key: "statutory-filing-status",
    route: "/hr-admin/reports/statutory-filing-status",
    heading: "Statutory Filing Status",
    searchPlaceholder: "Search filing, TAN, provider, output profile, hash",
    query: "",
    queryParam: "sort=",
    expectedHeader: "published_artifact_count",
  },
  {
    key: "provider-filing-receipts",
    route: "/hr-admin/reports/provider-filing-receipts",
    heading: "Provider Filing Receipts",
    searchPlaceholder: "Search provider, receipt, artifact, checksum, failure",
    query: "",
    queryParam: "sort=",
    expectedHeader: "external_reference",
  },
];

test.describe("Phase R4-F compliance report export certification", () => {
  for (const item of exportCases) {
    test(`HR admin can download audited ${item.key} CSV export`, async ({ page }) => {
      await gotoAuthenticated(page, item.route, hrAdmin);
      await expectPageReady(page, item.heading);

      if (item.query) {
        await page.getByPlaceholder(item.searchPlaceholder).fill(item.query);
      } else {
        await expect(page.getByPlaceholder(item.searchPlaceholder)).toBeVisible();
      }
      const exportLink = page.getByRole("link", { name: "Export filtered CSV" });
      await expect(exportLink).toHaveAttribute("href", new RegExp(`/api/hr-admin/reports/${item.key}\\?.*${item.queryParam}`));

      const response = await page.request.get((await exportLink.getAttribute("href")) ?? `/api/hr-admin/reports/${item.key}`);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/csv");
      expect(response.headers()["content-disposition"]).toContain(`${item.key}.csv`);
      expect(response.headers()["x-hrms-report-key"]).toBe(item.key);
      expect(response.headers()["x-hrms-generated-at"]).toBeTruthy();
      expect(response.headers()["x-hrms-report-filters"]).toContain("sort");
      expect(Number(response.headers()["x-hrms-source-row-count"])).toBeGreaterThanOrEqual(0);

      const body = await response.text();
      const checksum = response.headers()["x-hrms-report-checksum"];
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
      expect(createHash("sha256").update(body).digest("hex")).toBe(checksum);
      expect(body).toContain(item.expectedHeader);
    });
  }

  test("employee cannot download audited HR admin compliance report exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    for (const item of exportCases) {
      const response = await page.request.get(`/api/hr-admin/reports/${item.key}`);
      expect([401, 403]).toContain(response.status());
      const serialized = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
      expect(serialized).not.toContain("token");
      expect(serialized).not.toContain("password");
      expect(serialized).not.toContain("secret");
    }
  });
});
