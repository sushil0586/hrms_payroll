import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

async function expectFields(scope: Locator, labels: string[]) {
  for (const label of labels) {
    await expect(field(scope, label)).toBeVisible();
  }
}

function field(scope: Locator, label: string) {
  return scope
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::label[1]")
    .locator("input, select, textarea")
    .first();
}

async function expectOptions(scope: Locator, label: string, minimum = 1) {
  const count = await field(scope, label).evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).length;
  });
  expect(count).toBeGreaterThanOrEqual(minimum);
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${path}`) && item.request().method() === method),
    action(),
  ]);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as T;
}

test.describe("HR admin salary setup flows", () => {
  test("salary setup exposes every current read workspace section and navigation action", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/salary-setup");
    await expectPageReady(page, "Salary Setup");

    for (const link of ["Payroll Setup", "Readiness", "Inputs", "Rules", "Calculations"]) {
      await expect(page.getByRole("link", { name: link, exact: true })).toBeVisible();
    }

    for (const metric of ["Components", "Structures", "Active versions", "Assigned employees"]) {
      await expect(page.locator(".metric-tile-soft").filter({ hasText: metric })).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Version matrix" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Structure composition" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Employee salary coverage" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Salary setup controls" })).toBeVisible();

    for (const header of ["Structure", "Status", "Pay group", "Versions", "Assignments", "Currency", "Component", "Type", "Value", "Rule reference", "Employee", "Effective", "Annual CTC", "Reason"]) {
      await expect(page.getByRole("columnheader", { name: header }).first()).toBeVisible();
    }

    await expect(page.locator(".salary-component-stack")).toBeVisible();
    await expect(page.locator(".salary-version-grid")).toHaveCount(1);
    await expect(page.locator(".salary-setup-detail-panel").first()).toBeVisible();

    const structureLink = page.locator("main a[href*='structureId=']").first();
    if (await structureLink.isVisible().catch(() => false)) {
      await structureLink.click();
      await expect(page).toHaveURL(/structureId=/);
      await expect(page.getByRole("heading", { name: "Employee salary coverage" })).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: "No structure selected" })).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("salary setup browser CRUD creates and updates components, structures, versions, lines, and assignments", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/salary-setup");
    await expectPageReady(page, "Salary Setup");

    const componentForm = page.getByTestId("salary-component-form");
    const structureForm = page.getByTestId("salary-structure-form");
    const versionForm = page.getByTestId("salary-version-form");
    const lineForm = page.getByTestId("salary-line-form");
    const assignmentForm = page.getByTestId("salary-assignment-form");

    await expectFields(componentForm, [
      "Code",
      "Name",
      "Component type",
      "Value type",
      "Status",
      "Payslip visibility",
      "Formula reference",
      "Applicability rule reference",
      "Rounding rule reference",
      "Accounting mapping reference",
      "Statutory treatment reference",
      "Config profile reference",
    ]);
    await expect(componentForm.getByRole("checkbox", { name: "Taxable" })).toBeVisible();
    await expect(componentForm.getByRole("checkbox", { name: "Proratable" })).toBeVisible();
    await expectOptions(componentForm, "Component type");
    await expectOptions(componentForm, "Value type");
    await expectOptions(componentForm, "Status");

    const componentCode = uniqueCode("SAL_COMP");
    const component = await submitAndCapture<{ id: string; code: string; name: string }>(page, "salary-components", "POST", async () => {
      await field(componentForm, "Code").fill(componentCode);
      await field(componentForm, "Name").fill(`Browser ${componentCode}`);
      await field(componentForm, "Component type").selectOption("earning");
      await field(componentForm, "Value type").selectOption("fixed_amount");
      await field(componentForm, "Status").selectOption("active");
      await field(componentForm, "Payslip visibility").fill("visible");
      await field(componentForm, "Applicability rule reference").fill("salary.applicability.browser.v1");
      await field(componentForm, "Rounding rule reference").fill("salary.rounding.browser.v1");
      await field(componentForm, "Accounting mapping reference").fill("salary.accounting.browser.v1");
      await field(componentForm, "Statutory treatment reference").fill("salary.statutory.browser.v1");
      await field(componentForm, "Config profile reference").fill("salary.component.browser.profile.v1");
      await componentForm.getByRole("checkbox", { name: "Taxable" }).uncheck();
      await componentForm.getByRole("checkbox", { name: "Proratable" }).check();
      await componentForm.getByRole("button", { name: "Create component" }).click();
    });
    await expect(page.getByText(componentCode).first()).toBeVisible();

    await submitAndCapture(page, `salary-components/${component.id}`, "PATCH", async () => {
      await field(componentForm, "Name").fill(`Updated ${componentCode}`);
      await componentForm.getByRole("button", { name: "Save component" }).click();
    });
    await expect(page.getByText(`Updated ${componentCode}`).first()).toBeVisible();

    await expectFields(structureForm, ["Code", "Name", "Pay group", "Currency code", "Status", "Description", "Config profile reference"]);
    await expectOptions(structureForm, "Status");
    const structureCode = uniqueCode("SAL_STRUCT");
    const structure = await submitAndCapture<{ id: string; code: string; name: string }>(page, "salary-structures", "POST", async () => {
      await field(structureForm, "Code").fill(structureCode);
      await field(structureForm, "Name").fill(`Browser ${structureCode}`);
      await field(structureForm, "Pay group").selectOption("");
      await field(structureForm, "Currency code").fill("INR");
      await field(structureForm, "Status").selectOption("draft");
      await field(structureForm, "Description").fill("Browser-created salary structure for local QA.");
      await field(structureForm, "Config profile reference").fill("salary.structure.browser.profile.v1");
      await structureForm.getByRole("button", { name: "Create structure" }).click();
    });
    await expect(page.getByText(structureCode).first()).toBeVisible();

    await submitAndCapture(page, `salary-structures/${structure.id}`, "PATCH", async () => {
      await field(structureForm, "Description").fill("Updated through browser salary setup CRUD.");
      await structureForm.getByRole("button", { name: "Save structure" }).click();
    });
    await expect(field(structureForm, "Description")).toHaveValue("Updated through browser salary setup CRUD.");

    await expectFields(versionForm, ["Structure", "Version", "Effective from", "Effective to", "Annual CTC", "Currency code", "Status", "Config profile reference"]);
    await expectOptions(versionForm, "Structure");
    await expectOptions(versionForm, "Status");
    const version = await submitAndCapture<{ id: string; version: number }>(page, "salary-structure-versions", "POST", async () => {
      await field(versionForm, "Structure").selectOption(structure.id);
      await field(versionForm, "Version").fill("1");
      await field(versionForm, "Effective from").fill("2026-04-01");
      await field(versionForm, "Effective to").fill("2027-03-31");
      await field(versionForm, "Annual CTC").fill("1200000");
      await field(versionForm, "Currency code").fill("INR");
      await field(versionForm, "Status").selectOption("draft");
      await field(versionForm, "Config profile reference").fill("salary.version.browser.profile.v1");
      await versionForm.getByRole("button", { name: "Create version" }).click();
    });
    await expect(page.getByText(`Version ${version.version}`).first()).toBeVisible();

    await submitAndCapture(page, `salary-structure-versions/${version.id}`, "PATCH", async () => {
      await field(versionForm, "Annual CTC").fill("1250000");
      await versionForm.getByRole("button", { name: "Save version" }).click();
    });
    await expect(page.getByText(/structure version saved/i).first()).toBeVisible();

    await expectFields(lineForm, ["Structure version", "Component", "Display order", "Amount", "Percentage", "Formula reference", "Calculation rule reference", "Config profile reference"]);
    await expect(lineForm.getByRole("checkbox", { name: "Active line" })).toBeVisible();
    await expectOptions(lineForm, "Structure version");
    await expectOptions(lineForm, "Component");
    const line = await submitAndCapture<{ id: string }>(page, "salary-structure-components", "POST", async () => {
      await field(lineForm, "Structure version").selectOption(version.id);
      await field(lineForm, "Component").selectOption(component.id);
      await field(lineForm, "Display order").fill("10");
      await field(lineForm, "Amount").fill("55000");
      await field(lineForm, "Percentage").fill("");
      await field(lineForm, "Calculation rule reference").fill("salary.line.calc.browser.v1");
      await field(lineForm, "Config profile reference").fill("salary.line.browser.profile.v1");
      await lineForm.getByRole("checkbox", { name: "Active line" }).check();
      await lineForm.getByRole("button", { name: "Create component line" }).click();
    });
    await expect(field(lineForm, "Calculation rule reference")).toHaveValue("salary.line.calc.browser.v1");

    await submitAndCapture(page, `salary-structure-components/${line.id}`, "PATCH", async () => {
      await field(lineForm, "Amount").fill("56000");
      await lineForm.getByRole("checkbox", { name: "Active line" }).uncheck();
      await lineForm.getByRole("button", { name: "Save component line" }).click();
    });
    await expect(field(lineForm, "Amount")).toHaveValue("56000.00");
    await expect(page.getByText(/component line saved/i).first()).toBeVisible();

    await expectFields(assignmentForm, ["Employee", "Structure version", "Effective from", "Effective to", "Status", "Annual CTC override", "Assignment reason", "Config profile reference"]);
    await expectOptions(assignmentForm, "Employee");
    await expectOptions(assignmentForm, "Structure version");
    await expectOptions(assignmentForm, "Status");
    const assignmentReason = `Browser salary assignment ${Date.now()}`;
    const assignment = await submitAndCapture<{ id: string }>(page, "employee-salary-assignments", "POST", async () => {
      await field(assignmentForm, "Structure version").selectOption(version.id);
      await field(assignmentForm, "Effective from").fill("2026-04-01");
      await field(assignmentForm, "Effective to").fill("2027-03-31");
      await field(assignmentForm, "Status").selectOption("draft");
      await field(assignmentForm, "Annual CTC override").fill("1260000");
      await field(assignmentForm, "Assignment reason").fill(assignmentReason);
      await field(assignmentForm, "Config profile reference").fill("salary.assignment.browser.profile.v1");
      await assignmentForm.getByRole("button", { name: "Create assignment" }).click();
    });
    await expect(field(assignmentForm, "Assignment reason")).toHaveValue(assignmentReason);

    await submitAndCapture(page, `employee-salary-assignments/${assignment.id}`, "PATCH", async () => {
      await field(assignmentForm, "Assignment reason").fill(`${assignmentReason} updated`);
      await assignmentForm.getByRole("button", { name: "Save assignment" }).click();
    });
    await expect(field(assignmentForm, "Assignment reason")).toHaveValue(`${assignmentReason} updated`);
    await expectNoHorizontalOverflow(page);
  });

  test("salary setup controls remain usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/salary-setup");
    await expectPageReady(page, "Salary Setup");

    await expect(page.getByRole("heading", { name: "Salary setup controls" })).toBeVisible();
    for (const testId of ["salary-component-form", "salary-structure-form", "salary-version-form", "salary-line-form", "salary-assignment-form"]) {
      await expect(page.getByTestId(testId)).toBeVisible();
    }
    await expect(field(page.getByTestId("salary-component-form"), "Component type")).toBeVisible();
    await expect(field(page.getByTestId("salary-assignment-form"), "Employee")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
