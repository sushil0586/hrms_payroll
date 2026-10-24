import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

let workspace: IsolatedQaWorkspace;
let foreignWorkspace: IsolatedQaWorkspace;
let blockedRunId = "";
let lockedRunId = "";
let lockedSnapshotId = "";

function field(scope: Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select, textarea").first();
}

async function postJson<T>(page: Page, url: string, data: unknown) {
  return page.evaluate(async ({ endpoint, body }) => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) as T };
  }, { endpoint: url, body: data });
}

async function browserJson<T>(page: Page, method: "POST" | "PATCH", url: string, data: unknown) {
  return page.evaluate(async ({ endpoint, requestMethod, body }) => {
    const response = await fetch(endpoint, {
      method: requestMethod,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) as T };
  }, { endpoint: url, requestMethod: method, body: data });
}

async function createPeriod(page: Page, suffix: string) {
  const stamp = Date.now();
  const result = await postJson<{ id: string }>(page, "/api/hr-admin/payroll-periods", {
    calendar_id: workspace.manifest.payroll.calendar_id,
    code: `p3-${suffix}-${stamp}`,
    name: `Phase 3 ${suffix} ${stamp}`,
    start_date: suffix === "blocked" ? "2027-01-01" : "2027-02-01",
    end_date: suffix === "blocked" ? "2027-01-31" : "2027-02-28",
    pay_date: suffix === "blocked" ? "2027-01-31" : "2027-02-28",
    status: "open",
    config_profile_ref: `tenant.payroll.period.phase3.${suffix}.v1`,
  });
  expect(result.status).toBe(201);
  return result.body.id;
}

async function createRunThroughForm(page: Page, periodId: string, suffix: string) {
  await page.goto(`/hr-admin/payroll-inputs?tab=actions&refresh=${Date.now()}#payroll-input-operation-run`, { waitUntil: "domcontentloaded" });
  await expectPageReady(page, "Payroll Inputs");
  const form = page.getByTestId("payroll-run-form");
  await form.getByRole("button", { name: "New" }).click();
  await field(form, "Period").selectOption(periodId);
  await field(form, "Pay group").selectOption(workspace.manifest.payroll.pay_group_id);
  await field(form, "Code").fill(`P3_${suffix.toUpperCase()}_${Date.now()}`);
  await field(form, "Name").fill(`Phase 3 ${suffix} transition run`);
  await field(form, "Status").selectOption("collecting_inputs");
  await field(form, "Input profile ref").fill(`tenant.payroll.input.phase3.${suffix}.v1`);
  await field(form, "Snapshot schema ref").fill(`tenant.payroll.snapshot.phase3.${suffix}.v1`);
  await field(form, "Config profile reference").fill(`tenant.payroll.run.phase3.${suffix}.v1`);
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/hr-admin/payroll-runs") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Create run" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  return (await response.json() as { id: string }).id;
}

