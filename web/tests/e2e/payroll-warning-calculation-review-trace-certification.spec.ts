import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, type Persona } from "../helpers/staging-auth";
import { createPayrollLifecycleOperator } from "../helpers/tenant-rbac";

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
    const options = Array.from((element as HTMLSelectElement).options);
    const option = options.find((item) => item.textContent?.includes(String(needle))) ?? options.find((item) => item.value);
    return option?.value ?? "";
  }, text);
  expect(value).toBeTruthy();
  await select.selectOption(value);
}

async function selectEmployee(scope: Locator, text: string) {
  await scope.getByPlaceholder("Code, name, or email").fill(text);
  const select = field(scope, "Employee");
  await expect
    .poll(async () => {
      return select.evaluate((element) => Array.from((element as HTMLSelectElement).options).filter((item) => item.value).length);
    })
    .toBeGreaterThan(0);
  await selectOptionContaining(select, text);
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

async function createWarningLockedRun(page: Page, payrollOperator: Persona) {
  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", payrollOperator);
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
      await selectEmployee(snapshotForm, "EMP-0042");
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

  await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${run.payload.id}&snapshotId=${snapshot.payload.id}`, payrollOperator);
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

test.describe("Phase 5N payroll warning calculation and review trace certification", () => {
  test("warning-locked inputs preserve evidence into calculation validation and review", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const payrollOperator = await createPayrollLifecycleOperator(page);
    const run = await createWarningLockedRun(page, payrollOperator);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.runId}`, payrollOperator);
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

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.runId}&calculationId=${calculation.payload.calculation.id}`, payrollOperator);
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

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}`, payrollOperator);
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
