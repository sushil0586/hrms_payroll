import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll readiness flows", () => {
  test("readiness table filters and live row detail stay URL-driven", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-readiness");
    await expectPageReady(page, "Payroll Readiness");

    await expect(page.getByRole("heading", { name: "Payroll source review" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Employee" })).toBeVisible();
    await expect(page.getByText("Source data readiness")).toBeVisible();

    await page.getByRole("link", { name: /Warning/ }).click();
    await expect(page).toHaveURL(/status=warning/);
    await expect(page.getByText("Warning").or(page.getByText("No employees")).first()).toBeVisible();

    const employeeLink = page.locator("main a[href*='employeeId=']").first();
    if (await employeeLink.isVisible().catch(() => false)) {
      await employeeLink.click();
      await expect(page).toHaveURL(/employeeId=/);
      await expect(page.getByText("Readiness").or(page.getByText("Source")).first()).toBeVisible();
    }

    await gotoAuthenticated(page, "/hr-admin/payroll-readiness");
    await page.getByRole("textbox", { name: "Search" }).fill("A");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === "A"),
      page.getByRole("button", { name: "Apply" }).click(),
    ]);
    await expect(page.getByText("Source data readiness").or(page.getByRole("columnheader", { name: "Employee" })).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
