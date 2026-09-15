import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant admin security and trust final certification", () => {
  test("certifies enterprise security readiness across desktop and mobile", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/security-readiness");
    await expectPageReady(page, "Enterprise Security Readiness");

    for (const label of ["MFA", "SSO", "SCIM", "Session", "Audit", "Data"]) {
      await expect(page.getByRole("main").getByText(new RegExp(`${label}: (Ready|Attention)`)).first()).toBeVisible();
    }

    for (const heading of ["MFA and SSO", "SCIM and Sessions", "Audit and Data Protection"]) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }

    await expect(page.getByText(/Evidence:/).first()).toBeVisible();
    await expect(page.getByText(/Status:/).first()).toBeVisible();
    await expect(page.getByText(/Owner:/).first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Trust audit" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/tenant-admin/security-readiness");
    await expectPageReady(page, "Enterprise Security Readiness");
    await expect(page.getByRole("heading", { name: "Launch posture" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Launch blockers|No blockers|Action required/ }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("certifies trust audit filtering, pagination, and download integrity", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/trust-audit?page_size=3");
    await expectPageReady(page, "Tenant Trust Audit");

    await expect(page.getByRole("main").getByText("Review scope", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Active filters", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Audit taxonomy" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Session evidence" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence ledger" })).toBeVisible();
    await expect(page.getByLabel("Trust audit pagination")).toBeVisible();

    const nextLink = page.getByRole("link", { name: "Next" });
    const nextDisabled = await nextLink.getAttribute("aria-disabled");
    if (nextDisabled !== "true") {
      await nextLink.click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByLabel("Trust audit pagination")).toContainText("Page 2");
      await page.getByRole("link", { name: "First" }).click();
      await expect(page).toHaveURL(/page=1/);
    }

    await page.getByRole("main").getByText("Support access", { exact: true }).first().click();
    await expect(page).toHaveURL(/event_group=support/);
    await expect(page.getByText("Group: Support")).toBeVisible();
    await page.getByRole("link", { name: "Clear" }).click();
    await expect(page.getByText("No filters")).toBeVisible();

    const download = await page.request.get("/api/tenant-admin/commercial-support-audit/download");
    expect(download.ok()).toBeTruthy();
    expect(download.headers()["content-type"]).toContain("application/json");
    const body = await download.json();
    expect(body.tenant.code).toBeTruthy();
    expect(Array.isArray(body.commercial_events)).toBeTruthy();
    expect(body.support_access).toBeTruthy();
    expect(body.evidence_checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies empty trust filters and denied employee access", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/trust-audit?event_group=tenant_admin&event_type=unknown_event_type&page_size=3");
    await expectPageReady(page, "Tenant Trust Audit");
    await expect(page.getByText("No audit events match the selected trust filters.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, "/ess", employee);
    const securityResponse = await page.request.get("/api/tenant-admin/security-readiness");
    expect([401, 403, 404]).toContain(securityResponse.status());
    const trustResponse = await page.request.get("/api/tenant-admin/trust-audit");
    expect([401, 403, 404]).toContain(trustResponse.status());
    const downloadResponse = await page.request.get("/api/tenant-admin/commercial-support-audit/download");
    expect([401, 403, 404]).toContain(downloadResponse.status());
  });
});
