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

async function createDisposableActiveRule(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-rules", hrAdmin);
  await expectPageReady(page, "Payroll Rules");
  const ruleDefinitionForm = form(page, "payroll-rule-definition-form");
  const ruleVersionForm = form(page, "payroll-rule-version-form");
  const ruleCode = uniqueCode("REVIEW_RULE");

  await ruleDefinitionForm.getByRole("button", { name: "New" }).click();
  const rule = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-rule-definitions$/, "POST", async () => {
    await field(ruleDefinitionForm, "Code").fill(ruleCode);
    await field(ruleDefinitionForm, "Name").fill(`Review decision ${ruleCode}`);
    await field(ruleDefinitionForm, "Rule type").selectOption("formula");
    await field(ruleDefinitionForm, "Description").fill("Browser-created review decision rule.");
    await field(ruleDefinitionForm, "Tags JSON").fill(JSON.stringify(["browser", "phase5o"]));
    await field(ruleDefinitionForm, "Config profile reference").fill("tenant.payroll.rule.phase5o.v1");
    await ruleDefinitionForm.getByRole("button", { name: "Create rule" }).click();
  });
  expect(rule.ok).toBeTruthy();

  await ruleVersionForm.getByRole("button", { name: "New" }).click();
  const version = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-rule-versions$/, "POST", async () => {
    await field(ruleVersionForm, "Rule").selectOption(rule.payload.id);
    await field(ruleVersionForm, "Version").fill("1");
    await field(ruleVersionForm, "Status").selectOption("active");
    await field(ruleVersionForm, "Expression").fill("salary.annual_ctc / 12");
    await field(ruleVersionForm, "Effective from").fill("2026-01-01");
    await field(ruleVersionForm, "Effective to").fill("");
    await field(ruleVersionForm, "Rounding rule reference").fill("payroll.round.nearest_rupee.v1");
    await field(ruleVersionForm, "Input schema JSON").fill(JSON.stringify({ required_paths: ["salary.annual_ctc"] }));
    await field(ruleVersionForm, "Output schema JSON").fill(JSON.stringify({ result_path: "components.phase5o_basic" }));
    await field(ruleVersionForm, "Config snapshot JSON").fill(JSON.stringify({
      component_code: "PHASE5O_BASIC",
      component_name: "Phase 5O Basic",
      component_type: "earning",
      calculation_order: 10,
      output_path: "components.phase5o_basic",
      profile_ref: "tenant.payroll.rule.version.phase5o.v1",
    }));
    await ruleVersionForm.getByRole("button", { name: "Create version" }).click();
  });
  expect(version.ok).toBeTruthy();
}

