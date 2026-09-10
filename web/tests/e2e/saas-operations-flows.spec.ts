import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("SaaS operations health", () => {
  test("shows tenant health, queue, support, and evidence signals", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/saas-operations");
    await expectPageReady(page, "SaaS Operations");
    await expect(page.getByRole("main").getByText("Operations posture", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Operational triage", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Provider queue", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Support sessions", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notifications and provider jobs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tenant-owned operations" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Commercial audit", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Usage evidence", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Control plane", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Resilience", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "SLA ops", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Launch remediation", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
