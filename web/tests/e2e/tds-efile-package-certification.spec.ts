import { createHash } from "crypto";
import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase R4-B TDS e-file package certification", () => {
  test("HR admin can download a guarded Form 24Q package when mapped TDS evidence exists", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory", hrAdmin);
    await expectPageReady(page, "Payroll Statutory");

    const tdsReport = page.getByTestId("tds-compliance-report");
    await expect(tdsReport).toBeVisible();
    await expect(page.getByRole("link", { name: "Download TDS e-file package" })).toHaveAttribute("href", "/api/hr-admin/reports/tds-efile-package");

    const response = await page.request.get("/api/hr-admin/reports/tds-efile-package");
    if (response.status() === 400) {
      const payload = await response.json();
      expect(payload.detail).toBe("TDS e-file package is not ready.");
      expect(payload.blocking_reasons.length).toBeGreaterThan(0);
      return;
    }

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["x-hrms-report-key"]).toBe("tds-efile-package");
    expect(Number(response.headers()["x-hrms-source-row-count"])).toBeGreaterThan(0);
    const body = await response.text();
    const checksum = response.headers()["x-hrms-package-checksum"];
    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(createHash("sha256").update(body).digest("hex")).toBe(checksum);
    expect(body).toContain("form_24q_deductee");
    expect(body).toContain("filing_authority_ref");
    expect(body).toContain("provider_ref");
    expect(body).toContain("source_hash");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot download the HR admin TDS e-file package", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    const response = await page.request.get("/api/hr-admin/reports/tds-efile-package");
    expect([401, 403]).toContain(response.status());
    const payload = await response.json().catch(() => ({}));
    const serialized = JSON.stringify(payload).toLowerCase();
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("password");
    expect(serialized).not.toContain("secret");
  });
});
