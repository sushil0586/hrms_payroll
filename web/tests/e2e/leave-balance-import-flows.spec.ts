import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type LeaveBalanceRow = {
  employee_code: string;
  leave_policy_name: string;
};

type LeaveBalanceTransactionRow = {
  employee_code: string;
  leave_policy_name: string;
  reason: string;
  status: string;
};

test.describe("HR admin leave balance import flows", () => {
  test("leave balance import validates commits and records audited transactions", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/leave-balances", hrAdmin);
    await expectPageReady(page, "Leave balances");

    const balances = await page.evaluate(async () => {
      const response = await fetch("/api/hr-admin/leave-balances");
      if (!response.ok) {
        throw new Error(`Leave balance read failed with ${response.status}`);
      }
      return response.json();
    }) as LeaveBalanceRow[];
    expect(balances.length).toBeGreaterThan(0);

    const first = balances[0];
    const suffix = String(Date.now()).slice(-6);
    const reason = `Browser leave import ${suffix}`;
    const duplicateReason = `Browser leave import duplicate ${suffix}`;
    const csv = [
      "employee_code,leave_policy_name,action,units,effective_date,reason",
      `${first.employee_code},"${first.leave_policy_name}",credit_adjustment,1.00,2026-04-01,${reason}`,
      `${first.employee_code},"${first.leave_policy_name}",credit_adjustment,1.00,2026-04-01,${duplicateReason}`,
      `UNKNOWN-${suffix},"${first.leave_policy_name}",credit_adjustment,1.00,2026-04-01,Browser leave import unknown ${suffix}`,
      `${first.employee_code},"${first.leave_policy_name}",credit_adjustment,0,2026-04-01,Browser leave import zero ${suffix}`,
    ].join("\n");

    const workbench = page.getByTestId("leave-balance-import-workbench");
    await expect(workbench).toBeVisible();
    await expect(workbench.getByRole("heading", { name: "Leave balance import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Load sample template" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Copy template" })).toBeVisible();
    await expect(workbench.getByRole("link", { name: "Download template" })).toHaveAttribute("download", "leave-balance-import-template.csv");
    await expect(workbench.getByText("Upload CSV", { exact: true })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Preview leave import" })).toBeVisible();
    await expect(workbench.getByRole("button", { name: "Commit ready leave rows" })).toBeDisabled();

    await workbench.locator("input[type='file']").setInputFiles({
      name: "leave-balance-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await expect(workbench.getByLabel("Leave balance CSV data")).toHaveValue(new RegExp(first.employee_code));
    await workbench.getByRole("button", { name: "Preview leave import" }).click();

    await expect(workbench.getByText("Preview ready. Commit ready leave balance actions after checking blocked rows.")).toBeVisible();
    await expect(workbench.locator("tbody tr")).toHaveCount(4);
    await expect(workbench.locator("tr").filter({ hasText: reason }).locator(".readiness-badge", { hasText: "ready" })).toBeVisible();
    const duplicateRow = workbench.locator("tr").filter({ hasText: duplicateReason });
    await expect(duplicateRow.locator(".readiness-badge", { hasText: "blocked" })).toBeVisible();
    await expect(duplicateRow.getByText("Only one leave balance action per employee, policy, date, and action can be committed in one import batch.")).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: `UNKNOWN-${suffix}` }).getByText("Employee code must match an employee with an existing leave balance.")).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: "Browser leave import zero" }).getByText("Units must be greater than zero.")).toBeVisible();

    await workbench.getByRole("button", { name: "Commit ready leave rows" }).click();
    await expect(workbench.getByText("Commit complete. Created rows are saved as leave balance transactions.")).toBeVisible({ timeout: 30_000 });
    await expect(workbench.locator("tr").filter({ hasText: reason }).locator(".readiness-badge", { hasText: "created" })).toBeVisible();
    await expect(page.getByText(reason).first()).toBeVisible();

    const transactions = await page.evaluate(async () => {
      const response = await fetch("/api/hr-admin/leave-balances/transactions");
      if (!response.ok) {
        throw new Error(`Leave transaction read failed with ${response.status}`);
      }
      return response.json();
    }) as LeaveBalanceTransactionRow[];
    expect(transactions.some((item) => item.reason === reason && item.employee_code === first.employee_code)).toBeTruthy();
    expect(transactions.some((item) => item.reason === duplicateReason)).toBeFalsy();

    await expectNoHorizontalOverflow(page);
  });
});
