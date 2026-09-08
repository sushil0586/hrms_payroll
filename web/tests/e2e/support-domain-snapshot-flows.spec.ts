import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Support domain snapshot", () => {
  test("shows scope-bound domain diagnostics", async ({ page }) => {
    await page.goto("/support/domain-snapshot");
    await expectPageReady(page, "Support Domain Snapshot");
    await expect(page.getByRole("main").getByText("Runtime enforcement", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scope-bound snapshot" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Payroll providers", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Payroll Support", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Operational mix" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Session console" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
