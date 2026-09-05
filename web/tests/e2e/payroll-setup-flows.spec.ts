import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll setup flows", () => {
  test("setup workspace exposes calendars, periods, groups, and assignment detail", async ({ page }) => {
    await page.goto("/hr-admin/payroll-setup");
    await expectPageReady(page, "Payroll Setup");

    await expect(page.getByRole("heading", { name: "Period control" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Configuration matrix" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Group" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /India Staff/ })).toBeVisible();
    await expect(page.getByText("calendar-day-proration.v1")).toBeVisible();

    await page.getByRole("link", { name: /Operations/ }).click();
    await expect(page).toHaveURL(/payGroupId=paygroup-operations/);
    await expect(page.getByRole("heading", { name: "Operations" }).first()).toBeVisible();
    await expect(page.getByText("operations.shift-linked.v1")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Run windows" })).toBeVisible();
    await expect(page.getByText("Assignments").last()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
