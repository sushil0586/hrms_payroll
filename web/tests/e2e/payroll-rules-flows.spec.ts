import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll rule engine flows", () => {
  test("rule workspace exposes formulas, safe expressions, dependencies, and traces", async ({ page }) => {
    await page.goto("/hr-admin/payroll-rules");
    await expectPageReady(page, "Payroll Rules");

    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(page.getByText("Rule versions").first()).toBeVisible();
    await expect(page.getByText("round_decimal(salary.annual_ctc * salary.basic_percentage / 12, 2)").first()).toBeVisible();
    await expect(page.getByText("salary.annual_ctc").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Locked snapshot options" })).toBeVisible();
    await expect(page.getByText("August 2026 Core Payroll").first()).toBeVisible();

    await page.getByRole("link", { name: /HRA India Metro/ }).click();
    await expect(page).toHaveURL(/ruleId=payrule-hra-metro/);
    await expect(page.getByRole("heading", { name: "HRA India Metro" }).first()).toBeVisible();
    await expect(page.getByText("round_decimal(salary.basic_monthly * 0.50, 2)").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Recent evaluations" })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