async function createApprovedReadyReview(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
  await expectPageReady(page, "Payroll Inputs");
  const runForm = form(page, "payroll-run-form");
  const snapshotForm = form(page, "payroll-input-snapshot-form");
  const lockForm = form(page, "payroll-input-lock-form");
  const runCode = uniqueCode("REVIEW_DECISION");

  await runForm.getByRole("button", { name: "New" }).click();
  const run = await submitAndCapture<{ id: string; code: string }>(page, /\/api\/hr-admin\/payroll-runs$/, "POST", async () => {
    await field(runForm, "Code").fill(runCode);
    await field(runForm, "Name").fill(`Review decision ${runCode}`);
    await field(runForm, "Status").selectOption("collecting_inputs");
    await field(runForm, "Input profile ref").fill("tenant.payroll.input.phase5o.v1");
    await field(runForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.phase5o.v1");
    await field(runForm, "Config profile reference").fill("tenant.payroll.run.phase5o.v1");
    await runForm.getByRole("button", { name: "Create run" }).click();
  });
  expect(run.ok).toBeTruthy();

  await snapshotForm.getByRole("button", { name: "New" }).click();
  const snapshot = await submitAndCapture<{ id: string }>(page, /\/api\/hr-admin\/payroll-input-snapshots$/, "POST", async () => {
    await field(snapshotForm, "Payroll run").selectOption(run.payload.id);
    await selectOptionContaining(field(snapshotForm, "Employee"), "EMP-0042");
    await field(snapshotForm, "Snapshot status").selectOption("ready");
    await field(snapshotForm, "Input profile ref").fill("tenant.payroll.input.phase5o.v1");
    await field(snapshotForm, "Config profile reference").fill("tenant.payroll.snapshot.phase5o.v1");
    await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify({ source: "browser", employment_status: "active" }));
    await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify({ source: "browser", legal_entity: "Phase 5O", cost_center: "QA-CC" }));
    await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 840000, monthly_gross: 70000, currency_code: "INR" }));
    await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 22, present_days: 22, lop_days: 0 }));
    await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify({ blockers: [], warnings: [] }));
    await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
  });
  expect(snapshot.ok).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${run.payload.id}&snapshotId=${snapshot.payload.id}`, hrAdmin);
  await expectPageReady(page, "Payroll Inputs");
  const lock = await submitAndCapture<{ locked_count: number }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/lock-inputs$`), "POST", async () => {
    await lockForm.getByRole("button", { name: "Lock selected run inputs" }).click();
  });
  expect(lock.ok).toBeTruthy();

  await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.payload.id}`, hrAdmin);
  await expectPageReady(page, "Payroll Calculations");
  const calculationPanel = page.getByLabel("Calculation controls");
  const calculation = await submitAndCapture<{ calculation: { id: string } }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/calculate-draft$`), "POST", async () => {
    await calculationPanel.getByLabel("Calculation profile ref").fill("tenant.payroll.calc.phase5o.v1");
    await calculationPanel.getByRole("button", { name: "Calculate draft" }).click();
  });
  expect(calculation.ok).toBeTruthy();

  const review = await submitAndCapture<{ review: { id: string } }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.payload.id}/open-review$`), "POST", async () => {
    await calculationPanel.getByLabel("Review profile ref").fill("tenant.payroll.review.phase5o.v1");
    await calculationPanel.getByRole("button", { name: "Open review" }).click();
  });
  expect(review.ok).toBeTruthy();
  return { runCode, reviewId: review.payload.review.id };
}

test.describe("Phase 5O payroll review exception decision certification", () => {
  test("review controls create, block, decide, submit, approve, lock, and preserve audit evidence", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await createDisposableActiveRule(page);
    const setup = await createApprovedReadyReview(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${setup.reviewId}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    await expect(page.locator(".payroll-review-card.is-selected")).toContainText(setup.runCode);
    await expect(page.getByRole("heading", { name: "Review controls" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Exception actions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Exception register" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Approved calculation lines" })).toBeVisible();

    const actions = page.getByLabel("Exception actions");
    const title = `Browser blocker ${setup.runCode}`;
    await actions.getByLabel("Title").fill(title);
    await actions.getByLabel("Detail").fill("Browser-created blocker requires reviewer decision before submission.");
    await actions.getByLabel("Category").fill("browser_certification");
    await actions.getByLabel("Severity").selectOption("blocker");
    await actions.getByLabel("Calculation line").selectOption({ index: 1 });
    const created = await submitAndCapture<{ id: string }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${setup.reviewId}/exceptions$`), "POST", async () => {
      await actions.getByRole("button", { name: "Create exception" }).click();
    });
    expect(created.ok).toBeTruthy();
    await expect(page.getByRole("status").first()).toContainText("Exception created.");

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${setup.reviewId}&exceptionId=${created.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    await expect(page.locator(".payroll-review-exception-table tr.is-selected")).toContainText(title);
    await expect(page.locator("aside[aria-label$='exception detail']")).toContainText("Browser-created blocker");

    const controls = page.getByLabel("Review controls");
    const blockedSubmit = await submitAndCapture<{ detail?: string }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${setup.reviewId}/submit$`), "POST", async () => {
      await controls.getByRole("button", { name: "Submit review" }).click();
    });
    expect(blockedSubmit.ok).toBeFalsy();
    expect(blockedSubmit.status).toBe(400);
    await expect(page.getByRole("alert").first()).toContainText(/blocker/i);

    await actions.locator("#payroll-review-exception-decision").selectOption("accepted");
    await actions.getByLabel("Decision reason").fill("Finance accepted this blocker for the certification run.");
    const decision = await submitAndCapture<{ status: string }>(page, new RegExp(`/api/hr-admin/payroll-review-exceptions/${created.payload.id}/decision$`), "POST", async () => {
      await actions.getByRole("button", { name: "Save decision" }).click();
    });
    expect(decision.ok).toBeTruthy();
    expect(decision.payload.status).toBe("accepted");
    await expect(page.getByRole("status").first()).toContainText("Exception decision saved.");

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${setup.reviewId}&exceptionId=${created.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    await expect(page.locator("aside[aria-label$='exception detail']")).toContainText("Finance accepted this blocker");

    const submitted = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${setup.reviewId}/submit$`), "POST", async () => {
      await controls.getByRole("button", { name: "Submit review" }).click();
    });
    expect(submitted.ok).toBeTruthy();
    expect(submitted.payload.review.status).toBe("ready_for_approval");

    await controls.getByLabel("Approval profile ref").fill("tenant.payroll.approval.phase5o.v1");
    await controls.getByLabel("Approval comment").fill("Reviewer approved after accepted blocker decision.");
    const approved = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${setup.reviewId}/approve$`), "POST", async () => {
      await controls.getByRole("button", { name: "Approve review" }).click();
    });
    expect(approved.ok).toBeTruthy();
    expect(approved.payload.review.status).toBe("approved");
    await expect(page.getByRole("status").first()).toContainText("Payroll review approved.");

    const locked = await submitAndCapture<{ review: { status: string } }>(page, new RegExp(`/api/hr-admin/payroll-reviews/${setup.reviewId}/lock$`), "POST", async () => {
      await controls.getByRole("button", { name: "Final lock" }).click();
    });
    expect(locked.ok).toBeTruthy();
    expect(locked.payload.review.status).toBe("locked");

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${setup.reviewId}&exceptionId=${created.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    await expect(page.locator(".payroll-review-card.is-selected")).toContainText("Locked");
    await expect(page.getByText("Reviewer approved after accepted blocker decision.")).toBeVisible();
    await expect(page.getByText("tenant.payroll.approval.phase5o.v1")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
