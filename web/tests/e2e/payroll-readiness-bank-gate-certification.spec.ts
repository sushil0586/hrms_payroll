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

function main(page: Page) {
  return page.locator("main").first();
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

async function createEmployeeWithPrimaryBank(page: Page) {
  const runRef = Date.now().toString(36).toUpperCase();
  const code = `PW_RDY_BANK_${runRef}`;

  await gotoAuthenticated(page, "/hr-admin/employees/new");
  await expectPageReady(page, "Create employee");
  await fillEmployeeCodeAfterHydration(page, code);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill("Ready");
  await field(page, "Last name").fill("Bankgate");
  await field(page, "Preferred name").fill("Ready Bankgate");
  await continueEmployeeForm(page, "Contact and dates");
  await field(page, "Work email").fill(`pw.ready.bank.${runRef.toLowerCase()}@example.test`);
  await field(page, "Personal email").fill(`pw.ready.bank.personal.${runRef.toLowerCase()}@example.test`);
  await field(page, "Phone number").fill("+91 98765 43124");
  await field(page, "Date of birth").fill("1993-01-01");
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

  await gotoAuthenticated(page, `/hr-admin/employees/${employee.id}/bank-accounts`);
  await expectPageReady(page, /Bank accounts for Ready Bankgate/);
  const form = page.locator("form").filter({ has: page.getByRole("heading", { name: /Create bank account|Edit bank account/ }) }).first();
  await field(form, "Account holder name").fill("Ready Bankgate");
  await field(form, "Bank name").fill(`Readiness Gate Bank ${runRef}`);
  await field(form, "Account number").fill(`930000${Date.now().toString().slice(-8)}`);
  await field(form, "IFSC code").fill("SBIN0001234");
  await field(form, "Branch name").fill("Readiness Gate Branch");
  await form.locator("label.selection-row").filter({ hasText: "Primary account" }).locator("input").check();

  const account = await submitAndCapture<{ id: string; is_primary: boolean }>(
    page,
    `/api/hr-admin/employees/${employee.id}/bank-accounts`,
    "POST",
    async () => {
      await form.getByRole("button", { name: "Create account" }).click();
    },
  );
  expect(account.is_primary).toBe(true);
  await expect(page.getByRole("status").filter({ hasText: "Employee bank account saved." })).toBeVisible();
  return employee;
}

test.describe("Phase 5 readiness bank coverage gate certification", () => {
  test("payroll readiness reflects browser-created primary bank account coverage", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const employee = await createEmployeeWithPrimaryBank(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-readiness?tab=employees&q=${employee.employee_code}&page_size=10`);
    await expectPageReady(page, "Payroll Readiness");
    await expect(main(page).getByRole("link", { name: "Setup", exact: true })).toHaveAttribute("href", "/hr-admin/payroll-setup");
    await expect(main(page).getByRole("link", { name: "Inputs", exact: true })).toHaveAttribute("href", "/hr-admin/payroll-inputs");
    await expect(main(page).getByRole("link", { name: "Review", exact: true })).toHaveAttribute("href", "/hr-admin/payroll-review");
    await expect(main(page).getByRole("link", { name: "Report", exact: true })).toHaveAttribute("href", "/hr-admin/reports/payroll-close-readiness");

    for (const label of ["Search", "Period start", "Period end", "Page size"]) {
      await expect(page.getByLabel(label, { exact: true })).toBeVisible();
    }
    await expect(page.locator(".pagination-bar")).toBeVisible();
    await expect(page.locator(".pagination-bar").getByText("1-1")).toBeVisible();

    const row = page.locator(".payroll-readiness-table tbody tr").filter({ hasText: employee.employee_code }).first();
    await expect(row).toBeVisible();
    await expect(row.locator("td").nth(6)).toHaveText("Ready");
    const employeeHref = await row.locator("a").getAttribute("href");
    expect(employeeHref).toContain(`employeeId=${employee.id}`);
    await gotoAuthenticated(page, employeeHref ?? `/hr-admin/payroll-readiness?tab=employees&employeeId=${employee.id}`);
    await expect(page).toHaveURL(new RegExp(`employeeId=${employee.id}`));
    await expect(page.locator(`aside[aria-label="Ready Bankgate readiness detail"]`)).toBeVisible();
    await expect(page.locator(".payroll-source-grid .detail-row").filter({ hasText: "Bank accounts" })).toContainText("1");
    await expect(page.getByText("Missing primary bank account")).toHaveCount(0);

    await page.getByLabel("Search", { exact: true }).fill("NO_MATCH_READINESS_BANK_GATE");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === "NO_MATCH_READINESS_BANK_GATE"),
      page.getByRole("button", { name: "Apply" }).click(),
    ]);
    await expect(page.getByText("No rows found.")).toBeVisible();
    await expect(page.locator(".pagination-bar").getByText("0-0")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
