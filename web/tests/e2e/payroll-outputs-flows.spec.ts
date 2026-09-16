import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll output flows", () => {
  test("outputs workspace exposes artifact register, storage strategy, and live artifact details", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-outputs");
    await expectPageReady(page, "Payroll Outputs");

    await expect(page.getByRole("heading", { name: "Output batches" })).toBeVisible();
    await expect(page.getByText("Artifact register").first()).toBeVisible();
    await expect(page.getByText("Finance handoff readiness").first()).toBeVisible();
    await expect(page.getByText("Storage").or(page.getByText("Source hash")).or(page.getByText("No output artifacts")).first()).toBeVisible();

    const artifactLink = page.locator("main table a[href*='artifactId=']").first();
    if (await artifactLink.isVisible().catch(() => false)) {
      const href = await artifactLink.getAttribute("href");
      expect(href).toContain("artifactId=");
      await artifactLink.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForURL(/artifactId=/),
        artifactLink.click(),
      ]);
      await expect(page).toHaveURL(/artifactId=/);
      await expect(page.getByText("Access governance").or(page.getByText("Download file")).or(page.getByText("Storage")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
