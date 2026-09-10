import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Support console", () => {
  test("shows scoped support session evidence or a clear closed support state", async ({ page }) => {
    await gotoAuthenticated(page, "/support");
    await expectPageReady(page, "Support Console");
    await expect(page.getByRole("main").getByText("Runtime enforcement", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Support session gate" })).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByText("Support Session Allowed", { exact: true })
        .or(page.getByText("Support Session Denied", { exact: true }))
        .or(page.getByText("Support session is not available"))
        .or(page.getByText("No active support session"))
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("main").getByText("Configuration Health", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Commercial evidence", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tenant console" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
