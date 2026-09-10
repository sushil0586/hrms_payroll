import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll rule engine flows", () => {
  test("rule workspace exposes formulas, locked snapshot options, and live rule detail", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-rules");
    await expectPageReady(page, "Payroll Rules");

    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(page.getByText("Rule versions").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Locked snapshot options" })).toBeVisible();

    const ruleLink = page.locator("main a[href*='ruleId=']").first();
    if (await ruleLink.isVisible().catch(() => false)) {
      await ruleLink.click();
      await expect(page).toHaveURL(/ruleId=/);
      await expect(page.getByRole("heading", { name: "Recent evaluations" }).or(page.getByText("Formula")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
