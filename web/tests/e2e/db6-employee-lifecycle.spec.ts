import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string) {
  return scope
    .locator("label.form-field")
    .filter({ has: scope.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .first();
}

async function firstValue(locator: Locator) {
  const value = await locator.evaluate((node) =>
    Array.from((node as HTMLSelectElement).options).find((option) => option.value)?.value ?? "",
  );
  expect(value).not.toBe("");
  await locator.selectOption(value);
  return value;
}

async function optionContaining(locator: Locator, text: string) {
  await expect.poll(async () => (await locator.locator("option").allTextContents()).some((label) => label.includes(text))).toBe(true);
  const value = await locator.evaluate((node, expected) =>
    Array.from((node as HTMLSelectElement).options).find((option) => option.textContent?.includes(expected))?.value ?? "",
  text);
  expect(value).not.toBe("");
  await locator.selectOption(value);
  return value;
}

async function next(page: Page) {
  await page.getByRole("button", { name: "Continue" }).click();
}

test("DB6-06-001/002/006 browser lifecycle preserves history and archives safely", async ({ page }) => {
  test.setTimeout(180_000);
  const suffix = Date.now().toString(36);
  const employeeCode = `DB66-${suffix}`;
  const targetDepartmentCode = `DB66-DEP-${suffix}`;
  const targetDepartmentName = `Lifecycle Target ${suffix}`;

  await gotoAuthenticated(page, "/hr-admin/employees/new");
  const employeeOptionsResponse = await requestWithBrowserSession(page, "/api/hr-admin/employees/options");
  expect(employeeOptionsResponse.status).toBe(200);
  const employeeOptions = JSON.parse(employeeOptionsResponse.body) as { business_units: Array<{ id: string }> };
  expect(employeeOptions.business_units[0]?.id).toBeTruthy();
  const departmentFixture = await requestWithBrowserSession(page, "/api/hr-admin/organization/departments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      code: targetDepartmentCode,
      name: targetDepartmentName,
      business_unit_id: employeeOptions.business_units[0].id,
      is_active: true,
    }),
  });
  expect(departmentFixture.status).toBe(201);

  await field(page, "Employee code").fill(employeeCode);
  await field(page, "Employment status").selectOption("active");
  await field(page, "First name").fill("Lifecycle");
  await field(page, "Last name").fill("Certified");
  await field(page, "Preferred name").fill("Lifecycle Certified");
  await next(page);
  await field(page, "Work email").fill(`${employeeCode.toLowerCase()}@example.test`);
  await field(page, "Date of birth").fill("1994-01-01");
  await field(page, "Date of joining").fill("2026-01-01");
  await next(page);
  await firstValue(field(page, "Legal entity"));
  await firstValue(field(page, "Branch"));
  await optionContaining(field(page, "Department"), "QA People");
  await firstValue(field(page, "Cost center"));
  await firstValue(field(page, "Designation"));
  await firstValue(field(page, "Employment type"));
  await optionContaining(field(page, "Reporting manager"), "QA-TA-001");
  await next(page);
  const createResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/hr-admin/employees") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create employee" }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  await page.waitForURL((url) => Boolean(url.searchParams.get("employeeId")));
  const employee = { id: new URL(page.url()).searchParams.get("employeeId") ?? "" };
  expect(employee.id).not.toBe("");

  await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employee.id}`);
  await expectPageReady(page, "Employees");
  await expect(page.getByText(employeeCode).first()).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText(employeeCode).first()).toBeVisible();

  await gotoAuthenticated(page, "/hr-admin/movements/new");
  await optionContaining(field(page, "Employee"), employeeCode);
  await field(page, "Movement type").selectOption("transfer");
  await field(page, "Status").selectOption("completed");
  await field(page, "Effective date").fill("2026-10-10");
  await field(page, "Reason").fill("DB-6.6 certified same-entity movement");
  await field(page, "Workflow reference").fill(`DB66-MOVE-${suffix}`);
  await optionContaining(field(page, "From department"), "QA People");
  await optionContaining(field(page, "To department"), targetDepartmentName);
  await optionContaining(field(page, "From manager"), "QA-TA-001");
  await optionContaining(field(page, "To manager"), "QA-MGR-001");
  await field(page, "Current snapshot JSON").fill(JSON.stringify({ source: "db6-browser" }));
  const movementResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/hr-admin/movements") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create movement" }).click();
  expect((await movementResponsePromise).status()).toBe(201);

  await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employee.id}`);
  await expectPageReady(page, "Employees");
  await expect(page.locator(".detail-row").filter({ hasText: "Department" })).toContainText(targetDepartmentName);
  await expect(page.locator(".detail-row").filter({ hasText: "Reporting Manager" })).not.toContainText("Tanvi Admin");

  await gotoAuthenticated(page, `/hr-admin/employees/${employee.id}/edit`);
  await field(page, "Employment status").selectOption("inactive");
  await next(page);
  await next(page);
  await next(page);
  const archiveResponsePromise = page.waitForResponse((response) =>
    response.url().includes(`/api/hr-admin/employees/${employee.id}`) && response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Save changes" }).click();
  expect((await archiveResponsePromise).status()).toBe(200);
  await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employee.id}`);
  await expect(page.getByText(employeeCode).first()).toBeVisible();
  await expect(page.locator(".detail-row").filter({ hasText: "Employment Status" })).toContainText("Inactive");

  const destructiveDelete = await requestWithBrowserSession(page, `/api/hr-admin/employees/${employee.id}`, {
    method: "DELETE",
  });
  expect(destructiveDelete.status).toBe(405);
});
