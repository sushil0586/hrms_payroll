import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll settlement flows", () => {
  test("settlement workspace exposes F&F packages, lines, totals, and trace evidence", async ({ page }) => {
    await page.goto("/hr-admin/payroll-settlements");
    await expectPageReady(page, "Payroll Settlements");

    await expect(page.getByRole("heading", { name: "Settlement runs" })).toBeVisible();
    await expect(page.getByText("Full-and-final packages").first()).toBeVisible();
    await expect(page.getByText("Final Earned Salary").first()).toBeVisible();
    await expect(page.getByText("Leave Encashment").first()).toBeVisible();
    await expect(page.getByText("Notice Recovery").first()).toBeVisible();
    await expect(page.getByText("₹40,000").first()).toBeVisible();
    await expect(page.getByText("india.full-final.settlement.v1").first()).toBeVisible();

    await page.getByRole("link", { name: /Riya Sharma/ }).first().click();
    await expect(page).toHaveURL(/settlementId=paysettle-riya-aug-2026/);
    await expect(page.getByLabel("Riya Sharma payroll settlement").getByRole("heading", { name: "Riya Sharma" })).toBeVisible();
    await expect(page.getByText("exit.actual_exit_date").first()).toBeVisible();
    await expect(page.getByText("leave.balance.encashable_days").first()).toBeVisible();
    await expect(page.getByText("loan.outstanding_principal").first()).toBeVisible();
    await expect(page.getByText("settlement:EMP-0042:aug-2026").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
