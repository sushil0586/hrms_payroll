import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Support domain snapshot", () => {
  test("shows scope-bound domain diagnostics or a clear closed support state", async ({ page }) => {
    await gotoAuthenticated(page, "/support/domain-snapshot");
    await expectPageReady(page, "Support Domain Snapshot");
    await expect(page.getByRole("main").getByText("Runtime enforcement", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scope-bound snapshot" })).toBeVisible();
    await expect(
      page
        .getByRole("main")
        .getByText("Payroll providers", { exact: true })
        .or(page.getByText("scope is not available").or(page.getByText("No active support session")))
        .first(),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational mix" }).or(page.getByText("Runtime enforcement")).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Session console" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
