import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type PayrollRun = {
  id: string;
  code: string;
  name: string;
  status: string;
};

type CalculationLine = {
  id: string;
  calculation_id: string;
  employee_code: string;
  line_type: string;
  source_hash: string;
};

type CalculationSetup = {
  runs: PayrollRun[];
  calculations: Array<{
    id: string;
    payroll_run_id: string;
    status: string;
    line_count: number;
    totals_snapshot: Record<string, unknown>;
  }>;
  lines: CalculationLine[];
};

type ReviewSetup = {
  reviews: Array<{
    id: string;
    payroll_run_id: string;
    status: string;
    review_profile_ref: string;
    exception_count: number;
  }>;
  exceptions: Array<{
    id: string;
    severity: string;
    status: string;
    detail: string;
    decision_reason: string;
  }>;
  lines: CalculationLine[];
};

const prefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const runCode = `${prefix.toLowerCase()}-calc-review`;

function panel(page: Page, label: string) {
  return page.getByLabel(label);
}

async function apiGet<T>(page: Page, url: string) {
  const response = await page.request.get(url);
  expect(response.status(), `${url} should return 200`).toBe(200);
  return (await response.json()) as T;
}

async function submitAndCapture<T>(page: Page, routePattern: RegExp, method: string, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => routePattern.test(item.url()) && item.request().method() === method, { timeout: 45_000 }),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function locatePilotRun(page: Page) {
  const setup = await apiGet<CalculationSetup>(page, "/api/hr-admin/payroll-calculation-setup");
  const run = setup.runs.find((item) => item.code === runCode);
  expect(run, `Missing ${runCode}. Run seed_pilot_100_calculation before this certification.`).toBeTruthy();
  expect(run?.status, `${runCode} must start inputs_locked for a repeatable browser run`).toBe("inputs_locked");
  return run as PayrollRun;
}

function textField(scope: Locator, label: string) {
  return scope.getByLabel(label);
}

