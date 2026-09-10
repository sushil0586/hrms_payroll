import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll handoff flows", () => {
  test("handoff workspace exposes finance artifacts, provider evidence, and live detail links", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-handoff");
    await expectPageReady(page, "Payroll Handoff");

    await expect(page.getByRole("heading", { name: "Handoffs" })).toBeVisible();
    await expect(page.getByText("Finance artifacts").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery acknowledgements" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider retries" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider jobs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Provider callbacks" })).toBeVisible();
    await expect(page.getByText("Audit packs").first()).toBeVisible();

    const artifactLink = page.locator("main a[href*='artifactId=']").first();
    if (await artifactLink.isVisible().catch(() => false)) {
      await artifactLink.click();
      await expect(page).toHaveURL(/artifactId=/);
      await expect(page.getByText("Locked evidence").or(page.getByText("Storage")).or(page.getByText("Provider")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
