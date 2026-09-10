import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function form(page: Page, testId: string) {
  return page.getByTestId(testId);
}

function field(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select, textarea").first();
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

async function createWarningLockedRun(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
  await expectPageReady(page, "Payroll Inputs");

  const runForm = form(page, "payroll-run-form");
  const snapshotForm = form(page, "payroll-input-snapshot-form");
  const lockForm = form(page, "payroll-input-lock-form");
  const runCode = uniqueCode("WARN_TRACE");

  await runForm.getByRole("button", { name: "New" }).click();
  const run = await submitAndCapture<{ id: string; code: string }>(
    page,
    /\/api\/hr-admin\/payroll-runs$/,
    "POST",
    async () => {
      await field(runForm, "Code").fill(runCode);
      await field(runForm, "Name").fill(`Warning trace ${runCode}`);
      await field(runForm, "Status").selectOption("collecting_inputs");
      await field(runForm, "Input profile ref").fill("tenant.payroll.input.warning_trace.v1");
      await field(runForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.warning_trace.v1");
      await field(runForm, "Config profile reference").fill("tenant.payroll.run.warning_trace.v1");
      await runForm.getByRole("button", { name: "Create run" }).click();
    },
  );
  expect(run.ok).toBeTruthy();

  await snapshotForm.getByRole("button", { name: "New" }).click();
  const snapshot = await submitAndCapture<{ id: string; snapshot_status: string }>(
    page,
    /\/api\/hr-admin\/payroll-input-snapshots$/,
    "POST",
    async () => {
      await field(snapshotForm, "Payroll run").selectOption(run.payload.id);
      await selectOptionContaining(field(snapshotForm, "Employee"), "EMP-0042");
      await field(snapshotForm, "Snapshot status").selectOption("warning");
      await field(snapshotForm, "Input profile ref").fill("tenant.payroll.input.warning_trace.v1");
      await field(snapshotForm, "Config profile reference").fill("tenant.payroll.snapshot.warning_trace.v1");
      await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify({ source: "browser", employment_status: "active" }));
      await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify({ source: "browser", legal_entity: "Warning Trace", cost_center: "QA-CC" }));
      await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 720000, monthly_gross: 60000, currency_code: "INR" }));
      await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 22, present_days: 22, lop_days: 0 }));
      await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify({ blockers: [], warnings: ["Missing primary bank account."] }));
      await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
    },
  );
  expect(snapshot.ok).toBeTruthy();
  expect(snapshot.payload.snapshot_status).toBe("warning");

  await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${run.payload.id}&snapshotId=${snapshot.payload.id}`, hrAdmin);
  await expectPageReady(page, "Payroll Inputs");
  await expect(page.locator(".payroll-input-lock-grid .detail-row").filter({ hasText: "Warnings" })).toContainText("1");
  await expect(page.locator("aside[aria-label$='payroll input snapshot']")).toContainText("Missing primary bank account.");

  const lock = await submitAndCapture<{ locked_count: number }>(
    page,
    new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/lock-inputs$`),
    "POST",
    async () => {
      await lockForm.getByRole("button", { name: "Lock selected run inputs" }).click();
    },
  );
  expect(lock.ok).toBeTruthy();
  expect(lock.payload.locked_count).toBeGreaterThanOrEqual(1);

  return { runId: run.payload.id, runCode };
}

