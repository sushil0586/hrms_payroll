import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll calculation flows", () => {
  test("calculation workspace exposes draft attempts, lines, totals, and traces", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-calculations");
    await expectPageReady(page, "Payroll Calculations");

    await expect(page.getByRole("heading", { name: "Calculation queue" })).toBeVisible();
    await expect(page.getByText("Calculation attempts").first()).toBeVisible();
    await expect(page.getByText("Calculation validation").first()).toBeVisible();
    await expect(page.getByText("Latest net pay").or(page.getByText("No calculations")).first()).toBeVisible();
    await expect(page.getByText("Validation").or(page.getByText("Calculation validation")).first()).toBeVisible();

    const lineLink = page.locator("main a[href*='lineId=']").first();
    if (await lineLink.isVisible().catch(() => false)) {
      await lineLink.click();
      await expect(page).toHaveURL(/lineId=/);
      await expect(page.getByText("Source hash").or(page.getByText("Formula")).or(page.getByText("Source")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
