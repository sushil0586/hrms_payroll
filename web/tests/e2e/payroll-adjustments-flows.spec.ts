import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll adjustment flows", () => {
  test("adjustment workspace exposes one-time inputs, approval state, profile refs, and source hashes", async ({ page }) => {
    await page.goto("/hr-admin/payroll-adjustments");
    await expectPageReady(page, "Payroll Adjustments");

    await expect(page.getByRole("heading", { name: "Adjustment runs" })).toBeVisible();
    await expect(page.getByText("One-time payroll inputs").first()).toBeVisible();
    await expect(page.getByText("india.monthly.adjustments.v1").first()).toBeVisible();
    await expect(page.getByText("Performance Bonus").first()).toBeVisible();
    await expect(page.getByText("Travel Reimbursement").first()).toBeVisible();
    await expect(page.getByText("Loan Recovery").first()).toBeVisible();
    await expect(page.getByText("₹15,000").first()).toBeVisible();

    await page.getByRole("link", { name: /Travel Reimbursement/ }).click();
    await expect(page).toHaveURL(/adjustmentId=payadj-reimb-aman-aug/);
    await expect(page.getByRole("heading", { name: "Travel Reimbursement" })).toBeVisible();
    await expect(page.getByText("payroll.adjustment.approval.v1").first()).toBeVisible();
    await expect(page.getByText("expense:EMP-0002:TRV-2181").first()).toBeVisible();
    await expect(page.getByText("ef8c7b6a5d4e").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
