import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { hrAdmin, platformAdmin, type Persona } from "../helpers/staging-auth";

const execFileAsync = promisify(execFile);
const repoRoot = resolve(__dirname, "../../..");

type SupportGrantResponse = {
  support_access_grant: {
    id: string;
    status: string;
    session_ref: string;
    scope_refs: string[];
  };
};

type TrustAuditResponse = {
  events: Array<{
    event_type: string;
    support_session_ref: string;
    source_ref: string;
  }>;
};

async function captureLifecycleStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7f-support-session-lifecycle/${name}.png`);
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

async function createSupportGrant(page: Page, sessionRef: string, reason: string, status: "approved" | "active" = "active") {
  await switchPersona(page, hrAdmin, "/tenant-admin");
  await expectPageReady(page, "Tenant Admin Console");
  const createResponse = await page.request.post("/api/tenant-admin/support-access-grants", {
    data: {
      support_agent_identifier: platformAdmin.username,
      reason,
      scope_refs: ["configuration_health"],
      requested_duration_minutes: 30,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  let payload = (await createResponse.json()) as SupportGrantResponse;
  expect(payload.support_access_grant.status).toBe("requested");

  const approveResponse = await page.request.patch(`/api/tenant-admin/support-access-grants/${payload.support_access_grant.id}`, {
    data: { action: "approve", decision_note: `Approved for ${reason}.` },
  });
  expect(approveResponse.ok()).toBeTruthy();
  payload = (await approveResponse.json()) as SupportGrantResponse;
  expect(payload.support_access_grant.status).toBe("approved");

  if (status === "approved") {
    return payload.support_access_grant;
  }

  const startResponse = await page.request.patch(`/api/tenant-admin/support-access-grants/${payload.support_access_grant.id}`, {
    data: { action: "start", session_ref: sessionRef },
  });
  expect(startResponse.ok()).toBeTruthy();
  payload = (await startResponse.json()) as SupportGrantResponse;
  expect(payload.support_access_grant.status).toBe("active");
  expect(payload.support_access_grant.session_ref).toBe(sessionRef);
  return payload.support_access_grant;
}

async function expireSupportGrant(grantId: string) {
  const script = String.raw`
from django.utils import timezone
from datetime import timedelta
from apps.common.models import SaasSupportAccessGrant

