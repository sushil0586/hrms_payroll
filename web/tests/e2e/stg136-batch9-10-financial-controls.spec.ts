import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

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
let hrChecker: Persona;

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

test.describe("STG-136 Batch 9 closure and Batch 10 outputs", () => {
  test.beforeEach(async ({}, testInfo) => {
    const manifestPath = process.env.PLAYWRIGHT_EXISTING_QA_WORKSPACE_MANIFEST;
    workspace = manifestPath
      ? await loadIsolatedQaWorkspace(manifestPath, process.env.PLAYWRIGHT_EXISTING_QA_WORKSPACE_SEED_REF ?? "db6-connected")
      : await provisionIsolatedQaWorkspace(testInfo);
    hrAdmin = workspacePersona(workspace, "hr_admin");
    employee = workspacePersona(workspace, "employee");
    hrChecker = workspacePersona(workspace, "hr_checker");
  });

  test("STG-E2E-0903 0904 0908 and 1001-1009 financial controls", async ({ page }) => {
    test.setTimeout(180_000);
    const employeeCode = workspace.manifest.credentials.employee.employee_code;
    const runCode = `STG_B910_${Date.now()}`;
    const periodStart = process.env.DB6_PAYROLL_PERIOD_START ?? "2026-11-01";
    const periodEnd = process.env.DB6_PAYROLL_PERIOD_END ?? "2026-11-30";
    const payDate = process.env.DB6_PAYROLL_PAY_DATE ?? periodEnd;
    const periodLabel = process.env.DB6_PAYROLL_PERIOD_LABEL ?? "November 2026";
    expect(process.env.PROTECTED_PAYROLL_DIFF_SHA).toBeTruthy();

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

    await page.goto(`/hr-admin/payroll-inputs?tab=actions&runId=${run.payload.id}`, { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Inputs");
    await page.getByRole("button", { name: /Payroll run/ }).click();
    const duplicateRunForm = form(page, "payroll-run-form");
    await duplicateRunForm.getByRole("button", { name: "New" }).click();
    const duplicateRun = await submitAndCapture(page, /\/api\/hr-admin\/payroll-runs\/?$/, async () => {
      await field(duplicateRunForm, "Period").selectOption(period.id);
      await field(duplicateRunForm, "Pay group").selectOption(workspace.manifest.payroll.pay_group_id);
      await field(duplicateRunForm, "Code").fill(`${runCode}_DUPLICATE`);
      await field(duplicateRunForm, "Name").fill(`Duplicate ${runCode}`);
      await field(duplicateRunForm, "Status").selectOption("collecting_inputs");
      await field(duplicateRunForm, "Input profile ref").fill("tenant.payroll.input.stg-b910.v1");
      await field(duplicateRunForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.stg-b910.v1");
      await field(duplicateRunForm, "Config profile reference").fill("tenant.payroll.run.stg-b910.v1");
      await duplicateRunForm.getByRole("button", { name: "Create run" }).click();
    });
    expect(duplicateRun.status).toBe(400);

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

    await steps.getByRole("button", { name: /Input snapshot/ }).click();
    await snapshotForm.locator(".salary-crud-record").first().click();
    const lockedMutation = await submitAndCapture(page, new RegExp(`/api/hr-admin/payroll-input-snapshots/${snapshot.payload.id}$`), async () => {
      await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ annual_ctc: 1, monthly_gross: 1, currency_code: "INR" }));
      await snapshotForm.getByRole("button", { name: "Save snapshot" }).click();
    }, "PATCH");
    expect(lockedMutation.status).toBe(400);
    expect(JSON.stringify(lockedMutation.payload)).toContain("immutable");

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
    await page.getByRole("navigation", { name: "Payroll review workspace sections" }).getByRole("link", { name: /Actions/ }).click();
    await expect(page).toHaveURL(/tab=actions/);
    const review = page.getByLabel("Review controls");
    await expectReactHandler(review.getByRole("button", { name: "Submit review" }));
    expect((await submitAndCapture(page, new RegExp(`/api/hr-admin/payroll-reviews/${openReview.payload.review.id}/submit$`), () => review.getByRole("button", { name: "Submit review" }).click())).ok).toBeTruthy();
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Review");
    await expectReactHandler(review.getByRole("button", { name: "Approve review" }));
    await expect(review.getByRole("button", { name: "Approve review" })).toBeEnabled();
    const selfApproval = await submitAndCapture(page, new RegExp(`/api/hr-admin/payroll-reviews/${openReview.payload.review.id}/approve$`), async () => {
      await review.getByLabel("Approval profile ref").fill("tenant.payroll.approval.stg-b910.v1");
      await review.getByLabel("Approval comment").fill("Maker self-approval must be rejected.");
      await review.getByRole("button", { name: "Approve review" }).click();
    });
    expect(selfApproval.status).toBe(400);
    expect(JSON.stringify(selfApproval.payload)).toContain("submitter cannot approve");

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${openReview.payload.review.id}&tab=actions`, hrChecker);
    await expectPageReady(page, "Payroll Review");
    const checkerReview = page.getByLabel("Review controls");
    await expectReactHandler(checkerReview.getByRole("button", { name: "Approve review" }));
    const approval = await submitAndCapture(page, new RegExp(`/api/hr-admin/payroll-reviews/${openReview.payload.review.id}/approve$`), async () => {
      await checkerReview.getByLabel("Approval profile ref").fill("tenant.payroll.approval.stg-b910.v1");
      await checkerReview.getByLabel("Approval comment").fill("Independent checker reconciliation completed.");
      await checkerReview.getByRole("button", { name: "Approve review" }).click();
    });
    expect(approval.ok).toBeTruthy();

    const staleApproval = await page.evaluate(async (reviewId) => {
      const response = await fetch(`/api/hr-admin/payroll-reviews/${reviewId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approval_profile_ref: "tenant.payroll.approval.stg-b910.v1", comment: "stale replay" }),
      });
      return { status: response.status, body: await response.text() };
    }, openReview.payload.review.id);
    expect(staleApproval.status).toBe(400);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Review");
    await expectReactHandler(checkerReview.getByRole("button", { name: "Final lock" }));
    await expect(checkerReview.getByRole("button", { name: "Final lock" })).toBeEnabled();
    expect((await submitAndCapture(page, new RegExp(`/api/hr-admin/payroll-reviews/${openReview.payload.review.id}/lock$`), () => checkerReview.getByRole("button", { name: "Final lock" }).click())).ok).toBeTruthy();
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
    await page.getByRole("navigation", { name: "Payroll output sections" }).getByRole("link", { name: /Actions/ }).click();
    await expect(page).toHaveURL(/tab=actions/);
    const outputControls = page.getByRole("region", { name: "Output controls" });
    const publishButton = outputControls.getByRole("button", { name: "Publish outputs" });
    await expectReactHandler(publishButton);
    await expect(publishButton).toBeEnabled();
    const publishJob = await submitAndCapture<{ job: { id: string; status: string } }>(page, new RegExp(`/api/hr-admin/payroll-output-batches/${batchId}/publish$`), () => publishButton.click());
    expect(publishJob.status).toBe(202);
    await expect(outputControls).toContainText(/Completed|succeeded/i, { timeout: 30_000 });

    const publishReplay = await page.evaluate(async (id) => {
      const response = await fetch(`/api/hr-admin/payroll-output-batches/${id}/publish`, { method: "POST" });
      return { status: response.status, payload: await response.json() };
    }, batchId);
    expect(publishReplay.status).toBe(200);
    expect(publishReplay.payload.output_batch.id).toBe(batchId);
    expect(publishReplay.payload.output_batch.status).toBe("published");

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
    await expect.poll(async () => {
      return page.evaluate(async (jobId) => {
        const response = await fetch(`/api/hr-admin/payroll-jobs/${jobId}`);
        const payload = await response.json();
        return payload.job.status as string;
      }, handoffJob.payload.job.id);
    }, { timeout: 30_000 }).toBe("succeeded");

    const outputEvidence = await page.evaluate(async (id) => {
      const response = await fetch(`/api/hr-admin/payroll-output-setup?batch_id=${id}&artifact_page_size=50`);
      return { status: response.status, payload: await response.json() };
    }, batchId);
    expect(outputEvidence.status).toBe(200);
    const artifacts = outputEvidence.payload.artifacts as Array<{ id: string; kind: string; checksum_sha256: string; totals_snapshot: Record<string, string>; payroll_run_id: string; status: string }>;
    for (const kind of ["payslip", "register", "bank_advice", "accounting_export"]) {
      const artifact = artifacts.find((item) => item.kind === kind);
      expect(artifact, `${kind} artifact`).toBeTruthy();
      expect(artifact!.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(artifact!.payroll_run_id).toBe(run.payload.id);
    }
    const register = artifacts.find((item) => item.kind === "register")!;
    const bankAdvice = artifacts.find((item) => item.kind === "bank_advice")!;
    expect(register.totals_snapshot.net_pay).toBe("50000.00");
    expect(bankAdvice.totals_snapshot.net_pay).toBe("50000.00");

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
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const payslipArtifact = artifacts.find((item) => item.kind === "payslip")!;
    const downloadChecksum = createHash("sha256").update(await readFile(downloadPath!)).digest("hex");
    expect(downloadChecksum).toBe(payslipArtifact.checksum_sha256);

    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", hrChecker);
    const otherEmployeeAccess = await page.evaluate(async (id) => {
      const response = await fetch(`/api/me/payroll-payslips/${id}/download`);
      return response.status;
    }, payslipArtifact.id);
    expect(otherEmployeeAccess).toBe(404);

    await page.context().clearCookies();
    const unauthenticatedAccess = await page.goto(`/api/me/payroll-payslips/${payslipArtifact.id}/download`, { waitUntil: "domcontentloaded" });
    expect(unauthenticatedAccess?.status()).toBe(401);
  });
});
