import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

const PASSWORDLESS_RUN = Date.now().toString(36).toUpperCase();

function field(scope: Page | Locator, label: string) {
  return scope
    .locator("label.form-field")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("input, select, textarea")
    .first();
}

function bankForm(page: Page) {
  return page.locator("form").filter({ has: page.getByRole("heading", { name: /Create bank account|Edit bank account/ }) }).first();
}

function bankRecords(page: Page) {
  return page.locator("[aria-label='Employee bank account records']");
}

function bankRecord(page: Page, bankName: string) {
  return bankRecords(page).getByRole("button", { name: new RegExp(bankName) });
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

async function createDisposableEmployee(page: Page) {
  const code = `PW_BANK_${PASSWORDLESS_RUN}`;
  await gotoAuthenticated(page, "/hr-admin/employees/new");
  await expectPageReady(page, "Create employee");

  await field(page, "Employee code").fill(code);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill("Bank");
  await field(page, "Last name").fill("Certified");
  await field(page, "Preferred name").fill("Bank Certified");
  await field(page, "Work email").fill(`pw.bank.${PASSWORDLESS_RUN.toLowerCase()}@example.test`);
  await field(page, "Personal email").fill(`pw.bank.personal.${PASSWORDLESS_RUN.toLowerCase()}@example.test`);
  await field(page, "Phone number").fill("+91 98765 43123");
  await field(page, "Date of birth").fill("1994-01-01");
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

  const created = await submitAndCapture<{ id: string; employee_code: string }>(page, "/api/hr-admin/employees", "POST", async () => {
    await page.getByRole("button", { name: "Create employee" }).click();
  });
  expect(created.id).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${created.id}`));
  await expect(page.getByText(code).first()).toBeVisible();
  return created;
}

async function fillBankAccount(form: Locator, input: {
  holder: string;
  bank: string;
  account: string;
  ifsc: string;
  branch: string;
  primary: boolean;
}) {
  await field(form, "Account holder name").fill(input.holder);
  await field(form, "Bank name").fill(input.bank);
  await field(form, "Account number").fill(input.account);
  await field(form, "IFSC code").fill(input.ifsc);
  await field(form, "Branch name").fill(input.branch);
  const primary = form.locator("label.selection-row").filter({ hasText: "Primary account" }).locator("input");
  if (input.primary) {
    await primary.check();
  } else {
    await primary.uncheck();
  }
}

test.describe("Phase 3H employee bank account certification", () => {
  test("bank account page, validation, create, read, update, and primary switching are certified", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const employee = await createDisposableEmployee(page);

    await page.locator("details.action-menu summary").click();
    await expect(page.getByRole("link", { name: "Manage bank accounts" })).toBeVisible();
    await page.getByRole("link", { name: "Manage bank accounts" }).click();
    await expectPageReady(page, /Bank accounts for Bank Certified/);
    await expect(page.getByRole("link", { name: "Back to employee detail" })).toHaveAttribute("href", `/hr-admin/employees?employeeId=${employee.id}`);

    for (const metric of ["Bank accounts", "Primary accounts", "Employee status"]) {
      await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: "Bank accounts", exact: true })).toBeVisible();
    await expect(page.getByText("No bank account configured.")).toBeVisible();
    await expect(page.getByRole("button", { name: "New account" })).toBeVisible();

    const form = bankForm(page);
    await expect(page.getByRole("heading", { name: "Create bank account" })).toBeVisible();
    for (const label of ["Account holder name", "Bank name", "Account number", "IFSC code", "Branch name"]) {
      await expect(field(form, label), `${label} should be visible`).toBeVisible();
    }
    await expect(form.locator("label.selection-row").filter({ hasText: "Primary account" })).toBeVisible();
    await expect(form.getByRole("button", { name: "Create account" })).toBeVisible();
    await expect(form.getByRole("button", { name: "Reset" })).toBeVisible();

    await field(form, "Bank name").fill("");
    await form.getByRole("button", { name: "Create account" }).click();
    await expect
      .poll(() => field(form, "Bank name").evaluate((element) => (element as HTMLInputElement).validity.valueMissing))
      .toBe(true);

    await fillBankAccount(form, {
      holder: "Bank Certified",
      bank: `Phase 3H Secondary Bank ${PASSWORDLESS_RUN}`,
      account: `910000${Date.now().toString().slice(-8)}`,
      ifsc: "ICIC0001234",
      branch: "Secondary Branch",
      primary: false,
    });
    const secondary = await submitAndCapture<{ id: string; is_primary: boolean; bank_name: string; account_number: string }>(
      page,
      `/api/hr-admin/employees/${employee.id}/bank-accounts`,
      "POST",
      async () => {
        await form.getByRole("button", { name: "Create account" }).click();
      },
    );
    expect(secondary.is_primary).toBe(false);
    await expect(page.getByRole("status").filter({ hasText: "Employee bank account saved." })).toBeVisible();
    await expect(bankRecord(page, secondary.bank_name)).toBeVisible();
    await expect(bankRecord(page, secondary.bank_name).getByText("secondary", { exact: true })).toBeVisible();
    await expect(bankRecords(page).getByText(secondary.account_number.slice(-4))).toBeVisible();

    await page.getByRole("button", { name: "New account" }).click();
    await expect(page.getByRole("heading", { name: "Create bank account" })).toBeVisible();
    await fillBankAccount(form, {
      holder: "Bank Certified",
      bank: `Phase 3H Primary Bank ${PASSWORDLESS_RUN}`,
      account: `920000${Date.now().toString().slice(-8)}`,
      ifsc: "HDFC0001234",
      branch: "Primary Branch",
      primary: true,
    });
    const primary = await submitAndCapture<{ id: string; is_primary: boolean; bank_name: string }>(
      page,
      `/api/hr-admin/employees/${employee.id}/bank-accounts`,
      "POST",
      async () => {
        await form.getByRole("button", { name: "Create account" }).click();
      },
    );
    expect(primary.is_primary).toBe(true);
    await expect(bankRecord(page, primary.bank_name).getByText("primary", { exact: true })).toBeVisible();

    await bankRecord(page, secondary.bank_name).click();
    await expect(page.getByRole("heading", { name: "Edit bank account" })).toBeVisible();
    await expect(field(form, "Bank name")).toHaveValue(secondary.bank_name);
    await fillBankAccount(form, {
      holder: "Bank Certified Updated",
      bank: secondary.bank_name,
      account: secondary.account_number,
      ifsc: "ICIC0004321",
      branch: "Secondary Branch Updated",
      primary: true,
    });
    const updated = await submitAndCapture<{ id: string; is_primary: boolean; branch_name: string; account_holder_name: string }>(
      page,
      `/api/hr-admin/employees/${employee.id}/bank-accounts/${secondary.id}`,
      "PATCH",
      async () => {
        await form.getByRole("button", { name: "Save account" }).click();
      },
    );
    expect(updated.id).toBe(secondary.id);
    expect(updated.is_primary).toBe(true);
    expect(updated.branch_name).toBe("Secondary Branch Updated");
    expect(updated.account_holder_name).toBe("Bank Certified Updated");
    await expect(bankRecord(page, secondary.bank_name).getByText("primary", { exact: true })).toBeVisible();
    await expect(bankRecord(page, primary.bank_name).getByText("secondary", { exact: true })).toBeVisible();

    const listResponse = await page.request.get(`/api/hr-admin/employees/${employee.id}/bank-accounts`);
    expect(listResponse.ok()).toBeTruthy();
    const accounts = (await listResponse.json()) as Array<{ id: string; is_primary: boolean }>;
    expect(accounts).toHaveLength(2);
    expect(accounts.filter((account) => account.is_primary)).toHaveLength(1);
    expect(accounts.find((account) => account.id === secondary.id)?.is_primary).toBe(true);

    await expect(page.getByRole("button", { name: /delete|remove|archive/i })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
