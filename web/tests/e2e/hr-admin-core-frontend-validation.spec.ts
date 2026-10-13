import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function firstVisibleEmployeeId(page: Page, action: "access" | "bank") {
  await gotoAuthenticated(page, `/hr-admin/employees?action=${action}`, hrAdmin);
  await suppressBrowserTestNoise(page);
  await expectPageReady(page, "Employees");

  const actionLink = page.locator(`table a[href*="action=${action}"][href*="employeeId="]`).first();
  await expect(actionLink).toBeVisible();
  const actionHref = await actionLink.getAttribute("href");
  expect(actionHref).toBeTruthy();
  const employeeId = new URL(actionHref ?? "", page.url()).searchParams.get("employeeId");
  expect(employeeId).toBeTruthy();
  return employeeId ?? "";
}

test.describe("HR Admin core frontend validation", () => {
  test.describe.configure({ timeout: 90_000 });

  test("employee master blocks missing identity, invalid email, and invalid dates before calling the API", async ({ page }) => {
    let employeeCalls = 0;
    await page.route("**/api/hr-admin/employees", async (route) => {
      employeeCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoAuthenticated(page, "/hr-admin/employees/new", hrAdmin);
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Create employee");

    const form = page.locator("form.employee-child-form");
    await field(form, "Employee code").fill(`PW-VAL-${Date.now().toString(36).toUpperCase()}`);
    await field(form, "First name").fill("Validation");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: "2.Contact" })).toHaveAttribute("aria-current", "step");
    await field(form, "Work email").fill("not-an-email");
    await field(form, "Date of birth").fill("2026-10-07");
    await field(form, "Date of joining").fill("2026-01-01");
    await field(form, "Probation end date").fill("2025-12-31");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(form.getByText("Date review needed.")).toBeVisible();
    await expect(form.getByText(/Date of birth must be earlier than date of joining/)).toBeVisible();
    await expect(form.getByText(/Probation end date cannot be earlier than date of joining/)).toBeVisible();
    expect(employeeCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("employee access blocks missing identity and role selection before calling the API", async ({ page }) => {
    let accessCalls = 0;
    await page.route("**/api/hr-admin/employees/*/access", async (route) => {
      accessCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    const employeeId = await firstVisibleEmployeeId(page, "access");
    await gotoAuthenticated(page, `/hr-admin/employees/${employeeId}/access`, hrAdmin);
    await expectPageReady(page, /Access for/i);

    const form = page.locator("form.employee-child-form");
    await field(form, "Username").fill("");
    await field(form, "Email").fill("invalid-email");
    const checkedRoles = form.locator(".selection-row input[type='checkbox']:checked");
    const checkedRoleCount = await checkedRoles.count();
    for (let index = 0; index < checkedRoleCount; index += 1) {
      await checkedRoles.nth(0).uncheck();
    }
    await page.getByRole("button", { name: /Create access|Update access/ }).click();

    await expect(form.getByRole("alert").filter({ hasText: "Enter the username." })).toBeVisible();
    await expect(form.getByRole("alert").filter({ hasText: "Enter a valid email address." })).toBeVisible();
    await expect(form.getByRole("alert").filter({ hasText: "Select at least one tenant role." })).toBeVisible();
    expect(accessCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("employee document upload blocks missing fields and unsafe files before calling the API", async ({ page }) => {
    let uploadCalls = 0;
    await page.route("**/api/hr-admin/employee-documents", async (route) => {
      uploadCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoAuthenticated(page, "/hr-admin/employee-documents/new", hrAdmin);
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Upload employee document");

    await expect(page.locator("form.document-child-form")).toHaveAttribute("data-hydrated", "true");
    await page.getByRole("button", { name: "Upload document" }).click();

    const form = page.locator("form.document-child-form");
    await expect(form.getByRole("alert").filter({ hasText: "Select the employee before uploading." })).toBeVisible();
    await expect(form.getByRole("alert").filter({ hasText: "Select the document category." })).toBeVisible();
    await expect(form.getByRole("alert").filter({ hasText: "Enter a document title." })).toBeVisible();
    await expect(form.getByRole("alert").filter({ hasText: "Attach the employee document file." })).toBeVisible();
    expect(uploadCalls).toBe(0);

    await field(form, "Employee").selectOption({ index: 1 });
    await field(form, "Category").selectOption({ index: 1 });
    await field(form, "Title").fill("Payroll proof");
    await field(form, "File").setInputFiles({
      name: "unsafe-upload.exe",
      mimeType: "application/x-msdownload",
      buffer: Buffer.from("MZ"),
    });
    await page.getByRole("button", { name: "Upload document" }).click();

    await expect(form.getByRole("alert").filter({ hasText: /Executable or script files are not allowed/ })).toBeVisible();
    await expect(field(form, "File")).toHaveAttribute("aria-invalid", "true");
    expect(uploadCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("employee bank account blocks missing values and malformed IFSC before calling the API", async ({ page }) => {
    let bankCalls = 0;
    await page.route("**/api/hr-admin/employees/*/bank-accounts", async (route) => {
      bankCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });
    await page.route("**/api/hr-admin/employees/*/bank-accounts/*", async (route) => {
      bankCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    const employeeId = await firstVisibleEmployeeId(page, "bank");
    await gotoAuthenticated(page, `/hr-admin/employees/${employeeId}/bank-accounts`, hrAdmin);
    await expectPageReady(page, /Bank accounts for/i);
    await page.getByRole("button", { name: "New account" }).click();

    const form = page.locator("form.employee-bank-account-form");
    await field(form, "Account holder name").fill("");
    await field(form, "Bank name").fill("");
    await field(form, "Account number").fill("");
    await form.getByRole("button", { name: /Create account|Save account/ }).click();

    await expect(form.getByRole("alert").filter({ hasText: "Enter the account holder name." })).toBeVisible();
    await expect(form.getByRole("alert").filter({ hasText: "Enter the bank name." })).toBeVisible();
    await expect(form.getByRole("alert").filter({ hasText: "Enter the account number." })).toBeVisible();
    expect(bankCalls).toBe(0);

    await field(form, "Account holder name").fill("Nisha Rao");
    await field(form, "Bank name").fill("HDFC Bank");
    await field(form, "Account number").fill("50100123456789");
    await field(form, "IFSC code").fill("BADIFSC");
    await form.getByRole("button", { name: /Create account|Save account/ }).click();

    await expect(form.getByRole("alert").filter({ hasText: "Enter a valid IFSC code." })).toBeVisible();
    await expect(field(form, "IFSC code")).toHaveAttribute("aria-invalid", "true");
    expect(bankCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
