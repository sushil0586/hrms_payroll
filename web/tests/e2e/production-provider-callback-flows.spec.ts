import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

type Persona = {
  username: string;
  password: string;
};

const hrAdmin: Persona = {
  username: "nisha.rao",
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

async function captureProviderStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-provider-callbacks/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

async function expectVisibleText(page: Page, patterns: (string | RegExp)[]) {
  for (const pattern of patterns) {
    await expect(page.getByText(pattern).first()).toBeVisible();
  }
}

test.describe("Production provider callback and retry proof", () => {
  test("callback ledger exposes signed, idempotent, replay-safe webhook evidence", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-handoff?handoffId=payhandoff-aug-2026-core");
    await expectPageReady(page, "Payroll Handoff");

    await expect(page.getByRole("heading", { name: "Provider callbacks" })).toBeVisible();
    await expectVisibleText(page, [
      "evt-clear-aug-2026-01",
      "clear-statutory.callback.hmac.v1",
      "Webhook security",
      "Signature adapter",
      "payroll.provider_signature_adapter.rsa_sha256_public_key.v1",
      "payroll.callback.signature.rsa_sha256.v1",
      "callback_signature_matched",
      "callback_replay_window",
      "callback_rate_limit",
    ]);
    await captureProviderStep(page, testInfo, "01-callback-ledger-security");

    await page.locator("a[href*='evidence=callback%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Callback Evidence" })).toBeVisible();
    await expectVisibleText(page, [
      "Webhook identity",
      "Credential source",
      "callback_signature_matched",
      "callback_replay_window",
      "callback_rate_limit",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureProviderStep(page, testInfo, "02-callback-evidence-drilldown");
  });

  test("retry and queue recovery evidence show safe transient-failure controls", async ({ page }, testInfo) => {
    await loginIfRequired(
      page,
      hrAdmin,
      "/hr-admin/payroll-handoff?handoffId=payhandoff-aug-2026-core&artifactId=payhandoff-mh-pt-challan-aug-2026-core",
    );
    await expectPageReady(page, "Payroll Handoff");

    await expect(page.getByRole("heading", { name: "Maharashtra PT August 2026 Challan" })).toBeVisible();
    await expectVisibleText(page, [
      "Retry commands",
      "CLEAR_TIMEOUT",
      "Scheduled",
      "payroll.delivery.retry.statutory.v1",
      "payroll.provider_adapter.statutory.sandbox.v1",
      "clear-statutory.retry.worker.v1",
      "clear-statutory-sandbox-credential",
      "clear-statutory.credentials.sandbox.v1",
      "certified",
      "sandbox_ready",
      "certification_passed",
    ]);
    await expect(page.getByRole("button", { name: "Schedule retry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Requeue delivery" })).toBeVisible();
    await captureProviderStep(page, testInfo, "03-retry-command-controls");

    await page.locator("a[href*='evidence=retry%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Retry Evidence" })).toBeVisible();
    await expectVisibleText(page, [
      "Decision snapshot",
      "Backoff seconds",
      "Retry challan submission after provider timeout",
    ]);
    await captureProviderStep(page, testInfo, "04-retry-decision-evidence");

    await page.locator("a[href*='evidence=job%3A'][href*='payjob-retry']").first().click();
    await expect(page.getByRole("heading", { name: "Queue Runtime Evidence" })).toBeVisible();
    await expectVisibleText(page, [
      "Runtime policy",
      "Heartbeat seconds",
      "Stale Lease Recovered",
      "provider_job_stale_lease_recovered",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureProviderStep(page, testInfo, "05-queue-runtime-recovery");
  });

  test("delivery drilldown and provider audit pack preserve locked evidence chain", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-handoff?handoffId=payhandoff-aug-2026-core");
    await expectPageReady(page, "Payroll Handoff");

    await page.locator("a[href*='evidence=delivery%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Delivery Evidence" })).toBeVisible();
    await expectVisibleText(page, [
      "Audit drilldown",
      "Evidence chain",
      "Bank payout",
      "bank://ack/BANK-LIVE-BATCH-2026-08",
      "Payload checksum",
      "Linked provider records",
    ]);
    await captureProviderStep(page, testInfo, "06-delivery-evidence-chain");

    await page.locator("a[href*='artifactId=payhandoff-provider-audit-pack-aug-2026-core']").first().click();
    await expect(page).toHaveURL(/artifactId=payhandoff-provider-audit-pack-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "Provider Audit Pack - August 2026 Core Payroll" })).toBeVisible();
    await expectVisibleText(page, [
      "Locked evidence",
      "payroll.provider_audit_pack.standard.v1",
      "payroll.provider_audit_pack.schema.v1",
      "payroll.retention.provider_audit.10y.v1",
      "Evidence Checksum Sha256",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureProviderStep(page, testInfo, "07-provider-audit-pack-lock");
  });
});
