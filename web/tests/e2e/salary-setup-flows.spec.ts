import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin salary setup flows", () => {
  test("salary setup exposes components, versions, lines, and assignments", async ({ page }) => {
    await page.goto("/hr-admin/salary-setup");
    await expectPageReady(page, "Salary Setup");

    await expect(page.getByRole("heading", { name: "Catalog" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Version matrix" })).toBeVisible();
    await expect(page.getByText("hra.india.metro.v1").first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Staff Standard/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Structure composition" })).toBeVisible();
    await expect(page.getByText("PF Employee").first()).toBeVisible();

    await page.getByRole("link", { name: /Leadership Compensation/ }).click();
    await expect(page).toHaveURL(/structureId=salstruct-leadership/);
    await expect(page.getByRole("heading", { name: "Leadership Compensation" }).first()).toBeVisible();
    await expect(page.getByText("leadership.salary.review.v1")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Employee salary coverage" })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
