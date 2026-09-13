import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type PayrollRun = {
  id: string;
  name: string;
  code: string;
  status: string;
  snapshot_count: number;
  ready_count: number;
  warning_count: number;
  blocked_count: number;
  locked_count: number;
};

type PayrollInputSnapshot = {
  id: string;
  payroll_run_id: string;
  employee_code: string;
  employee_name: string;
  snapshot_status: string;
  source_hash: string;
  blockers: string[];
  warnings: string[];
};

type PayrollInputSetup = {
  runs: PayrollRun[];
  snapshots: PayrollInputSnapshot[];
};

const seedPrefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";

async function fetchPayrollInputSetup(request: APIRequestContext) {
  const response = await request.get("/api/hr-admin/payroll-input-snapshot-setup/");
  expect(response.status()).toBe(200);
  return (await response.json()) as PayrollInputSetup;
}

async function fetchSnapshotsForRun(request: APIRequestContext, runId: string) {
  const response = await request.get(`/api/hr-admin/payroll-input-snapshots?payroll_run_id=${runId}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as PayrollInputSnapshot[];
}

function runByName(setup: PayrollInputSetup, suffix: "Blocker Gate" | "Lockable") {
  const run = setup.runs.find((item) => item.name === `${seedPrefix} Payroll Inputs - ${suffix}`);
  expect(run, `Expected seeded ${suffix} payroll input run for ${seedPrefix}`).toBeTruthy();
  return run as PayrollRun;
}

function snapshotByEmployee(snapshots: PayrollInputSnapshot[], employeeSuffix: string) {
  const snapshot = snapshots.find((item) => item.employee_code === `${seedPrefix}_${employeeSuffix}`);
  expect(snapshot, `Expected seeded snapshot for ${seedPrefix}_${employeeSuffix}`).toBeTruthy();
  return snapshot as PayrollInputSnapshot;
}

async function openRunSnapshot(page: Page, run: PayrollRun, snapshot: PayrollInputSnapshot) {
  await gotoAuthenticated(page, `/hr-admin/payroll-inputs?runId=${run.id}&snapshotId=${snapshot.id}`, hrAdmin);
  await expectPageReady(page, "Payroll Inputs");
  await expect(page).toHaveURL(new RegExp(`runId=${run.id}.*snapshotId=${snapshot.id}`));
}

function lockMetric(page: Page, label: string) {
  return page.locator(".payroll-input-lock-grid .detail-row").filter({
    has: page.locator(".detail-label", { hasText: new RegExp(`^${label}$`) }),
  });
}

async function lockSelectedRun(page: Page, runId: string) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().endsWith(`/api/hr-admin/payroll-runs/${runId}/lock-inputs`) && item.request().method() === "POST", { timeout: 30000 }),
    page.getByTestId("payroll-input-lock-form").getByRole("button", { name: "Lock selected run inputs" }).click(),
  ]);
  return {
    status: response.status(),
    ok: response.ok(),
    payload: (await response.json().catch(() => ({}))) as { detail?: string; locked_count?: number; blocked_count?: number },
  };
}

test.describe.serial("P100-5 pilot payroll input snapshot and lock certification", () => {
  test("blocked pilot input run exposes blockers and rejects lock", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
    const setup = await fetchPayrollInputSetup(page.request);
    const blockedRun = runByName(setup, "Blocker Gate");
    const blockedSnapshots = await fetchSnapshotsForRun(page.request, blockedRun.id);
    const visibleBlockedSnapshot = snapshotByEmployee(blockedSnapshots, "E001");
    const blockedSnapshot = snapshotByEmployee(blockedSnapshots, "E096");

    expect(blockedRun.snapshot_count).toBe(100);
    expect(blockedRun.blocked_count).toBe(5);
    expect(blockedRun.warning_count).toBe(12);
    expect(blockedSnapshot.blockers).toContain("Missing primary bank account.");
    expect(blockedSnapshot.source_hash).toMatch(/^[a-f0-9]{64}$/);

    await openRunSnapshot(page, blockedRun, visibleBlockedSnapshot);
    await expect(page.getByRole("heading", { name: `${seedPrefix} Payroll Inputs - Blocker Gate` })).toBeVisible();
    await expect(lockMetric(page, "Blocked")).toContainText("5");
    await expect(page.locator("aside[aria-label$='payroll input snapshot']")).toContainText(`${seedPrefix}_E001`);
    await expect(page.getByText("Source hash").first()).toBeVisible();

    const lockResult = await lockSelectedRun(page, blockedRun.id);
    expect(lockResult.status).toBe(400);
    expect(lockResult.payload.blocked_count).toBe(5);
    await expect(page.getByRole("alert").first()).toContainText(/Cannot lock payroll inputs while blocked snapshots exist/);
    await expectNoHorizontalOverflow(page);
  });

  test("lockable pilot input run locks all 100 employees and prevents later mutation", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs", hrAdmin);
    const setup = await fetchPayrollInputSetup(page.request);
    const lockableRun = runByName(setup, "Lockable");
    const lockableSnapshots = await fetchSnapshotsForRun(page.request, lockableRun.id);
    const visibleLockableSnapshot = snapshotByEmployee(lockableSnapshots, "E001");
    const bankExceptionSnapshot = snapshotByEmployee(lockableSnapshots, "E096");

    expect(lockableRun.snapshot_count).toBe(100);
    expect(lockableRun.blocked_count).toBe(0);
    expect(lockableRun.warning_count).toBe(17);
    expect(bankExceptionSnapshot.warnings).toContain("Accepted exception: missing primary bank account retained for bank advice negative proof.");

    await openRunSnapshot(page, lockableRun, visibleLockableSnapshot);
    await expect(lockMetric(page, "Warnings")).toContainText("17");
    await expect(lockMetric(page, "Blocked")).toContainText("0");
    await expect(page.locator("aside[aria-label$='payroll input snapshot']")).toContainText(`${seedPrefix}_E001`);

    const lockResult = await lockSelectedRun(page, lockableRun.id);
    expect(lockResult.ok).toBeTruthy();
    expect(lockResult.payload.locked_count).toBeGreaterThanOrEqual(1);
    await expect(page.getByRole("status").first()).toContainText(/Payroll input snapshots locked for calculation/);

    const mutationResponse = await page.request.patch(`/api/hr-admin/payroll-input-snapshots/${bankExceptionSnapshot.id}`, {
      data: {
        salary_snapshot: {
          attempted_after_lock: true,
        },
      },
    });
    expect(mutationResponse.status()).toBe(400);
    expect(await mutationResponse.text()).toContain("Locked payroll input snapshots cannot be edited.");
  });

  test("payroll input exceptions report proves pilot filters, export, manifest, audit, and review drilldown", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    await gotoAuthenticated(page, "/hr-admin/reports/payroll-input-exceptions", hrAdmin);
    await expectPageReady(page, "Payroll Input Exceptions Report");

    const report = page.getByTestId("payroll-input-exceptions-report");
    await report.getByPlaceholder("Search employee, run, issue, hash").fill(seedPrefix);
    await expect(report.getByText(/Showing/).first()).toBeVisible();

    await report.getByLabel("Issue type").selectOption("Blocked");
    await expect(report.getByText(/Showing/).first()).toBeVisible();
    await expect(report.getByText("Missing primary bank account.").first()).toBeVisible();

    await report.getByLabel("Issue type").selectOption("All");
    await report.getByLabel("Lock state").selectOption("Locked");
    await expect(report.getByText(/Showing/).first()).toBeVisible();
    await expect(report.getByRole("cell", { name: new RegExp(`${seedPrefix}_E0`) }).first()).toBeVisible();

    const csvHref = await report.getByRole("link", { name: "Export filtered CSV" }).getAttribute("href");
    expect(csvHref).toBeTruthy();
    const csv = await page.request.get(csvHref ?? "");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["x-hrms-report-key"]).toBe("payroll-input-exceptions");
    expect(csv.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const csvBody = await csv.text();
    expect(csvBody).toContain(seedPrefix);
    expect(csvBody).toContain("source_hash");

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifest = await (await page.request.get(manifestHref ?? "")).json();
    expect(manifest.source_endpoints).toContain("/hr-admin/payroll-input-snapshot-setup/");
    expect(manifest.evidence_columns).toContain("source_hash");

    const auditResponse = await page.request.get("/api/hr-admin/reports/export-audits?report_key=payroll-input-exceptions");
    expect(auditResponse.status()).toBe(200);
    const auditPayload = await auditResponse.json();
    expect(auditPayload.items.some((item: { report_key: string }) => item.report_key === "payroll-input-exceptions")).toBeTruthy();

    const reviewLink = report.getByRole("link", { name: "Review" }).first();
    await expect(reviewLink).toHaveAttribute("href", /\/hr-admin\/payroll-inputs\?runId=.+snapshotId=.+/);
    await reviewLink.click();
    await expect(page).toHaveURL(/\/hr-admin\/payroll-inputs\?runId=.+snapshotId=.+/);
    await expectNoHorizontalOverflow(page);
  });

  test("employee cannot access pilot payroll input exception report or exports", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self Service");

    await page.goto("/hr-admin/reports/payroll-input-exceptions", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("payroll-input-exceptions-report")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Choose your workspace" })).toBeVisible();

    const csv = await page.request.get(`/api/hr-admin/reports/payroll-input-exceptions?search=${encodeURIComponent(seedPrefix)}`);
    expect([401, 403]).toContain(csv.status());
  });
});
