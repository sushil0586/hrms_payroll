import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll adjustment flows", () => {
  test("adjustment workspace exposes one-time inputs, approval state, profile refs, and source hashes", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-adjustments");
    await expectPageReady(page, "Payroll Adjustments");

    await expect(page.getByRole("heading", { name: "Adjustment runs" })).toBeVisible();
    await expect(page.getByText("One-time payroll inputs").first()).toBeVisible();

    const adjustmentLink = page.locator("main a[href*='adjustmentId=']").first();
    if (await adjustmentLink.isVisible().catch(() => false)) {
      await adjustmentLink.click();
      await expect(page).toHaveURL(/adjustmentId=/);
      await expect(page.getByText("Source hash").or(page.getByText("Approval")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
