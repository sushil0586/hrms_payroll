import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { hrAdmin, platformAdmin, type Persona } from "../helpers/staging-auth";

async function captureSupportStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7d-support-session-positive-scope/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function switchPersona(page: Page, persona: Persona, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: persona.username,
      password: persona.password,
    },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function requestSupportGrantThroughTenantAdmin(page: Page, sessionRef: string) {
  await switchPersona(page, hrAdmin, "/tenant-admin");
  await expectPageReady(page, "Tenant Admin Console");
  await expect(page.getByRole("heading", { name: "Scoped support grants" })).toBeVisible();
  await expect(page.getByRole("main").getByLabel("Support agent")).toBeVisible();
  await expect(page.getByRole("main").getByLabel("Duration")).toBeVisible();
  await expect(page.getByRole("main").getByLabel("Reason")).toBeVisible();

  const accountScope = page.getByRole("main").getByLabel("Account posture");
  const configurationScope = page.getByRole("main").getByLabel("Configuration health");
  await expect(accountScope).toBeVisible();
  await expect(configurationScope).toBeVisible();
  if (await accountScope.isChecked()) {
    await accountScope.uncheck();
  }
  await configurationScope.check();
  await expect(accountScope).not.toBeChecked();
  await expect(configurationScope).toBeChecked();

  const reason = `Phase 7D scoped support grant ${sessionRef}`;
  await page.getByRole("main").getByLabel("Support agent").fill(platformAdmin.username);
  await page.getByRole("main").getByLabel("Duration").fill("45");
  await page.getByRole("main").getByLabel("Reason").fill(reason);
  const requestButton = page.getByRole("main").getByRole("button", { name: "Request access" });
  await expect(requestButton).toBeEnabled();
  const createResponse = page.waitForResponse(
    (response) => response.url().includes("/api/tenant-admin/support-access-grants") && response.request().method() === "POST",
    { timeout: 20_000 },
  );
  await requestButton.click();
  await expect((await createResponse).ok()).toBeTruthy();
  await expect(page.getByText("Support access requested.")).toBeVisible();

  const row = page.locator(".tenant-support-access-row").filter({ hasText: reason }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row.getByText("Requested")).toBeVisible();
  await expect(row.getByText("configuration_health")).toBeVisible();
  await expect(row.getByLabel("Decision note")).toBeVisible();
  await expect(row.getByLabel("Session ref")).toBeVisible();
  await expect(row.getByRole("button", { name: "Approve" })).toBeDisabled();
  await expect(row.getByRole("button", { name: "Start session" })).toBeDisabled();

  await row.getByLabel("Decision note").fill("Approved for configuration health browser certification.");
  await expect(row.getByRole("button", { name: "Approve" })).toBeEnabled();
  const approveResponse = page.waitForResponse(
    (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
    { timeout: 20_000 },
  );
  await row.getByRole("button", { name: "Approve" }).click();
  await expect((await approveResponse).ok()).toBeTruthy();
  await expect(row.getByText("Approved")).toBeVisible({ timeout: 20_000 });

  await row.getByLabel("Session ref").fill(sessionRef);
  await expect(row.getByRole("button", { name: "Start session" })).toBeEnabled();
  const startResponse = page.waitForResponse(
    (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
    { timeout: 20_000 },
  );
  await row.getByRole("button", { name: "Start session" }).click();
  await expect((await startResponse).ok()).toBeTruthy();
  await expect(row.getByText("Active")).toBeVisible({ timeout: 20_000 });
}

test.describe("Phase 7D tenant-approved support session positive scope", () => {
  test("approved support agent can read only the granted support scope", async ({ page }, testInfo) => {
    const sessionRef = `phase7d-support-${Date.now()}`;

    await requestSupportGrantThroughTenantAdmin(page, sessionRef);
    await captureSupportStep(page, testInfo, "01-tenant-admin-grant-active");

    await switchPersona(page, platformAdmin, `/support?tenant_code=northstar-foods&scope_ref=configuration_health&session_ref=${sessionRef}`);
    await expectPageReady(page, "Support Console");
    await expect(page.getByText("Support Session Allowed", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(sessionRef).first()).toBeVisible();
    await expect(page.getByText("Configuration Health", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Commercial evidence scope is not available for this session.")).toBeVisible();
    await captureSupportStep(page, testInfo, "02-support-configuration-health-allowed");

    const allowedResponse = await page.request.get(`/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=configuration_health&session_ref=${sessionRef}`);
    expect(allowedResponse.ok()).toBeTruthy();
    const allowedPayload = await allowedResponse.json();
    expect(allowedPayload.support_session.allowed).toBe(true);
    expect(allowedPayload.support_session.scope_refs).toContain("configuration_health");
    expect(allowedPayload.configuration_health).toBeTruthy();
    expect(allowedPayload.commercial_evidence).toBeNull();

    for (const deniedScope of ["commercial_evidence", "payroll_support", "read_only_account"]) {
      const deniedResponse = await page.request.get(`/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=${deniedScope}&session_ref=${sessionRef}`);
      expect(deniedResponse.status()).toBe(403);
      const deniedPayload = await deniedResponse.json();
      expect(deniedPayload.allowed).toBe(false);
      expect(deniedPayload.code).toBe("support_scope_denied");
      expect(deniedPayload.required_scope_ref).toBe(deniedScope);
      expect(deniedPayload.scope_refs).toEqual(["configuration_health"]);
    }

    await page.goto(`/support/domain-snapshot?tenant_code=northstar-foods&session_ref=${sessionRef}&domain_ref=configuration_health`);
    await expectPageReady(page, "Support Domain Snapshot");
    await expect(page.getByText("Support Session Allowed", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Configuration Health", { exact: true }).first()).toBeVisible();
    await captureSupportStep(page, testInfo, "03-domain-snapshot-allowed");

    await page.goto(`/support/domain-snapshot?tenant_code=northstar-foods&session_ref=${sessionRef}&domain_ref=payroll_readiness`);
    await expectPageReady(page, "Support Domain Snapshot");
    await expect(page.getByText("Support Session Denied", { exact: true }).or(page.getByText("scope is not available")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureSupportStep(page, testInfo, "04-payroll-domain-denied");
  });
});
