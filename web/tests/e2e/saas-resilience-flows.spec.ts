import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("SaaS resilience readiness", () => {
  test("shows backup, restore, retention, and evidence posture", async ({ page }) => {
    await page.goto("/hr-admin/saas-resilience");
    await expectPageReady(page, "SaaS Resilience");
    await expect(page.getByRole("main").getByText("Resilience posture", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Resilience gate review" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tenant data windows" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational proof points" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Backup cadence", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Restore test", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Payroll retention", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Ops health", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Control plane", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
