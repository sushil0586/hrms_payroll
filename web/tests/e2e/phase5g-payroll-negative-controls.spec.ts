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

async function countNonEmptyOptions(select: Locator) {
  return select.evaluate((element) => {
    const typedElement = element as HTMLSelectElement;
    return Array.from(typedElement.options).filter((option) => option.value).length;
  });
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

async function ensurePayrollPeriodExists(page: Page) {
  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
  await expectPageReady(page, "Payroll Inputs");

  const runForm = form(page, "payroll-run-form");
  if ((await countNonEmptyOptions(field(runForm, "Period"))) > 0) {
    return;
  }

  await gotoAuthenticated(page, "/hr-admin/payroll-setup", hrAdmin);
  await expectPageReady(page, "Payroll Setup");

  const calendarForm = form(page, "payroll-calendar-form");
  const periodForm = form(page, "payroll-period-form");
  const calendarCode = uniqueCode("NEG_CAL");
  const periodCode = uniqueCode("NEG_PER");

  const calendar = await submitAndCapture<{ id: string }>(
    page,
    /\/api\/hr-admin\/payroll-calendars$/,
    "POST",
    async () => {
      await field(calendarForm, "Code").fill(calendarCode);
      await field(calendarForm, "Name").fill(`Negative control ${calendarCode}`);
      await field(calendarForm, "Frequency").selectOption("monthly");
      await field(calendarForm, "Timezone").fill("Asia/Kolkata");
      await field(calendarForm, "Currency code").fill("INR");
      await field(calendarForm, "Period start day").fill("1");
      await field(calendarForm, "Config profile reference").fill("payroll.calendar.phase5g.negative.v1");
      await calendarForm.getByRole("checkbox", { name: "Active calendar" }).check();
      await calendarForm.getByRole("button", { name: "Create calendar" }).click();
    },
  );
  expect(calendar.ok).toBeTruthy();

  const period = await submitAndCapture<{ id: string }>(
    page,
    /\/api\/hr-admin\/payroll-periods$/,
    "POST",
    async () => {
      await field(periodForm, "Calendar").selectOption(calendar.payload.id);
      await field(periodForm, "Code").fill(periodCode);
      await field(periodForm, "Name").fill(`Negative control ${periodCode}`);
      await field(periodForm, "Start date").fill("2026-08-01");
      await field(periodForm, "End date").fill("2026-08-31");
      await field(periodForm, "Pay date").fill("2026-09-01");
      await field(periodForm, "Status").selectOption("open");
      await field(periodForm, "Config profile reference").fill("payroll.period.phase5g.negative.v1");
      await periodForm.getByRole("button", { name: "Create period" }).click();
    },
  );
  expect(period.ok).toBeTruthy();

  await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
  await expectPageReady(page, "Payroll Inputs");
}

async function createRunAndSnapshot(page: Page, snapshotStatus: "ready" | "blocked") {
  const runForm = form(page, "payroll-run-form");
  const snapshotForm = form(page, "payroll-input-snapshot-form");
  const runCode = uniqueCode(snapshotStatus === "blocked" ? "BLOCKED_RUN" : "IMMUTABLE_RUN");

  await runForm.getByRole("button", { name: "New" }).click();
  const runResult = await submitAndCapture<{ id: string; code: string }>(
    page,
    /\/api\/hr-admin\/payroll-runs$/,
    "POST",
    async () => {
      await field(runForm, "Code").fill(runCode);
      await field(runForm, "Name").fill(`Browser negative ${runCode}`);
      await field(runForm, "Status").selectOption("collecting_inputs");
      await field(runForm, "Input profile ref").fill("tenant.payroll.input.phase5g.v1");
      await field(runForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.phase5g.v1");
      await field(runForm, "Config profile reference").fill("tenant.payroll.run.phase5g.v1");
      await runForm.getByRole("button", { name: "Create run" }).click();
    },
  );
  expect(runResult.ok).toBeTruthy();

  await snapshotForm.getByRole("button", { name: "New" }).click();
  const snapshotResult = await submitAndCapture<{ id: string; snapshot_status: string }>(
    page,
    /\/api\/hr-admin\/payroll-input-snapshots$/,
    "POST",
    async () => {
      await field(snapshotForm, "Payroll run").selectOption(runResult.payload.id);
      await selectOptionContaining(field(snapshotForm, "Employee"), "EMP-0042");
      await field(snapshotForm, "Snapshot status").selectOption(snapshotStatus);
      await field(snapshotForm, "Input profile ref").fill("tenant.payroll.input.phase5g.v1");
      await field(snapshotForm, "Config profile reference").fill("tenant.payroll.snapshot.phase5g.v1");
      await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify({ source: "browser", employment_status: "active" }));
      await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify({ source: "browser", legal_entity: "Phase 5G" }));
      await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 600000, monthly_gross: 50000, currency_code: "INR" }));
      await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 22, present_days: snapshotStatus === "blocked" ? 0 : 22, lop_days: snapshotStatus === "blocked" ? 22 : 0 }));
      await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify({ blockers: snapshotStatus === "blocked" ? ["Missing approved attendance"] : [], warnings: [] }));
      await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
    },
  );
  expect(snapshotResult.ok).toBeTruthy();

  return { runId: runResult.payload.id, runCode, snapshotId: snapshotResult.payload.id };
}

