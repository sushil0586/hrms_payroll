import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll readiness flows", () => {
  test("readiness table filters and row detail stay URL-driven", async ({ page }) => {
    await page.goto("/hr-admin/payroll-readiness");
    await expectPageReady(page, "Payroll Readiness");

    await expect(page.getByRole("heading", { name: "Payroll source review" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Employee" })).toBeVisible();
    await expect(page.getByText("Source data readiness")).toBeVisible();

    await page.getByRole("link", { name: /Warning/ }).click();
    await expect(page).toHaveURL(/status=warning/);
    await expect(page.getByRole("link", { name: /Riya Sharma/ })).toBeVisible();
    await expect(page.getByText("leave request(s) pending approval").first()).toBeVisible();

    await page.getByRole("link", { name: /Meera Iyer/ }).click();
    await expect(page).toHaveURL(/employeeId=emp-0044/);
    await expect(page.getByRole("heading", { name: "Meera Iyer" })).toBeVisible();
    await expect(page.getByText("attendance regularization(s) pending approval")).toBeVisible();

    await page.goto("/hr-admin/payroll-readiness");
    await page.getByRole("textbox", { name: "Search" }).fill("Aman");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === "Aman"),
      page.getByRole("button", { name: "Apply" }).click(),
    ]);

    await expect(page.getByRole("link", { name: /Aman Verma/ })).toBeVisible();
    await expect(page.getByText("Blocked").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
