import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string) {
  return scope
    .locator("label.form-field")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("input, select, textarea")
    .first();
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const value = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await locator.selectOption(value);
}

async function selectOptionContaining(locator: Locator, text: string) {
  const value = await locator.evaluate((element, expectedText) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value && option.textContent?.includes(expectedText))?.value ?? "";
  }, text);
  expect(value, `Expected option containing "${text}"`).not.toBe("");
  await locator.selectOption(value);
}

async function continueEmployeeForm(page: Page, stepHeading: string | RegExp) {
  const targetStep = stepHeading === "Contact and dates"
    ? /2\.Contact/
    : stepHeading === "Structural mapping"
      ? /3\.Structure/
      : stepHeading === "Review"
        ? /4\.Review/
      : stepHeading;
  await page.getByRole("button", { name: targetStep }).click();
  await expect(page.getByRole("heading", { name: stepHeading })).toBeVisible();
}

async function fillEmployeeCodeAfterHydration(page: Page, code: string) {
  const employeeCode = field(page, "Employee code");
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await employeeCode.fill("");
    await employeeCode.fill(code);
    try {
      await expect(page.locator(".form-shell-card__meta")).toContainText(code, { timeout: 3000 });
      return;
    } catch {
      await page.waitForTimeout(750);
    }
  }
  await expect(page.locator(".form-shell-card__meta")).toContainText(code);
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(path) && item.request().method() === method),
    action(),
  ]);
  const payload = (await response.json().catch(() => ({}))) as T;
  expect(response.ok(), `${method} ${path} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload;
}

async function createEmployeeWithoutBank(page: Page) {
  const runRef = Date.now().toString(36).toUpperCase();
  const code = `PW_RDY_WARN_${runRef}`;

  await gotoAuthenticated(page, "/hr-admin/employees/new");
  await expectPageReady(page, "Create employee");
  await fillEmployeeCodeAfterHydration(page, code);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill("Warning");
  await field(page, "Last name").fill("Bankgate");
  await field(page, "Preferred name").fill("Warning Bankgate");
  await continueEmployeeForm(page, "Contact and dates");
  await field(page, "Work email").fill(`pw.warning.bank.${runRef.toLowerCase()}@example.test`);
  await field(page, "Personal email").fill(`pw.warning.bank.personal.${runRef.toLowerCase()}@example.test`);
  await field(page, "Phone number").fill("+91 98765 43125");
  await field(page, "Date of birth").fill("1992-01-01");
  await field(page, "Date of joining").fill("2026-01-01");
  await field(page, "Probation end date").fill("2026-06-30");
  await field(page, "Confirmation date").fill("2026-07-01");
  await continueEmployeeForm(page, "Structural mapping");
  await selectOptionContaining(field(page, "Legal entity"), "Northstar Foods Pvt Ltd");
  await selectOptionContaining(field(page, "Branch"), "Bengaluru HO");
  await selectOptionContaining(field(page, "Business unit"), "Corporate");
  await selectOptionContaining(field(page, "Department"), "Sales");
  await selectOptionContaining(field(page, "Cost center"), "HO People Ops");
  await selectOptionContaining(field(page, "Designation"), "Sales Executive");
  await expect(field(page, "Grade")).not.toHaveValue("");
  await selectFirstNonEmptyOption(field(page, "Employment type"));
  await selectFirstNonEmptyOption(field(page, "Reporting manager"));
  await continueEmployeeForm(page, "Review");

  const employee = await submitAndCapture<{ id: string; employee_code: string }>(page, "/api/hr-admin/employees", "POST", async () => {
    await page.getByRole("button", { name: "Create employee" }).click();
  });
  await expect(page.getByText(code).first()).toBeVisible();
  return employee;
}

test.describe("Phase 5L payroll readiness negative gates certification", () => {
  test("employee without primary bank account remains blocked-gated in payroll readiness", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const employee = await createEmployeeWithoutBank(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-readiness?tab=employees&q=${employee.employee_code}&page_size=10`);
    await expectPageReady(page, "Payroll Readiness");

    const row = page.locator(".payroll-readiness-table tbody tr").filter({ hasText: employee.employee_code }).first();
    await expect(row).toBeVisible();
    await expect(row.locator(".readiness-badge")).toHaveText("Blocked");
    await expect(row.locator("td").nth(6)).toHaveText("Missing");

    const employeeHref = await row.locator("a").getAttribute("href");
    expect(employeeHref).toContain(`employeeId=${employee.id}`);
    await gotoAuthenticated(page, employeeHref ?? `/hr-admin/payroll-readiness?tab=employees&employeeId=${employee.id}`);
    await expect(page).toHaveURL(new RegExp(`employeeId=${employee.id}`));
    await expect(page.locator(`aside[aria-label="Warning Bankgate readiness detail"]`)).toBeVisible();
    await expect(page.locator(".payroll-source-grid .detail-row").filter({ hasText: "Bank accounts" })).toContainText("0");
    await expect(page.getByText("Blocked").first()).toBeVisible();
    await expect(page.getByText("Missing primary bank account.")).toBeVisible();

    const readyHref = await page.locator(".status-tab-row").getByRole("link", { name: /^Ready\b/ }).getAttribute("href");
    expect(readyHref).toContain("status=ready");
    await gotoAuthenticated(page, readyHref ?? `/hr-admin/payroll-readiness?tab=employees&q=${employee.employee_code}&status=ready&page_size=10`);
    await expect(page).toHaveURL(/status=ready/);
    await expect(page.locator(".payroll-readiness-table tbody tr").filter({ hasText: employee.employee_code })).toHaveCount(0);

    await gotoAuthenticated(page, `/hr-admin/payroll-readiness?tab=employees&q=${employee.employee_code}&status=blocked&page_size=10`);
    await expect(page.locator(".payroll-readiness-table tbody tr").filter({ hasText: employee.employee_code })).toBeVisible();
    await expect(page.locator(".pagination-bar").getByText("1-1")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
