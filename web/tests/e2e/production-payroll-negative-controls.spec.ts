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
  await expect(page).toHaveURL(/\/ess$/);
  await page.goto(targetPath);
}

async function captureNegativeStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-payroll-negative-controls/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function expectVisibleText(page: Page, patterns: (string | RegExp)[]) {
  for (const pattern of patterns) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

test.describe("Production payroll negative controls", () => {
  test("source-data blockers and blocked input snapshots stay visible before payroll close", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-readiness?status=blocked&q=Aman");
    await expectPageReady(page, "Payroll Readiness");
    await expect(page.getByRole("heading", { name: "Payroll source review" })).toBeVisible();
    await expectVisibleText(page, [
      "Aman Verma",
      "Blocked",
      "Missing cost center.",
      "Missing primary bank account.",
    ]);
    await expect(page.getByRole("link", { name: /Aman Verma/ })).toBeVisible();
    await captureNegativeStep(page, testInfo, "01-readiness-blocked-source-data");

    await page.goto("/hr-admin/payroll-inputs?runId=payrun-sep-2026-core&snapshotId=snapshot-emp-0043");
    await expectPageReady(page, "Payroll Inputs");
    await expect(page.getByRole("heading", { name: "September 2026 Core Payroll" })).toBeVisible();
    await expectVisibleText(page, [
      "Collecting Inputs",
      "Aman Verma",
      "Blocked",
      "Missing primary bank account",
      "Cost center is not mapped",
      "Must clear before lock",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureNegativeStep(page, testInfo, "02-blocked-input-snapshot");
  });

  test("pre-calculation validation exposes unsafe close posture", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-calculations?runId=payrun-sep-2026-core");
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("heading", { name: "September 2026 Core Payroll" })).toBeVisible();
    await expectVisibleText(page, [
      "Collecting Inputs",
      "1 blocked",
      "Issue register",
      "No open calculation validation issues for this payroll run.",
    ]);

    await page.goto("/hr-admin/payroll-calculations?runId=payrun-aug-2026-core");
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("heading", { name: "August 2026 Core Payroll" })).toBeVisible();
    await expectVisibleText(page, [
      "Calculated",
      "Issue register",
      "2 open checks",
      "Snapshot has source-data warnings",
      "Required statutory profile needs review",
      "Source Data: 1",
      "Statutory Setup: 1",
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
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-outputs?batchId=payoutbatch-aug-2026-core&artifactId=payoutartifact-payslip-emp-0001");
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("heading", { name: "Payslip - Nisha Rao" })).toBeVisible();
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
