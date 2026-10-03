import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Employee self-service payslip flows", () => {
  test("employee payslip workspace exposes published downloads and storage evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/payslips");
    await expectPageReady(page, "Payslips");

    await expect(page.getByRole("heading", { name: "Published payslips" })).toBeVisible();
    await expect(page.getByText("Published only").or(page.getByText("No payslips found")).first()).toBeVisible();

    const reviewPayslip = page.getByRole("button", { name: "Review payslip" }).first();
    if (await reviewPayslip.isVisible().catch(() => false)) {
      await reviewPayslip.click();
      await expect(page.getByText("Source hash").first()).toBeVisible();
      await expect(page.getByText("Access trail").first()).toBeVisible();
    }

    const download = page.getByRole("link", { name: "Download payslip" }).first();
    if (await download.isVisible().catch(() => false)) {
      await expect(download).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/.+\/download/);
    }
    const markRead = page.getByRole("button", { name: "Mark as read" }).first();
    if (await markRead.isVisible().catch(() => false)) {
      await expect(markRead).toBeEnabled();
    }

    await expectNoHorizontalOverflow(page);
  });
});
