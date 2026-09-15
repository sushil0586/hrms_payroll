import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant enterprise security readiness", () => {
  test("shows MFA, SSO, SCIM, audit, and data protection posture", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/security-readiness");
    await expectPageReady(page, "Enterprise Security Readiness");
    await expect(page.getByRole("main").getByText("Launch posture", { exact: true })).toBeVisible();
    await expect(page.getByText(/Readiness/i).first()).toBeVisible();
    await expect(page.getByText(/Blockers/i).first()).toBeVisible();
    await expect(page.getByText(/Warnings/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "MFA and SSO" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "SCIM and Sessions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Audit and Data Protection" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Launch blockers|No blockers|Action required/ }).first()).toBeVisible();
    await expect(page.getByText("Certificate rotation window")).toBeVisible();
    await expect(page.getByText("Customer audit export", { exact: true })).toBeVisible();
    await expect(page.getByText(/Owner:/).first()).toBeVisible();
    await expect(page.getByText(/Status:/).first()).toBeVisible();
    await expect(page.getByText(/Evidence:/).first()).toBeVisible();
    const trustAuditLink = page.getByRole("main").getByRole("link", { name: "Trust audit" });
    await expect(trustAuditLink).toBeVisible();
    await trustAuditLink.click();
    await expectPageReady(page, "Tenant Trust Audit");
    await expectNoHorizontalOverflow(page);
  });

  test("denies security readiness API to employee role", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    const response = await page.request.get("/api/tenant-admin/security-readiness");
    expect([401, 403, 404]).toContain(response.status());
  });
});
