import { expect, test, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

async function expectRouteHealthy(page: Page, heading: string | RegExp) {
  await expectPageReady(page, heading);
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe("ESS real user demo certification", () => {
  test("employee can understand and use each ESS page with realistic demo data", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    await gotoAuthenticated(page, "/ess", employee);
    await expectRouteHealthy(page, "My workspace");
    await expect(page.getByRole("link", { name: "Apply leave" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Regularize attendance" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Tax declarations" }).first()).toBeVisible();

    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectRouteHealthy(page, "Leave");
    await expect(page.getByRole("heading", { name: "Leave requests" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toHaveCount(0);
    await page.getByRole("button", { name: "Apply leave" }).click();
    await expect(page.getByRole("dialog", { name: "Apply leave" })).toBeVisible();
    await expect(page.getByLabel("Leave type")).toBeVisible();
    await expect(page.getByLabel("Evidence file")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit leave" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectRouteHealthy(page, "Attendance");
    await expect(page.getByRole("heading", { name: "Submit regularization" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Regularizations" })).toBeVisible();
    await page.getByRole("button", { name: "Regularize attendance" }).click();
    await expect(page.getByRole("dialog", { name: "Regularize attendance" })).toBeVisible();
    await expect(page.getByLabel("Attendance record")).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit regularization" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await gotoAuthenticated(page, "/ess/payslips", employee);
    await expectRouteHealthy(page, "Payslips");
    await expect(page.getByText(/net pay|gross|deductions/i).first()).toBeVisible();

    await gotoAuthenticated(page, "/ess/documents", employee);
    await expectRouteHealthy(page, "Documents");
    for (const text of ["PAN Card", "Aadhaar Card", "Bank Account Proof", "Address Proof"]) {
      await expect(page.getByRole("heading", { name: text }).first(), `${text} should be visible in document center`).toBeVisible();
    }
    await expect(page.getByText("Re-upload requested.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Upload document" })).toBeVisible();

    await gotoAuthenticated(page, "/ess/statutory-declarations", employee);
    await expectRouteHealthy(page, "Statutory Declarations");
    for (const text of [
      "Tax years",
      "FY2026-27",
      "FY2025-26",
      "PAN",
      "ABCDE1234F",
      "Equity linked saving scheme",
      "Bengaluru house rent receipts",
      "Proof register",
    ]) {
      await expect(page.getByText(text, { exact: true }).first(), `${text} should be visible in statutory declarations`).toBeVisible();
    }

    await page.setViewportSize({ width: 1280, height: 820 });
    await gotoAuthenticated(page, "/ess/statutory-declarations", employee);
    await expectRouteHealthy(page, "Statutory Declarations");
    await expect(page.getByRole("heading", { name: /Start declaration|Update declaration/ })).toBeVisible();

    await gotoAuthenticated(page, "/ess/notifications", employee);
    await expectRouteHealthy(page, /Notifications|Employee notifications/i);
    await expect(page.getByRole("heading", { name: "Inbox filters" })).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();
  });
});
