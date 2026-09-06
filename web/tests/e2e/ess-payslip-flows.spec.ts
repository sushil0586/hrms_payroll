import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Employee self-service payslip flows", () => {
  test("employee payslip workspace exposes published downloads and storage evidence", async ({ page }) => {
    await page.goto("/ess/payslips");
    await expectPageReady(page, "Payslips");

    await expect(page.getByRole("heading", { name: "Payslip register" })).toBeVisible();
    await expect(page.getByText("Payslip - Riya Sharma").first()).toBeVisible();
    await expect(page.getByText("August 2026").first()).toBeVisible();
    await expect(page.getByText("₹28,200").first()).toBeVisible();
    await expect(page.getByText("payroll.storage.local.generated.v1").first()).toBeVisible();
    await expect(page.getByText("local-payslip-emp-0042-v1").first()).toBeVisible();
    await expect(page.getByText("payroll.download.stream.local.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.retention.7y.v1").first()).toBeVisible();
    await expect(page.getByText("Source hash").first()).toBeVisible();
    await expect(page.getByText("Access trail").first()).toBeVisible();
    await expect(page.getByText("Recent access events").first()).toBeVisible();
    await expect(page.getByText("Published").first()).toBeVisible();
    await expect(page.getByText("Notified").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Mark as read" })).toBeVisible();

    const download = page.getByRole("link", { name: "Download payslip" });
    await expect(download).toBeVisible();
    await expect(download).toHaveAttribute("href", /\/api\/me\/payroll-payslips\/payoutartifact-payslip-emp-0042\/download/);

    await expectNoHorizontalOverflow(page);
  });
});
