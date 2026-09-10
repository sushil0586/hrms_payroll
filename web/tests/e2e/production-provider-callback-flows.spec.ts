import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectVisibleText, gotoAuthenticated, hrAdmin, loginIfRequired } from "../helpers/staging-auth";

async function captureProviderStep(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`production-provider-callbacks/${name}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true });
}

test.describe("Production provider callback and retry proof", () => {
  test("callback ledger exposes signed, idempotent, replay-safe webhook evidence", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-handoff");
    await expectPageReady(page, "Payroll Handoff");

    await expect(page.getByRole("heading", { name: "Provider callbacks" })).toBeVisible();
    test.skip(await page.locator("a[href*='evidence=callback%3A']").count() === 0, "No provider callback seed exists in this staging tenant.");
    await expectVisibleText(page, [
      "Webhook security",
      "Signature adapter",
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
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-handoff");
    await expectPageReady(page, "Payroll Handoff");

    test.skip(await page.locator("a[href*='evidence=retry%3A']").count() === 0, "No provider retry seed exists in this staging tenant.");
    await page.locator("a[href*='evidence=retry%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Retry Evidence" })).toBeVisible();
    await expectVisibleText(page, [
      "Decision snapshot",
      "Backoff seconds",
    ]);
    await captureProviderStep(page, testInfo, "03-retry-decision-evidence");

    test.skip(await page.locator("a[href*='evidence=job%3A']").count() === 0, "No provider job seed exists in this staging tenant.");
    await page.locator("a[href*='evidence=job%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Queue Runtime Evidence" })).toBeVisible();
    await expectVisibleText(page, [
      "Runtime policy",
      "Heartbeat seconds",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureProviderStep(page, testInfo, "04-queue-runtime-recovery");
  });

  test("delivery drilldown and provider audit pack preserve locked evidence chain", async ({ page }, testInfo) => {
    await loginIfRequired(page, hrAdmin, "/hr-admin/payroll-handoff");
    await expectPageReady(page, "Payroll Handoff");

    test.skip(await page.locator("a[href*='evidence=delivery%3A']").count() === 0, "No provider delivery seed exists in this staging tenant.");
    await page.locator("a[href*='evidence=delivery%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Delivery Evidence" })).toBeVisible();
    await expectVisibleText(page, [
      "Audit drilldown",
      "Evidence chain",
      "Payload checksum",
      "Linked provider records",
    ]);
    await captureProviderStep(page, testInfo, "06-delivery-evidence-chain");

    await gotoAuthenticated(page, "/hr-admin/payroll-handoff");
    const auditPack = page.locator("a[href*='artifactId=']").filter({ hasText: /audit pack/i }).first();
    test.skip(await auditPack.count() === 0, "No provider audit-pack seed exists in this staging tenant.");
    await auditPack.click();
    await expectVisibleText(page, [
      "Locked evidence",
      "Evidence Checksum Sha256",
    ]);
    await expectNoHorizontalOverflow(page);
    await captureProviderStep(page, testInfo, "07-provider-audit-pack-lock");
  });
});
