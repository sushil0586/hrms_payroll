import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Tenant trust audit", () => {
  test("shows customer-visible audit filters and evidence", async ({ page }) => {
    await page.goto("/tenant-admin/trust-audit");
    await expectPageReady(page, "Tenant Trust Audit");
    await expect(page.getByRole("main").getByText("Event groups", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Support access", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence ledger" })).toBeVisible();
    await expect(page.getByRole("strong").filter({ hasText: "Support Access Session Checked" })).toBeVisible();
    await expect(page.getByRole("link", { name: "support-session-demo-001" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
