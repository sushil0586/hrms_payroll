import { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { hrAdmin, platformAdmin, type Persona } from "../helpers/staging-auth";

type TrustAuditResponse = {
  events: Array<{
    event_type: string;
    actor_identifier: string;
    source_ref: string;
    source_hash: string;
  }>;
};

async function captureAuditDownloadStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`phase7h-audit-download-rejected-support/${name}.png`);
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

test.describe("Phase 7H audit download and rejected support lifecycle", () => {
  test("rejected support access is browser-visible and exported in the audit pack", async ({ page }, testInfo) => {
    const stamp = Date.now();
    const reason = `Phase 7H rejected support grant ${stamp}`;
    const decisionNote = `Rejected during Phase 7H audit download certification ${stamp}.`;

    await switchPersona(page, hrAdmin, "/tenant-admin");
    await expectPageReady(page, "Tenant Admin Console");
    await expect(page.getByRole("heading", { name: "Scoped support grants" })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Support agent")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Duration")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Reason")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Account posture")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Configuration health")).toBeVisible();

    await page.getByRole("main").getByLabel("Support agent").fill(platformAdmin.username);
    await page.getByRole("main").getByLabel("Duration").fill("25");
    await page.getByRole("main").getByLabel("Reason").fill(reason);
    const requestButton = page.getByRole("main").getByRole("button", { name: "Request access" });
    await expect(requestButton).toBeEnabled();
    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants") && response.request().method() === "POST",
      { timeout: 20_000 },
    );
    await requestButton.click();
    await expect((await createResponsePromise).ok()).toBeTruthy();
    await expect(page.getByRole("status")).toContainText("Support access requested.");

    const rejectedRow = page.locator(".tenant-support-access-row").filter({ hasText: reason }).first();
    await expect(rejectedRow).toBeVisible({ timeout: 20_000 });
    await expect(rejectedRow.getByText("Requested")).toBeVisible();
    await expect(rejectedRow.getByText("read_only_account").or(rejectedRow.getByText("configuration_health")).first()).toBeVisible();
    await expect(rejectedRow.getByLabel("Decision note")).toBeVisible();
    await expect(rejectedRow.getByRole("button", { name: "Reject" })).toBeDisabled();
    await rejectedRow.getByLabel("Decision note").fill(decisionNote);
    await expect(rejectedRow.getByRole("button", { name: "Reject" })).toBeEnabled();
    await expect(rejectedRow.getByRole("button", { name: "Approve" })).toBeEnabled();
    await expect(rejectedRow.getByRole("button", { name: "Start session" })).toBeDisabled();

    const rejectResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
      { timeout: 20_000 },
    );
    await rejectedRow.getByRole("button", { name: "Reject" }).click();
    await expect((await rejectResponsePromise).ok()).toBeTruthy();
    await expect(page.getByRole("status")).toContainText("Reject saved.");
    await expect(rejectedRow.getByText("Rejected")).toBeVisible({ timeout: 20_000 });
    await expect(rejectedRow.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(rejectedRow.getByRole("button", { name: "Start session" })).toBeDisabled();
    await expect(rejectedRow.getByRole("button", { name: "Revoke" })).toBeDisabled();
    await expectNoHorizontalOverflow(page);
    await captureAuditDownloadStep(page, testInfo, "01-rejected-support-row");

    await page.goto(`/tenant-admin/trust-audit?event_group=support&event_type=support_access_rejected`, { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Tenant Trust Audit");
    await expect(page.getByText("Event: Support Access Rejected")).toBeVisible();
    await expect(page.getByText("Support Access Rejected", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(platformAdmin.username).or(page.getByText(hrAdmin.username)).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await captureAuditDownloadStep(page, testInfo, "02-rejected-support-trust-audit");

    const auditResponse = await page.request.get("/api/tenant-admin/trust-audit?event_group=support&event_type=support_access_rejected&page_size=50");
    expect(auditResponse.ok()).toBeTruthy();
    const audit = (await auditResponse.json()) as TrustAuditResponse;
    const rejectedEvent = audit.events.find((event) => event.event_type === "support_access_rejected" && event.actor_identifier === hrAdmin.username);
    expect(rejectedEvent).toBeTruthy();
    expect(rejectedEvent?.source_ref).toBe("saas.support_access.grant.v1");
    expect(rejectedEvent?.source_hash).toBeTruthy();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Download audit" }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("northstar-foods-commercial-support-audit-pack.json");
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();
    const rawPack = await readFile(downloadPath as string, "utf8");
    const auditPack = JSON.parse(rawPack);
    expect(auditPack.tenant.code).toBe("northstar-foods");
    expect(auditPack.audit_pack_ref).toBeTruthy();
    expect(auditPack.evidence_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(auditPack.integrity.source_hashes.support_access_grants.length).toBeGreaterThan(0);
    expect(auditPack.integrity.source_hashes.commercial_events.length).toBeGreaterThan(0);
    expect(auditPack.support_access.grants.length).toBeGreaterThan(0);
    expect(auditPack.commercial_events.length).toBeGreaterThan(0);
    expect(JSON.stringify(auditPack)).toContain("support_access_rejected");
    expect(JSON.stringify(auditPack)).toContain(reason);
    expect(JSON.stringify(auditPack)).toContain("saas.support_access.grant.v1");
  });
});
