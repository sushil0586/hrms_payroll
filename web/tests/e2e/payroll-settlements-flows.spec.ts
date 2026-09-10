import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll settlement flows", () => {
  test("settlement workspace exposes F&F packages, totals, and live trace detail", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-settlements");
    await expectPageReady(page, "Payroll Settlements");

    await expect(page.getByRole("heading", { name: "Settlement runs" })).toBeVisible();
    await expect(page.getByText("Full-and-final packages").first()).toBeVisible();
    await expect(page.getByText("Source").or(page.getByText("Totals")).or(page.getByText("No settlements")).first()).toBeVisible();

    const settlementLink = page.locator("main a[href*='settlementId=']").first();
    if (await settlementLink.isVisible().catch(() => false)) {
      await settlementLink.click();
      await expect(page).toHaveURL(/settlementId=/);
      await expect(page.getByText("Source hash").or(page.getByText("Trace")).or(page.getByText("Line")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