test.describe("Phase 5G payroll negative controls", () => {
  test("blocks close actions when source snapshots are blocked and protects locked snapshots from edits", async ({ page }) => {
    await ensurePayrollPeriodExists(page);

    const blocked = await createRunAndSnapshot(page, "blocked");
    const lockPanel = form(page, "payroll-input-lock-form");
    await expect(lockPanel.getByLabel("Selected run lock readiness")).toContainText("Blocked");
    await expect(lockPanel.getByText("Lock blocked.")).toBeVisible();
    await expect(lockPanel.getByText("Missing approved attendance")).toBeVisible();
    const blockedLock = await submitAndCapture<{ detail?: string; blocked_count?: number }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${blocked.runId}/lock-inputs$`),
      "POST",
      async () => {
        await lockPanel.getByRole("button", { name: "Lock selected run inputs" }).click();
      },
    );
    expect(blockedLock.status).toBe(400);
    expect(blockedLock.payload.blocked_count).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole("alert").first()).toContainText(/Cannot lock payroll inputs while blocked snapshots exist/);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${blocked.runId}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    const blockedCalculationReadiness = page.getByRole("region", { name: "Calculation readiness" });
    await expect(blockedCalculationReadiness).toContainText("Calculation blocked.");
    await expect(blockedCalculationReadiness).toContainText(/snapshot.*still need input lock|blocker validation/i);
    await page.getByLabel("Calculation controls").getByLabel("Calculation profile ref").fill("tenant.payroll.calc.phase5g.v1");
    await expect(page.getByLabel("Calculation controls").getByRole("button", { name: "Calculate draft" })).toBeDisabled();

    await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
    await expectPageReady(page, "Payroll Inputs");
    const ready = await createRunAndSnapshot(page, "ready");
    const readyLock = await submitAndCapture<{ locked_count: number }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${ready.runId}/lock-inputs$`),
      "POST",
      async () => {
        await lockPanel.getByRole("button", { name: "Lock selected run inputs" }).click();
      },
    );
    expect(readyLock.ok).toBeTruthy();
    expect(readyLock.payload.locked_count).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole("status").first()).toContainText(/Payroll input snapshots locked for calculation/);

    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${ready.runId}`, hrAdmin);
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("region", { name: "Calculation readiness" })).toContainText("Ready to calculate.");
    await expect(page.getByLabel("Calculation controls").getByRole("button", { name: "Calculate draft" })).toBeEnabled();

    await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${ready.runId}&snapshotId=${ready.snapshotId}`, hrAdmin);
    await expectPageReady(page, "Payroll Inputs");
    const snapshotForm = form(page, "payroll-input-snapshot-form");
    const immutableEdit = await submitAndCapture<{ detail?: string }>(
      page,
      new RegExp(`/api/hr-admin/payroll-input-snapshots/${ready.snapshotId}$`),
      "PATCH",
      async () => {
        await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 1, monthly_gross: 1, currency_code: "INR" }));
        await snapshotForm.getByRole("button", { name: "Save snapshot" }).click();
      },
    );
    expect(immutableEdit.status).toBe(400);
    await expect(page.getByRole("alert").first()).toContainText(/Locked payroll input snapshots cannot be edited/);
    await expectNoHorizontalOverflow(page);
  });
});
