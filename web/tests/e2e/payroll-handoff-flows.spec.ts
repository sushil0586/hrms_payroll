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
    await expect(page.getByRole("heading", { name: "Provider callbacks" })).toBeVisible();
    await expect(page.getByText("payroll.provider.bank.manual.v1").first()).toBeVisible();
    await expect(page.getByText("ACK-AUG-2026-01").first()).toBeVisible();
    await expect(page.getByText("payroll.delivery.retry.statutory.v1").first()).toBeVisible();
    await expect(page.getByText("transient_gateway").first()).toBeVisible();
    await expect(page.getByText("Attempt 3").first()).toBeVisible();
    await expect(page.getByText("evt-clear-aug-2026-01").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.callback.hmac.v1").first()).toBeVisible();
    await expect(page.getByText("Webhook security").first()).toBeVisible();
    await expect(page.getByText("callback_signature_matched").first()).toBeVisible();
    await expect(page.getByText("callback_replay_window").first()).toBeVisible();
    await expect(page.getByText("callback_rate_limit").first()).toBeVisible();
    await expect(page.getByText("Reconciled").first()).toBeVisible();

    await page.getByRole("link", { name: /Accounting Export - August 2026 Core Payroll/ }).click();
    await expect(page).toHaveURL(/artifactId=payhandoff-accounting-export-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "Accounting Export - August 2026 Core Payroll" })).toBeVisible();
    await expect(page.getByText("finance.ledger.mapping.default.v1").first()).toBeVisible();
    await expect(page.getByText("text/csv").first()).toBeVisible();
    await expect(page.getByText("payroll.storage.local.generated.v1").first()).toBeVisible();
    await expect(page.getByText("local-accounting-export-v1").first()).toBeVisible();
    await expect(page.getByText("payroll.download.stream.local.v1").first()).toBeVisible();
    await expect(page.getByText("Streamed").first()).toBeVisible();
    await expect(page.getByText("Provider acknowledgement").first()).toBeVisible();
    await expect(page.getByText("payroll.provider.accounting.manual.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.delivery.retry.standard.v1").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download file" }).first()).toBeVisible();
    await expect(page.getByText("ab77118811bb").first()).toBeVisible();

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

    await expectNoHorizontalOverflow(page);
  });
});
