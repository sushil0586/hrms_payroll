import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Tenant enterprise security readiness", () => {
  test("shows MFA, SSO, SCIM, audit, and data protection posture", async ({ page }) => {
    await page.goto("/tenant-admin/security-readiness");
    await expectPageReady(page, "Enterprise Security Readiness");
    await expect(page.getByRole("main").getByText("Launch posture", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "MFA and SSO" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "SCIM and Sessions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Audit and Data Protection" })).toBeVisible();
    await expect(page.getByText("Certificate rotation window")).toBeVisible();
    await expect(page.getByText("Customer audit export", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Trust audit" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