grant = SaasSupportAccessGrant.objects.get(id="${grantId}")
grant.access_expires_at = timezone.now() - timedelta(minutes=1)
grant.save(update_fields=["access_expires_at", "updated_at"])
`;
  await execFileAsync(resolve(repoRoot, ".venv/bin/python"), ["backend/manage.py", "shell", "-c", script], { cwd: repoRoot });
}

async function expectSupportDenied(page: Page, sessionRef: string, code: string) {
  await switchPersona(page, platformAdmin, `/support?tenant_code=northstar-foods&scope_ref=configuration_health&session_ref=${sessionRef}`);
  await expectPageReady(page, "Support Console");
  await expect(page.getByText("Support Session Denied", { exact: true }).first()).toBeVisible();
  const response = await page.request.get(`/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=configuration_health&session_ref=${sessionRef}`);
  expect(response.status()).toBe(403);
  const payload = await response.json();
  expect(payload.allowed).toBe(false);
  expect(payload.code).toBe(code);
}

async function expectTrustAuditEvents(page: Page, sessionRef: string, labels: string[], eventTypes: string[]) {
  await switchPersona(page, hrAdmin, `/tenant-admin/trust-audit?event_group=support&support_session_ref=${sessionRef}`);
  await expectPageReady(page, "Tenant Trust Audit");
  await expect(page.getByText(`Session: ${sessionRef}`)).toBeVisible();
  for (const label of labels) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  const response = await page.request.get(`/api/tenant-admin/trust-audit?event_group=support&support_session_ref=${sessionRef}&page_size=50`);
  expect(response.ok()).toBeTruthy();
  const audit = (await response.json()) as TrustAuditResponse;
  expect(audit.events.map((event) => event.event_type)).toEqual(expect.arrayContaining(eventTypes));
  for (const event of audit.events) {
    expect(event.support_session_ref).toBe(sessionRef);
    expect(event.source_ref).toBeTruthy();
  }
}

async function openTenantAdminConsole(page: Page) {
  await page.goto("/tenant-admin", { waitUntil: "domcontentloaded" });
  await expectPageReady(page, "Tenant Admin Console");
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await expect(page.getByRole("main").getByRole("button", { name: "Request access" })).toBeVisible();
}

test.describe("Phase 7F support session lifecycle", () => {
  test("ended, revoked, and expired support sessions deny access and remain audit-visible", async ({ page }, testInfo) => {
    const stamp = Date.now();
    const endSessionRef = `phase7f-end-${stamp}`;
    const revokeSessionRef = `phase7f-revoke-${stamp}`;
    const expireSessionRef = `phase7f-expire-${stamp}`;

    const endGrant = await createSupportGrant(page, endSessionRef, `Phase 7F end lifecycle ${endSessionRef}`);
    await openTenantAdminConsole(page);
    const endRow = page.locator(".tenant-support-access-row").filter({ hasText: endSessionRef }).first();
    await expect(endRow).toBeVisible();
    await expect(endRow.getByText("Active")).toBeVisible();
    await expect(endRow.getByRole("button", { name: "End session" })).toBeEnabled();
    const [endResponse] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
        { timeout: 20_000 },
      ),
      endRow.getByRole("button", { name: "End session" }).click(),
    ]);
    await expect(endResponse.ok()).toBeTruthy();
    await expect(page.getByText("End session saved.")).toBeVisible();
    await expect(endRow.getByText("Ended")).toBeVisible({ timeout: 20_000 });
    await captureLifecycleStep(page, testInfo, "01-ended-session-row");
    await expectSupportDenied(page, endSessionRef, "support_session_not_active");
    await captureLifecycleStep(page, testInfo, "02-ended-session-denied");
    await expectTrustAuditEvents(page, endSessionRef, ["Support Access Session Ended", "Support Access Session Denied"], [
      "support_access_session_ended",
      "support_access_session_denied",
    ]);

    await createSupportGrant(page, revokeSessionRef, `Phase 7F revoke lifecycle ${revokeSessionRef}`);
    await openTenantAdminConsole(page);
    const revokeRow = page.locator(".tenant-support-access-row").filter({ hasText: revokeSessionRef }).first();
    await expect(revokeRow).toBeVisible();
    await expect(revokeRow.getByText("Active")).toBeVisible();
    await revokeRow.getByLabel("Decision note").fill("Revoked during Phase 7F lifecycle certification.");
    await expect(revokeRow.getByRole("button", { name: "Revoke" })).toBeEnabled();
    const [revokeResponse] = await Promise.all([
      page.waitForResponse(
        (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
        { timeout: 20_000 },
      ),
      revokeRow.getByRole("button", { name: "Revoke" }).click(),
    ]);
    await expect(revokeResponse.ok()).toBeTruthy();
    await expect(page.getByText("Revoke saved.")).toBeVisible();
    await expect(revokeRow.getByText("Revoked")).toBeVisible({ timeout: 20_000 });
    await captureLifecycleStep(page, testInfo, "03-revoked-session-row");
    await expectSupportDenied(page, revokeSessionRef, "support_session_not_active");
    await captureLifecycleStep(page, testInfo, "04-revoked-session-denied");
    await expectTrustAuditEvents(page, revokeSessionRef, ["Support Access Revoked", "Support Access Session Denied"], [
      "support_access_revoked",
      "support_access_session_denied",
    ]);

    const expireGrant = await createSupportGrant(page, expireSessionRef, `Phase 7F expiry lifecycle ${expireSessionRef}`);
    await expireSupportGrant(expireGrant.id);
    await expectSupportDenied(page, expireSessionRef, "support_session_not_active");
    await captureLifecycleStep(page, testInfo, "05-expired-session-denied");
    await expectTrustAuditEvents(page, expireSessionRef, ["Support Access Session Expired", "Support Access Session Denied"], [
      "support_access_session_expired",
      "support_access_session_denied",
    ]);
    await captureLifecycleStep(page, testInfo, "06-expired-session-audit");
  });
});
