import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll review flows", () => {
  test("review workspace exposes exceptions, approvals, final lock controls, and live detail", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-review");
    await expectPageReady(page, "Payroll Review");

    await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
    await expect(page.getByText("Exception register").first()).toBeVisible();
    await expect(page.getByText("Approval trail").first()).toBeVisible();
    await expect(page.getByText("Final lock").first()).toBeVisible();

    const exceptionLink = page.locator("main a[href*='exceptionId=']").first();
    if (await exceptionLink.isVisible().catch(() => false)) {
      await exceptionLink.click();
      await expect(page).toHaveURL(/exceptionId=/);
      await expect(page.getByText("Approval").or(page.getByText("Source")).or(page.getByText("Exception")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
