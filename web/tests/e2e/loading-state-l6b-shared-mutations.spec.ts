import { expect, test } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Phase L6B shared mutation recovery", () => {
  test.describe.configure({ mode: "serial" });

  test("Tenant support and change requests recover from delayed network failure without duplicates", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const workspace = await provisionIsolatedQaWorkspace(testInfo);
    try {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await gotoAuthenticated(page, "/tenant-admin/support-access", workspacePersona(workspace, "tenant_admin"));
      const form = page.getByTestId("tenant-support-access-form");
      await form.getByLabel("Support agent").fill("qa.support@example.test");
      await form.getByLabel("Reason").fill("L6B retained support reason");
      await expect(form.getByRole("button", { name: "Request access" })).toBeEnabled();
      let attempts = 0;
      await page.route("**/api/tenant-admin/support-access-grants", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        await route.abort("connectionfailed");
      });

      const startedAt = Date.now();
      await form.getByRole("button", { name: "Request access" }).click();
      const pending = form.getByRole("button", { name: "Requesting support access" });
      await expect(pending).toHaveAttribute("aria-busy", "true", { timeout: 500 });
      await expect(pending.locator(".async-action-button__spinner")).toHaveCSS("animation-name", "none");
      const acknowledgementMs = Date.now() - startedAt;
      await pending.click({ force: true });
      await expect(form.getByRole("alert").filter({ hasText: "Unable to reach" })).toBeVisible();
      expect(attempts).toBe(1);
      await expect(form.getByLabel("Support agent")).toHaveValue("qa.support@example.test");
      await expect(form.getByLabel("Reason")).toHaveValue("L6B retained support reason");
      await expect(form.getByRole("button", { name: "Request access" })).toBeEnabled();
      await page.unroute("**/api/tenant-admin/support-access-grants");

      await gotoAuthenticated(page, "/tenant-admin/plan", workspacePersona(workspace, "tenant_admin"));
      const title = page.getByLabel("Title");
      await title.fill("L6B retained change title");
      const submit = page.getByRole("button", { name: "Submit request" });
      await expect(submit).toBeEnabled();
      let changeAttempts = 0;
      await page.route("**/api/tenant-admin/change-requests", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        changeAttempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 750));
        await route.abort("connectionfailed");
      });
      await submit.click();
      const changePending = page.getByRole("button", { name: "Submitting change request" });
      await expect(changePending).toHaveAttribute("aria-busy", "true", { timeout: 500 });
      await changePending.click({ force: true });
      await expect(page.getByRole("alert").filter({ hasText: "Unable to reach" })).toBeVisible();
      expect(changeAttempts).toBe(1);
      await expect(title).toHaveValue("L6B retained change title");
      await expect(page.getByRole("button", { name: "Submit request" })).toBeEnabled();
      await page.setViewportSize({ width: 390, height: 844 });
      const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(hasHorizontalOverflow).toBeFalsy();
      await testInfo.attach("tenant-support-network-recovery.json", {
        body: Buffer.from(JSON.stringify({ acknowledgementMs, attempts, changeAttempts, delaysMs: [2_000, 750], inputsPreserved: true }, null, 2)),
        contentType: "application/json",
      });
      console.info(`l6b-tenant-mutations ${JSON.stringify({ acknowledgementMs, attempts, changeAttempts })}`);
    } finally {
      await cleanupIsolatedQaWorkspace(workspace);
    }
  });
});
