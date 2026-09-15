import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

test.describe("Tenant admin users dialog certification", () => {
  test("certifies invite dialog validation, focus, Escape, and role requirement", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/users", tenantAdmin);
    await expectPageReady(page, "Tenant User Management");

    await page.getByRole("main").getByRole("button", { name: "Invite member" }).click();
    const dialog = page.getByRole("dialog", { name: "Invite tenant member" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Email")).toBeFocused();
    await expect(dialog.getByRole("alert")).toContainText("Email is required.");
    await expect(dialog.getByRole("button", { name: "Invite member", exact: true })).toBeDisabled();

    await dialog.getByLabel("Email").fill("bad-email");
    await expect(dialog.getByRole("alert")).toContainText("Enter a valid work email address.");
    await expect(dialog.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");

    await dialog.getByLabel("Email").fill(`ta.dialog.${Date.now()}@example.test`);
    await expect(dialog.getByRole("alert")).toContainText("Username is required.");
    await expect(dialog.getByLabel("Username")).toHaveAttribute("aria-invalid", "true");

    await dialog.getByLabel("Username").fill(`ta.dialog.${Date.now()}`);
    const checkedRoles = await dialog.locator("input[type='checkbox']:checked").all();
    for (const role of checkedRoles) {
      await role.uncheck();
    }
    await expect(dialog.getByRole("alert")).toContainText("Select at least one role.");
    await expect(dialog.getByRole("button", { name: "Invite member", exact: true })).toBeDisabled();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies update roles dialog focus, no-role validation, and Escape close", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/users", tenantAdmin);
    await expectPageReady(page, "Tenant User Management");

    await page.getByRole("main").getByRole("button", { name: "Update roles" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Update tenant member roles" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("input[type='checkbox']").first()).toBeFocused();

    const checkedRoles = await dialog.locator("input[type='checkbox']:checked").all();
    for (const role of checkedRoles) {
      await role.uncheck();
    }
    await expect(dialog.getByRole("alert")).toContainText("Select at least one role before saving.");
    await expect(dialog.getByRole("button", { name: "Update roles", exact: true })).toBeDisabled();

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies access-change dialog focus, status copy, and close paths", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/users", tenantAdmin);
    await expectPageReady(page, "Tenant User Management");

    const actionButton = page.getByRole("main").getByRole("button", { name: /Suspend|Activate/ }).first();
    await actionButton.click();
    const dialog = page.getByRole("dialog", { name: /tenant member/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Change note")).toBeFocused();
    await expect(dialog.getByRole("status")).toContainText(/members can access|members lose access/i);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toHaveCount(0);

    await page.getByRole("main").getByRole("button", { name: "Revoke" }).first().click();
    const revokeDialog = page.getByRole("dialog", { name: "Revoke tenant member" });
    await expect(revokeDialog).toBeVisible();
    await expect(revokeDialog.getByLabel("Change note")).toBeFocused();
    await expect(revokeDialog.getByRole("status")).toContainText("Revoked members lose access");
    await page.keyboard.press("Escape");
    await expect(revokeDialog).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies list search empty state and pagination controls", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/users", tenantAdmin);
    await expectPageReady(page, "Tenant User Management");

    const memberRows = page.locator(".tenant-membership-row");
    await expect(memberRows.first()).toBeVisible();
    expect(await memberRows.count()).toBeLessThanOrEqual(8);
    const pager = page.getByLabel("Member pagination");
    await expect(pager).toBeVisible();
    await expect(pager.getByRole("button", { name: "Previous" })).toBeDisabled();

    await page.getByLabel("Search members").fill("no-tenant-admin-member-for-this-query");
    await expect(page.getByRole("status", { name: "" }).filter({ hasText: "No members match the current search." })).toBeVisible();
    await expect(pager).toContainText("0-0 of 0");
    await expect(pager.getByRole("button", { name: "Next" })).toBeDisabled();
    await expectNoHorizontalOverflow(page);
  });
});
