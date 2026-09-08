import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Support console", () => {
  test("shows scoped support session evidence", async ({ page }) => {
    await page.goto("/support");
    await expectPageReady(page, "Support Console");
    await expect(page.getByRole("main").getByText("Runtime enforcement", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Support session gate" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Support Session Allowed", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Configuration health", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Commercial evidence", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Commercial evidence scope is not available for this session.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Tenant console" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
