import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, hrAdmin, manager, tenantAdmin, gotoAuthenticated } from "../helpers/staging-auth";

async function expectWorkspaceLoaded(page: Page, text: string | RegExp) {
  await expect(page.locator("main").getByText(text).first()).toBeVisible();
  await expect(page.getByText(/Demo .*mode|seeded demo data/i)).toHaveCount(0);
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe.serial("deployed read-only auth routing proof", () => {
  test("unauthenticated privileged workspace redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/hr-admin");
    await expect(page).toHaveURL(/\/login$/);
    await expectPageReady(page, "Sign in");
  });

  test("HR admin opens HR workspace", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expectPageReady(page, /Control Center|Control center/i);
    await expectWorkspaceLoaded(page, /People Operations|People operations|HR Admin/i);
  });

  test("employee opens ESS and is redirected away from HR admin", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, /My workspace|Self service/i);
    await expectWorkspaceLoaded(page, /My workspace|Self service|Employee/i);
    await expect(page.getByRole("link", { name: "HR Admin" })).toHaveCount(0);

    await page.goto("/hr-admin");
    await expect(page).toHaveURL(/\/ess$/);
    await expectPageReady(page, /My workspace|Self service/i);
  });

  test("manager opens MSS without HR admin escalation", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/approvals", manager);
    await expectPageReady(page, "Manager inbox");
    await expectWorkspaceLoaded(page, /Manager inbox|Manager/i);
  });

  test("tenant admin opens tenant control center", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin", tenantAdmin);
    await expectPageReady(page, "Account Control Center");
    await expectWorkspaceLoaded(page, /Tenant Admin|Account Control Center/i);
  });
});
