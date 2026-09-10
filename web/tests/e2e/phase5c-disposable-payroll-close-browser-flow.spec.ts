import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function form(page: Page, testId: string) {
  return page.getByTestId(testId);
}

function field(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select, textarea").first();
}

async function expectFields(scope: Locator, labels: string[]) {
  for (const label of labels) {
    await expect(field(scope, label)).toBeVisible();
  }
}

async function expectSelectOptions(scope: Locator, label: string, minimum = 1) {
  const count = await field(scope, label).evaluate((element) => {
    const select = element as HTMLSelectElement;
    return Array.from(select.options).filter((option) => option.value).length;
  });
  expect(count).toBeGreaterThanOrEqual(minimum);
}

async function selectOptionContaining(select: Locator, text: string) {
  const value = await select.evaluate((element, needle) => {
    const option = Array.from((element as HTMLSelectElement).options).find((item) => item.textContent?.includes(String(needle)));
    return option?.value ?? "";
  }, text);
  expect(value).toBeTruthy();
  await select.selectOption(value);
}

async function submitAndCapture<T>(page: Page, routePattern: RegExp, method: string, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => routePattern.test(item.url()) && item.request().method() === method, { timeout: 30000 }),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

test.describe("Phase 5F disposable payroll close browser flow", () => {
  test("creates disposable run, publishes outputs, generates handoff evidence, and proves ESS payslip access", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory", hrAdmin);
    await expectPageReady(page, "Payroll Statutory");

    const statutoryPackForm = form(page, "statutory-pack-form");
    const statutoryComponentForm = form(page, "statutory-component-form");
    const statutoryRegistrationForm = form(page, "statutory-registration-form");
    const statutoryFilingForm = form(page, "statutory-filing-form");
    const statutoryPackCode = uniqueCode("TDS_PACK");
    const statutoryComponentCode = uniqueCode("TDS_COMPONENT");
    const statutoryTreatmentRef = `payroll.statutory.tds.${statutoryComponentCode.toLowerCase()}.v1`;

    const statutoryPackResult = await submitAndCapture<{ id: string; code: string }>(
      page,
      /\/api\/hr-admin\/payroll-statutory-packs$/,
      "POST",
      async () => {
        await field(statutoryPackForm, "Code").fill(statutoryPackCode);
        await field(statutoryPackForm, "Name").fill(`Browser ${statutoryPackCode}`);
        await field(statutoryPackForm, "Country code").fill("IN");
        await field(statutoryPackForm, "Jurisdiction reference").fill("country:IN");
        await field(statutoryPackForm, "Status").selectOption("active");
        await field(statutoryPackForm, "Effective from").fill("2026-01-01");
        await field(statutoryPackForm, "Effective to").fill("2026-12-31");
        await field(statutoryPackForm, "Currency code").fill("INR");
        await field(statutoryPackForm, "Statutory profile reference").fill(`payroll.statutory.${statutoryPackCode}.v1`);
        await field(statutoryPackForm, "Validation profile reference").fill(`payroll.statutory.validation.${statutoryPackCode}.v1`);
        await field(statutoryPackForm, "Config profile reference").fill("statutory.pack.phase5q.close.v1");
        await statutoryPackForm.getByRole("button", { name: "Create pack" }).click();
      },
    );
    expect(statutoryPackResult.ok).toBeTruthy();

    const statutoryComponentResult = await submitAndCapture<{ id: string; code: string }>(
      page,
      /\/api\/hr-admin\/payroll-statutory-components$/,
      "POST",
      async () => {
        await field(statutoryComponentForm, "Statutory pack").selectOption(statutoryPackResult.payload.id);
        await field(statutoryComponentForm, "Salary component").selectOption("");
        await field(statutoryComponentForm, "Code").fill(statutoryComponentCode);
        await field(statutoryComponentForm, "Name").fill("Browser TDS Compliance Deduction");
        await field(statutoryComponentForm, "Statutory type").selectOption("tax_deducted_at_source");
        await field(statutoryComponentForm, "Contribution owner").selectOption("employee");
        await field(statutoryComponentForm, "Calculation method").selectOption("formula");
        await field(statutoryComponentForm, "Wage base reference").fill("salary.monthly_gross");
        await field(statutoryComponentForm, "Statutory treatment reference").fill(statutoryTreatmentRef);
        await field(statutoryComponentForm, "Registration reference").fill("tds.tan");
        await field(statutoryComponentForm, "Applicability profile reference").fill("payroll.statutory.tds.applicability.phase5q.v1");
        await field(statutoryComponentForm, "Rounding rule reference").fill("payroll.round.nearest_rupee.v1");
        await field(statutoryComponentForm, "Formula reference").fill("payroll.formula.tds.monthly_gross_10_percent.phase5q.v1");
        await field(statutoryComponentForm, "Status").selectOption("active");
        await field(statutoryComponentForm, "Config profile reference").fill("statutory.component.phase5q.close.v1");
        await statutoryComponentForm.getByRole("button", { name: "Create component" }).click();
      },
    );
    expect(statutoryComponentResult.ok).toBeTruthy();

    const statutoryRegistrationResult = await submitAndCapture<{ id: string; registration_number: string }>(
      page,
      /\/api\/hr-admin\/payroll-statutory-employer-registrations$/,
      "POST",
      async () => {
        await field(statutoryRegistrationForm, "Statutory pack").selectOption(statutoryPackResult.payload.id);
        await field(statutoryRegistrationForm, "Statutory component").selectOption(statutoryComponentResult.payload.id);
        await field(statutoryRegistrationForm, "Legal entity").selectOption({ index: 1 });
        await field(statutoryRegistrationForm, "Branch").selectOption({ index: 1 });
        await field(statutoryRegistrationForm, "Location").selectOption({ index: 1 });
        await field(statutoryRegistrationForm, "Code").fill(uniqueCode("TDS_REG"));
        await field(statutoryRegistrationForm, "Name").fill("Browser TDS TAN Registration");
        await field(statutoryRegistrationForm, "Registration type reference").fill("tds.tan");
        await field(statutoryRegistrationForm, "Registration number").fill(`TAN${Date.now()}`.slice(0, 16));
        await field(statutoryRegistrationForm, "Employer identifier").fill(`EMP${Date.now()}`.slice(0, 16));
        await field(statutoryRegistrationForm, "Jurisdiction reference").fill("country:IN");
        await field(statutoryRegistrationForm, "Filing authority reference").fill("income_tax_department");
        await field(statutoryRegistrationForm, "Provider reference").fill("payroll.provider.tds.fvu.phase5q");
        await field(statutoryRegistrationForm, "Status").selectOption("active");
        await field(statutoryRegistrationForm, "Effective from").fill("2026-01-01");
        await field(statutoryRegistrationForm, "Source reference").fill("browser-tds-registration");
        await field(statutoryRegistrationForm, "Config profile reference").fill("statutory.registration.phase5q.close.v1");
        await statutoryRegistrationForm.getByRole("button", { name: "Create registration" }).click();
      },
    );
    expect(statutoryRegistrationResult.ok).toBeTruthy();

    const statutoryFilingResult = await submitAndCapture<{ id: string; code: string }>(
      page,
      /\/api\/hr-admin\/payroll-statutory-filing-calendars$/,
      "POST",
      async () => {
        await field(statutoryFilingForm, "Statutory pack").selectOption(statutoryPackResult.payload.id);
        await field(statutoryFilingForm, "Statutory component").selectOption(statutoryComponentResult.payload.id);
        await field(statutoryFilingForm, "Employer registration").selectOption(statutoryRegistrationResult.payload.id);
        await field(statutoryFilingForm, "Code").fill(uniqueCode("TDS_FILE"));
        await field(statutoryFilingForm, "Name").fill("Browser Form 24Q Filing");
        await field(statutoryFilingForm, "Filing type reference").fill("tds.form_24q");
        await field(statutoryFilingForm, "Filing frequency").selectOption("monthly");
        await field(statutoryFilingForm, "Period start").fill("2026-01-01");
        await field(statutoryFilingForm, "Period end").fill("2026-12-31");
        await field(statutoryFilingForm, "Due date").fill("2026-07-15");
        await field(statutoryFilingForm, "Grace due date").fill("2026-07-20");
        await field(statutoryFilingForm, "Filing window start").fill("2026-07-01");
        await field(statutoryFilingForm, "Filing window end").fill("2026-07-15");
        await field(statutoryFilingForm, "Status").selectOption("due");
        await field(statutoryFilingForm, "Filing authority reference").fill("income_tax_department");
        await field(statutoryFilingForm, "Provider reference").fill("payroll.provider.tds.fvu.phase5q");
        await field(statutoryFilingForm, "Output profile reference").fill("payroll.output.tds.form24q.phase5q.v1");
        await field(statutoryFilingForm, "Source reference").fill("browser-tds-filing");
        await field(statutoryFilingForm, "Config profile reference").fill("statutory.filing.phase5q.close.v1");
        await statutoryFilingForm.getByRole("button", { name: "Create filing" }).click();
      },
    );
    expect(statutoryFilingResult.ok).toBeTruthy();

    await gotoAuthenticated(page, "/hr-admin/payroll-rules", hrAdmin);
    await expectPageReady(page, "Payroll Rules");

    const ruleDefinitionForm = form(page, "payroll-rule-definition-form");
    const ruleVersionForm = form(page, "payroll-rule-version-form");
    await expectFields(ruleDefinitionForm, ["Code", "Name", "Rule type", "Description", "Tags JSON", "Config profile reference"]);
    await expectFields(ruleVersionForm, [
      "Rule",
      "Version",
      "Status",
      "Expression language",
      "Expression",
      "Effective from",
      "Effective to",
      "Rounding rule reference",
      "Input schema JSON",
      "Output schema JSON",
      "Config snapshot JSON",
    ]);

    const ruleCode = uniqueCode("BASIC_RULE");
    await ruleDefinitionForm.getByRole("button", { name: "New" }).click();
    const ruleResult = await submitAndCapture<{ id: string; code: string }>(
      page,
      /\/api\/hr-admin\/payroll-rule-definitions$/,
      "POST",
      async () => {
        await field(ruleDefinitionForm, "Code").fill(ruleCode);
        await field(ruleDefinitionForm, "Name").fill(`Browser ${ruleCode}`);
        await field(ruleDefinitionForm, "Rule type").selectOption("formula");
        await field(ruleDefinitionForm, "Description").fill("Browser-created positive calculation rule.");
        await field(ruleDefinitionForm, "Tags JSON").fill(JSON.stringify(["browser", "phase5d", "positive_calculation"]));
        await field(ruleDefinitionForm, "Config profile reference").fill("tenant.payroll.rule.phase5d.v1");
        await ruleDefinitionForm.getByRole("button", { name: "Create rule" }).click();
      },
    );
    expect(ruleResult.ok).toBeTruthy();
    await expect(page.getByText(ruleCode).first()).toBeVisible();

    await ruleVersionForm.getByRole("button", { name: "New" }).click();
    const ruleVersionResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      /\/api\/hr-admin\/payroll-rule-versions$/,
      "POST",
      async () => {
        await field(ruleVersionForm, "Rule").selectOption(ruleResult.payload.id);
        await field(ruleVersionForm, "Version").fill("1");
        await field(ruleVersionForm, "Status").selectOption("active");
        await field(ruleVersionForm, "Expression").fill("salary.annual_ctc / 12");
        await field(ruleVersionForm, "Effective from").fill("2026-01-01");
        await field(ruleVersionForm, "Effective to").fill("");
        await field(ruleVersionForm, "Rounding rule reference").fill("payroll.round.nearest_rupee.v1");
        await field(ruleVersionForm, "Input schema JSON").fill(JSON.stringify({ required_paths: ["salary.annual_ctc"] }));
        await field(ruleVersionForm, "Output schema JSON").fill(JSON.stringify({ result_path: "components.basic_pay" }));
        await field(ruleVersionForm, "Config snapshot JSON").fill(JSON.stringify({
          component_code: "BASIC_PAY",
          component_name: "Basic Pay",
          component_type: "earning",
          calculation_order: 10,
          output_path: "components.basic_pay",
          profile_ref: "tenant.payroll.rule.version.phase5d.v1",
        }));
        await ruleVersionForm.getByRole("button", { name: "Create version" }).click();
      },
    );
    expect(ruleVersionResult.ok).toBeTruthy();
    await expect(page.getByText("payroll rule version saved.").first()).toBeVisible();

    await ruleDefinitionForm.getByRole("button", { name: "New" }).click();
    const taxRuleCode = uniqueCode("TDS_RULE");
    const taxRuleResult = await submitAndCapture<{ id: string; code: string }>(
      page,
      /\/api\/hr-admin\/payroll-rule-definitions$/,
      "POST",
      async () => {
        await field(ruleDefinitionForm, "Code").fill(taxRuleCode);
        await field(ruleDefinitionForm, "Name").fill(`Browser ${taxRuleCode}`);
        await field(ruleDefinitionForm, "Rule type").selectOption("formula");
        await field(ruleDefinitionForm, "Description").fill("Browser-created statutory tax deduction rule for compliance report evidence.");
        await field(ruleDefinitionForm, "Tags JSON").fill(JSON.stringify(["browser", "phase5q", "tds", "statutory_report"]));
        await field(ruleDefinitionForm, "Config profile reference").fill("tenant.payroll.rule.tds.phase5q.v1");
        await ruleDefinitionForm.getByRole("button", { name: "Create rule" }).click();
      },
    );
    expect(taxRuleResult.ok).toBeTruthy();
    await expect(page.getByText(taxRuleCode).first()).toBeVisible();

    await ruleVersionForm.getByRole("button", { name: "New" }).click();
    const taxRuleVersionResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      /\/api\/hr-admin\/payroll-rule-versions$/,
      "POST",
      async () => {
        await field(ruleVersionForm, "Rule").selectOption(taxRuleResult.payload.id);
        await field(ruleVersionForm, "Version").fill("1");
        await field(ruleVersionForm, "Status").selectOption("active");
        await field(ruleVersionForm, "Expression").fill("salary.monthly_gross * 0.1");
        await field(ruleVersionForm, "Effective from").fill("2026-01-01");
        await field(ruleVersionForm, "Effective to").fill("");
        await field(ruleVersionForm, "Rounding rule reference").fill("payroll.round.nearest_rupee.v1");
        await field(ruleVersionForm, "Input schema JSON").fill(JSON.stringify({ required_paths: ["salary.monthly_gross"] }));
        await field(ruleVersionForm, "Output schema JSON").fill(JSON.stringify({ result_path: `components.${statutoryComponentCode.toLowerCase()}` }));
        await field(ruleVersionForm, "Config snapshot JSON").fill(JSON.stringify({
          component_code: statutoryComponentCode,
          component_name: "TDS Compliance Deduction",
          component_type: "tax",
          line_type: "tax",
          calculation_order: 20,
          output_path: `components.${statutoryComponentCode.toLowerCase()}`,
          statutory_pack_id: statutoryPackResult.payload.id,
          statutory_pack_code: statutoryPackCode,
          statutory_component_id: statutoryComponentResult.payload.id,
          statutory_component_code: statutoryComponentCode,
          statutory_type: "tds",
          statutory_treatment_ref: statutoryTreatmentRef,
          profile_ref: "tenant.payroll.rule.version.tds.phase5q.v1",
        }));
        await ruleVersionForm.getByRole("button", { name: "Create version" }).click();
      },
    );
    expect(taxRuleVersionResult.ok).toBeTruthy();
    await expect(page.getByText("payroll rule version saved.").first()).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
    await expectPageReady(page, "Payroll Inputs");

    await expect(page.getByRole("heading", { name: "Payroll input operations" })).toBeVisible();
    const runForm = form(page, "payroll-run-form");
    const snapshotForm = form(page, "payroll-input-snapshot-form");
    const lockForm = form(page, "payroll-input-lock-form");

    await expectFields(runForm, ["Period", "Pay group", "Code", "Name", "Status", "Input profile ref", "Snapshot schema ref", "Config profile reference"]);
    await expectSelectOptions(runForm, "Period");
    await expectSelectOptions(runForm, "Status");
    await expect(runForm.getByRole("button", { name: "New" })).toBeVisible();
    await expect(runForm.getByRole("button", { name: /Create run|Save run/ })).toBeVisible();

    const runCode = uniqueCode("PAY_RUN");
    await runForm.getByRole("button", { name: "New" }).click();
    const runResult = await submitAndCapture<{ id: string; code: string; name: string }>(
      page,
      /\/api\/hr-admin\/payroll-runs$/,
      "POST",
      async () => {
        await field(runForm, "Code").fill(runCode);
        await field(runForm, "Name").fill(`Browser disposable ${runCode}`);
        await field(runForm, "Status").selectOption("collecting_inputs");
        await field(runForm, "Input profile ref").fill("tenant.payroll.input.phase5c.v1");
        await field(runForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.phase5c.v1");
        await field(runForm, "Config profile reference").fill("tenant.payroll.run.phase5c.v1");
        await runForm.getByRole("button", { name: "Create run" }).click();
      },
    );
    expect(runResult.ok).toBeTruthy();
    await expect(page.getByText(runCode).first()).toBeVisible();

    await expectFields(snapshotForm, [
      "Payroll run",
      "Employee",
      "Snapshot status",
      "Input profile ref",
      "Config profile reference",
      "Employee snapshot JSON",
      "Organization snapshot JSON",
      "Salary snapshot JSON",
      "Attendance snapshot JSON",
      "Validation snapshot JSON",
    ]);
    await expectSelectOptions(snapshotForm, "Payroll run");
    await expectSelectOptions(snapshotForm, "Employee");
    await expectSelectOptions(snapshotForm, "Snapshot status");

    await snapshotForm.getByRole("button", { name: "New" }).click();
    const snapshotResult = await submitAndCapture<{ id: string; employee_name: string; snapshot_status: string }>(
      page,
      /\/api\/hr-admin\/payroll-input-snapshots$/,
      "POST",
      async () => {
        await field(snapshotForm, "Payroll run").selectOption(runResult.payload.id);
        await selectOptionContaining(field(snapshotForm, "Employee"), "EMP-0042");
        await field(snapshotForm, "Snapshot status").selectOption("ready");
        await field(snapshotForm, "Input profile ref").fill("tenant.payroll.input.phase5c.v1");
        await field(snapshotForm, "Config profile reference").fill("tenant.payroll.snapshot.phase5c.v1");
        await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify({ source: "browser", employment_status: "active" }));
        await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify({ source: "browser", legal_entity: "Phase 5C" }));
        await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 600000, monthly_gross: 50000, currency_code: "INR" }));
        await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 22, present_days: 22, lop_days: 0 }));
        await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify({ blockers: [], warnings: [] }));
        await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
      },
    );
    expect(snapshotResult.ok).toBeTruthy();
    await expect(page.getByText("payroll input snapshot saved.").first()).toBeVisible();

    const updateResult = await submitAndCapture<{ id: string; snapshot_status: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-input-snapshots/${snapshotResult.payload.id}$`),
      "PATCH",
      async () => {
        await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 612000, monthly_gross: 51000, currency_code: "INR" }));
        await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 22, present_days: 21, lop_days: 1 }));
        await snapshotForm.getByRole("button", { name: "Save snapshot" }).click();
      },
    );
    expect(updateResult.ok).toBeTruthy();
    await expect(field(snapshotForm, "Attendance snapshot JSON")).toHaveValue(/"lop_days":1/);

    await expect(lockForm.getByRole("heading", { name: "Input lock" })).toBeVisible();
    await expect(lockForm.getByRole("button", { name: "Lock selected run inputs" })).toBeEnabled();
    const lockResult = await submitAndCapture<{ detail: string; locked_count: number }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${runResult.payload.id}/lock-inputs$`),
      "POST",
      async () => {
        await lockForm.getByRole("button", { name: "Lock selected run inputs" }).click();
      },
    );
    expect(lockResult.ok).toBeTruthy();
    expect(lockResult.payload.locked_count).toBeGreaterThanOrEqual(1);
    await expect(page.getByText("Payroll input snapshots locked for calculation.").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${runResult.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("heading", { name: "Calculation controls" })).toBeVisible();
    const calculateResponse = await submitAndCapture<{ calculation: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${runResult.payload.id}/calculate-draft$`),
      "POST",
      async () => {
        await page.getByLabel("Calculation controls").getByLabel("Calculation profile ref").fill("tenant.payroll.calc.phase5c.v1");
        await page.getByLabel("Calculation controls").getByRole("button", { name: "Calculate draft" }).click();
      },
    );
    expect(calculateResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Draft payroll calculation completed/);
    await expectNoHorizontalOverflow(page);

    const reviewResponse = await submitAndCapture<{ review: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${runResult.payload.id}/open-review$`),
      "POST",
      async () => {
        await page.getByLabel("Calculation controls").getByLabel("Review profile ref").fill("tenant.payroll.review.phase5e.v1");
        await page.getByLabel("Calculation controls").getByRole("button", { name: "Open review" }).click();
      },
    );
    expect(reviewResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Payroll review opened/);

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${reviewResponse.payload.review.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    const reviewPanel = page.getByLabel("Review controls");
    await expect(reviewPanel.getByRole("button", { name: "Submit review" })).toBeEnabled();
    const submitReviewResponse = await submitAndCapture<{ review: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${reviewResponse.payload.review.id}/submit$`),
      "POST",
      async () => {
        await reviewPanel.getByRole("button", { name: "Submit review" }).click();
      },
    );
    expect(submitReviewResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/submitted for approval/);

    const approveResponse = await submitAndCapture<{ review: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${reviewResponse.payload.review.id}/approve$`),
      "POST",
      async () => {
        await reviewPanel.getByLabel("Approval profile ref").fill("tenant.payroll.approval.phase5e.v1");
        await reviewPanel.getByRole("button", { name: "Approve review" }).click();
      },
    );
    expect(approveResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Payroll review approved/);

    const lockResponse = await submitAndCapture<{ review: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${reviewResponse.payload.review.id}/lock$`),
      "POST",
      async () => {
        await reviewPanel.getByRole("button", { name: "Final lock" }).click();
      },
    );
    expect(lockResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Payroll run final locked/);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${runResult.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    const calculationPanelAfterLock = page.getByLabel("Calculation controls");
    const reopenLockedReviewResponse = await submitAndCapture<{ detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${runResult.payload.id}/open-review$`),
      "POST",
      async () => {
        await calculationPanelAfterLock.getByRole("button", { name: "Open review" }).click();
      },
    );
    expect(reopenLockedReviewResponse.status).toBe(400);
    await expect(page.getByRole("alert").first()).toContainText(/Final locked payroll runs cannot be reopened for review/);

    await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${runResult.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Inputs");
    const lockedRunForm = form(page, "payroll-run-form");
    const editLockedRunResponse = await submitAndCapture<{ detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${runResult.payload.id}$`),
      "PATCH",
      async () => {
        await field(lockedRunForm, "Name").fill(`Edited locked ${runCode}`);
        await lockedRunForm.getByRole("button", { name: "Save run" }).click();
      },
    );
    expect(editLockedRunResponse.status).toBe(400);
    await expect(page.getByRole("alert").first()).toContainText(/Final locked payroll runs cannot be edited/);

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${reviewResponse.payload.review.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");

    const outputResponse = await submitAndCapture<{ output_batch: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${reviewResponse.payload.review.id}/generate-outputs$`),
      "POST",
      async () => {
        await reviewPanel.getByLabel("Output profile ref").fill("tenant.payroll.outputs.phase5e.v1");
        await reviewPanel.getByRole("button", { name: "Generate outputs" }).click();
      },
    );
    expect(outputResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Payroll outputs generated/);

    await gotoAuthenticated(page, `/hr-admin/payroll-outputs?batchId=${outputResponse.payload.output_batch.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Outputs");
    const outputPanel = page.getByLabel("Output controls");
    await expect(outputPanel.getByRole("button", { name: "Publish outputs" })).toBeEnabled();
    const publishResponse = await submitAndCapture<{ output_batch: { id: string; status: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-output-batches/${outputResponse.payload.output_batch.id}/publish$`),
      "POST",
      async () => {
        await outputPanel.getByRole("button", { name: "Publish outputs" }).click();
      },
    );
    expect(publishResponse.ok).toBeTruthy();
    expect(publishResponse.payload.output_batch.status).toBe("published");
    await expect(page.getByRole("status").first()).toContainText(/Payroll outputs published/);
    await expectNoHorizontalOverflow(page);

    const handoffResponse = await submitAndCapture<{ handoff: { id: string; status: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-output-batches/${outputResponse.payload.output_batch.id}/generate-finance-handoff$`),
      "POST",
      async () => {
        await outputPanel.getByLabel("Handoff profile ref").fill("tenant.payroll.handoff.phase5f.v1");
        await outputPanel.getByRole("button", { name: "Generate handoff" }).click();
      },
    );
    expect(handoffResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Payroll finance handoff generated/);

    await gotoAuthenticated(page, "/hr-admin/reports/statutory-deductions", hrAdmin);
    await expectPageReady(page, "Statutory Deduction Summary");
    const statutoryReport = page.getByTestId("statutory-deductions-report");
    await statutoryReport.getByPlaceholder("Search component, employee, provider, hash").fill(statutoryComponentCode);
    const mappedTdsRow = statutoryReport.locator("tbody tr").filter({ hasText: statutoryComponentCode }).first();
    await expect(mappedTdsRow).toBeVisible();
    await expect(mappedTdsRow).toContainText("Tax Deducted At Source");
    await expect(mappedTdsRow).toContainText(statutoryRegistrationResult.payload.registration_number);
    await expect(mappedTdsRow).toContainText("income_tax_department");
    await expect(mappedTdsRow).toContainText("payroll.provider.tds.fvu.phase5q");
    await expect(mappedTdsRow.locator("code").last()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoffResponse.payload.handoff.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Handoff");
    const handoffPanel = page.getByLabel("Handoff controls");
    await expect(handoffPanel.getByRole("button", { name: "Transmit handoff" })).toBeEnabled();
    const transmitResponse = await submitAndCapture<{ handoff: { id: string; status: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoffResponse.payload.handoff.id}/transmit$`),
      "POST",
      async () => {
        await handoffPanel.getByRole("button", { name: "Transmit handoff" }).click();
      },
    );
    expect(transmitResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Payroll finance handoff transmitted/);

    await gotoAuthenticated(page, "/hr-admin/reports/statutory-deductions", hrAdmin);
    await expectPageReady(page, "Statutory Deduction Summary");
    const transmittedStatutoryReport = page.getByTestId("statutory-deductions-report");
    await transmittedStatutoryReport.getByPlaceholder("Search component, employee, provider, hash").fill(statutoryComponentCode);
    const transmittedMappedTdsRow = transmittedStatutoryReport.locator("tbody tr").filter({ hasText: statutoryComponentCode }).first();
    await expect(transmittedMappedTdsRow).toContainText("Published");
    const statutoryExport = transmittedMappedTdsRow.getByRole("link", { name: "Export" });
    await expect(statutoryExport).toHaveAttribute("href", /\/api\/hr-admin\/payroll-output-artifacts\/.+\/download/);
    const statutoryExportHref = await statutoryExport.getAttribute("href");
    const statutoryExportResponse = await page.request.get(statutoryExportHref ?? "");
    expect(statutoryExportResponse.status()).toBe(200);
    expect(statutoryExportResponse.headers()["x-payroll-artifact-checksum"]).toBeTruthy();
    await gotoAuthenticated(page, `/hr-admin/payroll-handoff?handoffId=${handoffResponse.payload.handoff.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Handoff");

    const acknowledgeResponse = await submitAndCapture<{ handoff: { id: string; status: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoffResponse.payload.handoff.id}/acknowledge$`),
      "POST",
      async () => {
        await handoffPanel.getByLabel("Acknowledgement profile ref").fill("tenant.payroll.ack.phase5f.v1");
        await handoffPanel.getByRole("button", { name: "Acknowledge handoff" }).click();
      },
    );
    expect(acknowledgeResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/acknowledgement recorded/);

    const auditPackResponse = await submitAndCapture<{ handoff: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-finance-handoffs/${handoffResponse.payload.handoff.id}/generate-audit-pack$`),
      "POST",
      async () => {
        await handoffPanel.getByLabel("Audit pack profile ref").fill("tenant.payroll.audit.phase5f.v1");
        await handoffPanel.getByRole("button", { name: "Generate audit pack" }).click();
      },
    );
    expect(auditPackResponse.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/audit pack generated/);
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/ess/payslips?q=${runCode}`, employee);
    await expectPageReady(page, "Payslips");
    await expect(page.getByRole("heading", { name: "Payslip register" })).toBeVisible();
    await expect(page.getByText(runCode).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download payslip" }).first()).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/.+\/download/);
    await expect(page.getByText("Source hash").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
