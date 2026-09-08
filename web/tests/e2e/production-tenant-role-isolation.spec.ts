import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type APIResponse, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

async function captureIsolationStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-tenant-role-isolation/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function expectVisibleText(page: Page, patterns: (string | RegExp)[]) {
  for (const pattern of patterns) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

async function expectFailClosed(response: APIResponse) {
  expect([401, 403, 500]).toContain(response.status());
  const payload = await response.json().catch(() => ({}));
  const serializedPayload = JSON.stringify(payload);
  expect(serializedPayload).not.toContain("salary");
  expect(serializedPayload).not.toContain("payroll.provider.bank.live.v1");
  expect(serializedPayload).not.toContain("tenant.bank.debit_account.payroll.v1");
  expect(serializedPayload).not.toContain("aa8b7a6f5e4d3c2b");
}

test.describe("Production tenant and role isolation proof", () => {
  test("workspace chooser presents role-scoped entry points before privileged access", async ({ page }, testInfo) => {
    await page.goto("/");
    await expectPageReady(page, "Choose your workspace");

    await expectVisibleText(page, [
      "Shared sign-in",
      "Role-based access",
      "HR admin",
      "Employee self service",
      "Manager approvals",
      "Tenant admin",
      "Sign in for HR admin",
      "Sign in for ESS",
      "Sign in for MSS",
      "Sign in for tenant admin",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureIsolationStep(page, testInfo, "01-public-workspace-role-boundary");
  });

  test("employee payslip screen stays employee-scoped and does not expose HR/provider artifacts", async ({ page }, testInfo) => {
    await page.goto("/ess/payslips?payslipId=payoutartifact-payslip-emp-0042");
    await expectPageReady(page, "Payslips");

    await expect(page.getByRole("heading", { name: "Payslip - Riya Sharma" })).toBeVisible();
    await expectVisibleText(page, [
      "Published only",
      "Employee scoped",
      "Storage governed",
      "The API resolves files through the signed-in employee context and tenant boundary.",
      "Download payslip",
      "Access trail",
      "Calculation lines",
    ]);

    const pageText = await page.locator("body").innerText();
    expect(pageText).not.toContain("Payslip - Nisha Rao");
    expect(pageText).not.toContain("Payroll Register - August 2026 Core Payroll");
    expect(pageText).not.toContain("Provider callbacks");
    expect(pageText).not.toContain("tenant.bank.debit_account.payroll.v1");
    await expectNoHorizontalOverflow(page);
    await captureIsolationStep(page, testInfo, "02-employee-payroll-scope-boundary");
  });

  test("privileged mutation and support proxy routes fail closed without a session", async ({ page }) => {
    await page.context().clearCookies();

    const certificationResponse = await page.request.post("/api/hr-admin/payroll-provider-connections/pay-provider-bank-sandbox/run-certification", {
      data: { scenario_profile_ref: "payroll.provider_connection.bank.certification_scenarios.v1" },
    });
    await expectFailClosed(certificationResponse);

    const supportGrantResponse = await page.request.post("/api/tenant-admin/support-access-grants", {
      data: {
        support_agent_identifier: "support.agent@example.com",
        reason: "Unauthenticated boundary check.",
        scope_refs: ["payroll_support"],
        requested_duration_minutes: 15,
      },
    });
    await expectFailClosed(supportGrantResponse);

    const supportConsoleResponse = await page.request.get("/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=configuration_health");
    await expectFailClosed(supportConsoleResponse);

    const employeePayslipReadResponse = await page.request.post("/api/me/payroll-payslips/payoutartifact-payslip-emp-0042/read");
    await expectFailClosed(employeePayslipReadResponse);
  });

  test("tenant admin and support workspaces expose scoped access controls", async ({ page }, testInfo) => {
    await page.goto("/tenant-admin");
    await expectPageReady(page, "Tenant Admin Console");
    await expectVisibleText(page, [
      "Role coverage",
      "Member mutations",
      "Support access",
      "Scoped support grants",
      "Request access",
      "Start session",
      "Revoke",
      "Commercial audit",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureIsolationStep(page, testInfo, "03-tenant-admin-role-controls");

    await page.goto("/support");
    await expectPageReady(page, "Support Console");
    await expectVisibleText(page, [
      "Runtime enforcement",
      "Support session gate",
      "Support Session Allowed",
      "Commercial evidence scope is not available for this session.",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureIsolationStep(page, testInfo, "04-support-session-scope-controls");
  });
});
