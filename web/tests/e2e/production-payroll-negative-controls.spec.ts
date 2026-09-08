import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, expectVisibleText, hrAdmin, loginIfRequired } from "../helpers/staging-auth";

async function captureNegativeStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-payroll-negative-controls/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

test.describe("Production payroll negative controls", () => {
  test("source-data blockers and blocked input snapshots stay visible before payroll close", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-readiness");
    await expectPageReady(page, "Payroll Readiness");
    await expect(page.getByRole("heading", { name: "Payroll source review" })).toBeVisible();
    await expectVisibleText(page, [
      "Source data readiness",
      "Employees in scope",
      "Ready",
      "Warnings",
      "Blocked",
      "Readiness table",
    ]);
    await captureNegativeStep(page, testInfo, "01-readiness-blocked-source-data");

    await page.goto("/hr-admin/payroll-inputs");
    await expectPageReady(page, "Payroll Inputs");
    await expectVisibleText(page, [
      "Employee snapshots",
      "Lock readiness",
      "Input profile",
      "Snapshot schema",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureNegativeStep(page, testInfo, "02-blocked-input-snapshot");
  });

  test("pre-calculation validation exposes unsafe close posture", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-calculations");
    await expectPageReady(page, "Payroll Calculations");
    await expectVisibleText(page, [
      "Issue register",
      "Calculation attempts",
      "Calculation lines",
      "Gross earnings",
      "Net pay",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureNegativeStep(page, testInfo, "03-calculation-validation-gates");
  });

  test("published-only and tenant-scoped payslip controls are visible to the employee", async ({ page }, testInfo) => {
    await loginIfRequired(page, employee, "/ess/payslips");
    await expectPageReady(page, "Payslips");
    await expectVisibleText(page, [
      "Published payslips",
      "Published only",
      "Employee scoped",
      "Storage governed",
      "Draft and generated payroll artifacts stay hidden until the output batch is published.",
      "The API resolves files through the signed-in employee context and tenant boundary.",
      "Download payslip",
      "Access trail",
      "Read receipt",
    ]);
    await expect(page.getByRole("button", { name: /Read acknowledged|Mark as read/ }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureNegativeStep(page, testInfo, "04-employee-published-only-boundary");
  });

  test("HR output governance shows download and signed-grant control state", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-outputs");
    await expectPageReady(page, "Payroll Outputs");
    await expectVisibleText(page, [
      "Published",
      "Storage governance",
      "Download",
      "Ready",
      "Signed URL",
      "Streamed",
      "Access governance",
      "Active grants",
      "Revoked grants",
      "Expired grants",
      "Export access audit",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureNegativeStep(page, testInfo, "05-output-access-governance");
  });
});
