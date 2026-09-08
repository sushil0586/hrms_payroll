import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin SaaS control plane", () => {
  test("shows plan, entitlement, and usage-limit readiness", async ({ page }) => {
    await page.goto("/hr-admin/saas-control-plane");
    await expectPageReady(page, "SaaS Control Plane");
    await expect(page.getByText("Launch commercial gate")).toBeVisible();
    await expect(page.getByText("Northstar Foods")).toBeVisible();
    await expect(page.getByText("Required entitlements")).toBeVisible();
    await expect(page.getByText("Payroll provider integrations").first()).toBeVisible();
    await expect(page.getByText("API access policy")).toBeVisible();
    await expect(page.getByText("Payroll core")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save state" })).toBeVisible();
    await expect(page.getByText("Usage limits")).toBeVisible();
    await expect(page.getByText("Active Employees").first()).toBeVisible();
    await expect(page.getByText("Usage snapshot ledger")).toBeVisible();
    await expect(page.getByText("Commercial audit history")).toBeVisible();
    await expect(page.getByRole("link", { name: "Launch remediation" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
