import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

function filterToolbar(page: Page) {
  return page.locator(".queue-toolbar").first();
}

async function applyClientFilters(page: Page) {
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get("page") === "1"),
    filterToolbar(page).getByRole("button", { name: "Apply filters" }).click(),
  ]);
  await expectNoHorizontalOverflow(page);
}

test.describe("HR admin operational queue flows", () => {
  test("employee directory filters and selected master detail stay URL-driven", async ({ page }) => {
    await page.goto("/hr-admin/employees");
    await expectPageReady(page, "Employees");

    await page.getByRole("textbox", { name: "Search" }).fill("Riya");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === "Riya"),
      page.getByRole("button", { name: "Apply" }).click(),
    ]);

    await expect(page.getByRole("link", { name: /Riya Sharma/ }).first()).toBeVisible();
    await page.getByRole("link", { name: /Riya Sharma/ }).first().click();
    await expect(page).toHaveURL(/employeeId=/);
    await expect(page.getByRole("heading", { name: "Employee master detail" })).toBeVisible();
    await expect(page.getByText("Riya Sharma", { exact: false }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("organization setup switches structural layer and status filters", async ({ page }) => {
    await page.goto("/hr-admin/organization");
    await expectPageReady(page, /Organization setup review/);

    await page.getByRole("link", { name: /Legal Entities/ }).click();
    await expect(page).toHaveURL(/section=legal_entities/);

    await page.getByLabel("Status").selectOption("active");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("status") === "active"),
      page.getByRole("button", { name: "Apply" }).click(),
    ]);

    await expect(page.getByText("Change carefully.").or(page.getByText("Low edit impact."))).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("lifecycle inbox filters records and blocks demo bulk owner updates", async ({ page }) => {
    await page.goto("/hr-admin/lifecycle");
    await expectPageReady(page, "Lifecycle");

    await filterToolbar(page).getByRole("combobox", { name: /^Lifecycle type$/ }).selectOption("onboarding");
    await applyClientFilters(page);
    await expect(page).toHaveURL(/item_type=onboarding/);
    await expect(page.getByRole("link", { name: "Open record" }).first()).toHaveAttribute("href", /onboardings/);

    await page.getByRole("button", { name: "Select page" }).click();
    await expect(page.getByRole("button", { name: /Assign owner \([1-9]/ })).toBeEnabled();
    await page.getByRole("button", { name: /Assign owner/ }).click();
    await expect(page.getByText("Bulk owner updates are disabled in demo mode.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee document queue filters expiry work and selects reminder candidates", async ({ page }) => {
    await page.goto("/hr-admin/employee-documents");
    await expectPageReady(page, /Employee document review/);

    await filterToolbar(page).getByLabel("Expiry focus").selectOption("expiring");
    await applyClientFilters(page);
    await expect(page).toHaveURL(/expiry_filter=expiring/);

    await page.getByRole("button", { name: "Select page" }).click();
    await expect(page.getByRole("button", { name: /Send reminder \([1-9]/ })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("notification queue filters pending notifications and selects retry candidates", async ({ page }) => {
    await page.goto("/hr-admin/notifications");
    await expectPageReady(page, "Notification queue");

    await filterToolbar(page).getByLabel("Status").selectOption("pending");
    await applyClientFilters(page);

    await expect(page).toHaveURL(/status=pending/);
    await expect(page.getByRole("heading", { name: "New leave request pending approval" })).toBeVisible();
    await page.getByRole("checkbox", { name: "Select page" }).check();
    await expect(page.getByRole("button", { name: /Retry selected \([1-9]/ })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("audit center narrows the timeline by source and search", async ({ page }) => {
    await page.goto("/hr-admin/audit");
    await expectPageReady(page, "Audit center");

    await filterToolbar(page).getByLabel("Source").selectOption("document_review");
    await filterToolbar(page).getByRole("textbox", { name: "Search" }).fill("document");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("source") === "document_review" && url.searchParams.get("q") === "document"),
      filterToolbar(page).getByRole("button", { name: "Apply filters" }).click(),
    ]);

    await expect(page.getByText("document review").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
