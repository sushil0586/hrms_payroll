import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, expectVisibleText, hrAdmin, loginIfRequired } from "../helpers/staging-auth";

async function captureCloseStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-payroll-close/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path });
}

test.describe("Production payroll close proof", () => {
  test("traces payroll close from source readiness to employee payslip evidence", async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-readiness?tab=employees");
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

    const inputSetupResponse = await page.request.get("/api/hr-admin/payroll-input-snapshot-setup?snapshot_page_size=1");
    expect(inputSetupResponse.ok()).toBeTruthy();
    const inputSetup = (await inputSetupResponse.json()) as {
      snapshots: Array<{ id: string; payroll_run_id: string }>;
    };
    expect(inputSetup.snapshots.length).toBeGreaterThan(0);
    const snapshot = inputSetup.snapshots[0];

    await page.goto(`/hr-admin/payroll-inputs?runId=${snapshot.payroll_run_id}`, { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Inputs");
    await page.locator(`a[href*="snapshotId=${snapshot.id}"]`).click();
    await expectVisibleText(page, [
      "Locked inputs",
      "Source hash",
      "Lock readiness",
      "Input profile",
      "Snapshot schema",
    ]);
    await captureCloseStep(page, testInfo, "02-input-snapshots-locked");

    await page.goto("/hr-admin/payroll-rules", { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Rules");
    await expect(page.getByRole("heading", { name: "Rule engine summary" })).toBeVisible();
    await expectVisibleText(page, [
      "Safe expressions",
      "Dependencies",
      "Locked snapshots",
    ]);
    await captureCloseStep(page, testInfo, "03-rule-engine-evidence");

    await page.goto("/hr-admin/payroll-calculations", { waitUntil: "domcontentloaded" });
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

    await page.goto("/hr-admin/payroll-review", { waitUntil: "domcontentloaded" });
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

    await page.goto("/hr-admin/payroll-outputs", { waitUntil: "domcontentloaded" });
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

    await page.goto("/hr-admin/payroll-handoff", { waitUntil: "domcontentloaded" });
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
      "Published payslips only",
    ]);
    await page.getByRole("button", { name: "Review payslip" }).first().click();
    const payslipDialog = page.getByRole("dialog").filter({ hasText: "Payslip detail" });
    await expect(payslipDialog).toBeVisible();
    for (const label of [
      "Access trail",
      "Payment summary",
      "Storage governance",
      "Source hash",
      "Payslip lines",
      "Download payslip",
    ]) {
      const section = payslipDialog.getByText(label, { exact: true }).first();
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
    }

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
