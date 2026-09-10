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

async function createRun(page: Page, prefix: string) {
  const runForm = form(page, "payroll-run-form");
  const runCode = uniqueCode(prefix);

  await runForm.getByRole("button", { name: "New" }).click();
  const result = await submitAndCapture<{ id: string; code: string }>(
    page,
    /\/api\/hr-admin\/payroll-runs$/,
    "POST",
    async () => {
      await field(runForm, "Code").fill(runCode);
      await field(runForm, "Name").fill(`Readiness guard ${runCode}`);
      await field(runForm, "Status").selectOption("collecting_inputs");
      await field(runForm, "Input profile ref").fill("tenant.payroll.input.guard.v1");
      await field(runForm, "Snapshot schema ref").fill("tenant.payroll.snapshot.guard.v1");
      await field(runForm, "Config profile reference").fill("tenant.payroll.run.guard.v1");
      await runForm.getByRole("button", { name: "Create run" }).click();
    },
  );
  expect(result.ok).toBeTruthy();
  return { id: result.payload.id, code: runCode };
}

async function createSnapshot(page: Page, input: {
  runId: string;
  employeeNeedle: string;
  status: "warning" | "blocked";
  blockers: string[];
  warnings: string[];
}) {
  const snapshotForm = form(page, "payroll-input-snapshot-form");
  await snapshotForm.getByRole("button", { name: "New" }).click();
  const result = await submitAndCapture<{ id: string; snapshot_status: string }>(
    page,
    /\/api\/hr-admin\/payroll-input-snapshots$/,
    "POST",
    async () => {
      await field(snapshotForm, "Payroll run").selectOption(input.runId);
      await selectOptionContaining(field(snapshotForm, "Employee"), input.employeeNeedle);
      await field(snapshotForm, "Snapshot status").selectOption(input.status);
      await field(snapshotForm, "Input profile ref").fill("tenant.payroll.input.guard.v1");
      await field(snapshotForm, "Config profile reference").fill("tenant.payroll.snapshot.guard.v1");
      await field(snapshotForm, "Employee snapshot JSON").fill(JSON.stringify({ source: "browser", employment_status: "active" }));
      await field(snapshotForm, "Organization snapshot JSON").fill(JSON.stringify({ source: "browser", cost_center: input.status === "blocked" ? null : "QA-CC" }));
      await field(snapshotForm, "Salary snapshot JSON").fill(JSON.stringify({ source: "browser", annual_ctc: 600000, monthly_gross: 50000, currency_code: "INR" }));
      await field(snapshotForm, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 22, present_days: input.status === "blocked" ? 0 : 22, lop_days: input.status === "blocked" ? 22 : 0 }));
      await field(snapshotForm, "Validation snapshot JSON").fill(JSON.stringify({ blockers: input.blockers, warnings: input.warnings }));
      await snapshotForm.getByRole("button", { name: "Create snapshot" }).click();
    },
  );
  expect(result.ok).toBeTruthy();
  expect(result.payload.snapshot_status).toBe(input.status);
  return result.payload;
}

test.describe("Phase 5M payroll close readiness guard certification", () => {
  test("warning posture stays visible and blocked snapshots stop input lock", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
    await expectPageReady(page, "Payroll Inputs");

    const warningRun = await createRun(page, "WARN_LOCK");
    const warningSnapshot = await createSnapshot(page, {
      runId: warningRun.id,
      employeeNeedle: "EMP-0042",
      status: "warning",
      blockers: [],
      warnings: ["Missing primary bank account."],
    });

    await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${warningRun.id}&snapshotId=${warningSnapshot.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Inputs");
    await expect(page.locator(".payroll-input-lock-grid .detail-row").filter({ hasText: "Warnings" })).toContainText("1");
    await expect(page.locator(".payroll-input-lock-grid .detail-row").filter({ hasText: "Blocked" })).toContainText("0");
    const warningDetail = page.locator("aside[aria-label$='payroll input snapshot']");
    await expect(warningDetail).toContainText("Warning");
    await expect(warningDetail.getByText("Missing primary bank account.", { exact: true })).toBeVisible();

    const warningLock = await submitAndCapture<{ locked_count: number }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${warningRun.id}/lock-inputs$`),
      "POST",
      async () => {
        await form(page, "payroll-input-lock-form").getByRole("button", { name: "Lock selected run inputs" }).click();
      },
    );
    expect(warningLock.ok).toBeTruthy();
    expect(warningLock.payload.locked_count).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole("status").first()).toContainText(/Payroll input snapshots locked for calculation/);

    const blockedRun = await createRun(page, "BLOCK_LOCK");
    const blockedSnapshot = await createSnapshot(page, {
      runId: blockedRun.id,
      employeeNeedle: "EMP-0043",
      status: "blocked",
      blockers: ["Missing cost center."],
      warnings: ["Missing primary bank account."],
    });

    await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${blockedRun.id}&snapshotId=${blockedSnapshot.id}`, hrAdmin);
    await expectPageReady(page, "Payroll Inputs");
    await expect(page.locator(".payroll-input-lock-grid .detail-row").filter({ hasText: "Warnings" })).toContainText("0");
    await expect(page.locator(".payroll-input-lock-grid .detail-row").filter({ hasText: "Blocked" })).toContainText("1");
    const blockedDetail = page.locator("aside[aria-label$='payroll input snapshot']");
    await expect(blockedDetail.getByText("Missing cost center.", { exact: true })).toBeVisible();

    const blockedLock = await submitAndCapture<{ blocked_count?: number }>(
      page,
      new RegExp(`/api/hr-admin/payroll-runs/${blockedRun.id}/lock-inputs$`),
      "POST",
      async () => {
        await form(page, "payroll-input-lock-form").getByRole("button", { name: "Lock selected run inputs" }).click();
      },
    );
    expect(blockedLock.status).toBe(400);
    expect(blockedLock.payload.blocked_count).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole("alert").first()).toContainText(/Cannot lock payroll inputs while blocked snapshots exist/);
    await expectNoHorizontalOverflow(page);
  });
});
