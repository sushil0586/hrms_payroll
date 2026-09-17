import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, platformAdmin } from "../helpers/staging-auth";

const platformRoutes = [
  { path: "/platform-admin", heading: "Platform Admin Dashboard", tab: "Control" },
  { path: "/platform-admin/leads", heading: "Leads", tab: "Leads" },
  { path: "/platform-admin/tenants", heading: "Tenants", tab: "Tenants" },
  { path: "/platform-admin/onboarding", heading: "Launch Checklist", tab: "Launch Checklist" },
  { path: "/platform-admin/admins", heading: "Tenant Admin Users", tab: "Tenant Admin Users" },
  { path: "/platform-admin/policy-packs", heading: "Setup Templates", tab: "Setup Templates" },
  { path: "/platform-admin/permissions", heading: "Permission Catalog", tab: null },
  { path: "/platform-admin/audit-logs", heading: "Audit Logs", tab: "Events" },
] as const;

const viewports = [
  { label: "desktop", width: 1366, height: 900 },
  { label: "mobile", width: 390, height: 844 },
] as const;

async function attachScreenshot(page: Page, name: string) {
  const image = await page.screenshot({ fullPage: true, animations: "disabled" });
  expect(image.length).toBeGreaterThan(1000);
  await test.info().attach(name, {
    body: image,
    contentType: "image/png",
  });
}

test.describe("Platform admin visual and accessibility certification", () => {
  test("all platform admin routes render cleanly on desktop and mobile", async ({ page }) => {
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of platformRoutes) {
        await gotoAuthenticated(page, route.path, platformAdmin);
        if (route.tab) {
          await expectPageReady(page, route.heading);
        } else {
          await suppressBrowserTestNoise(page);
          await expect(page.locator(".app-shell--workspace")).toBeVisible();
          await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
        }
        if (route.tab) {
          await expect(page.getByRole("tablist", { name: "Platform admin sections" })).toBeVisible();
          await expect(page.getByRole("tab", { name: new RegExp(`^${route.tab}`) })).toHaveAttribute("aria-selected", "true");
          await expect(page.getByTestId("platform-admin-panel-guide")).toBeVisible();
        }
        await expectNoAppError(page);
        await expectNoHorizontalOverflow(page);
        const screenshotLabel = (route.tab ?? route.heading).toLowerCase().replaceAll(" ", "-");
        await attachScreenshot(page, `platform-admin-${screenshotLabel}-${viewport.label}`);
      }
    }
  });

  test("primary dialogs support keyboard focus, validation, and Escape close", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoAuthenticated(page, "/platform-admin/tenants", platformAdmin);
    await expectPageReady(page, "Tenants");

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();

    const createTenant = page.locator("article").filter({ has: page.getByRole("heading", { name: "Create tenant" }) }).first();
    await createTenant.getByRole("button", { name: "Create tenant" }).click();
    const createTenantDialog = page.getByRole("dialog", { name: "Create platform tenant" });
    await expect(createTenantDialog).toBeVisible();
    await expect(createTenantDialog).toHaveAttribute("aria-describedby", "create-platform-tenant-description");
    await expect(createTenantDialog.locator('[name="code"]')).toBeFocused();
    await createTenantDialog.getByRole("button", { name: "Create tenant" }).click();
    await expect(createTenantDialog.locator('[name="code"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(createTenantDialog).toBeHidden();

    await page.getByRole("tab", { name: /^Tenant Admin Users/ }).click();
    const addContactButton = page.locator("article").filter({ has: page.getByRole("heading", { name: "Admin contacts" }) }).first().getByRole("button", { name: "Add contact" });
    await expect(addContactButton).toBeVisible();
    await addContactButton.click();
    const addContactDialog = page.getByRole("dialog", { name: "Add platform admin contact" });
    await expect(addContactDialog).toBeVisible();
    await expect(addContactDialog).toHaveAttribute("aria-describedby", "add-platform-admin-contact-description");
    await expect(addContactDialog.locator('[name="full_name"]')).toBeFocused();
    await addContactDialog.getByRole("button", { name: "Add contact" }).click();
    await expect(addContactDialog.locator('[name="full_name"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(addContactDialog).toBeHidden();
    await expectNoHorizontalOverflow(page);
  });
});
