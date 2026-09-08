import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

type Persona = {
  username: string;
  password: string;
};

const hrAdmin: Persona = {
  username: "nisha.rao",
  password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
};

const employee: Persona = {
  username: "riya.sharma",
  password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
};

async function loginIfRequired(page: Page, persona: Persona, targetPath: string) {
  await page.goto(targetPath);
  if (!page.url().includes("/login")) {
    return;
  }

  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/ess$/, { timeout: 15_000 });
  await page.goto(targetPath);
}

async function captureStorageStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-storage-governance/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function expectVisibleText(page: Page, patterns: (string | RegExp)[]) {
  for (const pattern of patterns) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
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
    await loginIfRequired(
      page,
      hrAdmin,
      "/hr-admin/payroll-outputs?batchId=payoutbatch-aug-2026-core&artifactId=payoutartifact-payslip-emp-0001",
    );
    await expectPageReady(page, "Payroll Outputs");

    await expect(page.getByRole("heading", { name: "Payslip - Nisha Rao" })).toBeVisible();
    await expectVisibleText(page, [
      "Storage governance",
      "payroll.storage.local.generated.v1",
      "local-payslip-1-v1",
      "payroll.download.stream.local.v1",
      "payroll.retention.7y.v1",
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
      "payroll.payslip.template.india.v1",
      "employee.portal.publish.v1",
    ]);

    const download = page.getByRole("link", { name: "Download file" }).first();
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute("href", /\/api\/v1\/hr-admin\/payroll-output-artifacts\/payoutartifact-payslip-emp-0001\/download\//);

    const auditExport = page.getByRole("link", { name: "Export access audit" });
    await expect(auditExport).toBeVisible();
    await expect(auditExport).toHaveAttribute("href", /\/api\/v1\/hr-admin\/payroll-output-artifacts\/payoutartifact-payslip-emp-0001\/access-audit-export\//);

    await expectNoRawSecretLeak(page);
    await expectNoHorizontalOverflow(page);
    await captureStorageStep(page, testInfo, "01-hr-output-storage-governance");
  });

  test("employee payslip surface stays published-only and employee-scoped with storage evidence", async ({ page }, testInfo) => {
    await loginIfRequired(page, employee, "/ess/payslips?payslipId=payoutartifact-payslip-emp-0042");
    await expectPageReady(page, "Payslips");

    await expect(page.getByRole("heading", { name: "Payslip - Riya Sharma" })).toBeVisible();
    await expectVisibleText(page, [
      "Published only",
      "Employee scoped",
      "Storage governed",
      "Download payslip",
      "Access trail",
      "Read receipt",
      "Payment summary",
      "Storage governance",
      "payroll.storage.local.generated.v1",
      "local-payslip-emp-0042-v1",
      "payroll.download.stream.local.v1",
      "payroll.retention.7y.v1",
      "Checksum",
      "Recent access events",
      "Published",
      "Notified",
      "Calculation lines",
    ]);

    const download = page.getByRole("link", { name: "Download payslip" });
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/payoutartifact-payslip-emp-0042\/download/);

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
      "payroll.storage.policy.strict-runtime.v1",
      "payroll.storage.policy.disabled.v1",
      "Required by provider package",
      "Runtime credentials, Private endpoint, KMS",
      "Lifecycle, Scan, Durability",
      "5 verified / 0 blocked",
      "0 verified / 1 blocked",
      "storage_policy_disabled, raw_storage_credentials_not_allowed",
    ]);

    await expectNoRawSecretLeak(page);
    await expectNoHorizontalOverflow(page);
    await captureStorageStep(page, testInfo, "03-storage-policy-readiness");
  });
});
