import { expect, test } from "@playwright/test";

import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, type IsolatedQaWorkspace, workspacePersona } from "../helpers/isolated-qa-workspace";

let fixture: IsolatedQaWorkspace;
test.beforeAll(async ({}, info) => { fixture = await provisionIsolatedQaWorkspace(info); });
test.afterAll(async () => cleanupIsolatedQaWorkspace(fixture));
test.beforeEach(async ({ page }) => {
  const persona = workspacePersona(fixture, "hr_admin");
  const login = await page.request.post("/api/auth/login", {
    data: { identifier: persona.username, password: persona.password },
  });
  expect(login.status()).toBe(200);
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

test("Payroll Register commits filters to a canonical, restorable URL", async ({ page }) => {
  const route = "/hr-admin/reports/payroll-register";
  await page.goto(`${route}?q=%20existing%20&sort=run_name&page=99&unknown=discard`, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}\\?q=existing&sort=run_name$`));
  const search = page.getByLabel("Search register");
  const sort = page.getByLabel("Sort");
  await expect(search).toHaveValue("existing");
  await expect(sort).toHaveValue("run_name");

  await search.fill("draft only");
  await sort.selectOption("net_pay_desc");
  expect(new URL(page.url()).searchParams.get("q")).toBe("existing");

  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}\\?q=draft\\+only&sort=net_pay_desc$`));

  await search.fill("enter applied");
  await search.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}\\?q=enter\\+applied&sort=net_pay_desc$`));

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(search).toHaveValue("enter applied");
  await expect(sort).toHaveValue("net_pay_desc");

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
  await expect(search).toHaveValue("");
  await expect(sort).toHaveValue("published_at_desc");

  await page.goBack({ waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}\\?q=enter\\+applied&sort=net_pay_desc$`));
  await expect(search).toHaveValue("enter applied");
  await expect(sort).toHaveValue("net_pay_desc");
});

for (const [slug, heading] of reports.filter(([slug]) => slug !== "payroll" && slug !== "payroll-register")) {
  test(`${heading} restores search scope and corrects stale pagination`, async ({ page }) => {
    const route = `/hr-admin/reports/${slug}`;
    await page.goto(`${route}?q=phase6&page=999`, { waitUntil: "domcontentloaded" });

    const search = page.locator('.report-catalog-workspace input[type="search"]').first();
    await expect(search).toHaveValue("phase6");
    await expect.poll(() => new URL(page.url()).searchParams.get("page")).toBeNull();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(search).toHaveValue("phase6");
    expect(new URL(page.url()).searchParams.get("q")).toBe("phase6");

    await page.goto("/hr-admin/reports/payroll", { waitUntil: "domcontentloaded" });
    await page.goBack({ waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}\\?q=phase6$`));
    await expect(search).toHaveValue("phase6");

    await search.fill("");
    await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBeNull();
  });
}
