import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(page: Page, label: string) {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .first();
}

function section(page: Page, heading: string | RegExp) {
  return page.locator("section, article").filter({ has: page.getByRole("heading", { name: heading }) }).first();
}

async function expectNativeRequired(locator: Locator) {
  await expect
    .poll(async () => locator.evaluate((element) => (element as HTMLInputElement | HTMLSelectElement).validity.valueMissing))
    .toBe(true);
}

async function expectSelectHasOptions(locator: Locator, minimum = 1) {
  const optionCount = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).length;
  });
  expect(optionCount).toBeGreaterThanOrEqual(minimum);
}

async function selectFirstNonEmptyOption(locator: Locator) {
  const value = await locator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await locator.selectOption(value);
  return value;
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${path}`) && item.request().method() === method),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function expectEmployeeFormCertified(page: Page, mode: "create" | "edit") {
  await expect(page.getByRole("heading", { level: 1, name: mode === "create" ? "Create employee" : /Edit employee:/, exact: mode === "create" })).toBeVisible();
  await expect(page.getByRole("heading", { name: mode === "create" ? "Create employee master" : "Edit employee master" })).toBeVisible();

  for (const heading of ["Identity and employment", "Contact and dates", "Structural mapping"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }

  for (const label of [
    "Employee code",
    "Employment status",
    "First name",
    "Middle name",
    "Last name",
    "Preferred name",
    "Work email",
    "Personal email",
    "Phone number",
    "Date of birth",
    "Date of joining",
    "Probation end date",
    "Confirmation date",
    "Legal entity",
    "Branch",
    "Location",
    "Business unit",
    "Department",
    "Cost center",
    "Designation",
    "Grade",
    "Employment type",
    "Reporting manager",
  ]) {
    await expect(field(page, label), `${label} should be visible`).toBeVisible();
  }

  for (const label of [
    "Employment status",
    "Legal entity",
    "Branch",
    "Location",
    "Business unit",
    "Department",
    "Cost center",
    "Designation",
    "Grade",
    "Employment type",
    "Reporting manager",
  ]) {
    await expectSelectHasOptions(field(page, label));
  }

  await expect(page.getByRole("button", { name: mode === "create" ? "Create employee" : "Save changes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe("Phase 3 employee lifecycle page certification", () => {
  test("employee master create, edit, directory detail, dependent dropdowns, and access provisioning are certified", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const code = uniqueCode("EMP");
    const username = `pw.emp.${Date.now()}`;
    const workEmail = `${username}@example.test`;

    await gotoAuthenticated(page, "/hr-admin/employees/new");
    await expectPageReady(page, "Create employee");
    await expectEmployeeFormCertified(page, "create");

    await page.getByRole("button", { name: "Create employee" }).click();
    await expectNativeRequired(field(page, "Employee code"));
    await expectNativeRequired(field(page, "First name"));

    await field(page, "Date of birth").fill("2026-01-01");
    await field(page, "Date of joining").fill("2025-01-01");
    await expect(page.getByText("date of birth must be earlier than date of joining")).toBeVisible();
    await field(page, "Date of birth").fill("1996-01-01");
    await field(page, "Date of joining").fill("2026-04-01");
    await field(page, "Probation end date").fill("2026-03-01");
    await expect(page.getByText("probation end date cannot be earlier than date of joining")).toBeVisible();
    await field(page, "Probation end date").fill("2026-09-30");
    await field(page, "Confirmation date").fill("2026-08-01");
    await expect(page.getByText("confirmation date cannot be earlier than probation end date")).toBeVisible();
    await field(page, "Confirmation date").fill("2026-10-01");

    await field(page, "Employee code").fill(code);
    await field(page, "Employment status").selectOption("active");
    await field(page, "First name").fill("Priya");
    await field(page, "Middle name").fill("Phase");
    await field(page, "Last name").fill("Tester");
    await field(page, "Preferred name").fill("Priya QA");
    await field(page, "Work email").fill(workEmail);
    await field(page, "Personal email").fill(`${username}.personal@example.test`);
    await field(page, "Phone number").fill("+91 98765 43210");

    const legalEntity = await selectFirstNonEmptyOption(field(page, "Legal entity"));
    await expectSelectHasOptions(field(page, "Branch"));
    await expectSelectHasOptions(field(page, "Cost center"));
    const branch = await selectFirstNonEmptyOption(field(page, "Branch"));
    await expect(field(page, "Legal entity")).toHaveValue(legalEntity);
    await expect(field(page, "Branch")).toHaveValue(branch);
    await selectFirstNonEmptyOption(field(page, "Department"));
    await expect(field(page, "Business unit")).not.toHaveValue("");
    await selectFirstNonEmptyOption(field(page, "Designation"));
    await expect(field(page, "Grade")).not.toHaveValue("");
    await selectFirstNonEmptyOption(field(page, "Cost center"));
    await selectFirstNonEmptyOption(field(page, "Employment type"));
    await selectFirstNonEmptyOption(field(page, "Reporting manager"));

    const createResult = await submitAndCapture<{ id: string; employee_code: string; full_name?: string }>(
      page,
      "employees",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Create employee" }).click();
      },
    );
    expect(createResult.ok).toBeTruthy();
    expect(createResult.payload.id).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${createResult.payload.id}`));
    await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Employee directory" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Employee master detail" })).toBeVisible();
    await expect(page.getByText(code).first()).toBeVisible();
    await expect(page.getByText("Priya Tester", { exact: false }).first()).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/employees/new");
    await field(page, "Employee code").fill(code);
    await field(page, "First name").fill("Duplicate");
    const duplicateResult = await submitAndCapture(page, "employees", "POST", async () => {
      await page.getByRole("button", { name: "Create employee" }).click();
    });
    expect(duplicateResult.ok).toBeFalsy();
    await expect(page.getByText("Save failed.")).toBeVisible();

    await gotoAuthenticated(page, `/hr-admin/employees/${createResult.payload.id}/edit`);
    await expectPageReady(page, /Edit employee:/);
    await expectEmployeeFormCertified(page, "edit");
    await expect(field(page, "Employee code")).toHaveValue(code);
    await field(page, "Preferred name").fill("Priya Certified");
    await field(page, "Phone number").fill("+91 98765 43211");
    await field(page, "Employment status").selectOption("on_notice");
    const updateResult = await submitAndCapture(page, `employees/${createResult.payload.id}`, "PATCH", async () => {
      await page.getByRole("button", { name: "Save changes" }).click();
    });
    expect(updateResult.ok).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`/hr-admin/employees\\?employeeId=${createResult.payload.id}`));
    await expect(page.getByText("Priya Certified").first()).toBeVisible();
    await expect(page.getByText("on notice").first()).toBeVisible();

    const actionsMenu = page.locator("details.action-menu").filter({ hasText: "Actions" }).first();
    await expect(actionsMenu.locator("summary")).toBeVisible();
    await actionsMenu.locator("summary").click();
    await expect(page.getByRole("link", { name: "Edit employee" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Manage access" })).toBeVisible();
    await page.getByRole("link", { name: "Manage access" }).click();
    await expectPageReady(page, /Manage system access/);

    for (const heading of ["Identity and membership", "Access controls", "Role assignment"]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    for (const label of ["Username", "Email", "First name", "Last name", "Display name", "Phone number", "Membership status", "Temporary password"]) {
      await expect(field(page, label), `${label} access field should be visible`).toBeVisible();
    }
    await expect(field(page, "Membership status")).toBeVisible();
    await expect(page.getByText("User active")).toBeVisible();
    await expect(page.getByText("Must change password")).toBeVisible();
    await expect(page.getByText("Default membership")).toBeVisible();
    await expect(page.getByText("At least one role is required.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create access" })).toBeDisabled();

    await field(page, "Username").fill(username);
    await field(page, "Email").fill(workEmail);
    await field(page, "First name").fill("Priya");
    await field(page, "Last name").fill("Tester");
    await field(page, "Display name").fill("Priya Certified");
    await field(page, "Phone number").fill("+91 98765 43211");
    await field(page, "Membership status").selectOption("active");
    await field(page, "Temporary password").fill("Password@123");
    await page.locator(".selection-row input[type='checkbox']").first().check();
    await expect(page.getByRole("button", { name: "Create access" })).toBeEnabled();
    const accessResult = await submitAndCapture(page, `employees/${createResult.payload.id}/access`, "POST", async () => {
      await page.getByRole("button", { name: "Create access" }).click();
    });
    expect(accessResult.ok).toBeTruthy();
    await expect(page.getByText("Access updated.")).toBeVisible();
    await expect(page.getByText("Employee access saved successfully.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
