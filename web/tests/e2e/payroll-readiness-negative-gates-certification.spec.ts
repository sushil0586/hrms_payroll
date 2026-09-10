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
  await field(page, "Employee code").fill(code);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill("Warning");
  await field(page, "Last name").fill("Bankgate");
  await field(page, "Preferred name").fill("Warning Bankgate");
  await field(page, "Work email").fill(`pw.warning.bank.${runRef.toLowerCase()}@example.test`);
  await field(page, "Personal email").fill(`pw.warning.bank.personal.${runRef.toLowerCase()}@example.test`);
  await field(page, "Phone number").fill("+91 98765 43125");
  await field(page, "Date of birth").fill("1992-01-01");
  await field(page, "Date of joining").fill("2026-01-01");
  await field(page, "Probation end date").fill("2026-06-30");
  await field(page, "Confirmation date").fill("2026-07-01");
  await selectFirstNonEmptyOption(field(page, "Branch"));
  await expect(field(page, "Legal entity")).not.toHaveValue("");
  await selectFirstNonEmptyOption(field(page, "Cost center"));
  await selectFirstNonEmptyOption(field(page, "Department"));
  await expect(field(page, "Business unit")).not.toHaveValue("");
  await selectFirstNonEmptyOption(field(page, "Designation"));
  await expect(field(page, "Grade")).not.toHaveValue("");
  await selectFirstNonEmptyOption(field(page, "Employment type"));
  await selectFirstNonEmptyOption(field(page, "Reporting manager"));

  const employee = await submitAndCapture<{ id: string; employee_code: string }>(page, "/api/hr-admin/employees", "POST", async () => {
    await page.getByRole("button", { name: "Create employee" }).click();
  });
  await expect(page.getByText(code).first()).toBeVisible();
  return employee;
}

test.describe("Phase 5L payroll readiness negative gates certification", () => {
  test("employee without primary bank account remains warning-gated in payroll readiness", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const employee = await createEmployeeWithoutBank(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-readiness?q=${employee.employee_code}&page_size=10`);
    await expectPageReady(page, "Payroll Readiness");

    const row = page.locator(".payroll-readiness-table tbody tr").filter({ hasText: employee.employee_code }).first();
    await expect(row).toBeVisible();
    await expect(row.locator(".readiness-badge")).toHaveText("Warning");
    await expect(row.locator("td").nth(6)).toHaveText("Missing");

    await row.locator("a").click();
    await expect(page).toHaveURL(new RegExp(`employeeId=${employee.id}`));
    await expect(page.locator(`aside[aria-label="Warning Bankgate readiness detail"]`)).toBeVisible();
    await expect(page.locator(".payroll-source-grid .detail-row").filter({ hasText: "Bank accounts" })).toContainText("0");
    await expect(page.getByText("Warning").first()).toBeVisible();
    await expect(page.getByText("Missing primary bank account.")).toBeVisible();

    await page.locator(".status-tab-row").getByRole("link", { name: /^Ready\b/ }).click();
    await expect(page).toHaveURL(/status=ready/);
    await expect(page.locator(".payroll-readiness-table tbody tr").filter({ hasText: employee.employee_code })).toHaveCount(0);

    await gotoAuthenticated(page, `/hr-admin/payroll-readiness?q=${employee.employee_code}&status=warning&page_size=10`);
    await expect(page.locator(".payroll-readiness-table tbody tr").filter({ hasText: employee.employee_code })).toBeVisible();
    await expect(page.locator(".pagination-bar").getByText("1-1")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
