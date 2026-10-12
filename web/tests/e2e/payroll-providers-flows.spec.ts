import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function openProviderTab(page: Page, name: RegExp | string) {
  const tab = page.getByRole("navigation", { name: "Payroll provider sections" }).getByRole("link", { name });
  const href = await tab.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expectPageReady(page, "Payroll Providers");
}

async function openProviderEditor(page: Page) {
  const button = page.getByRole("button", { name: "Configure provider" }).first();
  const dialog = page.getByRole("dialog", { name: "Configure provider connection" });
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  await button.click();
  if (!(await dialog.isVisible({ timeout: 3_000 }).catch(() => false))) {
    await button.dispatchEvent("click");
  }
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openMappingRuleBuilder(page: Page, button: Locator) {
  const dialog = page.getByRole("dialog", { name: /rule builder/i });
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
  await button.scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
  await button.click();
  if (!(await dialog.isVisible({ timeout: 3_000 }).catch(() => false))) {
    await button.dispatchEvent("click");
  }
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe("HR admin payroll provider connection flows", () => {
  test("provider workspace exposes readiness gates, certification controls, and provider detail links", async ({ page }) => {
    test.setTimeout(90_000);
    await gotoAuthenticated(page, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");

    await expect(page.getByRole("heading", { name: "Connections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Certification checklist" })).toBeVisible();
    await expect(page.getByText("Launch rehearsal").first()).toBeVisible();
    await expect(page.getByText("Live rails off").first()).toBeVisible();
    await expect(page.getByText(/real payout, filing, and journal submission stay disabled/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Run rehearsal" })).toBeVisible();
    await expect(page.getByText("Selected lane plan")).toBeVisible();
    const lanePlan = page.locator(".payroll-provider-lane-plan").first();
    await expect(lanePlan.getByText("Runtime route").first()).toBeVisible();
    await expect(page.getByText("Schema mapping").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Configure provider" })).toBeVisible();
    await expect(lanePlan).toContainText(/Runtime route|Schema mapping|Sandbox certification|Activation/);
    if (await lanePlan.getByText("Open blockers").isVisible().catch(() => false)) {
      await expect(lanePlan.getByRole("button", { name: "Activate connection" })).toHaveCount(0);
    }

    await openProviderTab(page, /Connections/);
    await expect(page.getByRole("button", { name: "Run certification" }).or(page.getByRole("heading", { name: "Scenario evidence" })).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scenario evidence" })).toBeVisible();
    await expect(page.getByText("Adapter contract").first()).toBeVisible();

    await openProviderTab(page, /Mapping/);
    await expect(page.getByText("Schema mapping").or(page.getByRole("heading", { name: "Provider schema coverage" })).first()).toBeVisible();

    await openProviderTab(page, /Registry/);
    await expect(page.getByRole("heading", { name: "Provider client readiness" })).toBeVisible();

    const connectionLink = page.locator("main a[href*='connectionId=']").first();
    if (await connectionLink.isVisible().catch(() => false)) {
      const href = await connectionLink.getAttribute("href");
      expect(href).toContain("connectionId=");
    }

    await expectNoHorizontalOverflow(page);
  });

  test("provider configuration editor validates safe provider setup inputs before saving", async ({ page }) => {
    test.setTimeout(90_000);
    await gotoAuthenticated(page, "/hr-admin/payroll-providers?tab=connections");
    await expectPageReady(page, "Payroll Providers");

    await openProviderEditor(page);
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

    await openProviderEditor(page);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("provider mapping rule builder closes with Escape", async ({ page }) => {
    test.setTimeout(90_000);
    await gotoAuthenticated(page, "/hr-admin/payroll-providers?tab=mapping");
    await expectPageReady(page, "Payroll Providers");

    const editRulesButton = page.getByRole("button", { name: "Edit rules" }).first();
    test.skip(await editRulesButton.count() === 0, "No editable mapping pack exists in this tenant.");

    await openMappingRuleBuilder(page, editRulesButton);

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
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/payroll-providers?tab=delivery");
    await expectPageReady(page, "Payroll Providers");
    await expect(page.getByRole("heading", { name: "Callback, retry, and revoke certification" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await openProviderTab(page, /Connections/);
    await expect(page.getByRole("button", { name: "Configure provider" })).toBeVisible();
    await openProviderEditor(page);
    await expectNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog", { name: "Configure provider connection" })).toHaveCount(0);
  });
});
