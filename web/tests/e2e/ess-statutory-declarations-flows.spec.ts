import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Employee statutory declaration flows", () => {
  test("employee declaration workspace exposes tax profile, proof status, and payroll source trail", async ({ page }) => {
    await page.goto("/ess/statutory-declarations");
    await expectPageReady(page, "Statutory Declarations");

    await expect(page.getByRole("heading", { name: "Tax years" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Proof status and tax profile" })).toBeVisible();
    await expect(page.getByText("Riya Sharma").first()).toBeVisible();
    await expect(page.getByText("FY2026-27").first()).toBeVisible();
    await expect(page.getByText("Old Regime").first()).toBeVisible();
    await expect(page.getByText("ABCDE1234F").first()).toBeVisible();
    await expect(page.getByText("123456789012").first()).toBeVisible();
    await expect(page.getByText("Life Insurance Premium").first()).toBeVisible();
    await expect(page.getByText("House Rent Exemption").first()).toBeVisible();
    await expect(page.getByText("employee-document:lic-premium-fy2026").first()).toBeVisible();
    await expect(page.getByText("india.tax.proof-window.fy2026.v1").first()).toBeVisible();
    await expect(page.getByText("payroll.calc.statutory.fy2026.v1").first()).toBeVisible();
    await expect(page.getByText("Locked").first()).toBeVisible();
    await expect(page.getByText("Verified").first()).toBeVisible();
    await expect(page.getByText("Not Required").first()).toBeVisible();
    await expect(page.getByText("₹1,80,000").first()).toBeVisible();
    await expect(page.getByText("₹1,75,000").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Start declaration" })).toBeVisible();
    await expect(page.getByLabel("Financial year")).toBeVisible();
    await expect(page.getByLabel("Tax regime")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Submit" })).toBeDisabled();
    await expect(page.getByLabel("Item name")).toBeDisabled();
    await expect(page.getByLabel("Upload category")).toBeDisabled();
    await expect(page.getByLabel("Proof file")).toBeDisabled();
    await expect(page.getByText("Tax Proof Uploads")).toBeAttached();
    await expect(page.getByText("Create or select a draft declaration to add proof rows.")).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
