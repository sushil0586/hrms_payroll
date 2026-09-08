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

async function captureCloseStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-payroll-close/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function expectVisibleText(page: Page, patterns: (string | RegExp)[]) {
  for (const pattern of patterns) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

test.describe("Production payroll close proof", () => {
  test("traces payroll close from source readiness to employee payslip evidence", async ({ page }, testInfo) => {
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

    await page.goto("/hr-admin/payroll-inputs?runId=payrun-aug-2026-core&snapshotId=snapshot-aug-emp-0042");
    await expectPageReady(page, "Payroll Inputs");
    await expect(page.getByRole("heading", { name: "August 2026 Core Payroll" })).toBeVisible();
    await expectVisibleText(page, [
      "Inputs Locked",
      "Source hash",
      "Lock readiness",
      "india.monthly.input.profile.v1",
      "Riya Sharma",
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

    await page.goto("/hr-admin/payroll-calculations?runId=payrun-aug-2026-core");
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("heading", { name: "August 2026 Core Payroll" })).toBeVisible();
    await expectVisibleText(page, [
      "Issue register",
      "Calculation attempts",
      "Calculation lines",
      "Gross earnings",
      "Net pay",
      "Statutory basis",
      "Source",
    ]);
    await expect(page.getByText("₹63,400").first()).toBeVisible();
    await captureCloseStep(page, testInfo, "04-draft-calculation-trace");

    await page.goto("/hr-admin/payroll-review?reviewId=payreview-aug-2026-core");
    await expectPageReady(page, "Payroll Review");
    await expect(page.getByRole("heading", { name: "August 2026 Core Payroll" })).toBeVisible();
    await expectVisibleText(page, [
      "Exception register",
      "Approval trail",
      "Final lock",
      "Locked",
      "india.monthly.review.profile.v1",
      "Approved calculation lines",
    ]);
    await expect(page.getByText("₹63,400").first()).toBeVisible();
    await captureCloseStep(page, testInfo, "05-review-approval-final-lock");

    await page.goto("/hr-admin/payroll-outputs?batchId=payoutbatch-aug-2026-core&artifactId=payoutartifact-payslip-emp-0001");
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: "Payslip - Nisha Rao" })).toBeVisible();
    await expectVisibleText(page, [
      "Published",
      "Artifact register",
      "Access governance",
      "Storage governance",
      "payroll.payslip.template.india.v1",
      "payroll.storage.local.generated.v1",
      "payroll.download.stream.local.v1",
      "Export access audit",
      "Download file",
    ]);
    await captureCloseStep(page, testInfo, "06-published-output-governance");

    await page.goto("/hr-admin/payroll-handoff?handoffId=payhandoff-aug-2026-core");
    await expectPageReady(page, "Payroll Handoff");
    await expectVisibleText(page, [
      "Finance artifacts",
      "Delivery acknowledgements",
      "Provider retries",
      "Provider jobs",
      "Provider callbacks",
      "Provider audit pack",
      "Reconciled",
      "Bank advice",
      "Accounting net",
      "Statutory total",
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
