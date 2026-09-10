import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, expectVisibleText, hrAdmin, loginIfRequired } from "../helpers/staging-auth";

async function captureStorageStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-storage-governance/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function expectNoRawSecretLeak(page: Page) {
  const pageText = await page.locator("body").innerText();
  expect(pageText).not.toContain("secret_key");
  expect(pageText).not.toContain("secret_access_key");
  expect(pageText).not.toContain("access_key_id");
  expect(pageText).not.toContain("runtime-secret-key");
  expect(pageText).not.toContain("should-not-be-in-config");
}

test.describe("Production storage governance proof", () => {
  test("HR output artifact exposes storage metadata, access grants, and audit export", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-outputs");
    await expectPageReady(page, "Payroll Outputs");

    await expectVisibleText(page, [
      "Storage governance",
      /payroll\.storage\.[\w.-]+\.v1/,
      /payroll\.download\.[\w.-]+\.v1/,
      /payroll\.retention\.[\w.-]+\.v1/,
      "Download",
      "Ready",
      "Access governance",
      "Signed issued",
      "Active grants",
      "Revoked grants",
      "Expired grants",
      "Downloads",
      "Latest expiry",
      "Source hash",
      "Template config",
    ]);

    const download = page.getByRole("link", { name: "Download file" }).first();
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute("href", /\/api\/hr-admin\/payroll-output-artifacts\/[^/]+\/download/);

    const auditExport = page.getByRole("link", { name: "Export access audit" });
    await expect(auditExport).toBeVisible();
    await expect(auditExport).toHaveAttribute("href", /\/api\/hr-admin\/payroll-output-artifacts\/[^/]+\/access-audit-export/);

    await expectNoRawSecretLeak(page);
    await expectNoHorizontalOverflow(page);
    await captureStorageStep(page, testInfo, "01-hr-output-storage-governance");
  });

  test("employee payslip surface stays published-only and employee-scoped with storage evidence", async ({ page }, testInfo) => {
    await loginIfRequired(page, employee, "/ess/payslips");
    await expectPageReady(page, "Payslips");

    await expectVisibleText(page, [
      "Published only",
      "Employee scoped",
      "Storage governed",
      "Download payslip",
      "Access trail",
      "Read receipt",
      "Payment summary",
      "Storage governance",
      /payroll\.storage\.[\w.-]+\.v1/,
      /payroll\.download\.[\w.-]+\.v1/,
      /payroll\.retention\.[\w.-]+\.v1/,
      "Checksum",
      "Recent access events",
      "Published",
      "Calculation lines",
    ]);

    const download = page.getByRole("link", { name: "Download payslip" });
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/[^/]+\/download/);

    await expectNoRawSecretLeak(page);
    await expectNoHorizontalOverflow(page);
    await captureStorageStep(page, testInfo, "02-employee-payslip-storage-boundary");
  });

  test("provider storage policy registry shows strict controls and raw-secret blockers", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");

    await expect(page.getByRole("heading", { name: "Artifact policy readiness" })).toBeVisible();
    await expectVisibleText(page, [
      "Storage policies",
      "Credential refs",
      "No raw secrets",
      "Storage and IAM",
      "payroll.storage.policy.default.v1",
      "Required by provider package",
      "Local/default",
      "Default retention",
      "verified",
    ]);

    await expectNoRawSecretLeak(page);
    await expectNoHorizontalOverflow(page);
    await captureStorageStep(page, testInfo, "03-storage-policy-readiness");
  });
});
