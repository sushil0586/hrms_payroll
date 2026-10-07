import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";

async function gotoHrAdminDemo(page: Page, path: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    {
      name: "hrms_access_token",
      value: "playwright-demo-token",
      url: origin,
    },
  ]);
  await page.goto(path, { waitUntil: "networkidle" });
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
