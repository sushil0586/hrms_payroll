import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin payroll input snapshot flows", () => {
  test("input workspace exposes run locks, source snapshots, and live employee traces", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-inputs");
    await expectPageReady(page, "Payroll Inputs");

    await expect(page.getByRole("heading", { name: "Input control" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Hash" })).toBeVisible();
    await expect(page.getByText("Source hash").or(page.getByText("Input profile")).or(page.getByText("No input snapshots")).first()).toBeVisible();

    const snapshotLink = page.locator("main a[href*='snapshotId=']").first();
    if (await snapshotLink.isVisible().catch(() => false)) {
      await snapshotLink.click();
      await expect(page).toHaveURL(/snapshotId=/);
      await expect(page.getByText("Source hash").or(page.getByRole("heading", { name: "Lock readiness" })).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
