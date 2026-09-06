import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll calculation flows", () => {
  test("calculation workspace exposes draft attempts, lines, totals, and traces", async ({ page }) => {
    await page.goto("/hr-admin/payroll-calculations");
    await expectPageReady(page, "Payroll Calculations");

    await expect(page.getByRole("heading", { name: "Calculation queue" })).toBeVisible();
    await expect(page.getByText("Calculation attempts").first()).toBeVisible();
    await expect(page.getByText("Calculation validation").first()).toBeVisible();
    await expect(page.getByText("Source Data: 1").first()).toBeVisible();
    await expect(page.getByText("Statutory Setup: 1").first()).toBeVisible();
    await expect(page.getByText("Snapshot has source-data warnings").first()).toBeVisible();
    await expect(page.getByText("Required statutory profile needs review").first()).toBeVisible();
    await expect(page.getByText("india.monthly.validation.profile.v1").first()).toBeVisible();
    await expect(page.getByText("Latest net pay").first()).toBeVisible();
    await expect(page.getByText("Validation").first()).toBeVisible();
    await expect(page.getByText("Attempt 2").first()).toBeVisible();
    await expect(page.getByText("PF Employee India").first()).toBeVisible();
    await expect(page.getByText("Performance Bonus").first()).toBeVisible();
    await expect(page.getByText("₹63,400").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tax Deducted At Source" })).toBeVisible();
    await expect(page.getByText("TDS annualization").first()).toBeVisible();
    await expect(page.getByText("FY2026-27").first()).toBeVisible();
    await expect(page.getByText("1 cap rules consumed").first()).toBeVisible();
    await expect(page.getByText("Regime comparison").first()).toBeVisible();
    await expect(page.getByText("Old").first()).toBeVisible();
    await expect(page.getByText("New").first()).toBeVisible();

    await page.getByRole("link", { name: /PF Employee India/ }).first().click();
    await expect(page).toHaveURL(/lineId=paycalcline-0-2/);
    await expect(page.getByRole("heading", { name: "PF Employee India" })).toBeVisible();
    await expect(page.getByText("round_decimal(min(salary.basic_monthly, 15000) * 0.12, 2)").first()).toBeVisible();
    await expect(page.getByText("salary.basic_monthly").first()).toBeVisible();
    await expect(page.getByText("PF_EMPLOYEE").first()).toBeVisible();
    await expect(page.getByText("ab8c7b6a5d4e3f20").first()).toBeVisible();

    await page.getByRole("link", { name: /Performance Bonus/ }).first().click();
    await expect(page).toHaveURL(/lineId=paycalcline-adjustment-payadj-bonus-riya-aug/);
    await expect(page.getByRole("heading", { name: "Performance Bonus" })).toBeVisible();
    await expect(page.getByText("Adjustment Source").first()).toBeVisible();
    await expect(page.getByText("payroll.adjustment.input.snapshot.v1").first()).toBeVisible();
    await expect(page.getByText("payroll_adjustment.amount").first()).toBeVisible();
    await expect(page.getByText("bonus:EMP-0001:aug-2026").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
