import { expect, test } from "@playwright/test";

import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, type IsolatedQaWorkspace, workspacePersona } from "../helpers/isolated-qa-workspace";

let fixture: IsolatedQaWorkspace;
test.beforeAll(async ({}, info) => { fixture = await provisionIsolatedQaWorkspace(info); });
test.afterAll(async () => cleanupIsolatedQaWorkspace(fixture));
test.beforeEach(async ({ page }) => {
  const persona = workspacePersona(fixture, "hr_admin");
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
  await page.setViewportSize({ width: 320, height: 640 });
});

const reports = [
  ["payroll", "Payroll Reports"],
  ["payroll-register", "Payroll Register Report"],
  ["payroll-adjustments", "Payroll Adjustments Report"],
  ["payroll-close-readiness", "Payroll Close Readiness Report"],
  ["payroll-input-exceptions", "Payroll Input Exceptions Report"],
  ["payroll-review-exceptions", "Payroll Review Exceptions Report"],
  ["payroll-settlements", "Payroll Settlements Report"],
  ["salary-variance", "Salary Variance Report"],
  ["bank-advice", "Bank Advice Report"],
  ["payslip-publication", "Payslip Publication Report"],
  ["finance-handoff-exceptions", "Finance Handoff Exceptions Report"],
  ["provider-filing-receipts", "Provider Filing Receipts"],
  ["compliance-summary", "Compliance Summary"],
  ["challan-reconciliation", "Challan Reconciliation"],
  ["pf-ecr-readiness", "PF ECR Readiness"],
  ["esic-contribution-readiness", "ESIC Contribution Readiness"],
  ["professional-tax-readiness", "Professional Tax Readiness"],
  ["lwf-readiness", "LWF Readiness"],
  ["tds-efile-readiness", "TDS E-file Readiness"],
  ["statutory-deductions", "Statutory Deduction Summary"],
  ["statutory-filing-status", "Statutory Filing Status"],
] as const;

for (const [slug, heading] of reports) {
  test(`${heading} follows the Phase 6 narrow-screen shell contract`, async ({ page }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/hr-admin/reports/${slug}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const actionableErrors = errors.filter((message) => (
      !message.includes("due to access control checks") &&
      !(info.project.name === "webkit" && message === "Load failed")
    ));
    expect(actionableErrors).toEqual([]);
  });
}
