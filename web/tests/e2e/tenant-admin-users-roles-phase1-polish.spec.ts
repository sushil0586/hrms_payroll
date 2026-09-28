import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

const artifactDir = path.join(process.cwd(), "test-results/tenant-admin-users-roles-phase1");

function slug(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

async function capture(page: Page, name: string) {
  mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, `${slug(name)}.png`), fullPage: true, animations: "disabled" });
}

async function expectControlsStayInsideMain(page: Page, route: string) {
  const issues = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea").evaluateAll((controls) => {
    return controls.flatMap((control) => {
      const rect = control.getBoundingClientRect();
      const style = window.getComputedStyle(control);
      if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) {
        return [];
      }
      const label = (control.textContent || control.getAttribute("aria-label") || control.getAttribute("placeholder") || control.tagName).trim();
      const clipped = rect.left < -1 || rect.right > document.documentElement.clientWidth + 1;
      const textClipped = control instanceof HTMLButtonElement || control.classList.contains("button")
        ? control.scrollWidth > control.clientWidth + 2
        : false;
      return clipped || textClipped ? [`${label || control.tagName} clipped=${clipped} textClipped=${textClipped}`] : [];
    }).slice(0, 10);
  });

  expect(issues, `${route} should not clip visible controls`).toEqual([]);
}

async function auditTenantPage(page: Page, route: string, heading: string | RegExp) {
  await gotoAuthenticated(page, route, tenantAdmin);
  await suppressBrowserTestNoise(page);
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectVisibleLinksAreReal(page, route);
  await auditVisibleControls(page, route, 48);
  await expectControlsStayInsideMain(page, route);
}

test.describe("Tenant Admin Phase 1 users and roles polish", () => {
  test("Users directory is aligned and dialogs stay usable", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await auditTenantPage(page, "/tenant-admin/users", "Tenant User Management");

    await expect(page.getByText("User Directory")).toBeVisible();
    await expect(page.locator(".tenant-directory-header")).toBeVisible();
    await expect(page.locator(".tenant-membership-row__actions").first()).toBeVisible();
    await expect(page.locator(".tenant-membership-row__actions").first().getByRole("button", { name: /update roles/i })).toBeVisible();
    await capture(page, "users-desktop");

    await page.getByRole("button", { name: /invite member/i }).click();
    await expect(page.getByRole("dialog", { name: /invite tenant member/i })).toBeVisible();
    await expectControlsStayInsideMain(page, "/tenant-admin/users invite dialog");
    await capture(page, "users-invite-dialog");
    await page.getByRole("dialog", { name: /invite tenant member/i }).getByRole("button", { name: /cancel|close/i }).first().click();
    await expect(page.getByRole("dialog", { name: /invite tenant member/i })).toBeHidden();

    await page.getByRole("button", { name: /update roles/i }).first().click();
    await expect(page.getByRole("dialog", { name: /update tenant member roles/i })).toBeVisible();
    await expectControlsStayInsideMain(page, "/tenant-admin/users update roles dialog");
    await capture(page, "users-update-roles-dialog");
  });

  test("Roles workspace keeps list, permission overview, and editor balanced", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await auditTenantPage(page, "/tenant-admin/roles", "Roles & Permissions");

    await expect(page.getByText("Access model")).toBeVisible();
    await expect(page.locator(".tenant-role-workspace")).toBeVisible();
    await expect(page.locator(".tenant-role-row__actions").first()).toBeVisible();
    await expect(page.locator(".tenant-permission-overview")).toBeVisible();
    await capture(page, "roles-desktop");

    await page.getByRole("button", { name: /add role/i }).click();
    await expect(page.getByRole("dialog", { name: /create tenant role/i })).toBeVisible();
    await expect(page.getByRole("tablist", { name: /permission modules/i })).toBeVisible();
    await expectControlsStayInsideMain(page, "/tenant-admin/roles create dialog");
    await capture(page, "roles-create-dialog");
  });

  test("Users and roles stay smooth on mobile", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });

    await auditTenantPage(page, "/tenant-admin/users", "Tenant User Management");
    await expect(page.locator(".tenant-directory-header")).toBeHidden();
    await expect(page.locator(".tenant-membership-row__actions").first().getByRole("button").first()).toBeVisible();
    await capture(page, "users-mobile");

    await auditTenantPage(page, "/tenant-admin/roles", "Roles & Permissions");
    await expect(page.locator(".tenant-role-workspace")).toBeVisible();
    await expect(page.locator(".tenant-role-row__actions").first().getByRole("button").first()).toBeVisible();
    await capture(page, "roles-mobile");
  });
});