async function createSnapshotThroughForm(page: Page, runId: string, status: "blocked" | "ready") {
  await page.goto(`/hr-admin/payroll-inputs?tab=actions&runId=${runId}&refresh=${Date.now()}#payroll-input-operation-snapshot`, { waitUntil: "domcontentloaded" });
  await expectPageReady(page, "Payroll Inputs");
  const form = page.getByTestId("payroll-input-snapshot-form");
  await form.getByRole("button", { name: "New" }).click();
  await field(form, "Payroll run").selectOption(runId);
  const employeeCode = workspace.manifest.credentials.employee.employee_code;
  await field(form, "Find person").fill(employeeCode);
  const employeeOption = field(form, "Employee").locator("option").filter({ hasText: employeeCode });
  await expect(employeeOption).toHaveCount(1);
  await field(form, "Employee").selectOption(await employeeOption.getAttribute("value") ?? "");
  await field(form, "Snapshot status").selectOption(status);
  await field(form, "Input profile ref").fill("tenant.payroll.input.phase3.v1");
  await field(form, "Config profile reference").fill("tenant.payroll.snapshot.phase3.v1");
  await field(form, "Employee snapshot JSON").fill(JSON.stringify({ employment_status: "active" }));
  await field(form, "Organization snapshot JSON").fill(JSON.stringify({ tenant_id: workspace.manifest.tenant.id }));
  await field(form, "Salary snapshot JSON").fill(JSON.stringify({ annual_ctc: 600000, monthly_gross: 50000, currency_code: "INR" }));
  await field(form, "Attendance snapshot JSON").fill(JSON.stringify({ working_days: 20, present_days: 20, lop_days: 0 }));
  await field(form, "Validation snapshot JSON").fill(JSON.stringify(status === "blocked"
    ? { blockers: ["Phase 3 owned blocker"], warnings: [] }
    : { blockers: [], warnings: [] }));
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/hr-admin/payroll-input-snapshots") && response.request().method() === "POST");
  await form.getByRole("button", { name: "Create snapshot" }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  return (await response.json() as { id: string }).id;
}

test.describe.serial("Payroll Phase 3 transition and recovery closure", () => {
  test.beforeAll(async ({}, testInfo) => {
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    foreignWorkspace = await provisionIsolatedQaWorkspace(testInfo);
  });

  test.afterAll(async () => {
    await cleanupIsolatedQaWorkspace(foreignWorkspace);
    await cleanupIsolatedQaWorkspace(workspace);
  });

  test("owned blocker snapshot rejects lock and preserves the reconciliation reason", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs?tab=actions", workspacePersona(workspace, "hr_admin"));
    blockedRunId = await createRunThroughForm(page, await createPeriod(page, "blocked"), "blocked");
    await createSnapshotThroughForm(page, blockedRunId, "blocked");

    await page.goto(`/hr-admin/payroll-inputs?tab=actions&runId=${blockedRunId}&refresh=${Date.now()}#payroll-input-operation-lock`, { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Inputs");
    const lockForm = page.getByTestId("payroll-input-lock-form");
    await expect(lockForm).toContainText("Resolve blocker snapshots before locking this payroll run.");
    await expect(lockForm.getByRole("button", { name: "Lock selected run inputs" })).toBeDisabled();
    const rejected = await browserJson<{ blocked_count: number }>(page, "POST", `/api/hr-admin/payroll-runs/${blockedRunId}/lock-inputs`, {});
    expect(rejected.status).toBe(400);
    expect(rejected.body).toMatchObject({ blocked_count: 1 });
  });

  test("owned ready snapshot locks, persists, calculates once, and restores the durable job after reload", async ({ page }) => {
    test.setTimeout(180_000);
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs?tab=actions", workspacePersona(workspace, "hr_admin"));
    lockedRunId = await createRunThroughForm(page, await createPeriod(page, "ready"), "ready");
    lockedSnapshotId = await createSnapshotThroughForm(page, lockedRunId, "ready");
    await page.goto(`/hr-admin/payroll-inputs?tab=actions&runId=${lockedRunId}&refresh=${Date.now()}#payroll-input-operation-lock`, { waitUntil: "domcontentloaded" });
    const lockForm = page.getByTestId("payroll-input-lock-form");
    const lockResponse = page.waitForResponse((response) => response.url().endsWith(`/api/hr-admin/payroll-runs/${lockedRunId}/lock-inputs`) && response.request().method() === "POST");
    await lockForm.getByRole("button", { name: "Lock selected run inputs" }).click();
    expect((await lockResponse).status()).toBe(200);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(lockForm).toContainText("Inputs are already locked for this payroll run.");
    expect((await browserJson(page, "PATCH", `/api/hr-admin/payroll-input-snapshots/${lockedSnapshotId}`, { salary_snapshot: { altered: true } })).status).toBe(400);

    await page.goto(`/hr-admin/payroll-calculations?runId=${lockedRunId}&refresh=${Date.now()}`, { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Calculations");
    const panel = page.getByRole("region", { name: "Calculation controls" });
    await panel.getByLabel("Calculation profile ref").fill("tenant.payroll.calc.phase3.transition.v1");
    const acceptedPromise = page.waitForResponse((response) => response.url().endsWith(`/api/hr-admin/payroll-runs/${lockedRunId}/calculate-draft`) && response.request().method() === "POST");
    await panel.getByRole("button", { name: "Calculate draft" }).click();
    const accepted = await acceptedPromise;
    expect(accepted.status()).toBe(202);
    const jobId = (await accepted.json() as { job: { id: string } }).job.id;
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(panel.locator("div.form-status").first()).toContainText(/Queued|Processing|Completed/);
    await expect(panel.locator("div.form-status").first()).toContainText("Completed", { timeout: 90_000 });
    const duplicate = await postJson<{ job: { id: string } }>(page, `/api/hr-admin/payroll-runs/${lockedRunId}/calculate-draft`, {
      execution_mode: "async",
      calculation_profile_ref: "tenant.payroll.calc.phase3.transition.v1",
    });
    expect(duplicate.status).toBe(202);
    expect(duplicate.body.job.id).toBe(jobId);
  });

  test("employee and foreign-tenant users cannot mutate the owned run", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", workspacePersona(workspace, "employee"));
    expect((await browserJson(page, "POST", `/api/hr-admin/payroll-runs/${lockedRunId}/calculate-draft`, {})).status).toBe(403);
    await gotoAuthenticated(page, "/hr-admin", workspacePersona(foreignWorkspace, "hr_admin"));
    expect((await browserJson(page, "POST", `/api/hr-admin/payroll-runs/${lockedRunId}/calculate-draft`, {})).status).toBe(404);
    expect((await browserJson(page, "POST", `/api/hr-admin/payroll-runs/${lockedRunId}/lock-inputs`, {})).status).toBe(404);
  });

  test("abort, 503, and malformed success never show false completion and retain the entered profile", async ({ page }) => {
    await gotoAuthenticated(page, `/hr-admin/payroll-calculations?runId=${lockedRunId}`, workspacePersona(workspace, "hr_admin"));
    const panel = page.getByRole("region", { name: "Calculation controls" });
    const input = panel.getByLabel("Calculation profile ref");
    const endpoint = `**/api/hr-admin/payroll-runs/${lockedRunId}/calculate-draft`;
    const cases = [
      { value: "tenant.phase3.abort", handler: async (route: import("@playwright/test").Route) => route.abort("connectionfailed") },
      { value: "tenant.phase3.503", handler: async (route: import("@playwright/test").Route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Temporary payroll outage." }) }) },
      { value: "tenant.phase3.malformed", handler: async (route: import("@playwright/test").Route) => route.fulfill({ status: 202, contentType: "application/json", body: "{}" }) },
    ];
    for (const fault of cases) {
      await page.route(endpoint, fault.handler, { times: 1 });
      await input.fill(fault.value);
      await panel.getByRole("button", { name: "Calculate draft" }).click();
      await expect(panel.getByRole("alert").last()).toBeVisible();
      await expect(input).toHaveValue(fault.value);
      await expect(panel.getByText("Calculate draft completed.", { exact: true })).toHaveCount(0);
      await page.unroute(endpoint);
    }
  });
});
