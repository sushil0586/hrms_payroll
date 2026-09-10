import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll provider connection flows", () => {
  test("provider workspace exposes readiness gates, certification controls, and provider detail links", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");

    await expect(page.getByRole("heading", { name: "Connections" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Certification checklist" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run certification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scenario evidence" })).toBeVisible();
    await expect(page.getByText("Adapter contract").or(page.getByText("Provider client readiness")).first()).toBeVisible();
    await expect(page.getByText("Schema mapping").or(page.getByText("Mapping packs")).first()).toBeVisible();
    await expect(page.getByText("Launch rehearsal").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Run rehearsal" })).toBeVisible();

    const connectionLink = page.locator("main a[href*='connectionId=']").first();
    if (await connectionLink.isVisible().catch(() => false)) {
      await connectionLink.click();
      await expect(page).toHaveURL(/connectionId=/);
      await expect(page.getByRole("heading", { name: "Certification checklist" })).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
