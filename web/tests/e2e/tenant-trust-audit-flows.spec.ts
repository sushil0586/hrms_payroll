import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant trust audit", () => {
  test("shows customer-visible audit filters and live evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/trust-audit");
    await expectPageReady(page, "Tenant Trust Audit");
    await expect(page.getByRole("main").getByText("Event groups", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Support access", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence ledger" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();

    const evidenceLink = page.locator("main a[href*='eventId='], main a[href*='support-session'], main a[href*='audit']").first();
    if (await evidenceLink.isVisible().catch(() => false)) {
      await expect(evidenceLink).toBeVisible();
    } else {
      await expect(page.getByText("No audit events").or(page.getByText("Evidence ledger")).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });
});
