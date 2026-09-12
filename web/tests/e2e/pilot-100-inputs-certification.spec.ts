import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const seedPrefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const seedPassword = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const usernamePrefix = seedPrefix.toLowerCase();

async function loginAsSeededUser(page: Page, username: string, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, path, { username, password: seedPassword });
}

test.describe("P100-4 pilot payroll input certification", () => {
  test("attendance report exposes pilot attendance, overtime, regularization, pagination, and export evidence", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/reports/attendance-register", hrAdmin);
    await expectPageReady(page, "Daily Attendance Register");
    const report = page.getByTestId("attendance-register-report");
    await expect(report).toBeVisible();

    await report.getByPlaceholder("Search employee, department, status, notes").fill(`${seedPrefix}_E061`);
    await expect(report.getByText(/Showing/).first()).toBeVisible();
    await expect(report.getByRole("cell", { name: new RegExp(`${seedPrefix}_E0`) }).first()).toBeVisible();

    await report.getByLabel("Sort").selectOption("overtime");
    await expect(report.getByText(/Showing/).first()).toBeVisible();

    const csvHref = await report.getByRole("link", { name: "Export filtered CSV" }).getAttribute("href");
    expect(csvHref).toBeTruthy();
    const csv = await page.request.get(csvHref ?? "");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["x-hrms-report-key"]).toBe("attendance-register");
    expect(csv.headers()["x-hrms-report-checksum"]).toMatch(/^[a-f0-9]{64}$/);
    const body = await csv.text();
    expect(body).toContain(seedPrefix);
    expect(body).toContain("overtime_hours");

    await report.getByPlaceholder("Search employee, department, status, notes").fill(`${seedPrefix}_E056`);
    await report.getByLabel("Regularization").selectOption("Regularized");
    await expect(report.getByText(/Regularized|Showing/).first()).toBeVisible();
    await expect(report.locator(".pagination-bar")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("leave balance report and ESS expose pilot leave usage and pending approvals", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/reports/leave-balance", hrAdmin);
    await expectPageReady(page, "Leave Balance Report");
    const report = page.getByTestId("leave-balance-report");
    await expect(report).toBeVisible();

    await report.getByPlaceholder("Search employee, policy, leave type").fill(seedPrefix);
    await expect(report.getByText(/Showing/).first()).toBeVisible();
    await expect(report.getByText(seedPrefix).first()).toBeVisible();
    await report.getByLabel("Sort").selectOption("reserved");
    await expect(report.getByText(/Reserved|Showing/).first()).toBeVisible();

    const manifestHref = await report.getByRole("link", { name: "Manifest" }).getAttribute("href");
    expect(manifestHref).toBeTruthy();
    const manifest = await (await page.request.get(manifestHref ?? "")).json();
    expect(manifest.source_endpoints).toContain("/hr-admin/leave-balances/");
    expect(manifest.evidence_columns).toContain("available_after_reserved");

    await loginAsSeededUser(page, `${usernamePrefix}.e051`, "/ess?leaveStatus=pending&leavePage=1");
    await expectPageReady(page, "Self service");
    await expect(page.getByText(seedPrefix).first()).toBeVisible();
    await expect(page.getByText(/Pending/i).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("manager approval inbox exposes pilot leave and attendance queues for seeded direct reports", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    await loginAsSeededUser(page, `${usernamePrefix}.e001`, "/mss/approvals?queue=leave&leavePage=1");
    await expectPageReady(page, "Manager inbox");
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
    await expect(page.getByText(seedPrefix).first()).toBeVisible();

    await loginAsSeededUser(page, `${usernamePrefix}.e008`, "/mss/approvals?queue=attendance&regPage=1");
    await expect(page.getByRole("heading", { name: "Attendance regularizations" })).toBeVisible();
    await expect(page.getByText(seedPrefix).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("lifecycle reports expose pilot onboarding, probation, movement, and exit risk rows", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/reports/lifecycle-aging", hrAdmin);
    await expectPageReady(page, "Lifecycle Aging and SLA Report");
    const report = page.getByTestId("lifecycle-aging-report");
    await expect(report).toBeVisible();

    await report.getByPlaceholder("Search employee, owner, workflow, SLA").fill(seedPrefix);
    await expect(report.getByText(/Showing/).first()).toBeVisible();
    await expect(report.getByText(new RegExp(`${seedPrefix}_E08[6-9]|${seedPrefix}_E090`)).first()).toBeVisible();
    for (const lifecycleType of ["Onboarding", "Probation", "Movement", "Exit"]) {
      const control = report.getByLabel("Lifecycle type");
      await control.selectOption(lifecycleType.toLowerCase());
      await expect(report.getByText(/Showing|No lifecycle aging rows/).first()).toBeVisible();
    }

    const csvHref = await report.getByRole("link", { name: "Export filtered CSV" }).getAttribute("href");
    expect(csvHref).toBeTruthy();
    const csv = await page.request.get(csvHref ?? "");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["x-hrms-report-key"]).toBe("lifecycle-aging");
    expect(await csv.text()).toContain(seedPrefix);
    await expectNoHorizontalOverflow(page);
  });
});
