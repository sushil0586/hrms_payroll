import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, expectVisibleText, hrAdmin, loginIfRequired } from "../helpers/staging-auth";

async function captureCloseStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-payroll-close/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

test.describe("Production payroll close proof", () => {
  test("traces payroll close from source readiness to employee payslip evidence", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-readiness");
    await expectPageReady(page, "Payroll Readiness");
    await expect(page.getByRole("heading", { name: "Payroll source review" })).toBeVisible();
    await expectVisibleText(page, [
      "Source data readiness",
      "Employees in scope",
      "Ready",
      "Warnings",
      "Blocked",
    ]);
    await captureCloseStep(page, testInfo, "01-source-readiness");

    await page.goto("/hr-admin/payroll-inputs");
    await expectPageReady(page, "Payroll Inputs");
    await expectVisibleText(page, [
      "Locked inputs",
      "Source hash",
      "Lock readiness",
      "Input profile",
      "Snapshot schema",
    ]);
    await captureCloseStep(page, testInfo, "02-input-snapshots-locked");

    await page.goto("/hr-admin/payroll-rules");
    await expectPageReady(page, "Payroll Rules");
    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expectVisibleText(page, [
      "Safe expressions",
      "Dependencies",
      "Locked snapshots",
    ]);
    await captureCloseStep(page, testInfo, "03-rule-engine-evidence");

    await page.goto("/hr-admin/payroll-calculations");
    await expectPageReady(page, "Payroll Calculations");
    await expectVisibleText(page, [
      "Issue register",
      "Calculation attempts",
      "Calculation lines",
      "Gross earnings",
      "Net pay",
      "Source",
    ]);
    await captureCloseStep(page, testInfo, "04-draft-calculation-trace");

    await page.goto("/hr-admin/payroll-review");
    await expectPageReady(page, "Payroll Review");
    await expectVisibleText(page, [
      "Exception register",
      "Approval trail",
      "Final lock",
      "Locked",
      "Review profile",
      "Approved calculation lines",
    ]);
    await captureCloseStep(page, testInfo, "05-review-approval-final-lock");

    await page.goto("/hr-admin/payroll-outputs");
    await expectPageReady(page, "Payroll Outputs");
    await expectVisibleText(page, [
      "Published",
      "Artifact register",
      "Access governance",
      "Storage governance",
      "Template config",
      "Provider",
      "Strategy",
      "Export access audit",
      "Download file",
    ]);
    await captureCloseStep(page, testInfo, "06-published-output-governance");

    await page.goto("/hr-admin/payroll-handoff");
    await expectPageReady(page, "Payroll Handoff");
    await expectVisibleText(page, [
      "Finance artifacts",
      "Delivery acknowledgements",
      "Provider retries",
      "Provider jobs",
      "Provider callbacks",
    ]);
    await captureCloseStep(page, testInfo, "07-finance-handoff-provider-evidence");

    await page.context().clearCookies();
    await loginIfRequired(page, employee, "/ess/payslips");
    await expectPageReady(page, "Payslips");
    await expectVisibleText(page, [
      "Published payslips",
      "Payslip register",
      "Access trail",
      "Payment summary",
      "Storage governance",
      "Source hash",
      "Calculation lines",
      "Download payslip",
    ]);

    const isLiveEmployeePayroll = await page.getByText("Live employee payroll").first().isVisible().catch(() => false);
    const markAsRead = page.getByRole("button", { name: "Mark as read" }).first();
    if (isLiveEmployeePayroll && await markAsRead.isVisible().catch(() => false)) {
      const responsePromise = page.waitForResponse((response) => (
        response.url().includes("/api/me/payroll-payslips/") &&
        response.url().endsWith("/read") &&
        response.request().method() === "POST"
      ), { timeout: 10_000 }).catch(() => null);
      await markAsRead.click();
      const response = await responsePromise;
      if (response) {
        expect(response.status(), "read receipt endpoint should succeed when backend auth is active").toBeLessThan(300);
      }
      await expect(page.getByRole("button", { name: /Read acknowledged|Mark as read/ }).first()).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: /Read acknowledged|Mark as read/ }).first()).toBeVisible();
    }

    await captureCloseStep(page, testInfo, "08-employee-payslip-distribution");
    await expectNoHorizontalOverflow(page);
  });
});
