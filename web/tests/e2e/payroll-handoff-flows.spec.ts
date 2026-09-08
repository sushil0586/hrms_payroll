import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll handoff flows", () => {
  test("handoff workspace exposes finance artifacts, profile refs, source hashes, and provider acknowledgements", async ({ page }) => {
    await page.goto("/hr-admin/payroll-handoff");
    await expectPageReady(page, "Payroll Handoff");

    await expect(page.getByRole("heading", { name: "Handoffs" })).toBeVisible();
    await expect(page.getByText("Finance artifacts").first()).toBeVisible();
    await expect(page.getByText("india.monthly.finance.handoff.v1").first()).toBeVisible();
    await expect(page.getByText("india.bank.neft.profile.v1").first()).toBeVisible();
    await expect(page.getByText("tally.accounting.export.v1").first()).toBeVisible();
    await expect(page.getByText("india.statutory.summary.v1").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Statutory filing files" })).toBeVisible();
    await expect(page.getByText("Maharashtra PT August 2026 Return").first()).toBeVisible();
    await expect(page.getByText("Maharashtra PT August 2026 Challan").first()).toBeVisible();
    await expect(page.getByText("india.pt.mh.return.file.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.portal.v1").first()).toBeVisible();
    await expect(page.getByText("₹63,400").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery acknowledgements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider retries" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider jobs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider callbacks" })).toBeVisible();
    await expect(page.getByText("Audit packs").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider audit pack" })).toBeVisible();
    await expect(page.getByText("payroll.provider_audit_pack.standard.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.retention.provider_audit.10y.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider.bank.live.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_adapter.bank.live_payout.v1").first()).toBeVisible();
    await expect(page.getByText("bank.live.neft.payout.v1").first()).toBeVisible();
    await expect(page.getByText("tenant.bank.debit_account.payroll.v1").first()).toBeVisible();
    await expect(page.getByText("Live payout").first()).toBeVisible();
    await expect(page.getByText("UTR-AUG-2026-001").first()).toBeVisible();
    await expect(page.getByText("ACK-AUG-2026-01").first()).toBeVisible();
    await expect(page.getByText("payroll.delivery.retry.statutory.v1").first()).toBeVisible();
    await expect(page.getByText("transient_gateway").first()).toBeVisible();
    await expect(page.getByText("Attempt 3").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_queue.provider_retry.standard.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_worker.provider_retry.standard.v1").first()).toBeVisible();
    await expect(page.getByText("Provider Retry").first()).toBeVisible();
    await expect(page.getByText("Heartbeat 1").first()).toBeVisible();
    await expect(page.getByText("Recovered 1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_queue.heartbeat.standard.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_mapping.bank.bank_advice.default.v1").first()).toBeVisible();
    await expect(page.getByText("evt-clear-aug-2026-01").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.callback.hmac.v1").first()).toBeVisible();
    await expect(page.getByText("Webhook security").first()).toBeVisible();
    await expect(page.getByText("Signature adapter").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_signature_adapter.rsa_sha256_public_key.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.callback.signature.rsa_sha256.v1").first()).toBeVisible();
    await expect(page.getByText("callback_signature_matched").first()).toBeVisible();
    await expect(page.getByText("callback_replay_window").first()).toBeVisible();
    await expect(page.getByText("callback_rate_limit").first()).toBeVisible();
    await expect(page.getByText("Reconciled").first()).toBeVisible();

    await page.locator("a[href*='artifactId=payhandoff-provider-audit-pack-aug-2026-core']").first().click();
    await expect(page).toHaveURL(/artifactId=payhandoff-provider-audit-pack-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "Provider Audit Pack - August 2026 Core Payroll" })).toBeVisible();
    await expect(page.getByText("Locked evidence").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_audit_pack.schema.v1").first()).toBeVisible();
    await expect(page.getByText("Evidence Checksum Sha256").first()).toBeVisible();

    await page.locator('a[href="/hr-admin/payroll-handoff?handoffId=payhandoff-aug-2026-core&artifactId=payhandoff-accounting-export-aug-2026-core"]').click();
    await expect(page).toHaveURL(/artifactId=payhandoff-accounting-export-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "Accounting Export - August 2026 Core Payroll" })).toBeVisible();
    await expect(page.getByText("finance.ledger.mapping.default.v1").first()).toBeVisible();
    await expect(page.getByText("text/csv").first()).toBeVisible();
    await expect(page.getByText("payroll.storage.local.generated.v1").first()).toBeVisible();
    await expect(page.getByText("local-accounting-export-v1").first()).toBeVisible();
    await expect(page.getByText("payroll.download.stream.local.v1").first()).toBeVisible();
    await expect(page.getByText("Streamed").first()).toBeVisible();
    await expect(page.getByText("Provider acknowledgement").first()).toBeVisible();
    await expect(page.getByText("Schema mapping").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_mapping.accounting.accounting_export.default.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.internal.accounting_export.submission.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider.accounting.live.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_adapter.accounting.live_journal.v1").first()).toBeVisible();
    await expect(page.getByText("accounting.live.ledger.profile.v1").first()).toBeVisible();
    await expect(page.getByText("tenant.accounting.company.primary.v1").first()).toBeVisible();
    await expect(page.getByText("Live journal").first()).toBeVisible();
    await expect(page.getByText("VCH-AUG-2026-001").first()).toBeVisible();
    await expect(page.getByText("payroll.delivery.retry.standard.v1").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download file" }).first()).toBeVisible();
    await expect(page.getByText("ab77118811bb").first()).toBeVisible();

    await page.locator("a[href*='artifactId=payhandoff-statutory-report-aug-2026-core']").first().click();
    await expect(page).toHaveURL(/artifactId=payhandoff-statutory-report-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "Statutory Summary - August 2026 Core Payroll" })).toBeVisible();
    await expect(page.getByText("payroll.provider.statutory.live.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_adapter.statutory.live_filing.v1").first()).toBeVisible();
    await expect(page.getByText("statutory.live.epfo.ecr.profile.v1").first()).toBeVisible();
    await expect(page.getByText("india.epfo.portal.v1").first()).toBeVisible();
    await expect(page.getByText("EPFO-MH-ACME-001").first()).toBeVisible();
    await expect(page.getByText("Live filing").first()).toBeVisible();
    await expect(page.getByText("RCPT-EPFO-AUG-2026-001").first()).toBeVisible();

    await page.locator("a[href*='artifactId=payhandoff-mh-pt-return-aug-2026-core']").first().click();
    await expect(page).toHaveURL(/artifactId=payhandoff-mh-pt-return-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "Maharashtra PT August 2026 Return" })).toBeVisible();
    await expect(page.getByText("Submission contract").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.return.adapter.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.pt.return.submit.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.callback.hmac.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.pt.return.certificate.v1").first()).toBeVisible();
    await expect(page.getByText("Recorded").first()).toBeVisible();

    await page.locator("a[href*='artifactId=payhandoff-mh-pt-challan-aug-2026-core']").first().click();
    await expect(page).toHaveURL(/artifactId=payhandoff-mh-pt-challan-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "Maharashtra PT August 2026 Challan" })).toBeVisible();
    await expect(page.getByText("Retry commands").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Schedule retry" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Requeue delivery" })).toBeVisible();
    await expect(page.getByText("CLEAR_TIMEOUT").first()).toBeVisible();
    await expect(page.getByText("Scheduled").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_adapter.statutory.sandbox.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.retry.worker.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory-sandbox-credential").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.credentials.sandbox.v1").first()).toBeVisible();
    await expect(page.getByText("Connection gate").first()).toBeVisible();
    await expect(page.getByText("certified").first()).toBeVisible();
    await expect(page.getByText("sandbox_ready").first()).toBeVisible();
    await expect(page.getByText("certification_passed").first()).toBeVisible();

    await page.locator("a[href*='evidence=delivery%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Delivery Evidence" })).toBeVisible();
    await expect(page.getByText("Audit drilldown").first()).toBeVisible();
    await expect(page.getByText("Evidence chain").first()).toBeVisible();
    await expect(page.getByText("Bank payout").first()).toBeVisible();
    await expect(page.getByText("bank://ack/BANK-LIVE-BATCH-2026-08").first()).toBeVisible();
    await expect(page.getByText("Payload checksum").first()).toBeVisible();
    await expect(page.getByText("Linked provider records").first()).toBeVisible();

    await page.locator("a[href*='evidence=retry%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Retry Evidence" })).toBeVisible();
    await expect(page.getByText("Decision snapshot").first()).toBeVisible();
    await expect(page.getByText("Backoff seconds").first()).toBeVisible();
    await expect(page.getByText("Retry challan submission after provider timeout").first()).toBeVisible();

    await page.locator("a[href*='evidence=job%3A'][href*='payjob-retry']").first().click();
    await expect(page.getByRole("heading", { name: "Queue Runtime Evidence" })).toBeVisible();
    await expect(page.getByText("Runtime policy").first()).toBeVisible();
    await expect(page.getByText("Heartbeat seconds").first()).toBeVisible();
    await expect(page.getByText("Stale Lease Recovered").first()).toBeVisible();
    await expect(page.getByText("provider_job_stale_lease_recovered").first()).toBeVisible();

    await page.locator("a[href*='evidence=callback%3A']").first().click();
    await expect(page.getByRole("heading", { name: "Callback Evidence" })).toBeVisible();
    await expect(page.getByText("Webhook identity").first()).toBeVisible();
    await expect(page.getByText("Credential source").first()).toBeVisible();
    await expect(page.getByText("callback_signature_matched").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
