import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, payrollFinanceManager } from "../helpers/staging-auth";

test.describe("Payroll finance manager control center certification", () => {
  test("shows payout, compliance, provider, and audit command center without layout overflow", async ({ page }) => {
    await gotoAuthenticated(page, "/finance-manager", payrollFinanceManager);
    await expectPageReady(page, "Finance control center");

    const controlCenter = page.getByTestId("finance-manager-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: "Close and payout priorities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Latest handoff snapshot" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence coverage" })).toBeVisible();

    for (const signal of [
      "Finance handoff",
      "Bank advice",
      "Provider delivery",
      "Statutory liability",
      "Provider exceptions",
      "Export audit",
    ]) {
      await expect(controlCenter.getByText(signal, { exact: true }).first()).toBeVisible();
    }

    for (const action of [
      "Export bank advice",
      "Export filings",
      "Export audit",
      "Payroll register",
      "Bank advice",
      "Challan proof",
      "Statutory deductions",
      "Exceptions",
    ]) {
      await expect(page.getByRole("link", { name: action }).first()).toBeVisible();
    }

    await expect(page.getByText("Payroll Finance", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Finance operations", { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
