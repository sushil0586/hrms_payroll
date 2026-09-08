import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type APIResponse, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

type Persona = {
  username: string;
  password: string;
};

const hrAdmin: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "nisha.rao",
  password: process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123",
};

async function loginIfRequired(page: Page, persona: Persona, targetPath: string) {
  await page.goto(targetPath);
  if (!page.url().includes("/login")) {
    return;
  }

  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/ess$/);
  await page.goto(targetPath);
}

async function captureLaunchGateStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-launch-release-gate/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function expectVisibleText(page: Page, patterns: (string | RegExp)[]) {
  for (const pattern of patterns) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

async function expectGuardedExport(response: APIResponse, label: string) {
  expect([401, 403, 500], `${label} should fail closed without launch operator session`).toContain(response.status());
  const body = await response.text();
  expect(body, `${label} should not leak source snapshots`).not.toMatch(/salary_snapshot|bank_debit_account|private_key/i);
  expect(body, `${label} should not expose launch audit pack internals before auth`).not.toMatch(/[a-f0-9]{64}/i);
}

test.describe("Production launch release gate proof", () => {
  test("HR launch cockpit connects audit, remediation, operations, resilience, and SLA gates", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin");
    await expectPageReady(page, "Control center");
    await expectVisibleText(page, [
      "Launch audit",
      "SaaS launch audit",
      "hrms.saas_launch_audit.v1",
      "Ops Health",
      "SaaS",
      "Launch",
      "Download audit",
    ]);
    await captureLaunchGateStep(page, testInfo, "01-hr-control-launch-audit");

    await page.goto("/hr-admin/launch-remediation");
    await expectPageReady(page, "Launch Remediation");
    await expectVisibleText(page, [
      "Open assignments",
      "Primary bank coverage",
      "Download audit",
      "Assign owner",
    ]);
    await expect(page.locator(".record-card", { hasText: "Provider launch history" })).toBeVisible();
    await captureLaunchGateStep(page, testInfo, "02-launch-remediation-actions");

    await page.goto("/hr-admin/saas-operations");
    await expectPageReady(page, "SaaS Operations");
    await expectVisibleText(page, [
      "Operations posture",
      "Operational triage",
      "Provider queue",
      "Support sessions",
      "Commercial audit",
      "Usage evidence",
    ]);
    await expect(page.getByRole("main").getByRole("link", { name: "Control plane", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Resilience", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "SLA ops", exact: true })).toBeVisible();
    await captureLaunchGateStep(page, testInfo, "03-saas-operations-posture");

    await page.goto("/hr-admin/saas-resilience");
    await expectPageReady(page, "SaaS Resilience");
    await expectVisibleText(page, [
      "Resilience posture",
      "Resilience gate review",
      "Tenant data windows",
      "Operational proof points",
      "Backup cadence",
      "Restore test",
      "Payroll retention",
    ]);
    await captureLaunchGateStep(page, testInfo, "04-resilience-release-gates");

    await page.goto("/hr-admin/saas-sla-operations");
    await expectPageReady(page, "SaaS SLA Ops");
    await expectVisibleText(page, [
      "SLA posture",
      "Service-impact records",
      "SLA triage signals",
      "Response and resolution windows",
      "Impacted tenant surfaces",
      "Configured signal limits",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureLaunchGateStep(page, testInfo, "05-sla-release-gates");
  });

  test("commercial release gate shows plan, entitlements, usage evidence, and customer trust audit", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/saas-control-plane");
    await expectPageReady(page, "SaaS Control Plane");
    await expectVisibleText(page, [
      "Launch commercial gate",
      "Northstar Foods",
      "Required entitlements",
      "Payroll provider integrations",
      "API access policy",
      "Payroll core",
      "Usage limits",
      "Usage snapshot ledger",
      "Commercial audit history",
    ]);
    await expect(page.getByRole("button", { name: "Save state" })).toBeVisible();
    await captureLaunchGateStep(page, testInfo, "06-commercial-control-plane");

    await page.goto("/tenant-admin");
    await expectPageReady(page, "Tenant Admin Console");
    await expectVisibleText(page, [
      "Commercial audit",
      "Support access",
      "Members",
      "Roles",
      "Change requests",
      "Download audit",
    ]);
    await captureLaunchGateStep(page, testInfo, "07-tenant-admin-release-review");

    await page.goto("/tenant-admin/security-readiness");
    await expectPageReady(page, "Enterprise Security Readiness");
    await expectVisibleText(page, [
      "Launch posture",
      "MFA and SSO",
      "SCIM and Sessions",
      "Audit and Data Protection",
      "Certificate rotation window",
      "Customer audit export",
    ]);
    await captureLaunchGateStep(page, testInfo, "08-enterprise-security-readiness");

    await page.goto("/tenant-admin/trust-audit");
    await expectPageReady(page, "Tenant Trust Audit");
    await expectVisibleText(page, [
      "Event groups",
      "Support access",
      "Evidence ledger",
      "Support Access Session Checked",
      "support-session-demo-001",
      "Download audit",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureLaunchGateStep(page, testInfo, "09-tenant-trust-audit");
  });

  test("provider launch rehearsal ties payroll handoff, route packages, storage policy, and audit-pack evidence", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");
    await expectVisibleText(page, [
      "Launch rehearsal",
      "Run rehearsal",
      "Recorded rehearsals",
      "payroll.provider_launch_readiness.audit_pack.v1",
      "payroll.provider_launch_rehearsal.v1",
      "Finance handoff gate",
      "Live adapter readiness",
      "Provider client readiness",
      "Provider package manifests",
      "Artifact policy readiness",
      "Storage and IAM",
      "No raw secrets",
    ]);
    await captureLaunchGateStep(page, testInfo, "10-provider-launch-rehearsal");

    await page.goto("/hr-admin/payroll-handoff?handoffId=payhandoff-aug-2026-core");
    await expectPageReady(page, "Payroll Handoff");
    await expectVisibleText(page, [
      "Finance artifacts",
      "Delivery acknowledgements",
      "Provider retries",
      "Provider jobs",
      "Provider callbacks",
      "Provider audit pack",
      "Bank advice",
      "Accounting net",
      "Statutory total",
      "Reconciled",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureLaunchGateStep(page, testInfo, "11-payroll-handoff-release-evidence");
  });

  test("support diagnostic release view remains scope-bound and operator ready", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/support/domain-snapshot");
    await expectPageReady(page, "Support Domain Snapshot");
    await expectVisibleText(page, [
      "Runtime enforcement",
      "Scope-bound snapshot",
      "Payroll providers",
      "Payroll Support",
      "Operational mix",
      "Session console",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureLaunchGateStep(page, testInfo, "12-support-scope-release-diagnostics");
  });

  test("release evidence exports fail closed without authenticated backend session", async ({ page }) => {
    await page.context().clearCookies();

    await expectGuardedExport(
      await page.request.get("/api/hr-admin/saas-launch-audit/download"),
      "HRMS launch audit export",
    );
    await expectGuardedExport(
      await page.request.get("/api/tenant-admin/commercial-support-audit/download"),
      "tenant commercial support audit export",
    );
  });
});
