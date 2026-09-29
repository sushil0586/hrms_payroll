import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("authenticated documentation access", () => {
  test("redirects anonymous users to login", async ({ page }) => {
    await page.context().clearCookies();

    await page.goto("/docs");
    await page.waitForURL(/\/login$/, { timeout: 10_000 });
    await suppressBrowserTestNoise(page);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Accerio HRMS User Guide")).toHaveCount(0);

    const assetResponse = await page.request.get("/docs-assets/screenshots/hr-admin/dashboard-overview.png");
    expect(assetResponse.status()).toBe(401);
  });

  test("renders guide navigation, search, deep links, and protected assets for a signed-in user", async ({ page }) => {
    await gotoAuthenticated(page, "/docs", hrAdmin);
    await suppressBrowserTestNoise(page);
    await expect(page.getByRole("heading", { name: "Accerio HRMS User Guide" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Statutory Payroll" }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const assetResponse = await page.request.get("/docs-assets/screenshots/hr-admin/dashboard-overview.png");
    expect(assetResponse.ok()).toBeTruthy();
    expect(assetResponse.headers()["content-type"]).toContain("image/png");

    await page.goto("/docs/hr-admin/payroll/statutory-payroll");
    await expect(page.getByRole("heading", { name: "Statutory Payroll" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Payroll Control|Payroll Setup|Payroll/i }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto("/docs?q=payroll");
    await expect(page.getByRole("heading", { name: /Results for "payroll"/i })).toBeVisible();
    await expect(page.locator(".docs-result-card").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
