import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, hrAdmin, manager, platformAdmin, tenantAdmin, gotoAuthenticated } from "../helpers/staging-auth";

async function expectWorkspaceLoaded(page: Page, text: string | RegExp) {
  await expect(page.locator("main").getByText(text).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText(/Demo .*mode|seeded demo data/i)).toHaveCount(0);
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe.serial("deployed read-only auth routing proof", () => {
  test("unauthenticated privileged workspace redirects to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/hr-admin", { waitUntil: "commit" });
    await expect(page).toHaveURL(/\/login$/);
    await expectPageReady(page, "Sign in");
  });

  test("HR admin opens HR workspace", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expectPageReady(page, /Control Center|Control center/i);
    await expectWorkspaceLoaded(page, /HR Control Center|HR control center/i);
  });

  test("critical HR APIs remain tenant-scoped and employee-denied", async ({ page }) => {
    const paths = [
      "/api/hr-admin/employees?page=1&page_size=10",
      "/api/hr-admin/attendance-records?page=1&page_size=10",
      "/api/hr-admin/leave-requests?page=1&page_size=10",
      "/api/hr-admin/payroll-input-snapshot-setup",
    ];

    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    for (const path of paths) {
      const response = await page.request.get(path);
      expect(response.ok(), `${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
    }

    await gotoAuthenticated(page, "/ess", employee);
    for (const path of paths) {
      const response = await page.request.get(path);
      expect(response.status(), path).toBe(403);
    }
  });

  test("employee opens ESS and is denied HR admin access", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, /My workspace|Self service/i);
    await expectWorkspaceLoaded(page, /My workspace|Self service|Employee/i);
    await expect(page.getByRole("link", { name: "HR Admin" })).toHaveCount(0);

    await page.goto("/hr-admin");
    await expect(page).toHaveURL(/\/access-denied$/);
    await expectPageReady(page, "Workspace access unavailable");
    await expect(page.getByRole("link", { name: "Employee workspace" })).toHaveAttribute("href", "/ess");
  });

  test("manager opens MSS without HR admin escalation", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/approvals", manager);
    await expectPageReady(page, /Manager approvals|Manager inbox/i);
    await expectWorkspaceLoaded(page, /Manager approvals|Manager inbox|Manager/i);
  });

  test("tenant admin opens tenant control center", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin", tenantAdmin);
    await expectPageReady(page, "Account Control Center");
    await expectWorkspaceLoaded(page, /Tenant Admin|Account Control Center/i);
  });

  test("platform admin opens platform control center", async ({ page }) => {
    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    for (const path of ["/api/platform/summary", "/api/platform/tenants"]) {
      const response = await page.request.get(path);
      expect(response.ok(), `${path}: ${response.status()} ${await response.text()}`).toBeTruthy();
    }
    await expectPageReady(page, /Platform Admin Dashboard|Platform Control Center/i);
    await expectWorkspaceLoaded(page, /Platform Admin Dashboard|Platform Control Center/i);
  });
});
