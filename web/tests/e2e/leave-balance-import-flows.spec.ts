import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type LeaveBalanceRow = {
  employee_code: string;
  leave_policy_name: string;
};

type LeaveBalanceTransactionRow = {
  id?: string;
  employee_code: string;
  leave_policy_name: string;
  reason: string;
  status: string;
};

type PaginatedResponse<T> = {
  items: T[];
};

test.describe("HR admin leave balance import flows", () => {
  test("leave balance import validates commits and records audited transactions", async ({ page }) => {
    test.setTimeout(120 * 1000);
    await gotoAuthenticated(page, "/hr-admin/leave-balances", hrAdmin);
    await expectPageReady(page, "Leave balances");

    const balances = await page.evaluate(async () => {
      const response = await fetch("/api/hr-admin/leave-balances");
      if (!response.ok) {
        throw new Error(`Leave balance read failed with ${response.status}`);
      }
      return response.json();
    }) as PaginatedResponse<LeaveBalanceRow>;
    const balanceRows = balances.items;
    expect(balanceRows.length).toBeGreaterThan(0);
    const importsBefore = await page.evaluate(async () => {
      const response = await fetch("/api/hr-admin/import-batches?import_type=leave_balance_actions");
      return response.json();
    }) as { count: number };

    const first = balanceRows[0];
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

    await page.locator("summary").filter({ hasText: "Import balance actions" }).click();
    const workbench = page.getByTestId("leave-balance-import-workbench").last();
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
    const readyRow = workbench.getByRole("cell", { name: reason, exact: true }).locator("xpath=..");
    await expect(readyRow.getByRole("cell", { name: "ready", exact: true })).toBeVisible();
    const duplicateRow = workbench.locator("tr").filter({ hasText: duplicateReason });
    await expect(duplicateRow.getByRole("cell", { name: "blocked", exact: true })).toBeVisible();
    await expect(duplicateRow.getByText("Only one leave balance action per employee, policy, date, and action can be committed in one import batch.")).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: `UNKNOWN-${suffix}` }).getByText("Employee code must exactly match an authorized employee.")).toBeVisible();
    await expect(workbench.locator("tr").filter({ hasText: "Browser leave import zero" }).getByText(/Units must be greater than zero/)).toBeVisible();

    await workbench.getByRole("button", { name: "Commit ready leave rows" }).click();
    await expect(workbench.getByText(/Import processed: 1 saved, 0 failed or unconfirmed, 3 blocked\. Source identity [a-f0-9]{12} recorded\./)).toBeVisible({ timeout: 30_000 });
    await expect(readyRow.getByRole("cell", { name: "created", exact: true })).toBeVisible();
    await expect(page.getByText(reason).first()).toBeVisible();

    const transactions = await page.evaluate(async () => {
      const response = await fetch("/api/hr-admin/leave-balances/transactions");
      if (!response.ok) {
        throw new Error(`Leave transaction read failed with ${response.status}`);
      }
      return response.json();
    }) as PaginatedResponse<LeaveBalanceTransactionRow>;
    expect(transactions.items.some((item) => item.reason === reason && item.employee_code === first.employee_code)).toBeTruthy();
    expect(transactions.items.some((item) => item.reason === duplicateReason)).toBeFalsy();

    const firstTransaction = transactions.items.find((item) => item.reason === reason);
    expect(firstTransaction?.id).toBeTruthy();
    await workbench.locator("input[type='file']").setInputFiles({
      name: "leave-balance-import.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv),
    });
    await workbench.getByRole("button", { name: "Preview leave import" }).click();
    await expect(workbench.getByText("Preview ready. Commit ready leave balance actions after checking blocked rows.")).toBeVisible();
    const replayResponse = page.waitForResponse((response) =>
      response.url().includes("/api/hr-admin/leave-balances/actions")
      && response.request().method() === "POST",
    );
    await workbench.getByRole("button", { name: "Commit ready leave rows" }).click();
    expect((await replayResponse).status()).toBe(200);
    await expect(workbench.getByText(/Source identity [a-f0-9]{12} recorded\./)).toBeVisible();

    const replayedTransactions = await page.evaluate(async (expectedReason) => {
      const response = await fetch(`/api/hr-admin/leave-balances/transactions?q=${encodeURIComponent(expectedReason)}`);
      return response.json();
    }, reason) as PaginatedResponse<LeaveBalanceTransactionRow>;
    expect(replayedTransactions.items.filter((item) => item.reason === reason)).toHaveLength(1);
    expect(replayedTransactions.items.find((item) => item.reason === reason)?.id).toBe(firstTransaction?.id);

    const importHistory = await page.evaluate(async () => {
      const response = await fetch("/api/hr-admin/import-batches?import_type=leave_balance_actions");
      return response.json();
    }) as { items: Array<{ source_hash: string; created_count: number }> };
    expect(importHistory.items).toHaveLength(importsBefore.count + 1);
    expect(importHistory.items[0].created_count).toBe(1);

    await expectNoHorizontalOverflow(page);
  });
});
