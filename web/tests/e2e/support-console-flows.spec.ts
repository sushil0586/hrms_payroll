import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Support console", () => {
  test("shows scoped support session evidence or a clear closed support state", async ({ page }) => {
    await gotoAuthenticated(page, "/support");
    await expectPageReady(page, "Support Console");
    await expect(page.getByRole("main").getByText("Runtime enforcement", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Support session gate" })).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByText("Support Session Allowed", { exact: true })
        .or(page.getByText("Support Session Denied", { exact: true }))
        .or(page.getByText("Support session is not available"))
        .or(page.getByText("No active support session"))
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("main").getByText("Configuration Health", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Commercial evidence", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tenant console" })).toBeVisible();
    const domainSnapshot = page.getByRole("link", { name: "Domain snapshot" });
    if (await domainSnapshot.isVisible().catch(() => false)) {
      await expect(domainSnapshot).toHaveAttribute("href", /\/support\/domain-snapshot/);
    }
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/support");
    await expectPageReady(page, "Support Console");
    await expect(page.getByRole("heading", { name: "Support session gate" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("support domain snapshot opens in a scoped allowed or denied state", async ({ page }) => {
    await gotoAuthenticated(page, "/support/domain-snapshot?tenant_code=northstar-foods&session_ref=support-session-demo-001&domain_ref=payroll_providers");
    await expectPageReady(page, "Support Domain Snapshot");

    for (const metric of ["Session", "Domain", "Snapshot count", "Agent"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: /Scope-bound snapshot|Available domains/ }).first()).toBeVisible();
    await expect(
      page
        .getByText("Support Session Allowed", { exact: true })
        .or(page.getByText("Support Session Denied", { exact: true }))
        .or(page.getByText(/scope is not available|support grant is active/i))
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Session console" })).toHaveAttribute("href", /\/support/);
    await expectNoHorizontalOverflow(page);
  });

  test("support runtime APIs fail closed without a valid tenant-approved session", async ({ page }) => {
    await gotoAuthenticated(page, "/support");

    for (const path of [
      "/api/support/tenant-console?tenant_code=northstar-foods&scope_ref=configuration_health&session_ref=missing-support-session",
      "/api/support/domain-snapshot?tenant_code=northstar-foods&domain_ref=payroll_providers&session_ref=missing-support-session",
    ]) {
      const response = await page.request.get(path);
      expect([401, 403, 404], `${path} should fail closed`).toContain(response.status());
      const body = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
      for (const forbidden of ["password", "secret", "token", "salary_snapshot"]) {
        expect(body, `${path} denial should not leak ${forbidden}`).not.toContain(forbidden);
      }
    }
  });
});
