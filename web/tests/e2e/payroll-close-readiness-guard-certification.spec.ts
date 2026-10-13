import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function uniqueCode(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function form(page: Page, testId: string) {
  return page.getByTestId(testId);
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
  const runCode = uniqueCode(prefix);
  const setupResponse = await page.request.get("/api/hr-admin/payroll-input-snapshot-setup/");
  expect(setupResponse.ok(), await setupResponse.text()).toBeTruthy();
  const setup = (await setupResponse.json()) as { options?: { periods?: Array<{ id: string }> } };
  const periodId = setup.options?.periods?.[0]?.id ?? "";
  expect(periodId, "Expected at least one payroll period for close-readiness guard setup.").toBeTruthy();
  const result = await page.request.post("/api/hr-admin/payroll-runs", {
    data: {
      period_id: periodId,
      pay_group_id: null,
      code: runCode,
      name: `Readiness guard ${runCode}`,
      status: "collecting_inputs",
      input_profile_ref: "tenant.payroll.input.guard.v1",
      snapshot_schema_ref: "tenant.payroll.snapshot.guard.v1",
      config_profile_ref: "tenant.payroll.run.guard.v1",
    },
  });
  expect(result.ok(), `Payroll run create failed: ${await result.text()}`).toBeTruthy();
  const payload = (await result.json()) as { id: string; code: string };
  return { id: payload.id, code: runCode };
}

async function createSnapshot(page: Page, input: {
  runId: string;
  employeeNeedle: string;
  status: "warning" | "blocked";
  blockers: string[];
  warnings: string[];
}) {
  const employeeResponse = await page.request.get(`/api/hr-admin/employees/option-search?q=${encodeURIComponent(input.employeeNeedle)}&limit=1`);
  expect(employeeResponse.ok(), await employeeResponse.text()).toBeTruthy();
  const employeePayload = (await employeeResponse.json()) as { items?: Array<{ id: string }> };
  const employeeId = employeePayload.items?.[0]?.id ?? "";
  expect(employeeId, `Expected employee option for ${input.employeeNeedle}`).toBeTruthy();
  const result = await page.request.post("/api/hr-admin/payroll-input-snapshots", {
    data: {
      payroll_run_id: input.runId,
      employee_id: employeeId,
      snapshot_status: input.status,
      input_profile_ref: "tenant.payroll.input.guard.v1",
      config_profile_ref: "tenant.payroll.snapshot.guard.v1",
      employee_snapshot: { source: "browser", employment_status: "active" },
      organization_snapshot: { source: "browser", cost_center: input.status === "blocked" ? null : "QA-CC" },
      salary_snapshot: { source: "browser", annual_ctc: 600000, monthly_gross: 50000, currency_code: "INR" },
      attendance_snapshot: { working_days: 22, present_days: input.status === "blocked" ? 0 : 22, lop_days: input.status === "blocked" ? 22 : 0 },
      validation_snapshot: { blockers: input.blockers, warnings: input.warnings },
    },
  });
  expect(result.ok(), `Payroll snapshot create failed: ${await result.text()}`).toBeTruthy();
  const payload = (await result.json()) as { id: string; snapshot_status?: string; status?: string };
  expect(payload.snapshot_status ?? payload.status).toBe(input.status);
  return payload;
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
    await expect(form(page, "payroll-input-lock-form").getByRole("button", { name: "Lock selected run inputs" })).toBeDisabled();
    await expect(form(page, "payroll-input-lock-form")).toContainText("Resolve blocker snapshots before locking this payroll run.");

    const blockedLock = await page.request.post(`/api/hr-admin/payroll-runs/${blockedRun.id}/lock-inputs`, { data: {} });
    expect(blockedLock.status()).toBe(400);
    const blockedLockPayload = (await blockedLock.json()) as { blocked_count?: number };
    expect(blockedLockPayload.blocked_count).toBeGreaterThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
  });
});
