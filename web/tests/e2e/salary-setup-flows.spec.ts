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

async function openSalaryActionTab(page: Page, name: RegExp | string) {
  await page.getByRole("navigation", { name: "Salary setup action groups" }).getByRole("button", { name }).click();
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
  test("salary setup action tabs keep a consistent form guidance structure", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/salary-setup?tab=actions");
    await expectPageReady(page, "Salary Setup");

    await expect(page.getByRole("navigation", { name: "Salary setup action groups" })).toBeVisible();
    await expect(page.locator(".setup-action-flow")).toBeVisible();
    await expect(page.locator(".setup-action-sidecar")).toBeVisible();
    await expect(page.getByTestId("salary-assignment-import-workbench")).toBeVisible();
    await expect(page.getByRole("region", { name: "Import workflow" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview import" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Commit ready rows" })).toBeVisible();

    const forms: Array<{
      tab: RegExp;
      workflow: string;
      testId: string;
      fields: string[];
    }> = [
      { tab: /Components/, workflow: "Components workflow", testId: "salary-component-form", fields: ["Code", "Component type"] },
      { tab: /Structures/, workflow: "Structures workflow", testId: "salary-structure-form", fields: ["Code", "Currency code"] },
      { tab: /Versions/, workflow: "Versions workflow", testId: "salary-version-form", fields: ["Structure", "Annual CTC"] },
      { tab: /Lines/, workflow: "Lines workflow", testId: "salary-line-form", fields: ["Structure version", "Component"] },
      { tab: /Assignments/, workflow: "Assignments workflow", testId: "salary-assignment-form", fields: ["Employee", "Structure version"] },
    ];

    for (const item of forms) {
      await openSalaryActionTab(page, item.tab);
      await expect(page.getByRole("region", { name: item.workflow })).toBeVisible();
      await expect(page.locator(".setup-action-sidecar")).toBeVisible();
      const form = page.getByTestId(item.testId);
      await expect(form).toBeVisible();
      await expectFields(form, item.fields);
      await expect(form.locator(".salary-crud-record-list")).toBeVisible();
      await expect(form.locator(".salary-crud-form__actions")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });

  test("salary assignment import workbench uploads validates commits and updates coverage", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const suffix = String(Date.now()).slice(-6);

    await gotoAuthenticated(page, "/hr-admin/salary-setup?tab=actions");
    await expectPageReady(page, "Salary Setup");

    const employeeCode = `SALIMP-${suffix}`;
    const employeeResponse = await page.request.post("/api/hr-admin/employees", {
      data: {
        employee_code: employeeCode,
        first_name: "Salary",
        middle_name: "",
        last_name: "Importer",
        preferred_name: "Salary Importer",
        work_email: `salary.import.${suffix}@example.test`,
        personal_email: "",
        phone_number: "+91 90000 00200",
        employment_status: "active",
        date_of_birth: null,
        date_of_joining: "2028-04-01",
        probation_end_date: null,
        confirmation_date: null,
        legal_entity_id: null,
        branch_id: null,
        location_id: null,
        department_id: null,
        business_unit_id: null,
        cost_center_id: null,
        designation_id: null,
        grade_id: null,
        employment_type_id: null,
        reporting_manager_id: null,
      },
    });
    expect(employeeResponse.ok()).toBeTruthy();
    await gotoAuthenticated(page, "/hr-admin/salary-setup?tab=actions");
    await expectPageReady(page, "Salary Setup");

    const structureForm = page.getByTestId("salary-structure-form");
    const versionForm = page.getByTestId("salary-version-form");
    const structureCode = uniqueCode("SAL_IMPORT_STRUCT");
    const structureNameForImport = `Browser Import ${structureCode}`;
    await openSalaryActionTab(page, /Structures/);
    const structure = await submitAndCapture<{ id: string; code: string; name: string }>(page, "salary-structures", "POST", async () => {
      await field(structureForm, "Code").fill(structureCode);
      await field(structureForm, "Name").fill(structureNameForImport);
      await field(structureForm, "Pay group").selectOption("");
      await field(structureForm, "Currency code").fill("INR");
      await field(structureForm, "Status").selectOption("active");
      await field(structureForm, "Description").fill("Browser-created structure for bulk assignment import.");
      await field(structureForm, "Config profile reference").fill(`salary.import.structure.${suffix}`);
      await structureForm.getByRole("button", { name: "Create structure" }).click();
    });
    await expect(page.getByText(structureCode).first()).toBeVisible();

    await openSalaryActionTab(page, /Versions/);
    const version = await submitAndCapture<{ id: string; version: number }>(page, "salary-structure-versions", "POST", async () => {
      await field(versionForm, "Structure").selectOption(structure.id);
      await field(versionForm, "Version").fill("1");
      await field(versionForm, "Effective from").fill("2028-04-01");
      await field(versionForm, "Effective to").fill("");
      await field(versionForm, "Annual CTC").fill("1400000");
      await field(versionForm, "Currency code").fill("INR");
      await field(versionForm, "Status").selectOption("active");
      await field(versionForm, "Config profile reference").fill(`salary.import.version.${suffix}`);
      await versionForm.getByRole("button", { name: "Create version" }).click();
    });
    await expect(page.getByText(`Version ${version.version}`).first()).toBeVisible();

    const assignmentForm = page.getByTestId("salary-assignment-form");
    await openSalaryActionTab(page, /Assignments/);
    await expectOptions(assignmentForm, "Employee");
    await expect(field(assignmentForm, "Employee").locator("option").filter({ hasText: employeeCode })).toHaveCount(1);
    const structureName = structureNameForImport;
    const structureVersion = String(version.version);

    const effectiveFrom = `2028-04-${String(Number(suffix.slice(-2)) % 20 + 1).padStart(2, "0")}`;
    const duplicateReason = `Bulk salary duplicate ${suffix}`;
    const csv = [
      "employee_code,structure_name,structure_version,effective_from,effective_to,status,annual_ctc_override,assignment_reason,config_profile_ref",
      `${employeeCode},"${structureName}",${structureVersion},${effectiveFrom},,active,1450000,Bulk salary import ${suffix},salary.assignment.bulk.${suffix}`,
      `${employeeCode},"${structureName}",${structureVersion},2028-05-01,2028-04-01,active,1500000,Bad date ${suffix},salary.assignment.bad-date.${suffix}`,
      `${employeeCode},"${structureName}",${structureVersion},${effectiveFrom},,active,1460000,${duplicateReason},salary.assignment.duplicate.${suffix}`,
    ].join("\n");

    const workbench = page.getByTestId("salary-assignment-import-workbench");
    await openSalaryActionTab(page, /Import/);
    await expect(workbench).toBeVisible();
    await expect(workbench.getByRole("heading", { name: "Salary assignment import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Load sample template" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Copy template" })).toBeVisible();
    await expect(workbench.getByRole("link", { name: "Download template" })).toBeVisible();
    await expect(workbench.getByText("Upload CSV", { exact: true })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Preview import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready rows" })).toBeDisabled();

    await workbench.locator("input[type='file']").setInputFiles({
      name: "salary-assignment-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await expect(workbench.getByLabel("CSV data")).toContainText(`Bulk salary import ${suffix}`);
    await workbench.getByRole("button", { name: "Preview import" }).click();
    await expect(
      workbench.getByRole("alert").or(workbench.getByText(/Preview ready|Preview found blocked rows|Commit ready salary assignments after checking blocked rows|Review blocked rows before committing/i)).first(),
    ).toBeVisible();
    await expect(workbench.locator("tbody tr")).toHaveCount(3);
    await expect(workbench.locator("tbody tr").nth(0).locator(".readiness-badge", { hasText: "ready" })).toBeVisible();
    await expect(workbench.locator("tbody tr").nth(1).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(workbench.locator("tbody tr").nth(2).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(workbench.getByText("Effective to cannot be earlier than effective from.")).toBeVisible();
    await expect(workbench.getByText("Duplicate assignment row exists in this import batch.")).toBeVisible();
    await expect(workbench.getByLabel("CSV data")).toContainText(duplicateReason);
    await expect(workbench.getByRole("button", { name: "Commit ready rows" })).toBeEnabled();

    await workbench.getByRole("button", { name: "Commit ready rows" }).click();
    await expect(workbench.getByText("Commit complete. Review employee salary coverage for created assignments.")).toBeVisible({ timeout: 30_000 });
    await expect(workbench.locator("tbody tr").nth(0).locator(".readiness-badge", { hasText: "created" })).toBeVisible();
    await expect(workbench.locator("tbody tr").nth(1).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(workbench.locator("tbody tr").nth(2).locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(page.getByText(`Bulk salary import ${suffix}`).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("salary setup exposes every current read workspace section and navigation action", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/salary-setup");
    await expectPageReady(page, "Salary Setup");

    for (const link of ["Payroll Setup", "Readiness", "Rules", "Add setup"]) {
      await expect(page.getByRole("link", { name: link, exact: true })).toBeVisible();
    }

    for (const metric of ["Components", "Structures", "Active versions", "Assigned employees"]) {
      await expect(page.locator(".metric-tile-soft").filter({ hasText: metric })).toBeVisible();
    }

    await expect(page.getByRole("link", { name: /Overview/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Salary setup summary" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Review assignments" })).toBeVisible();

    const tabs = page.getByLabel("Salary setup sections");

    await tabs.getByRole("link", { name: /Components/ }).click();
    await expect(page).toHaveURL(/tab=components/);
    await expect(page.getByRole("heading", { name: "Component catalog" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Component" })).toBeVisible();
    await expect(page.getByLabel("components pagination")).toBeVisible();

    await tabs.getByRole("link", { name: /Structures/ }).click();
    await expect(page).toHaveURL(/tab=structures/);
    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Version matrix" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Effective-dated salary versions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Structure composition" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Structure" }).first()).toBeVisible();
    for (const header of ["Status", "Pay group", "Versions", "Assignments", "Currency", "Component", "Type", "Value", "Rule reference"]) {
      await expect(page.getByRole("columnheader", { name: header }).first()).toBeVisible();
    }

    await tabs.getByRole("link", { name: /Assignments/ }).click();
    await expect(page).toHaveURL(/tab=assignments/);
    await expect(page.getByRole("heading", { name: "Employee salary coverage" })).toBeVisible();
    for (const header of ["Employee", "Structure", "Effective", "Annual CTC", "Status", "Reason"]) {
      await expect(page.getByRole("columnheader", { name: header }).first()).toBeVisible();
    }

    await tabs.getByRole("link", { name: /Setup Actions/ }).click();
    await expect(page).toHaveURL(/tab=actions/);
    await expect(page.getByRole("heading", { name: "Salary setup controls" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("salary setup browser CRUD creates and updates components, structures, versions, lines, and assignments", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/salary-setup?tab=actions");
    await expectPageReady(page, "Salary Setup");

    const componentForm = page.getByTestId("salary-component-form");
    const structureForm = page.getByTestId("salary-structure-form");
    const versionForm = page.getByTestId("salary-version-form");
    const lineForm = page.getByTestId("salary-line-form");
    const assignmentForm = page.getByTestId("salary-assignment-form");

    await openSalaryActionTab(page, /Components/);
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

    await openSalaryActionTab(page, /Structures/);
    await expectFields(structureForm, ["Code", "Name", "Pay group", "Currency code", "Status", "Description", "Config profile reference"]);
    await expectOptions(structureForm, "Status");
    const structureCode = uniqueCode("SAL_STRUCT");
    await field(structureForm, "Code").fill(structureCode);
    await field(structureForm, "Name").fill(`Browser ${structureCode}`);
    await field(structureForm, "Currency code").fill("IN");
    await structureForm.getByRole("button", { name: "Create structure" }).click();
    await expect(page.getByText("Currency code must be a 3-letter ISO code such as INR.")).toBeVisible();

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

    await openSalaryActionTab(page, /Versions/);
    await expectFields(versionForm, ["Structure", "Version", "Effective from", "Effective to", "Annual CTC", "Currency code", "Status", "Config profile reference"]);
    await expectOptions(versionForm, "Structure");
    await expectOptions(versionForm, "Status");
    await field(versionForm, "Structure").selectOption(structure.id);
    await field(versionForm, "Version").fill("1");
    await field(versionForm, "Effective from").fill("2026-04-01");
    await field(versionForm, "Effective to").fill("2026-03-31");
    await field(versionForm, "Annual CTC").fill("1200000");
    await versionForm.getByRole("button", { name: "Create version" }).click();
    await expect(page.getByText("Version effective to cannot be earlier than effective from.")).toBeVisible();

    const version = await submitAndCapture<{ id: string; version: number }>(page, "salary-structure-versions", "POST", async () => {
      await field(versionForm, "Structure").selectOption(structure.id);
      await expect(page.getByText("Selected salary structure is not active yet.")).toBeVisible();
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

    await openSalaryActionTab(page, /Lines/);
    await expectFields(lineForm, ["Structure version", "Component", "Display order", "Amount", "Percentage", "Formula reference", "Calculation rule reference", "Config profile reference"]);
    await expect(lineForm.getByRole("checkbox", { name: "Active line" })).toBeVisible();
    await expectOptions(lineForm, "Structure version");
    await expectOptions(lineForm, "Component");
    await field(lineForm, "Structure version").selectOption(version.id);
    await field(lineForm, "Component").selectOption(component.id);
    await field(lineForm, "Display order").fill("10");
    await field(lineForm, "Amount").fill("");
    await field(lineForm, "Percentage").fill("125");
    await lineForm.getByRole("button", { name: "Create component line" }).click();
    await expect(page.getByText("Percentage must be between 0 and 100.")).toBeVisible();

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

    await openSalaryActionTab(page, /Assignments/);
    await expectFields(assignmentForm, ["Employee", "Structure version", "Effective from", "Effective to", "Status", "Annual CTC override", "Assignment reason", "Config profile reference"]);
    await expectOptions(assignmentForm, "Employee");
    await expectOptions(assignmentForm, "Structure version");
    await expectOptions(assignmentForm, "Status");
    const assignmentReason = `Browser salary assignment ${Date.now()}`;
    await field(assignmentForm, "Structure version").selectOption(version.id);
    await field(assignmentForm, "Effective from").fill("2026-04-01");
    await field(assignmentForm, "Status").selectOption("active");
    await field(assignmentForm, "Assignment reason").fill("");
    await assignmentForm.getByRole("button", { name: "Create assignment" }).click();
    await expect(page.getByText("Assignment reason is required before activating employee salary coverage.")).toBeVisible();

    const assignment = await submitAndCapture<{ id: string }>(page, "employee-salary-assignments", "POST", async () => {
      await field(assignmentForm, "Structure version").selectOption(version.id);
      await expect(page.getByText("Selected structure version is not active yet.")).toBeVisible();
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
    await gotoAuthenticated(page, "/hr-admin/salary-setup?tab=actions");
    await expectPageReady(page, "Salary Setup");

    await expect(page.getByRole("heading", { name: "Salary setup controls" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Salary setup action groups" })).toBeVisible();

    await openSalaryActionTab(page, /Components/);
    await expect(page.getByTestId("salary-component-form")).toBeVisible();
    await expect(field(page.getByTestId("salary-component-form"), "Component type")).toBeVisible();

    await openSalaryActionTab(page, /Structures/);
    await expect(page.getByTestId("salary-structure-form")).toBeVisible();
    await expect(field(page.getByTestId("salary-structure-form"), "Currency code")).toBeVisible();

    await openSalaryActionTab(page, /Versions/);
    await expect(page.getByTestId("salary-version-form")).toBeVisible();
    await expect(field(page.getByTestId("salary-version-form"), "Annual CTC")).toBeVisible();

    await openSalaryActionTab(page, /Lines/);
    await expect(page.getByTestId("salary-line-form")).toBeVisible();
    await expect(field(page.getByTestId("salary-line-form"), "Component")).toBeVisible();

    await openSalaryActionTab(page, /Assignments/);
    await expect(page.getByTestId("salary-assignment-form")).toBeVisible();
    await expect(field(page.getByTestId("salary-assignment-form"), "Employee")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
