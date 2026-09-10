import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

const runSuffix = Date.now().toString(36).toUpperCase();

function uniqueCode(prefix: string) {
  return `PW9C_${prefix}_${runSuffix}`;
}

function field(scope: Locator, label: string, index = 0) {
  return scope
    .getByText(label, { exact: true })
    .locator("xpath=ancestor::label[1]")
    .locator("input, select, textarea")
    .nth(index);
}

function pageField(page: Page, label: string, index = 0) {
  return page
    .locator("label.form-field")
    .filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input, select, textarea")
    .nth(index);
}

function pageToggle(page: Page, label: string) {
  return page
    .locator("label")
    .filter({ has: page.locator("strong, .detail-label", { hasText: new RegExp(`^${label}$`) }) })
    .locator("input[type='checkbox']")
    .first();
}

async function selectFirstNonEmptyOption(select: Locator) {
  const value = await select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    return Array.from(selectElement.options).find((option) => option.value)?.value ?? "";
  });
  expect(value).not.toBe("");
  await select.selectOption(value);
  return value;
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(`/api/hr-admin/${path}`) && item.request().method() === method),
    action(),
  ]);
  const payload = (await response.json().catch(() => ({}))) as T;
  expect(response.ok(), `${method} ${path} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload;
}

async function createActiveShift(page: Page) {
  const code = uniqueCode("SHIFT");
  await gotoAuthenticated(page, "/hr-admin/shifts/new");
  await expectPageReady(page, "Create shift");
  await pageField(page, "Code").fill(code);
  await pageField(page, "Name").fill(`Phase 9C Shift ${runSuffix}`);
  await pageField(page, "Start time").fill("10:00");
  await pageField(page, "End time").fill("19:00");
  await pageField(page, "Working hours").fill("8.00");
  await pageField(page, "Break minutes").fill("45");
  await pageField(page, "Grace in minutes").fill("10");
  await pageField(page, "Grace out minutes").fill("5");
  await pageToggle(page, "Saturday").check();
  await pageToggle(page, "Sunday").check();
  await page.getByRole("button", { name: "Create shift" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/shifts$/);
  await expect(page.locator("article.record-card").filter({ hasText: code }).first()).toBeVisible();
}

async function createActiveHolidayCalendar(page: Page) {
  const code = uniqueCode("HC");
  await gotoAuthenticated(page, "/hr-admin/holiday-calendars/new");
  await expectPageReady(page, "Create holiday calendar");
  await pageField(page, "Code").fill(code);
  await pageField(page, "Name").fill(`Phase 9C Holiday Calendar ${runSuffix}`);
  await pageField(page, "Year").fill("2027");
  await page.getByRole("button", { name: "Add holiday" }).click();
  await pageField(page, "Date").fill("2027-01-26");
  await pageField(page, "Name", 1).fill("Republic Day Phase 9C");
  await selectFirstNonEmptyOption(pageField(page, "Holiday type"));
  await page.getByRole("button", { name: "Create holiday calendar" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/holiday-calendars$/);
  await expect(page.locator("article.record-card").filter({ hasText: code }).first()).toBeVisible();
}

async function createActiveAttendancePolicy(page: Page) {
  const code = uniqueCode("AP");
  await gotoAuthenticated(page, "/hr-admin/attendance-policies/new");
  await expectPageReady(page, "Create attendance policy");
  await pageField(page, "Code").fill(code);
  await pageField(page, "Name").fill(`Phase 9C Attendance Policy ${runSuffix}`);
  await pageField(page, "Status").selectOption("active");
  await selectFirstNonEmptyOption(pageField(page, "Default shift"));
  await selectFirstNonEmptyOption(pageField(page, "Holiday calendar"));
  await pageField(page, "Full day min hours").fill("8.00");
  await pageField(page, "Half day min hours").fill("4.00");
  await pageField(page, "Late mark after minutes").fill("15");
  await pageField(page, "Max late marks in period").fill("3");
  await pageField(page, "Overtime threshold minutes").fill("45");
  await pageToggle(page, "Enable automatic derivation").check();
  await page.getByRole("button", { name: "Create attendance policy" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/attendance-policies$/);
  await expect(page.locator("article.record-card").filter({ hasText: code }).first()).toBeVisible();
}

async function createActiveWorkflowTemplate(page: Page) {
  const code = uniqueCode("WF");
  await gotoAuthenticated(page, "/hr-admin/workflow-templates/new");
  await expectPageReady(page, "Create workflow template");
  await pageField(page, "Code").fill(code);
  await pageField(page, "Name").fill(`Phase 9C Workflow ${runSuffix}`);
  await pageField(page, "Trigger key").fill(`phase9c_${runSuffix.toLowerCase()}`);
  await pageField(page, "Status").selectOption("active");
  await pageField(page, "Version").fill("1");
  await pageField(page, "Description").fill("Phase 9C launch-audit blocker closure workflow.");
  await pageField(page, "Name", 1).fill("Manager approval");
  await pageField(page, "Condition snapshot JSON").fill("{}");
  await page.getByRole("button", { name: "Create workflow template" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/workflow-templates$/);
  await expect(page.locator("article.record-card").filter({ hasText: code }).first()).toBeVisible();
}

async function createActiveDocumentCategoryAndMandatoryRule(page: Page) {
  const code = uniqueCode("DOC");
  const name = `Phase 9C Document Category ${runSuffix}`;
  await gotoAuthenticated(page, "/hr-admin/document-categories/new");
  await expectPageReady(page, "Create document category");
  await pageField(page, "Code").fill(code);
  await pageField(page, "Name").fill(name);
  await pageField(page, "Description").fill("Phase 9C mandatory document category.");
  await pageField(page, "Visibility rules JSON").fill('{"visible_to":["hr_admin","employee"]}');
  await pageToggle(page, "Requires verification").check();
  await page.getByRole("button", { name: "Create category" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/document-categories$/);
  await expect(page.locator("article.record-card").filter({ hasText: code }).first()).toBeVisible();

  await gotoAuthenticated(page, "/hr-admin/document-requirements/new");
  await expectPageReady(page, "Create document requirement");
  await pageField(page, "Category").selectOption({ label: name });
  await selectFirstNonEmptyOption(pageField(page, "Legal entity"));
  await selectFirstNonEmptyOption(pageField(page, "Branch"));
  await selectFirstNonEmptyOption(pageField(page, "Department"));
  await selectFirstNonEmptyOption(pageField(page, "Grade"));
  await selectFirstNonEmptyOption(pageField(page, "Employment type"));
  await pageField(page, "Required within joining days").fill("30");
  await pageField(page, "Priority").fill("90");
  await pageToggle(page, "Mandatory").check();
  await pageToggle(page, "Active").check();
  await page.getByRole("button", { name: "Create requirement" }).click();
  await expect(page).toHaveURL(/\/hr-admin\/document-requirements$/);
  await expect(page.locator("article.record-card").filter({ hasText: name }).first()).toContainText("Mandatory");
}

async function createActiveSalaryConfiguration(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/salary-setup");
  await expectPageReady(page, "Salary Setup");

  const componentForm = page.getByTestId("salary-component-form");
  const structureForm = page.getByTestId("salary-structure-form");
  const versionForm = page.getByTestId("salary-version-form");
  const lineForm = page.getByTestId("salary-line-form");
  const componentCode = uniqueCode("SAL_COMP");
  const component = await submitAndCapture<{ id: string }>(page, "salary-components", "POST", async () => {
    await field(componentForm, "Code").fill(componentCode);
    await field(componentForm, "Name").fill(`Phase 9C ${componentCode}`);
    await field(componentForm, "Component type").selectOption("earning");
    await field(componentForm, "Value type").selectOption("fixed_amount");
    await field(componentForm, "Status").selectOption("active");
    await field(componentForm, "Payslip visibility").fill("visible");
    await field(componentForm, "Applicability rule reference").fill("salary.applicability.phase9c.v1");
    await field(componentForm, "Rounding rule reference").fill("salary.rounding.phase9c.v1");
    await field(componentForm, "Accounting mapping reference").fill("salary.accounting.phase9c.v1");
    await field(componentForm, "Statutory treatment reference").fill("salary.statutory.phase9c.v1");
    await field(componentForm, "Config profile reference").fill("salary.component.phase9c.profile.v1");
    await componentForm.getByRole("button", { name: "Create component" }).click();
  });
  await expect(page.getByText(componentCode).first()).toBeVisible();

  const structureCode = uniqueCode("SAL_STRUCT");
  const structure = await submitAndCapture<{ id: string }>(page, "salary-structures", "POST", async () => {
    await field(structureForm, "Code").fill(structureCode);
    await field(structureForm, "Name").fill(`Phase 9C ${structureCode}`);
    await field(structureForm, "Pay group").selectOption("");
    await field(structureForm, "Currency code").fill("INR");
    await field(structureForm, "Status").selectOption("active");
    await field(structureForm, "Description").fill("Phase 9C active salary structure.");
    await field(structureForm, "Config profile reference").fill("salary.structure.phase9c.profile.v1");
    await structureForm.getByRole("button", { name: "Create structure" }).click();
  });
  await expect(page.getByText(structureCode).first()).toBeVisible();

  const version = await submitAndCapture<{ id: string; version: number }>(page, "salary-structure-versions", "POST", async () => {
    await field(versionForm, "Structure").selectOption(structure.id);
    await field(versionForm, "Version").fill("1");
    await field(versionForm, "Effective from").fill("2026-04-01");
    await field(versionForm, "Effective to").fill("2027-03-31");
    await field(versionForm, "Annual CTC").fill("1200000");
    await field(versionForm, "Currency code").fill("INR");
    await field(versionForm, "Status").selectOption("active");
    await field(versionForm, "Config profile reference").fill("salary.version.phase9c.profile.v1");
    await versionForm.getByRole("button", { name: "Create version" }).click();
  });
  await expect(page.getByText(`Version ${version.version}`).first()).toBeVisible();

  await submitAndCapture(page, "salary-structure-components", "POST", async () => {
    await field(lineForm, "Structure version").selectOption(version.id);
    await field(lineForm, "Component").selectOption(component.id);
    await field(lineForm, "Display order").fill("10");
    await field(lineForm, "Amount").fill("55000");
    await field(lineForm, "Calculation rule reference").fill("salary.line.phase9c.v1");
    await field(lineForm, "Config profile reference").fill("salary.line.phase9c.profile.v1");
    await lineForm.getByRole("button", { name: "Create component line" }).click();
  });
  await expect(page.getByText(/component line saved/i).first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
}

async function createActivePayrollRuleVersion(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-rules");
  await expectPageReady(page, "Payroll Rules");

  const definitionForm = page.getByTestId("payroll-rule-definition-form");
  const versionForm = page.getByTestId("payroll-rule-version-form");
  const ruleCode = uniqueCode("RULE");

  const rule = await submitAndCapture<{ id: string }>(page, "payroll-rule-definitions", "POST", async () => {
    await definitionForm.getByRole("button", { name: "New" }).click();
    await field(definitionForm, "Code").fill(ruleCode);
    await field(definitionForm, "Name").fill(`Phase 9C Payroll Rule ${runSuffix}`);
    await selectFirstNonEmptyOption(field(definitionForm, "Rule type"));
    await field(definitionForm, "Description").fill("Phase 9C active payroll rule definition for launch audit closure.");
    await field(definitionForm, "Tags JSON").fill('["phase9c","launch-audit","browser-created"]');
    await field(definitionForm, "Config profile reference").fill("payroll.rule.phase9c.profile.v1");
    await definitionForm.getByRole("button", { name: "Create rule" }).click();
  });
  await expect(page.getByText(ruleCode).first()).toBeVisible();

  await submitAndCapture(page, "payroll-rule-versions", "POST", async () => {
    await versionForm.getByRole("button", { name: "New" }).click();
    await field(versionForm, "Rule").selectOption(rule.id);
    await field(versionForm, "Version").fill("1");
    await field(versionForm, "Status").selectOption("active");
    await selectFirstNonEmptyOption(field(versionForm, "Expression language"));
    await field(versionForm, "Expression").fill("salary.annual_ctc / 12");
    await field(versionForm, "Effective from").fill("2026-04-01");
    await field(versionForm, "Effective to").fill("2027-03-31");
    await field(versionForm, "Rounding rule reference").fill("payroll.rounding.phase9c.v1");
    await field(versionForm, "Input schema JSON").fill('{"required_paths":["salary.annual_ctc"]}');
    await field(versionForm, "Output schema JSON").fill('{"result_path":"components.phase9c_rule"}');
    await field(versionForm, "Config snapshot JSON").fill(
      '{"component_code":"PHASE9C_RULE","component_name":"Phase 9C Rule","component_type":"earning","calculation_order":20,"output_path":"components.phase9c_rule","profile_ref":"payroll.rule.version.phase9c.profile.v1"}',
    );
    await versionForm.getByRole("button", { name: "Create version" }).click();
  });
  await expect(page.getByText(/payroll rule version saved/i).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe("Phase 9C launch audit blocker closure", () => {
  test("HR admin closes launch audit master-data blockers through browser configuration", async ({ page }) => {
    test.setTimeout(12 * 60 * 1000);

    await createActiveShift(page);
    await createActiveHolidayCalendar(page);
    await createActiveAttendancePolicy(page);
    await createActiveWorkflowTemplate(page);
    await createActiveDocumentCategoryAndMandatoryRule(page);
    await createActiveSalaryConfiguration(page);
    await createActivePayrollRuleVersion(page);

    await gotoAuthenticated(page, "/hr-admin");
    await expectPageReady(page, "Control center");
    await expectNoHorizontalOverflow(page);

    const pageText = await page.locator("main").innerText();
    for (const blockerRef of [
      "attendance.policies",
      "workflows.active_templates",
      "documents.categories",
      "documents.mandatory_rules",
      "payroll.salary_components",
      "payroll.structure_versions",
      "payroll.rule_versions",
    ]) {
      expect(pageText, `${blockerRef} should no longer be shown as a launch blocker`).not.toContain(blockerRef);
    }
  });
});
