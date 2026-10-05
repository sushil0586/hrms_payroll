import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectDialogStable } from "../helpers/modal-stability";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("ESS Payslips launch certification", () => {
  test("payslip page keeps history, guidance, and detail review separate", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoAuthenticated(page, "/ess/payslips", employee);
    await expectPageReady(page, "Payslips");

    for (const metric of ["Published payslips", "Downloadable", "Latest net pay", "Latest pay date"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: /Published payslips|No payslip published/i }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payslip checklist" })).toBeVisible();
    await expect(page.getByText("Correct period")).toBeVisible();
    await expect(page.getByText("Salary totals")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Access trail" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Storage governance" })).toHaveCount(0);

    const reviewButton = page.getByRole("button", { name: "Review payslip" }).first();
    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click();
      const dialog = page.getByRole("dialog", { name: /Payslip detail|August|September|October|Payslip/i });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText("Payment summary")).toBeVisible();
      await expect(dialog.getByText("Access trail")).toBeVisible();
      await expect(dialog.getByText("Storage governance")).toBeVisible();
      await expect(dialog.getByText("Calculation lines")).toBeVisible();
      await expectDialogStable(page, "Payslip detail");
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ess/payslips", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expectPageReady(page, "Payslips");
    await expect(page.getByRole("heading", { name: /Published payslips|No payslip published/i }).first()).toBeVisible();
    const compactReviewButton = page.getByRole("button", { name: "Review payslip" }).first();
    if (await compactReviewButton.isVisible().catch(() => false)) {
      await compactReviewButton.click();
      await expectDialogStable(page, "Payslip detail");
    }
    await expectNoHorizontalOverflow(page);
  });

  test("filters, download links, and read receipt actions stay employee scoped", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/payslips", employee);
    await expectPageReady(page, "Payslips");

    for (const label of ["Search payslips", "Year", "Rows per page"]) {
      await expect(page.getByLabel(label).first()).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Apply" })).toBeVisible();

    const download = page.getByRole("link", { name: /Download latest|Download$/ }).first();
    if (await download.isVisible().catch(() => false)) {
      await expect(download).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/.+\/download/);
    }

    const reviewButton = page.getByRole("button", { name: "Review payslip" }).first();
    if (await reviewButton.isVisible().catch(() => false)) {
      await reviewButton.click();
      const dialog = page.getByRole("dialog").filter({ hasText: "Payslip detail" });
      await expect(dialog).toBeVisible();

      const markRead = dialog.getByRole("button", { name: "Mark as read" });
      if (await markRead.isVisible().catch(() => false)) {
        let readAttempt = 0;
        await page.route("**/api/me/payroll-payslips/*/read", async (route) => {
          readAttempt += 1;
          if (readAttempt === 1) {
            await route.fulfill({
              status: 500,
              contentType: "application/json",
              body: JSON.stringify({ detail: "Read receipt service is temporarily unavailable." }),
            });
            return;
          }
          await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "read" }) });
        });
        await markRead.click();
        await expect(dialog.getByText("Read receipt service is temporarily unavailable.")).toBeVisible();
        await expectDialogStable(page, "Payslip detail");
        await markRead.click();
        await expect(dialog.getByText("Read receipt service is temporarily unavailable.")).toHaveCount(0);
      }

      const modalDownload = dialog.getByRole("link", { name: "Download payslip" });
      if (await modalDownload.isVisible().catch(() => false)) {
        await expect(modalDownload).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/.+\/download/);
      } else {
        await expect(dialog.getByText("Download blocked")).toBeVisible();
      }
      await expectDialogStable(page, "Payslip detail");
    }
  });
});
