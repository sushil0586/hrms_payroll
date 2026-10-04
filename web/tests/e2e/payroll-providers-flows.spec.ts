import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll provider connection flows", () => {
  test("provider workspace exposes readiness gates, certification controls, and provider detail links", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");

    await expect(page.getByRole("heading", { name: "Connections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Certification checklist" })).toBeVisible();
    await expect(page.getByText("Launch rehearsal").first()).toBeVisible();
    await expect(page.getByText("Live rails off").first()).toBeVisible();
    await expect(page.getByText(/real payout, filing, and journal submission stay disabled/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Run rehearsal" })).toBeVisible();
    await expect(page.getByText("Selected lane plan")).toBeVisible();
    await expect(page.getByText("Runtime route")).toBeVisible();
    await expect(page.getByText("Schema mapping").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Configure provider" })).toBeVisible();

    await page.getByRole("link", { name: /Connections/ }).click();
    await expect(page.getByRole("button", { name: "Run certification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scenario evidence" })).toBeVisible();
    await expect(page.getByText("Adapter contract").first()).toBeVisible();

    await page.getByRole("link", { name: /Mapping/ }).click();
    await expect(page.getByText("Schema mapping").or(page.getByRole("heading", { name: "Provider schema coverage" })).first()).toBeVisible();

    await page.getByRole("link", { name: /Registry/ }).click();
    await expect(page.getByRole("heading", { name: "Provider client readiness" })).toBeVisible();

    const connectionLink = page.locator("main a[href*='connectionId=']").first();
    if (await connectionLink.isVisible().catch(() => false)) {
      const href = await connectionLink.getAttribute("href");
      expect(href).toContain("connectionId=");
    }

    await expectNoHorizontalOverflow(page);
  });

  test("provider configuration editor validates safe provider setup inputs before saving", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");

    await page.getByRole("button", { name: "Configure provider" }).click();
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toBeVisible();
    await expect(page.getByText(/Do not paste raw API keys, passwords, or certificates here/i)).toBeVisible();
    await expect(page.getByLabel("Provider ref")).toBeVisible();
    await expect(page.getByLabel("Credential ref")).toBeVisible();
    await expect(page.getByLabel("Real provider route")).toBeVisible();
    await expect(page.getByLabel("Live delivery enabled")).toBeVisible();

    await page.getByLabel("Advanced config JSON").fill("{");
    await page.getByRole("button", { name: "Save provider" }).click();
    await expect(page.getByText("Config JSON is invalid.")).toBeVisible();

    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
