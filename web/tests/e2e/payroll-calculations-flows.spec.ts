import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { createPayrollLifecycleOperator } from "../helpers/tenant-rbac";

test.describe("HR admin payroll calculation flows", () => {
  test("calculation workspace exposes draft attempts, lines, totals, and traces", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", payrollOperator);
    await expectPageReady(page, "Payroll Calculations");

    await expect(page.getByRole("heading", { name: "Calculation queue" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Calculation run review" })).toBeVisible();
    await expect(page.getByText("Selected run").first()).toBeVisible();
    await expect(page.getByText("Calculation attempts").first()).toBeVisible();
    await expect(page.getByText("Calculation validation").first()).toBeVisible();
    await expect(page.getByText("Selected line").or(page.getByText("No line selected")).first()).toBeVisible();
    await expect(page.getByText("Latest net pay").or(page.getByText("No calculations")).first()).toBeVisible();
    await expect(page.getByText("Validation").or(page.getByText("Calculation validation")).first()).toBeVisible();

    const lineLink = page.locator("main a[href*='lineId=']").first();
    if (await lineLink.isVisible().catch(() => false)) {
      await lineLink.click();
      await expect(page).toHaveURL(/lineId=/);
      await expect(page.getByText("Source hash").or(page.getByText("Formula")).or(page.getByText("Source")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("calculation workspace keeps selected trace across refresh and history", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", payrollOperator);
    await expectPageReady(page, "Payroll Calculations");

    const lineLink = page.locator("main a[href*='lineId=']").first();
    if (await lineLink.isVisible().catch(() => false)) {
      await lineLink.scrollIntoViewIfNeeded();
      await lineLink.click();
      await expect(page).toHaveURL(/lineId=/);
      await expect(page.getByText("Selected line")).toBeVisible();

      await page.reload({ waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Payroll Calculations");
      await expect(page).toHaveURL(/lineId=/);
      await expect(page.getByText("Selected line")).toBeVisible();

      await page.goBack();
      await expectPageReady(page, "Payroll Calculations");
      await page.goForward();
      await expectPageReady(page, "Payroll Calculations");
      await expect(page).toHaveURL(/lineId=/);
    }

    await expectNoHorizontalOverflow(page);
  });

  test("calculation workspace is usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", payrollOperator);
    await expectPageReady(page, "Payroll Calculations");

    await expect(page.getByRole("heading", { name: "Calculation queue" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Calculation run review" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Calculation readiness" })).toBeVisible();
    await expect(page.getByText("Calculation controls").first()).toBeVisible();

    const lineLink = page.locator("main a[href*='lineId=']").first();
    if (await lineLink.isVisible().catch(() => false)) {
      await lineLink.scrollIntoViewIfNeeded();
      await lineLink.click();
      await expect(page).toHaveURL(/lineId=/);
      await expect(page.getByText("Selected line")).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
