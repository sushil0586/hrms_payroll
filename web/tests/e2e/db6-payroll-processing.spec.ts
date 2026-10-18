import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  loadIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, type Persona } from "../helpers/staging-auth";

let workspace: IsolatedQaWorkspace;
let hrAdmin: Persona;
let employee: Persona;

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

async function submitAndCapture<T>(page: Page, route: RegExp, action: () => Promise<void>, method = "POST") {
  const [response] = await Promise.all([
    page.waitForResponse((item) => route.test(item.url()) && item.request().method() === method, { timeout: 30_000 }),
    action(),
  ]);
  return { status: response.status(), ok: response.ok(), payload: await response.json() as T };
}

async function expectReactHandler(control: Locator) {
  await expect.poll(() => control.evaluate((element) => Object.keys(element).some((key) => key.startsWith("__reactProps")))).toBeTruthy();
}

test.describe("DB-6.10/11 browser-first payroll processing and outputs", () => {
  test.beforeEach(async ({}, testInfo) => {
    const manifestPath = process.env.PLAYWRIGHT_EXISTING_QA_WORKSPACE_MANIFEST;
    workspace = manifestPath
      ? await loadIsolatedQaWorkspace(manifestPath, process.env.PLAYWRIGHT_EXISTING_QA_WORKSPACE_SEED_REF ?? "db6-connected")
      : await provisionIsolatedQaWorkspace(testInfo);
    hrAdmin = workspacePersona(workspace, "hr_admin");
    employee = workspacePersona(workspace, "employee");
  });

  test("locks inputs, completes durable calculation, approves, publishes outputs, and generates finance handoff", async ({ page }) => {
    test.setTimeout(180_000);
    const employeeCode = workspace.manifest.credentials.employee.employee_code;
    const runCode = `DB610_${Date.now()}`;
    const periodStart = process.env.DB6_PAYROLL_PERIOD_START ?? "2026-11-01";
    const periodEnd = process.env.DB6_PAYROLL_PERIOD_END ?? "2026-11-30";
    const payDate = process.env.DB6_PAYROLL_PAY_DATE ?? periodEnd;
    const periodLabel = process.env.DB6_PAYROLL_PERIOD_LABEL ?? "November 2026";

    await gotoAuthenticated(page, "/hr-admin/payroll-inputs?tab=actions", hrAdmin);
    await expectPageReady(page, "Payroll Inputs");
    const periodResponse = await page.evaluate(async (data) => {
      const response = await fetch("/api/hr-admin/payroll-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { ok: response.ok, status: response.status, body: await response.text() };
    }, {
        calendar_id: workspace.manifest.payroll.calendar_id,
        code: `db610-${periodStart.slice(0, 7)}-${Date.now()}`,
        name: `DB-6.10 ${periodLabel}`,
        start_date: periodStart,
        end_date: periodEnd,
        pay_date: payDate,
        status: "open",
        config_profile_ref: "tenant.payroll.period.db610.v1",
    });
    expect(periodResponse.ok, `${periodResponse.status}: ${periodResponse.body}`).toBeTruthy();
    const period = JSON.parse(periodResponse.body) as { id: string };
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Inputs");
    const steps = page.getByRole("navigation", { name: "Payroll input operation steps" });
    const runForm = form(page, "payroll-run-form");
    const snapshotForm = form(page, "payroll-input-snapshot-form");
    const lockForm = form(page, "payroll-input-lock-form");

    await steps.getByRole("button", { name: /Payroll run/ }).click();
    await runForm.getByRole("button", { name: "New" }).click();
    const run = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-runs\/?$/, async () => {
      await field(runForm, "Period").selectOption(period.id);
      await field(runForm, "Pay group").selectOption(workspace.manifest.payroll.pay_group_id);
      await field(runForm, "Code").fill(runCode);
      await field(runForm, "Name").fill(`DB-6.10 ${runCode}`);
      await field(runForm, "Status").selectOption("collecting_inputs");
      await field(runForm, "Input profile ref").fill("tenant.payroll.input.db610.v1");
      await field(runForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.db610.v1");
      await field(runForm, "Config profile reference").fill("tenant.payroll.run.db610.v1");
      await runForm.getByRole("button", { name: "Create run" }).click();
    });
    expect(run.ok, `${run.status}: ${JSON.stringify(run.payload)}`).toBeTruthy();

    await steps.getByRole("button", { name: /Input snapshot/ }).click();
    await snapshotForm.getByRole("button", { name: "New" }).click();
    await field(snapshotForm, "Payroll run").selectOption(run.payload.id);
    await field(snapshotForm, "Find person").fill(employeeCode);
    await expect(field(snapshotForm, "Employee").locator("option").filter({ hasText: employeeCode })).toHaveCount(1);
    const snapshot = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-input-snapshots\/?$/, async () => {
      await selectOptionContaining(field(snapshotForm, "Employee"), employeeCode);
      await field(snapshotForm, "Snapshot status").selectOption("ready");
      await field(snapshotForm, "Input profile ref").fill("tenant.payroll.input.db610.v1");
      await field(snapshotForm, "Config profile reference").fill("tenant.payroll.snapshot.db610.v1");
      await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify({ employment_status: "active" }));
      await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify({ tenant: workspace.manifest.tenant.id }));
      await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ annual_ctc: 600000, monthly_gross: 50000, currency_code: "INR" }));
      await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 21, present_days: 20, lop_days: 1 }));
      await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify({ blockers: [], warnings: [] }));
      await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
    });
    expect(snapshot.ok).toBeTruthy();

    await page.goto(`/hr-admin/payroll-inputs?tab=actions&runId=${run.payload.id}`, { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Inputs");
    await steps.getByRole("button", { name: /Lock gate/ }).click();
    const locked = await submitAndCapture<{ locked_count: number }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/lock-inputs$`), async () => {
      await lockForm.getByRole("button", { name: "Lock selected run inputs" }).click();
    });
    expect(locked.ok).toBeTruthy();
    expect(locked.payload.locked_count).toBe(1);

    await page.goto(`/hr-admin/payroll-calculations?runId=${run.payload.id}`, { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Calculations");
    const controls = page.getByRole("region", { name: "Calculation controls" });
    const calculationProfile = controls.getByLabel("Calculation profile ref");
    await expect.poll(() => calculationProfile.evaluate((input) => Boolean((input as HTMLInputElement & { _valueTracker?: unknown })._valueTracker))).toBeTruthy();
    const accepted = await submitAndCapture<{ job: { id: string; status: string } }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/calculate-draft$`), async () => {
      await calculationProfile.fill("tenant.payroll.calc.db610.v1");
      const calculateButton = controls.getByRole("button", { name: "Calculate draft" });
      await expect(calculateButton).toBeEnabled();
      await calculateButton.click();
    });
    expect(accepted.status).toBe(202);
    expect(accepted.payload.job.status).toBe("queued");
    await expect(controls).toContainText(/Queued|Running|Succeeded|completed/i);
    await expect(controls).toContainText(/Succeeded|completed/i, { timeout: 30_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("region", { name: "Calculation controls" })).toContainText(/Succeeded|completed/i);
    const openReviewButton = page.getByRole("region", { name: "Calculation controls" }).getByRole("button", { name: "Open review" });
    await expectReactHandler(openReviewButton);
    const openReview = await submitAndCapture<{ review: { id: string } }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/open-review$`), async () => {
      await openReviewButton.click();
    });
    expect(openReview.ok).toBeTruthy();

    await page.goto(`/hr-admin/payroll-review?reviewId=${openReview.payload.review.id}`, { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Review");
    const review = page.getByLabel("Review controls");
    await expectReactHandler(review.getByRole("button", { name: "Submit review" }));
    expect((await submitAndCapture(page, new RegExp(`/api/hr-admin/payroll-reviews/${openReview.payload.review.id}/submit$`), () => review.getByRole("button", { name: "Submit review" }).click())).ok).toBeTruthy();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Review");
    await expectReactHandler(review.getByRole("button", { name: "Approve review" }));
    await expect(review.getByRole("button", { name: "Approve review" })).toBeEnabled();
    expect((await submitAndCapture(page, new RegExp(`/api/hr-admin/payroll-reviews/${openReview.payload.review.id}/approve$`), async () => {
      await review.getByLabel("Approval profile ref").fill("tenant.payroll.approval.db610.v1");
      await review.getByLabel("Approval comment").fill("DB-6.10 independent payroll reconciliation completed.");
      await review.getByRole("button", { name: "Approve review" }).click();
    })).ok).toBeTruthy();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Review");
    await expectReactHandler(review.getByRole("button", { name: "Final lock" }));
    await expect(review.getByRole("button", { name: "Final lock" })).toBeEnabled();
    expect((await submitAndCapture(page, new RegExp(`/api/hr-admin/payroll-reviews/${openReview.payload.review.id}/lock$`), () => review.getByRole("button", { name: "Final lock" }).click())).ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText("Payroll run final locked");

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Review");
    await expectReactHandler(review.getByRole("button", { name: "Generate outputs" }));
    await expect(review.getByRole("button", { name: "Generate outputs" })).toBeEnabled();
    const outputJob = await submitAndCapture<{ job: { id: string; status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${openReview.payload.review.id}/generate-outputs$`), async () => {
      await review.getByLabel("Output profile ref").fill("tenant.payroll.outputs.db611.v1");
      await review.getByRole("button", { name: "Generate outputs" }).click();
    });
    expect(outputJob.status).toBe(202);
    await expect(review).toContainText(/Completed|succeeded/i, { timeout: 30_000 });

    await page.goto("/hr-admin/payroll-outputs?batchPageSize=25", { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Outputs");
    const batchRail = page.getByRole("heading", { name: "Output batches" }).locator("xpath=ancestor::aside[1]");
    const batchLink = batchRail.getByRole("link", { name: new RegExp(runCode) });
    await expect(batchLink).toBeVisible();
    const batchHref = await batchLink.getAttribute("href");
    const batchId = new URL(batchHref!, page.url()).searchParams.get("batchId");
    expect(batchId).toBeTruthy();
    await batchLink.click();
    await expect(page).toHaveURL(new RegExp(`batchId=${batchId}`));
    const outputControls = page.getByRole("region", { name: "Output controls" });
    const publishButton = outputControls.getByRole("button", { name: "Publish outputs" });
    await expectReactHandler(publishButton);
    await expect(publishButton).toBeEnabled();
    const publishJob = await submitAndCapture<{ job: { id: string; status: string } }>(page, new RegExp(`/api/hr-admin/payroll-output-batches/${batchId}/publish$`), () => publishButton.click());
    expect(publishJob.status).toBe(202);
    await expect(outputControls).toContainText(/Completed|succeeded/i, { timeout: 30_000 });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByText(/Published/).first()).toBeVisible();
    const handoffButton = page.getByRole("region", { name: "Output controls" }).getByRole("button", { name: "Generate handoff" });
    await expectReactHandler(handoffButton);
    await expect(handoffButton).toBeEnabled();
    const handoffJob = await submitAndCapture<{ job: { id: string; status: string } }>(page, new RegExp(`/api/hr-admin/payroll-output-batches/${batchId}/generate-finance-handoff$`), async () => {
      await page.getByRole("region", { name: "Output controls" }).getByLabel("Handoff profile ref").fill("tenant.payroll.finance.handoff.db611.v1");
      await handoffButton.click();
    });
    expect(handoffJob.status).toBe(202);
    await expect(page.getByRole("region", { name: "Output controls" })).toContainText(/Completed|succeeded/i, { timeout: 30_000 });

    await gotoAuthenticated(page, `/ess/payslips?q=${encodeURIComponent(runCode)}`, employee);
    await expectPageReady(page, "Payslips");
    await expect(page.getByText(runCode).first()).toBeVisible();
    const downloadLink = page.getByRole("link", { name: /Download latest|Download payslip/ }).first();
    await expect(downloadLink).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/.+\/download/);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      downloadLink.click(),
    ]);
    expect(download.suggestedFilename()).toBeTruthy();
    expect(await download.failure()).toBeNull();
  });
});
