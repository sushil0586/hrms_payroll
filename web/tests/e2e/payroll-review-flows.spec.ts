import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll review flows", () => {
  test("review workspace exposes final lock, exceptions, approvals, and line evidence", async ({ page }) => {
    await page.goto("/hr-admin/payroll-review");
    await expectPageReady(page, "Payroll Review");

    await expect(page.getByRole("heading", { name: "Review queue" })).toBeVisible();
    await expect(page.getByText("Exception register").first()).toBeVisible();
    await expect(page.getByText("Approval trail").first()).toBeVisible();
    await expect(page.getByText("Final lock").first()).toBeVisible();
    await expect(page.getByText("₹56,400").first()).toBeVisible();
    await expect(page.getByText("india.monthly.review.profile.v1").first()).toBeVisible();

    await page.getByRole("link", { name: /PF cap reviewed/ }).click();
    await expect(page).toHaveURL(/exceptionId=payexception-variance-note/);
    await expect(page.getByRole("heading", { name: "PF cap reviewed" })).toBeVisible();
    await expect(page.getByText("Accepted after finance verified").first()).toBeVisible();
    await expect(page.getByText("india.pf.v1").first()).toBeVisible();
    await expect(page.getByText("india.monthly.approval.profile.v1").first()).toBeVisible();
    await expect(page.getByText("PF Employee India").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
