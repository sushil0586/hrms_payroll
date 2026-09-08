import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("SaaS SLA operations", () => {
  test("shows incident, SLA target, service-impact, and threshold posture", async ({ page }) => {
    await page.goto("/hr-admin/saas-sla-operations");
    await expectPageReady(page, "SaaS SLA Ops");
    await expect(page.getByRole("main").getByText("SLA posture", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Service-impact records" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "SLA triage signals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Response and resolution windows" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Impacted tenant surfaces" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Configured signal limits" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Ops health", exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Launch remediation", exact: true })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