async function createDisposableActiveRule(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-rules", hrAdmin);
  await expectPageReady(page, "Payroll Rules");
  const ruleDefinitionForm = form(page, "payroll-rule-definition-form");
  const ruleVersionForm = form(page, "payroll-rule-version-form");
  const ruleCode = uniqueCode("WARN_TRACE_RULE");

  await ruleDefinitionForm.getByRole("button", { name: "New" }).click();
  const rule = await submitAndCapture<{ id: string; code: string }>(
    page,
    /\/api\/hr-admin\/payroll-rule-definitions$/,
    "POST",
    async () => {
      await field(ruleDefinitionForm, "Code").fill(ruleCode);
      await field(ruleDefinitionForm, "Name").fill(`Warning trace ${ruleCode}`);
      await field(ruleDefinitionForm, "Rule type").selectOption("formula");
      await field(ruleDefinitionForm, "Description").fill("Browser-created warning trace calculation rule.");
      await field(ruleDefinitionForm, "Tags JSON").fill(JSON.stringify(["browser", "phase5n", "warning_trace"]));
      await field(ruleDefinitionForm, "Config profile reference").fill("tenant.payroll.rule.warning_trace.v1");
      await ruleDefinitionForm.getByRole("button", { name: "Create rule" }).click();
    },
  );
  expect(rule.ok).toBeTruthy();

  await ruleVersionForm.getByRole("button", { name: "New" }).click();
  const version = await submitAndCapture<{ id: string; status: string }>(
    page,
    /\/api\/hr-admin\/payroll-rule-versions$/,
    "POST",
    async () => {
      await field(ruleVersionForm, "Rule").selectOption(rule.payload.id);
      await field(ruleVersionForm, "Version").fill("1");
      await field(ruleVersionForm, "Status").selectOption("active");
      await field(ruleVersionForm, "Expression").fill("salary.annual_ctc / 12");
      await field(ruleVersionForm, "Effective from").fill("2026-01-01");
      await field(ruleVersionForm, "Effective to").fill("");
      await field(ruleVersionForm, "Rounding rule reference").fill("payroll.round.nearest_rupee.v1");
      await field(ruleVersionForm, "Input schema JSON").fill(JSON.stringify({ required_paths: ["salary.annual_ctc"] }));
      await field(ruleVersionForm, "Output schema JSON").fill(JSON.stringify({ result_path: "components.warning_trace_basic" }));
      await field(ruleVersionForm, "Config snapshot JSON").fill(JSON.stringify({
        component_code: "WARN_TRACE_BASIC",
        component_name: "Warning Trace Basic",
        component_type: "earning",
        calculation_order: 10,
        output_path: "components.warning_trace_basic",
        profile_ref: "tenant.payroll.rule.version.warning_trace.v1",
      }));
      await ruleVersionForm.getByRole("button", { name: "Create version" }).click();
    },
  );
  expect(version.ok).toBeTruthy();
}

test.describe("Phase 5N payroll warning calculation and review trace certification", () => {
  test("warning-locked inputs preserve evidence into calculation validation and review", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await createDisposableActiveRule(page);
    const run = await createWarningLockedRun(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.runId}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    const calculationPanel = page.getByLabel("Calculation controls");
    const calculation = await submitAndCapture<{ calculation: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${run.runId}/calculate-draft$`),
      "POST",
      async () => {
        await calculationPanel.getByLabel("Calculation profile ref").fill("tenant.payroll.calc.warning_trace.v1");
        await calculationPanel.getByRole("button", { name: "Calculate draft" }).click();
      },
    );
    expect(calculation.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Draft payroll calculation completed/);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.runId}&calculationId=${calculation.payload.calculation.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("heading", { name: "Issue register" })).toBeVisible();
    await expect(page.locator(".payroll-calc-validation-card").filter({ hasText: /warning|source-data/i }).first()).toBeVisible();
    await expect(page.locator(".payroll-calc-attempt-table").filter({ hasText: "tenant.payroll.calc.warning_trace.v1" })).toBeVisible();

    const review = await submitAndCapture<{ review: { id: string }; detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${run.runId}/open-review$`),
      "POST",
      async () => {
        await calculationPanel.getByLabel("Review profile ref").fill("tenant.payroll.review.warning_trace.v1");
        await calculationPanel.getByRole("button", { name: "Open review" }).click();
      },
    );
    expect(review.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText(/Payroll review opened/);

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    await expect(page.locator(".payroll-review-card.is-selected").filter({ hasText: run.runCode })).toBeVisible();
    await expect(page.locator(".payroll-review-card.is-selected")).toContainText("tenant.payroll.review.warning_trace.v1");
    await expect(page.getByRole("heading", { name: "Exception register" })).toBeVisible();
    await expect(page.getByText(/warning|source-data|Missing primary bank account/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Open trace" })).toHaveAttribute(
      "href",
      new RegExp(`/hr-admin/payroll-calculations\\?runId=${run.runId}&calculationId=${calculation.payload.calculation.id}`),
    );
    await expectNoHorizontalOverflow(page);
  });
});
