import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  documentNavigationCount,
  expectLocalUpdateShell,
  expectNoDocumentNavigation,
  markLocalUpdateShell,
} from "../helpers/local-update-contract";

async function open(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  return { shell: await markLocalUpdateShell(page), navigationCount: await documentNavigationCount(page) };
}

test("leave balance apply, clear, and browser history remain local", async ({ page }) => {
  const { shell, navigationCount } = await open(page, "/hr-admin/reports/leave-balance");
  const form = page.getByRole("form", { name: "Leave balance filters" });
  const search = form.getByPlaceholder("Search employee, policy, leave type");
  await search.fill("phase-seven-no-match");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=phase-seven-no-match/);
  await expect(page.getByText("No leave balance rows match the selected filters.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Export filtered CSV" })).toHaveAttribute("href", /q=phase-seven-no-match/);
  await form.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).not.toHaveURL(/q=/);
  await page.goBack();
  await expect(search).toHaveValue("phase-seven-no-match");
  await page.goForward();
  await expect(search).toHaveValue("");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("leave balance combined filters scope exports and reset pagination", async ({ page }) => {
  const { shell, navigationCount } = await open(page, "/hr-admin/reports/leave-balance?page=2");
  await expect(page).not.toHaveURL(/page=2/);
  const form = page.getByRole("form", { name: "Leave balance filters" });
  await form.getByLabel("Balance state").selectOption("Reserved");
  await form.getByLabel("Sort").selectOption("employee");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/liability_state=Reserved/);
  await expect(page).toHaveURL(/sort=employee/);
  await expect(page).not.toHaveURL(/page=2/);
  const href = await page.getByRole("link", { name: "Export filtered CSV" }).getAttribute("href");
  expect(href).toContain("liability_state=Reserved");
  expect(href).toContain("sort=employee");
  expect(href).not.toContain("page=");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("payroll register committed filters drive rows, history, and exports", async ({ page }) => {
  const { shell, navigationCount } = await open(page, "/hr-admin/reports/payroll-register");
  const form = page.getByRole("form", { name: "Payroll register filters" });
  const search = form.getByPlaceholder("Search run, file, profile, hash");
  await search.fill("phase-seven-no-match");
  await form.getByLabel("Sort").selectOption("net_pay_desc");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=phase-seven-no-match/);
  await expect(page).toHaveURL(/sort=net_pay_desc/);
  await expect(page.getByText("No payroll register rows match the selected filters.")).toBeVisible();
  const href = await page.getByRole("link", { name: "Export filtered CSV" }).getAttribute("href");
  expect(href).toContain("q=phase-seven-no-match");
  expect(href).toContain("sort=net_pay_desc");
  await form.getByRole("button", { name: "Clear filters" }).click();
  await page.goBack();
  await expect(search).toHaveValue("phase-seven-no-match");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("instant attendance filters update only their report region", async ({ page }) => {
  const { shell, navigationCount } = await open(page, "/hr-admin/reports/attendance-register");
  const search = page.getByPlaceholder("Search employee, department, status, notes");
  await search.fill("phase-seven-attendance");
  await expect(page).toHaveURL(/q=phase-seven-attendance/);
  await expect(page.getByRole("link", { name: "Export filtered CSV" })).toHaveAttribute("href", /q=phase-seven-attendance/);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toHaveValue("");
  await expect(page).not.toHaveURL(/q=/);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("report family search, group, status, and clear are URL-backed", async ({ page }) => {
  const { shell, navigationCount } = await open(page, "/hr-admin/reports/payroll");
  const search = page.getByPlaceholder("Search reports, filters, evidence...");
  await search.fill("register");
  await expect(page).toHaveURL(/q=register/);
  await page.getByLabel("Readiness").selectOption({ index: 1 });
  await expect(page).toHaveURL(/status=/);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(search).toHaveValue("");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("failed report export retains filter context and shell", async ({ page }) => {
  const { shell, navigationCount } = await open(page, "/hr-admin/reports/leave-balance?q=retained-filter");
  await page.route("**/api/hr-admin/reports/leave-balance?**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ detail: "Report export is temporarily unavailable." }),
  }));
  await page.getByRole("link", { name: "Export filtered CSV" }).click();
  await expect(page.locator(".async-download-control__error")).toContainText("temporarily unavailable");
  await expect(page.getByPlaceholder("Search employee, policy, leave type")).toHaveValue("retained-filter");
  await expect(page).toHaveURL(/q=retained-filter/);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("report routes load without document-submit filter forms", async ({ page }) => {
  test.setTimeout(5 * 60_000);
  for (const route of [
    "/hr-admin/reports",
    "/hr-admin/reports/attendance",
    "/hr-admin/reports/hr-core",
    "/hr-admin/reports/payroll",
    "/hr-admin/reports/compliance",
    "/hr-admin/reports/attendance-derivation-exceptions",
    "/hr-admin/reports/attendance-register",
    "/hr-admin/reports/attendance-exceptions",
    "/hr-admin/reports/bank-advice",
    "/hr-admin/reports/challan-reconciliation",
    "/hr-admin/reports/compliance-summary",
    "/hr-admin/reports/esic-contribution-readiness",
    "/hr-admin/reports/finance-handoff-exceptions",
    "/hr-admin/reports/leave-attendance-collisions",
    "/hr-admin/reports/leave-balance",
    "/hr-admin/reports/lifecycle-aging",
    "/hr-admin/reports/lifecycle-queue",
    "/hr-admin/reports/lwf-readiness",
    "/hr-admin/reports/workforce",
    "/hr-admin/reports/payroll-adjustments",
    "/hr-admin/reports/payroll-input-exceptions",
    "/hr-admin/reports/payroll-register",
    "/hr-admin/reports/payroll-close-readiness",
    "/hr-admin/reports/payroll-review-exceptions",
    "/hr-admin/reports/payroll-settlements",
    "/hr-admin/reports/payslip-publication",
    "/hr-admin/reports/pf-ecr-readiness",
    "/hr-admin/reports/professional-tax-readiness",
    "/hr-admin/reports/provider-filing-receipts",
    "/hr-admin/reports/roster-rollout-audit",
    "/hr-admin/reports/salary-variance",
    "/hr-admin/reports/statutory-deductions",
    "/hr-admin/reports/statutory-filing-status",
    "/hr-admin/reports/tds-efile-readiness",
    "/hr-admin/reports/document-compliance",
    "/hr-admin/reports/export-audits",
  ]) {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status(), route).toBe(200);
    await expect(page.locator("main h1"), route).toHaveCount(1);
    await expect(page.locator('form[method="get"][data-navigation-mode="document"]'), route).toHaveCount(0);
    await expect(page.locator('form[method="post"]'), route).toHaveCount(0);
  }
});

test("report and mutation sources exclude legacy refresh paths", async () => {
  const sourceRoot = resolve(process.cwd(), "src");
  const sources = [
    "app/hr-admin/reports/leave-balance/leave-balance-report-workspace.tsx",
    "app/hr-admin/reports/payroll-register/payroll-register-report-workspace.tsx",
    "app/hr-admin/leave-types/leave-type-actions.tsx",
    "app/hr-admin/leave-policy-assignments/leave-policy-assignment-actions.tsx",
  ].map((file) => readFileSync(resolve(sourceRoot, file), "utf8")).join("\n");
  expect(sources).not.toContain("router.refresh(");
  expect(sources).not.toContain("window.location.reload(");
  expect(sources).not.toContain("useRefreshAfterMutation");
});
