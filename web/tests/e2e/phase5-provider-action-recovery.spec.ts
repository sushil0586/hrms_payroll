import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

test("Phase 5 provider rehearsal reports abort, service failure, and malformed success without false completion", async ({ page }, testInfo) => {
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  try {
    await gotoAuthenticated(page, "/hr-admin/payroll-providers?tab=overview", workspacePersona(workspace, "hr_admin"));
    await expectPageReady(page, "Payroll Providers");
    const button = page.getByRole("button", { name: "Run rehearsal" });

    await page.route("**/api/hr-admin/payroll-provider-launch-rehearsals/run", (route) => route.abort("failed"));
    await button.click();
    await expect(page.getByRole("status")).toContainText("could not be confirmed");
    await expect(button).toBeEnabled();
    await page.unroute("**/api/hr-admin/payroll-provider-launch-rehearsals/run");

    await page.route("**/api/hr-admin/payroll-provider-launch-rehearsals/run", (route) => route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Provider rehearsal service is temporarily unavailable." }),
    }));
    await button.click();
    await expect(page.getByRole("status")).toContainText("temporarily unavailable");
    await expect(button).toBeEnabled();
    await page.unroute("**/api/hr-admin/payroll-provider-launch-rehearsals/run");

    await page.route("**/api/hr-admin/payroll-provider-launch-rehearsals/run", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "{}",
    }));
    await button.click();
    await expect(page.getByRole("status")).toContainText("was not confirmed");
    await expect(page.getByRole("status")).not.toContainText("recorded");
    await expect(button).toBeEnabled();
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
