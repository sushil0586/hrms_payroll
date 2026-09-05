import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("HR admin payroll output flows", () => {
  test("outputs workspace exposes published payslips, register, profile, and source hashes", async ({ page }) => {
    await page.goto("/hr-admin/payroll-outputs");
    await expectPageReady(page, "Payroll Outputs");

    await expect(page.getByRole("heading", { name: "Output batches" })).toBeVisible();
    await expect(page.getByText("Artifact register").first()).toBeVisible();
    await expect(page.getByText("Finance handoff readiness").first()).toBeVisible();
    await expect(page.getByText("india.monthly.output.profile.v1").first()).toBeVisible();
    await expect(page.getByText("₹63,900").first()).toBeVisible();
    await expect(page.getByText("Payroll Register - August 2026 Core Payroll").first()).toBeVisible();

    await page.getByRole("link", { name: /Payslip - Nisha Rao/ }).click();
    await expect(page).toHaveURL(/artifactId=payoutartifact-payslip-emp-0001/);
    await expect(page.getByRole("heading", { name: "Payslip - Nisha Rao" })).toBeVisible();
    await expect(page.getByText("payroll.payslip.template.india.v1").first()).toBeVisible();
    await expect(page.getByText("employee.portal.publish.v1").first()).toBeVisible();
    await expect(page.getByText("text/html").first()).toBeVisible();
    await expect(page.getByText("payroll.storage.local.generated.v1").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download file" }).first()).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
