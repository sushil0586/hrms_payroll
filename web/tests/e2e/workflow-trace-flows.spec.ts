import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin workflow trace flows", () => {
  test("workflow hub exposes trace filters and timeline context", async ({ page }) => {
    await page.goto("/hr-admin/workflows");
    await expectPageReady(page, "Workflow control");

    await expect(page.getByRole("heading", { name: "Workflow timeline" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Earned leave request" })).toBeVisible();
    await expect(page.getByText("HR final review", { exact: true })).toBeVisible();
    await expect(page.getByText("SLA attention needed")).toBeVisible();

    await page.getByRole("textbox", { name: "Search" }).fill("missed punch");
    await page.getByRole("combobox", { name: "Module" }).selectOption("attendance");
    await page.getByRole("combobox", { name: "Status" }).selectOption("rejected");
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/q=missed\+punch/);
    await expect(page.getByRole("heading", { name: "Missed punch regularization" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Earned leave request" })).toHaveCount(0);
    await expect(page.locator(".detail-label").filter({ hasText: /^Reject$/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
