import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const seedPrefix = process.env.PLAYWRIGHT_PILOT100_PREFIX ?? "PILOT100_20260912";
const seedPassword = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const usernamePrefix = seedPrefix.toLowerCase();

function field(scope: Page | Locator, label: string) {
  return scope
    .locator("label.form-field")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("input, select, textarea")
    .first();
}

function directoryPanel(page: Page) {
  return page.locator(".queue-toolbar").filter({ has: page.getByRole("heading", { name: "Employee directory" }) }).first();
}

function directoryItems(page: Page) {
  return page.locator(".employee-directory-item");
}

function pagination(page: Page) {
  return directoryPanel(page).locator(".pagination-bar");
}

async function loginAsSeededUser(page: Page, username: string, path: string) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, path, { username, password: seedPassword });
}

test.describe("P100-3 pilot 100 workforce certification", () => {
  test("HR admin can search, page, inspect, and filter the 100 employee pilot workforce", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    await gotoAuthenticated(page, `/hr-admin/employees?q=${seedPrefix}&page_size=50`, hrAdmin);
    await expectPageReady(page, "Employees");
    await expect(directoryPanel(page).getByText("100", { exact: true }).first()).toBeVisible();
    await expect(pagination(page).getByText("1-50")).toBeVisible();
    await expect(pagination(page).getByText("of 100")).toBeVisible();
    await expect(directoryItems(page)).toHaveCount(50);

    await pagination(page).getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pagination(page).getByText("51-100")).toBeVisible();
    await expect(directoryItems(page)).toHaveCount(50);

    await field(directoryPanel(page), "Manager review").selectOption("managers");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("managerView") === "managers"),
      directoryPanel(page).getByRole("button", { name: "Apply" }).click(),
    ]);
    await expect(pagination(page).getByText("of 10")).toBeVisible();
    await expect(directoryItems(page)).toHaveCount(10);
    await expect(directoryItems(page).first()).toContainText(`${seedPrefix}_E001`);
    await expect(directoryItems(page).first()).toContainText("Access provisioned");
    await expectNoHorizontalOverflow(page);
  });

  test("seeded manager and employee can access their real workspaces with correct role surfaces", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    await loginAsSeededUser(page, `${usernamePrefix}.e011`, "/ess");
    await expectPageReady(page, "Self service");
    await expect(page.getByText(`${seedPrefix}_E011`).first()).toBeVisible();
    await expect(page.getByText(/Reporting manager: Aarav Sharma001/).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await loginAsSeededUser(page, `${usernamePrefix}.e001`, "/mss/approvals");
    await expectPageReady(page, "Manager inbox");
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: "Team members" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Approval queues" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("payroll readiness exposes the intentional missing-bank blockers", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);

    await gotoAuthenticated(page, `/hr-admin/payroll-readiness?q=${seedPrefix}_E096&page_size=10`, hrAdmin);
    await expectPageReady(page, "Payroll Readiness");
    await expect(page.locator(".pagination-bar").getByText("1-1")).toBeVisible();
    const row = page.locator(".payroll-readiness-table tbody tr").filter({ hasText: `${seedPrefix}_E096` }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText("Blocked");
    await row.locator("a").click();
    await expect(page).toHaveURL(/employeeId=/);
    await expect(page.getByText("Missing primary bank account").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
