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
    const lanePlan = page.locator(".payroll-provider-lane-plan").first();
    await expect(lanePlan).toContainText(/Runtime route|Schema mapping|Sandbox certification|Activation/);
    if (await lanePlan.getByText("Open blockers").isVisible().catch(() => false)) {
      await expect(lanePlan.getByRole("button", { name: "Activate connection" })).toHaveCount(0);
    }

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
    const providerName = page.getByLabel("Provider name");
    const originalProviderName = await providerName.inputValue();
    await expect(page.getByLabel("Provider ref")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Credential ref" })).toBeVisible();
    await expect(page.getByLabel("Real provider route")).toBeVisible();
    await expect(page.getByLabel("Live delivery enabled")).toBeVisible();

    await providerName.fill("");
    await page.getByRole("button", { name: "Save provider" }).click();
    await expect(page.getByText("Provider name is required before this provider setup can be saved.")).toBeVisible();
    await providerName.fill(originalProviderName || "Provider Connection");

    await page.getByLabel("Advanced config JSON").fill("{");
    await page.getByRole("button", { name: "Save provider" }).click();
    await expect(page.getByText("Config JSON is invalid.")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toHaveCount(0);

    await page.getByRole("button", { name: "Configure provider" }).click();
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("provider mapping rule builder closes with Escape", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-providers?tab=mapping");
    await expectPageReady(page, "Payroll Providers");

    const editRulesButton = page.getByRole("button", { name: "Edit rules" }).first();
    test.skip(await editRulesButton.count() === 0, "No editable mapping pack exists in this tenant.");

    await editRulesButton.click();
    await expect(page.getByRole("dialog", { name: /rule builder/i })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /rule builder/i })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("provider activation cannot be bypassed for an incomplete lane", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");

    const blockedCard = page.locator(".payroll-provider-card").filter({ hasText: /Placeholder|Config needed|Mapping needed|Certify|Review/i }).first();
    test.skip(await blockedCard.count() === 0, "No incomplete provider lane exists in this tenant.");
    const href = await blockedCard.getAttribute("href");
    const connectionId = new URL(href ?? "", "http://localhost").searchParams.get("connectionId");
    expect(connectionId).toBeTruthy();

    const response = await page.request.patch(`/api/hr-admin/payroll-provider-connections/${connectionId}`, {
      data: { status: "active" },
    });
    expect(response.status()).toBe(400);
    const payload = await response.json();
    expect(JSON.stringify(payload)).toContain("Active provider connections require");

    await blockedCard.click();
    await expect(page).toHaveURL(/connectionId=/);
    await expect(page.getByRole("button", { name: "Activate connection" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("provider workspace remains usable on mobile tabs and editor", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/payroll-providers?tab=delivery");
    await expectPageReady(page, "Payroll Providers");
    await expect(page.getByRole("heading", { name: "Callback, retry, and revoke certification" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.getByRole("link", { name: /Connections/ }).click();
    await expect(page.getByRole("button", { name: "Configure provider" })).toBeVisible();
    await page.getByRole("button", { name: "Configure provider" }).click();
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toHaveCount(0);
  });
});
