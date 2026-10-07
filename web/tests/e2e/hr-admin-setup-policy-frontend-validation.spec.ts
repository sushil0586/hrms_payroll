import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

async function gotoHrAdminDemo(page: Page, path: string) {
  await gotoAuthenticated(page, path, hrAdmin);
}

function field(scope: Page | Locator, label: string) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").first();
}

test.describe("HR Admin setup and policy frontend validation", () => {
  test("attendance policy blocks required and numeric rule errors before calling the API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/attendance-policies", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/attendance-policies/new");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Create attendance policy");

    const form = page.locator("form.form-layout-modern");
    await field(form, "Code").fill("");
    await field(form, "Name").fill("");
    await field(form, "Full day min hours").fill("4");
    await field(form, "Half day min hours").fill("8");
    await field(form, "Late mark after minutes").fill("-1");
    await page.getByRole("button", { name: "Create attendance policy" }).click();

    await expect(form.getByText("Enter a unique attendance policy code.")).toBeVisible();
    await expect(form.getByText("Enter the attendance policy name.")).toBeVisible();
    await expect(form.getByText("Half day minimum hours cannot be greater than full day minimum hours.")).toBeVisible();
    await expect(form.getByText("Late mark minutes cannot be negative.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("leave type blocks required identity and malformed color before calling the API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/leave-types", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/leave-types/new");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Create leave type");

    const form = page.locator("form.form-layout-modern");
    await field(form, "Code").fill("");
    await field(form, "Name").fill("");
    await field(form, "Color code").fill("green");
    await page.getByRole("button", { name: "Create leave type" }).click();

    await expect(form.getByText("Enter a unique leave type code.")).toBeVisible();
    await expect(form.getByText("Enter the leave type name.")).toBeVisible();
    await expect(form.getByText("Enter a color in #RRGGBB format.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("leave policy advanced sections stay collapsible and service tiers are HR-readable", async ({ page }) => {
    await gotoHrAdminDemo(page, "/hr-admin/leave-policies/new");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Create leave policy");

    const form = page.locator("form.form-layout-modern");
    const entitlementSection = form.locator("details").filter({ hasText: "Advanced entitlement and carry-forward rules" });
    const routingSection = form.locator("details").filter({ hasText: "Advanced routing and evidence rules" });
    const lifecycleSection = form.locator("details").filter({ hasText: "Request lifecycle governance" });

    await expect(entitlementSection).not.toHaveAttribute("open", "");
    await expect(routingSection).not.toHaveAttribute("open", "");
    await expect(lifecycleSection).not.toHaveAttribute("open", "");

    await field(form, "Template").selectOption("india-earned-leave");
    await expect(form.getByText("20 days below 3 years, then 22 days at 3+ years")).toBeVisible();
    await form.getByRole("button", { name: "Apply template" }).click();
    await expect(field(form, "Code")).toHaveValue("EL_STANDARD");
    await expect(field(form, "Annual entitlement")).toHaveValue("20.00");
    await expect(field(form, "Max carry forward")).toHaveValue("10.00");

    await field(form, "Gender restriction").selectOption("female");
    await field(form, "Marital status restriction").selectOption("unmarried");
    await expect(field(form, "Gender restriction")).toHaveValue("female");
    await expect(field(form, "Marital status restriction")).toHaveValue("unmarried");

    await entitlementSection.getByText("Advanced entitlement and carry-forward rules").click();
    await expect(entitlementSection).toHaveAttribute("open", "");
    await expect(entitlementSection.getByText("Service-based entitlement tiers")).toBeVisible();
    await expect(entitlementSection.getByText("3+ years")).toBeVisible();
    await expect(entitlementSection.getByText("5+ years")).toBeVisible();
    await entitlementSection.getByRole("button", { name: "Add service tier" }).click();
    const tierRows = entitlementSection.locator(".notice").filter({ hasText: "Tier applies once the employee completes the service months above." });
    await expect(tierRows).toHaveCount(3);
    const newTier = tierRows.nth(2);
    await field(newTier, "Tier label").fill("10+ years");
    await field(newTier, "Minimum completed service months").fill("120");
    await field(newTier, "Annual entitlement from this tier").fill("30.00");
    await expect(field(newTier, "Annual entitlement from this tier")).toHaveValue("30.00");

    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("leave policy list filters by search, status, leave type, and accrual", async ({ page }) => {
    await gotoHrAdminDemo(page, "/hr-admin/leave-policies");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Leave policies");

    const filters = page.locator(".queue-toolbar").filter({ hasText: "Policy filters" });
    await expect(filters).toBeVisible();
    await expect(field(filters, "Search")).toBeVisible();
    await expect(field(filters, "Status")).toBeVisible();
    await expect(field(filters, "Leave type")).toBeVisible();
    await expect(field(filters, "Accrual frequency")).toBeVisible();

    await field(filters, "Search").fill("no-policy-should-match-this");
    await expect(page.getByText("No leave policies match the current filters.")).toBeVisible();

    await filters.getByRole("button", { name: "Clear filters" }).click();
    await expect(page.getByText("No leave policies match the current filters.")).toHaveCount(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("leave policy save shows failure and success feedback", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/leave-policies", async (route) => {
      apiCalls += 1;
      if (apiCalls === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Leave policy save service is temporarily unavailable." }),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: "playwright-leave-policy", status: "active" }),
      });
    });

    await gotoHrAdminDemo(page, "/hr-admin/leave-policies/new");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Create leave policy");

    const form = page.locator("form.form-layout-modern");
    await field(form, "Template").selectOption("india-earned-leave");
    await form.getByRole("button", { name: "Apply template" }).click();
    await page.getByRole("button", { name: "Create leave policy" }).click();

    await expect(form.getByRole("alert").filter({ hasText: "Save failed." })).toBeVisible();
    await expect(form.getByText("Leave policy save service is temporarily unavailable.")).toBeVisible();

    await page.getByRole("button", { name: "Create leave policy" }).click();
    await expect(form.getByRole("status").filter({ hasText: "Save complete." })).toBeVisible();
    await expect(form.getByText("Leave policy created. Returning to the policy list.")).toBeVisible();
    expect(apiCalls).toBe(2);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("document category blocks required identity and invalid JSON before calling the API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/document-categories", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/document-categories/new");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Create document category");

    const form = page.locator("form.document-child-form");
    await field(form, "Code").fill("");
    await field(form, "Name").fill("");
    await field(form, "Visibility rules JSON").fill("{bad json");
    await page.getByRole("button", { name: "Create category" }).click();

    await expect(form.getByText("Enter a unique document category code.")).toBeVisible();
    await expect(form.getByText("Enter the document category name.")).toBeVisible();
    await expect(form.getByText("Visibility rules must be valid JSON.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("workflow template blocks required fields, date order, invalid JSON, and empty step name before API", async ({ page }) => {
    let apiCalls = 0;
    await page.route("**/api/hr-admin/workflow-templates", async (route) => {
      apiCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await gotoHrAdminDemo(page, "/hr-admin/workflow-templates/new");
    await suppressBrowserTestNoise(page);
    await expectPageReady(page, "Create workflow template");

    const form = page.locator("form.form-layout-modern");
    await field(form, "Code").fill("");
    await field(form, "Name").first().fill("");
    await field(form, "Trigger key").fill("");
    await field(form, "Effective from").fill("2026-10-07");
    await field(form, "Effective to").fill("2026-10-06");
    await field(form, "Condition snapshot JSON").fill("{bad json");
    const stepCard = form.locator("article").filter({ hasText: "Step 1" }).first();
    await field(stepCard, "Name").fill("");
    await page.getByRole("button", { name: "Create workflow template" }).click();

    await expect(form.getByText("Enter a unique workflow template code.")).toBeVisible();
    await expect(form.getByText("Enter the workflow template name.")).toBeVisible();
    await expect(form.getByText("Enter the workflow trigger key.")).toBeVisible();
    await expect(form.getByText("Effective to must be the same as or after effective from.")).toBeVisible();
    await expect(form.getByText("Condition snapshot must be valid JSON.")).toBeVisible();
    await expect(form.getByText("Enter a name for step 1.")).toBeVisible();
    expect(apiCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
