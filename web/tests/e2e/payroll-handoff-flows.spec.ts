import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll handoff flows", () => {
  test("handoff workspace exposes finance artifacts, profile refs, and source hashes", async ({ page }) => {
    await page.goto("/hr-admin/payroll-handoff");
    await expectPageReady(page, "Payroll Handoff");

    await expect(page.getByRole("heading", { name: "Handoffs" })).toBeVisible();
    await expect(page.getByText("Finance artifacts").first()).toBeVisible();
    await expect(page.getByText("india.monthly.finance.handoff.v1").first()).toBeVisible();
    await expect(page.getByText("india.bank.neft.profile.v1").first()).toBeVisible();
    await expect(page.getByText("tally.accounting.export.v1").first()).toBeVisible();
    await expect(page.getByText("india.statutory.summary.v1").first()).toBeVisible();
    await expect(page.getByText("₹63,900").first()).toBeVisible();

    await page.getByRole("link", { name: /Accounting Export - August 2026 Core Payroll/ }).click();
    await expect(page).toHaveURL(/artifactId=payhandoff-accounting-export-aug-2026-core/);
    await expect(page.getByRole("heading", { name: "Accounting Export - August 2026 Core Payroll" })).toBeVisible();
    await expect(page.getByText("finance.ledger.mapping.default.v1").first()).toBeVisible();
    await expect(page.getByText("text/csv").first()).toBeVisible();
    await expect(page.getByText("payroll.storage.local.generated.v1").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download file" }).first()).toBeVisible();
    await expect(page.getByText("ab77118811bb").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