test.describe.serial("P100-6 payroll calculation and review certification", () => {
  test("HR admin calculates, reviews, handles blockers, approves, locks, and certifies reports for 100 employees", async ({ page }) => {
    test.setTimeout(8 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    const run = await locatePilotRun(page);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("heading", { name: `${prefix} Payroll Calculation - Review Gate` })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Calculation controls" })).toBeVisible();

    const controls = panel(page, "Calculation controls");
    const calculation = await submitAndCapture<{
      calculation: {
        id: string;
        status: string;
        line_count: number;
        totals_snapshot: Record<string, unknown>;
      };
      lines: CalculationLine[];
    }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.id}/calculate-draft$`), "POST", async () => {
      await textField(controls, "Calculation profile ref").fill("tenant.payroll.calc.pilot100.v1");
      await controls.getByRole("button", { name: "Calculate draft" }).click();
    });
    expect(calculation.ok).toBeTruthy();
    expect(calculation.payload.calculation.status).toBe("completed");
    expect(calculation.payload.calculation.line_count).toBe(300);
    expect(Number(calculation.payload.calculation.totals_snapshot.employee_count)).toBe(100);
    expect(Number(calculation.payload.calculation.totals_snapshot.net_pay)).toBeGreaterThan(0);
    expect(calculation.payload.lines.filter((line) => line.source_hash).length).toBe(300);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${run.id}&calculationId=${calculation.payload.calculation.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.locator(".payroll-calc-attempt-table tr.is-selected")).toContainText("tenant.payroll.calc.pilot100.v1");
    await expect(page.locator(".payroll-calc-attempt-table tr.is-selected")).toContainText("300");
    await expect(page.getByRole("heading", { name: "Issue register" })).toBeVisible();
    await expect(page.locator(".payroll-calc-line-table")).toBeVisible();
    await expect(page.locator(".payroll-setup-count").filter({ hasText: "300 lines" })).toBeVisible();
    await expect(page.locator("aside[aria-label$='calculation trace']").first()).toContainText(/Source|Result/);
    await expectNoHorizontalOverflow(page);

    const refreshedCalculationSetup = await apiGet<CalculationSetup>(page, `/api/hr-admin/payroll-calculation-setup?run_id=${run.id}&calculation_id=${calculation.payload.calculation.id}`);
    const setupCalculation = refreshedCalculationSetup.calculations.find((item) => item.id === calculation.payload.calculation.id);
    expect(setupCalculation?.line_count).toBe(300);
    expect(refreshedCalculationSetup.lines.length).toBe(300);
    expect(new Set(refreshedCalculationSetup.lines.map((line) => line.employee_code)).size).toBe(100);

    const review = await submitAndCapture<{
      review: { id: string; status: string; review_profile_ref: string; exception_count: number };
    }>(page, new RegExp(`/api/hr-admin/payroll-runs/${run.id}/open-review$`), "POST", async () => {
      await textField(controls, "Review profile ref").fill("tenant.payroll.review.pilot100.v1");
      await controls.getByRole("button", { name: "Open review" }).click();
    });
    expect(review.ok).toBeTruthy();
    expect(review.payload.review.status).toBe("open");
    expect(review.payload.review.review_profile_ref).toBe("tenant.payroll.review.pilot100.v1");
    expect(review.payload.review.exception_count).toBeGreaterThanOrEqual(17);

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    await expect(page.locator(".payroll-review-card.is-selected")).toContainText(`${prefix} Payroll Calculation - Review Gate`);
    await expect(page.getByRole("heading", { name: "Review controls" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Exception register" })).toBeVisible();
    await expect(page.getByText(/Accepted exception: missing primary bank account|Pending leave request overlaps payroll period|Lifecycle event requires payroll review/).first()).toBeVisible();

    const reviewSetup = await apiGet<ReviewSetup>(page, `/api/hr-admin/payroll-review-setup?review_id=${review.payload.review.id}`);
    expect(reviewSetup.lines.length).toBe(300);
    expect(new Set(reviewSetup.lines.map((line) => line.employee_code)).size).toBe(100);
    expect(reviewSetup.exceptions.filter((item) => item.severity === "warning").length).toBeGreaterThanOrEqual(17);

    const exceptionActions = panel(page, "Exception actions");
    const blockerTitle = `Pilot approval blocker ${prefix}`;
    await exceptionActions.getByLabel("Title").fill(blockerTitle);
    await exceptionActions.getByLabel("Detail").fill("Finance reviewer requires explicit decision before approving the 100 employee pilot payroll.");
    await exceptionActions.getByLabel("Category").fill("pilot_certification");
    await exceptionActions.getByLabel("Severity").selectOption("blocker");
    await exceptionActions.getByLabel("Calculation line").selectOption({ index: 1 });
    const createdBlocker = await submitAndCapture<{ id: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/exceptions$`),
      "POST",
      async () => {
        await exceptionActions.getByRole("button", { name: "Create exception" }).click();
      },
    );
    expect(createdBlocker.ok).toBeTruthy();

    const reviewControls = panel(page, "Review controls");
    const blockedSubmit = await submitAndCapture<{ detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/submit$`),
      "POST",
      async () => {
        await reviewControls.getByRole("button", { name: "Submit review" }).click();
      },
    );
    expect(blockedSubmit.status).toBe(400);
    expect(blockedSubmit.payload.detail ?? "").toMatch(/blocker/i);
    await expect(page.getByRole("alert").first()).toContainText(/blocker/i);

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}&exceptionId=${createdBlocker.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    const selectedExceptionActions = panel(page, "Exception actions");
    await selectedExceptionActions.locator("#payroll-review-exception-decision").selectOption("accepted");
    await selectedExceptionActions.getByLabel("Decision reason").fill("Accepted after finance checked the pilot calculation evidence.");
    const decision = await submitAndCapture<{ status: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-review-exceptions/${createdBlocker.payload.id}/decision$`),
      "POST",
      async () => {
        await selectedExceptionActions.getByRole("button", { name: "Save decision" }).click();
      },
    );
    expect(decision.ok).toBeTruthy();
    expect(decision.payload.status).toBe("accepted");

    const submitted = await submitAndCapture<{ review: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/submit$`),
      "POST",
      async () => {
        await reviewControls.getByRole("button", { name: "Submit review" }).click();
      },
    );
    expect(submitted.ok).toBeTruthy();
    expect(submitted.payload.review.status).toBe("ready_for_approval");

    await reviewControls.getByLabel("Approval profile ref").fill("tenant.payroll.approval.pilot100.v1");
    await reviewControls.getByLabel("Approval comment").fill("Approved after P100 calculation evidence, warning register, and manual blocker decision were reviewed.");
    const approved = await submitAndCapture<{ review: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/approve$`),
      "POST",
      async () => {
        await reviewControls.getByRole("button", { name: "Approve review" }).click();
      },
    );
    expect(approved.ok).toBeTruthy();
    expect(approved.payload.review.status).toBe("approved");

    const locked = await submitAndCapture<{ review: { status: string } }>(
      page,
      new RegExp(`/api/hr-admin/payroll-reviews/${review.payload.review.id}/lock$`),
      "POST",
      async () => {
        await reviewControls.getByRole("button", { name: "Final lock" }).click();
      },
    );
    expect(locked.ok).toBeTruthy();
    expect(locked.payload.review.status).toBe("locked");

    await gotoAuthenticated(page, `/hr-admin/payroll-review?reviewId=${review.payload.review.id}&exceptionId=${createdBlocker.payload.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Review");
    await expect(page.locator(".payroll-review-card.is-selected")).toContainText("Locked");
    await expect(page.getByText("Accepted after finance checked the pilot calculation evidence.")).toBeVisible();
    await expect(page.getByText("tenant.payroll.approval.pilot100.v1")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/hr-admin/reports/salary-variance", hrAdmin);
    await expectPageReady(page, "Salary Variance Report");
    const salaryReport = page.getByTestId("salary-variance-report");
    await salaryReport.getByPlaceholder("Search employee, run, hash").fill(prefix);
    await expect(salaryReport.getByText(`${prefix} Payroll Calculation - Review Gate`).first()).toBeVisible();
    await expect(salaryReport.locator(".pagination-bar")).toBeVisible();
    const salaryExportResponse = await page.request.get(`/api/hr-admin/reports/salary-variance?q=${encodeURIComponent(prefix)}&sort=employee`);
    expect(salaryExportResponse.status()).toBe(200);
    expect(salaryExportResponse.headers()["x-hrms-report-key"]).toBe("salary-variance");
    expect(salaryExportResponse.headers()["x-hrms-source-row-count"]).toBe("100");
    expect(await salaryExportResponse.text()).toContain(`${prefix} Payroll Calculation - Review Gate`);
    const salaryManifestResponse = await page.request.get(`/api/hr-admin/reports/salary-variance?q=${encodeURIComponent(prefix)}&sort=employee&format=manifest`);
    expect(salaryManifestResponse.status()).toBe(200);
    expect((await salaryManifestResponse.json()).csv_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);

    await gotoAuthenticated(page, "/hr-admin/reports/payroll-review-exceptions", hrAdmin);
    await expectPageReady(page, "Payroll Review Exceptions Report");
    const exceptionReport = page.getByTestId("payroll-review-exceptions-report");
    await exceptionReport.getByPlaceholder("Search run, employee, component, decision").fill(prefix);
    await expect(exceptionReport.locator("tbody").getByText(`${prefix} Payroll Calculation - Review Gate`).first()).toBeVisible();
    await exceptionReport.getByPlaceholder("Search run, employee, component, decision").fill(blockerTitle);
    await expect(exceptionReport.locator("tbody").getByText(blockerTitle)).toBeVisible();
    const exceptionExportResponse = await page.request.get(`/api/hr-admin/reports/payroll-review-exceptions?q=${encodeURIComponent(prefix)}&sort=risk`);
    expect(exceptionExportResponse.status()).toBe(200);
    expect(exceptionExportResponse.headers()["x-hrms-report-key"]).toBe("payroll-review-exceptions");
    expect(Number(exceptionExportResponse.headers()["x-hrms-source-row-count"])).toBeGreaterThanOrEqual(18);
    const exceptionCsv = await exceptionExportResponse.text();
    expect(exceptionCsv).toContain(blockerTitle);
    expect(exceptionCsv).toContain("Accepted after finance checked the pilot calculation evidence.");
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access pilot calculation, review, or report evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/payroll-calculations", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HR admin restricted" })).toBeVisible();

    const calculationSetup = await page.request.get("/api/hr-admin/payroll-calculation-setup");
    expect([401, 403]).toContain(calculationSetup.status());
    const reviewSetup = await page.request.get("/api/hr-admin/payroll-review-setup");
    expect([401, 403]).toContain(reviewSetup.status());
    const salaryReport = await page.request.get(`/api/hr-admin/reports/salary-variance?q=${encodeURIComponent(prefix)}&sort=employee`);
    expect([401, 403]).toContain(salaryReport.status());
    const exceptionReport = await page.request.get(`/api/hr-admin/reports/payroll-review-exceptions?q=${encodeURIComponent(prefix)}&sort=risk`);
    expect([401, 403]).toContain(exceptionReport.status());
  });
});
