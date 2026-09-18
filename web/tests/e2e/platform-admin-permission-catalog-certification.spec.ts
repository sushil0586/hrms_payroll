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
    await expect(summary.getByText("Catalog source")).toBeVisible();

    const catalogReview = page.locator(".record-card").filter({ has: page.getByRole("heading", { name: "Catalog review" }) });
    await expect(catalogReview).toBeVisible();
    await expect(catalogReview.getByText("Manage tenant roles")).toBeVisible();
    await expect(catalogReview.getByText("tenant.roles.manage")).toBeVisible();
    await expect(catalogReview.getByText("Tenant Admin")).toBeVisible();
    await catalogReview.getByRole("button", { name: "Edit" }).first().click();
    await expect(page.getByRole("dialog", { name: "Edit platform permission" })).toBeVisible();
    await expect(page.getByText("Keys are immutable.")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

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

  test("certifies permission catalog edit validation, save, refresh persistence, and restore", async ({ page }) => {
    const permissionKey = "tenant.roles.manage";
    const originalLabel = "Manage tenant roles";
    const updatedLabel = `${originalLabel} QA`;

    await gotoAuthenticated(page, `/platform-admin/permissions?q=${encodeURIComponent(permissionKey)}`, platformAdmin);
    await suppressBrowserTestNoise(page);
    await expect(page.getByRole("heading", { level: 1, name: "Permission Catalog" })).toBeVisible();

    const catalogReview = page.locator(".record-card").filter({ has: page.getByRole("heading", { name: "Catalog review" }) });
    const row = catalogReview.locator(".platform-permission-row").filter({ hasText: permissionKey }).first();
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Edit" }).click();

    const dialog = page.getByRole("dialog", { name: "Edit platform permission" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Keys are immutable.")).toBeVisible();
    const label = dialog.getByLabel("Label");
    await expect(label).toBeFocused();
    await label.fill("");
    await dialog.getByRole("button", { name: "Save permission" }).click();
    await expect(dialog.getByText("Permission label is required.")).toBeVisible();

    await label.fill(updatedLabel);
    await dialog.getByLabel("Description").fill("QA-certified tenant role management permission.");
    await dialog.getByLabel("Risk").selectOption("high");
    await dialog.getByRole("button", { name: "Save permission" }).click();
    await expect(dialog).toBeHidden();
    await expect(row.getByText(updatedLabel, { exact: true })).toBeVisible();
    await expect(row.getByText("High", { exact: true })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    const refreshedRow = page.locator(".platform-permission-row").filter({ hasText: permissionKey }).first();
    await expect(refreshedRow.getByText(updatedLabel, { exact: true })).toBeVisible();

    await refreshedRow.getByRole("button", { name: "Edit" }).click();
    const restoreDialog = page.getByRole("dialog", { name: "Edit platform permission" });
    await restoreDialog.getByLabel("Label").fill(originalLabel);
    await restoreDialog.getByLabel("Risk").selectOption("medium");
    await restoreDialog.getByLabel("Description").fill("Can create, edit, and retire tenant roles.");
    await restoreDialog.getByRole("button", { name: "Save permission" }).click();
    await expect(restoreDialog).toBeHidden();
    await expect(page.locator(".platform-permission-row").filter({ hasText: permissionKey }).first().getByText(originalLabel, { exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
