import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { createPayrollLifecycleOperator } from "../helpers/tenant-rbac";

test.describe("HR admin payroll calculation flows", () => {
  test.setTimeout(60_000);

  async function openFirstVisibleLine(page: Page) {
    const lineLink = page.locator("main table.payroll-calc-line-table a[href*='lineId=']").first();
    if (!(await lineLink.isVisible().catch(() => false))) {
      return false;
    }
    await lineLink.scrollIntoViewIfNeeded();
    const href = await lineLink.getAttribute("href");
    expect(href).toContain("lineId=");
    await page.goto(href!);
    await expectPageReady(page, "Payroll Calculations");
    return true;
  }

  test("calculation workspace exposes draft attempts, lines, totals, and traces", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", payrollOperator);
    await expectPageReady(page, "Payroll Calculations");

    const setupResponse = await page.request.get("/api/hr-admin/payroll-calculation-setup?run_page_size=10&line_page_size=10&issue_page_size=10&calculation_page_size=10", { timeout: 45_000 });
    const setupBody = await setupResponse.body();
    const setupPayload = JSON.parse(setupBody.toString());
    expect(setupResponse.ok()).toBeTruthy();
    expect(setupPayload.options.active_rule_versions, "calculation setup should not preload rule versions by default").toHaveLength(0);
    expect(setupPayload.runs.length, "calculation setup should honor compact run page size").toBeLessThanOrEqual(10);
    expect(setupPayload.lines.length, "calculation setup should honor compact line page size").toBeLessThanOrEqual(10);
    expect(setupPayload.validation_issues.length, "calculation setup should honor compact issue page size").toBeLessThanOrEqual(10);
    expect(setupBody.length, "calculation setup payload should stay compact").toBeLessThan(350_000);

    await expect(page.getByRole("heading", { name: "Calculation queue" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Calculation run review" })).toBeVisible();
    await expect(page.getByText("Selected run").or(page.getByText("Run detail")).or(page.getByText("No payroll run selected")).first()).toBeVisible();
    await expect(page.getByText("Calculation attempts").first()).toBeVisible();
    await expect(page.getByText("Calculation validation").first()).toBeVisible();
    await expect(page.getByText("Selected line").or(page.getByText("No line selected")).first()).toBeVisible();
    await expect(page.getByText("Latest net pay").or(page.getByText("No calculations")).first()).toBeVisible();
    await expect(page.getByText("Validation").or(page.getByText("Calculation validation")).first()).toBeVisible();

    if (await openFirstVisibleLine(page)) {
      await expect(page).toHaveURL(/lineId=/);
      await expect(page.getByText("Source hash").or(page.getByText("Formula")).or(page.getByText("Source")).first()).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("calculation workspace keeps selected trace across refresh and history", async ({ page }) => {
    const payrollOperator = await createPayrollLifecycleOperator(page);
    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", payrollOperator);
    await expectPageReady(page, "Payroll Calculations");

    if (await openFirstVisibleLine(page)) {
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

    if (await openFirstVisibleLine(page)) {
      await expect(page).toHaveURL(/lineId=/);
      await expect(page.getByText("Selected line")).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  });
});
