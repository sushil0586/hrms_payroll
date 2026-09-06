import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll provider connection flows", () => {
  test("provider workspace exposes SaaS onboarding refs, readiness gates, and certification state", async ({ page }) => {
    await page.goto("/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");

    await expect(page.getByRole("heading", { name: "Connections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bank payout sandbox" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Certification checklist" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run certification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scenario evidence" })).toBeVisible();
    await expect(page.getByText("Adapter contract").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_contract.bank.sandbox_adapter.v1").first()).toBeVisible();
    await expect(page.getByText("Latest request").first()).toBeVisible();
    await expect(page.getByText("Latest result").first()).toBeVisible();
    await expect(page.getByText("bank_advice_submission").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_connection.bank.certification_scenarios.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider.bank.sandbox.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_adapter.bank.sandbox.v1").first()).toBeVisible();
    await expect(page.getByText("bank-sandbox-credential").first()).toBeVisible();
    await expect(page.getByText("bank.credentials.sandbox.v1").first()).toBeVisible();
    await expect(page.getByText("bank.sftp.callback.hmac.v1").first()).toBeVisible();
    await expect(page.getByText("No raw secrets").first()).toBeVisible();

    await page.getByRole("link", { name: /Clear statutory sandbox/ }).first().click();
    await expect(page).toHaveURL(/connectionId=pay-provider-clear-statutory/);
    await expect(page.getByRole("heading", { name: "Clear statutory sandbox" }).first()).toBeVisible();
    await expect(page.getByText("clear-statutory.portal.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.provider_adapter.statutory.sandbox.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory-sandbox-credential").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.credentials.sandbox.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.callback.hmac.v1").first()).toBeVisible();
    await expect(page.getByText("clear-statutory.pt.challan.receipt.v1").first()).toBeVisible();
    await expect(page.getByText("certification_passed").first()).toBeVisible();
    await expect(page.getByText("statutory_challan_receipt").first()).toBeVisible();
    await expect(page.getByText("statutory_callback_replay_guard").first()).toBeVisible();
    await expect(page.getByText("Pending").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
