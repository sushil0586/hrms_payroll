import { expect, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

test.describe("Platform admin permission catalog certification", () => {
  test("certifies catalog visibility, search, filters, and protected platform-only permissions", async ({ page }) => {
    await gotoAuthenticated(page, "/platform-admin/permissions", platformAdmin);
    await suppressBrowserTestNoise(page);
    await expect(page.locator(".app-shell--workspace")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Permission Catalog" })).toBeVisible();
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);

    await expect(page.getByRole("link", { name: "Permissions" })).toBeVisible();
    const summary = page.getByTestId("platform-permission-catalog-summary");
    await expect(summary).toBeVisible();
    await expect(summary.getByText("Tenant assignable")).toBeVisible();
    await expect(summary.getByText("Platform only")).toBeVisible();
    await expect(summary.getByText("Critical risk")).toBeVisible();

    const catalogReview = page.locator(".record-card").filter({ has: page.getByRole("heading", { name: "Catalog review" }) });
    await expect(catalogReview).toBeVisible();
    await expect(catalogReview.getByText("Manage tenant roles")).toBeVisible();
    await expect(catalogReview.getByText("tenant.roles.manage")).toBeVisible();
    await expect(catalogReview.getByText("Tenant Admin")).toBeVisible();

    await page.locator('[name="q"]').fill("permission_catalog");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/q=permission_catalog/);
    await expect(catalogReview.getByText("platform.permission_catalog.manage")).toBeVisible();
    await expect(catalogReview.getByText("Platform only")).toBeVisible();
    await expect(catalogReview.getByText("Critical")).toBeVisible();

    await page.locator('[name="assignable"]').selectOption("tenant");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("No permissions match these filters.")).toBeVisible();

    await page.getByRole("link", { name: "Reset" }).click();
    await page.locator('[name="risk"]').selectOption("critical");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/risk=critical/);
    await expect(catalogReview.getByText("Critical").first()).toBeVisible();
    await expect(catalogReview.getByText("Manage payroll setup").or(catalogReview.getByText("Manage permission catalog")).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
