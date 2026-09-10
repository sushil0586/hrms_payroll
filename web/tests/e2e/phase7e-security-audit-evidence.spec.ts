import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { hrAdmin, platformAdmin, type Persona } from "../helpers/staging-auth";

type SupportGrantResponse = {
  support_access_grant: {
    id: string;
    status: string;
    session_ref: string;
    scope_refs: string[];
  };
};

type TrustAuditResponse = {
  summary: {
    visible_event_count: number;
    support_session_count: number;
  };
  filters: {
    event_group: string;
    support_session_ref: string;
  };
  events: Array<{
    event_type: string;
    actor_identifier: string;
    source_ref: string;
    support_session_ref: string;
  }>;
};

async function captureAuditStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7e-security-audit-evidence/${name}.png`);
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

async function createActiveSupportSession(page: Page, sessionRef: string) {
  await switchPersona(page, hrAdmin, "/tenant-admin");
  await expectPageReady(page, "Tenant Admin Console");

  const createResponse = await page.request.post("/api/tenant-admin/support-access-grants", {
    data: {
      support_agent_identifier: platformAdmin.username,
      reason: `Phase 7E audit evidence ${sessionRef}`,
      scope_refs: ["configuration_health"],
      requested_duration_minutes: 30,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  let payload = (await createResponse.json()) as SupportGrantResponse;
  expect(payload.support_access_grant.status).toBe("requested");

  const approveResponse = await page.request.patch(`/api/tenant-admin/support-access-grants/${payload.support_access_grant.id}`, {
    data: {
      action: "approve",
      decision_note: "Approved for Phase 7E audit evidence.",
    },
  });
  expect(approveResponse.ok()).toBeTruthy();
  payload = (await approveResponse.json()) as SupportGrantResponse;
  expect(payload.support_access_grant.status).toBe("approved");

  const startResponse = await page.request.patch(`/api/tenant-admin/support-access-grants/${payload.support_access_grant.id}`, {
    data: {
      action: "start",
      session_ref: sessionRef,
    },
  });
  expect(startResponse.ok()).toBeTruthy();
  payload = (await startResponse.json()) as SupportGrantResponse;
  expect(payload.support_access_grant.status).toBe("active");
  expect(payload.support_access_grant.session_ref).toBe(sessionRef);
  expect(payload.support_access_grant.scope_refs).toEqual(["configuration_health"]);
}

async function getTrustAudit(page: Page, sessionRef: string) {
  const response = await page.request.get(`/api/tenant-admin/trust-audit?event_group=support&support_session_ref=${sessionRef}&page_size=50`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as TrustAuditResponse;
}

test.describe("Phase 7E security audit evidence", () => {
  test("support lifecycle and runtime decisions are customer-visible in trust audit", async ({ page }, testInfo) => {
    const sessionRef = `phase7e-audit-${Date.now()}`;
    await createActiveSupportSession(page, sessionRef);

    await switchPersona(page, platformAdmin, `/support?tenant_code=northstar-foods&scope_ref=configuration_health&session_ref=${sessionRef}`);
    await expectPageReady(page, "Support Console");
    await expect(page.getByText("Support Session Allowed", { exact: true }).first()).toBeVisible();

    const allowedResponse = await page.request.get(`/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=configuration_health&session_ref=${sessionRef}`);
    expect(allowedResponse.ok()).toBeTruthy();
    const deniedResponse = await page.request.get(`/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=payroll_support&session_ref=${sessionRef}`);
    expect(deniedResponse.status()).toBe(403);
    const deniedPayload = await deniedResponse.json();
    expect(deniedPayload.code).toBe("support_scope_denied");
    await captureAuditStep(page, testInfo, "01-runtime-support-events-created");

    await switchPersona(page, hrAdmin, `/tenant-admin/trust-audit?event_group=support&support_session_ref=${sessionRef}`);
    await expectPageReady(page, "Tenant Trust Audit");
    await expect(page.getByText(`Session: ${sessionRef}`)).toBeVisible();
    await expect(page.getByRole("link", { name: "Support access", exact: true })).toBeVisible();
    await expect(page.getByText("Support Access Session Started", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Support Access Session Checked", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Support Access Session Denied", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(sessionRef).first()).toBeVisible();
    await expect(page.getByText(platformAdmin.username).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureAuditStep(page, testInfo, "02-trust-audit-session-filter");

    const audit = await getTrustAudit(page, sessionRef);
    expect(audit.filters.event_group).toBe("support");
    expect(audit.filters.support_session_ref).toBe(sessionRef);
    expect(audit.summary.visible_event_count).toBeGreaterThanOrEqual(3);
    expect(audit.summary.support_session_count).toBeGreaterThanOrEqual(1);
    expect(audit.events.map((event) => event.event_type)).toEqual(
      expect.arrayContaining([
        "support_access_session_started",
        "support_access_session_checked",
        "support_access_session_denied",
      ]),
    );
    for (const event of audit.events) {
      expect(event.support_session_ref).toBe(sessionRef);
      expect(event.source_ref).toBeTruthy();
    }
  });
});
