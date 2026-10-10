import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll adjustment flows", () => {
  test.setTimeout(60_000);

  test("adjustment workspace exposes one-time inputs, approval state, profile refs, and source hashes", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-adjustments");
    await expectPageReady(page, "Payroll Adjustments");

    const setupResponse = await page.request.get("/api/hr-admin/payroll-adjustment-setup?snapshot_page_size=10&adjustment_page_size=10&post_lock_page_size=10");
    expect(setupResponse.ok()).toBeTruthy();
    const setupText = await setupResponse.text();
    const setupPayload = JSON.parse(setupText);
    expect(setupPayload.snapshots.length).toBeLessThanOrEqual(10);
    expect(setupPayload.adjustments.length).toBeLessThanOrEqual(10);
    expect(setupPayload.post_lock_impacts.length).toBeLessThanOrEqual(10);
    expect(setupPayload.options.employees).toHaveLength(0);
    expect(setupText.length).toBeLessThan(350_000);

    await expect(page.getByRole("heading", { name: "Adjustment runs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Adjustment input controls" })).toBeVisible();

    await page.getByRole("link", { name: /Register/ }).click();
    await expect(page.getByText("One-time payroll inputs").first()).toBeVisible();

    const adjustmentLink = page.locator("main a[href*='adjustmentId=']").first();
    if (await adjustmentLink.isVisible().catch(() => false)) {
      await adjustmentLink.click();
      await expect(page).toHaveURL(/adjustmentId=/);
      const detailPanel = page.locator(".payroll-adjustment-detail-panel").first();
      await expect(detailPanel.getByText("Source hash")).toBeVisible();
    }

    await page.getByRole("link", { name: /Actions/ }).click();
    await expect(page.getByLabel("Adjustment certification actions")).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
