import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll statutory flows", () => {
  test("statutory workspace exposes packs, registrations, filings, proof review, and source trail", async ({ page }) => {
    await page.goto("/hr-admin/payroll-statutory");
    await expectPageReady(page, "Payroll Statutory");

    await expect(page.getByRole("heading", { name: "Proof review queue" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Declarations and proof evidence" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Registration coverage" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upcoming filing obligations" })).toBeVisible();
    await expect(page.getByText("India FY 2026 Statutory Pack").first()).toBeVisible();
    await expect(page.getByText("Maharashtra PT Main Registration").first()).toBeVisible();
    await expect(page.getByText("PTRC/MAH/99881").first()).toBeVisible();
    await expect(page.getByText("Maharashtra PT August 2026 Return").first()).toBeVisible();
    await expect(page.getByText("EPFO August 2026 ECR").first()).toBeVisible();
    await expect(page.getByText("india.pt.mh.return.file.v1").first()).toBeVisible();
    await expect(page.getByText("Riya Sharma").first()).toBeVisible();
    await expect(page.getByText("EMP-0042").first()).toBeVisible();
    await expect(page.getByText("FY2026-27").first()).toBeVisible();
    await expect(page.getByText("Life Insurance Premium").first()).toBeVisible();
    await expect(page.getByText("House Rent Exemption").first()).toBeVisible();
    await expect(page.getByText("india.tax.proof-window.fy2026.v1").first()).toBeVisible();
    await expect(page.getByText("Employee Provident Fund").first()).toBeVisible();
    await expect(page.getByText("Maharashtra Professional Tax").first()).toBeVisible();
    await expect(page.getByText("india.epf.employee.v1").first()).toBeVisible();
    await expect(page.getByText("Locked").first()).toBeVisible();
    await expect(page.getByText("Verified").first()).toBeVisible();
    await expect(page.getByText("₹1,75,000").first()).toBeVisible();
    await expect(page.getByText("9f7a6b5c4d3e201122").first()).toBeVisible();

    await page.getByRole("link", { name: /Aman|EMP-0043/ }).first().click();
    await expect(page).toHaveURL(/declarationId=statdecl-emp-0043-fy2026/);
    await expect(page.getByRole("heading", { name: /Aman/ })).toBeVisible();
    await expect(page.getByText("Public Provident Fund").first()).toBeVisible();
    await expect(page.getByText("Submitted").first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
