import { expect, test, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

async function capturePost<T>(page: Page, url: RegExp, action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => url.test(candidate.url()) && candidate.request().method() === "POST"),
    action(),
  ]);
  return { status: response.status(), payload: (await response.json().catch(() => ({}))) as T };
}

test("DD-LV-006 browser maker/checker correction preserves one authoritative balance", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const maker = workspacePersona(workspace, "hr_admin");
  const checker = workspacePersona(workspace, "hr_checker");
  const employee = workspace.manifest.credentials.employee;
  const checkerEmployee = workspace.manifest.credentials.hr_checker;
  const policyId = workspace.manifest.leave.policy_id;
  const balanceId = workspace.manifest.leave.balance_id;
  const reason = `DD3 correction ${workspace.seedRef}`;

  try {
    await gotoAuthenticated(page, "/hr-admin/leave-balances", maker);
    await expectPageReady(page, "Leave balances");

    const policyUpdate = await requestWithBrowserSession(page, `/api/hr-admin/leave-policies/${policyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config_snapshot: {
          version: 1,
          entitlement: {
            grant_mode: "upfront",
            encashment_allowed: true,
            encashment_cap: "5.00",
          },
          operations: {
            reviewer_employee_id: checkerEmployee.employee_id,
            approval_required_for_debit_adjustment: true,
            approval_required_for_encashment: true,
          },
        },
      }),
    });
    expect(policyUpdate.status).toBe(200);

    const beforeResponse = await requestWithBrowserSession(page, `/api/hr-admin/leave-balances?employee_id=${employee.employee_id}`);
    expect(beforeResponse.status).toBe(200);
    const beforeItems = (JSON.parse(beforeResponse.body) as { items: Array<{ id: string; closing_balance: string }> }).items;
    const before = beforeItems.find((item) => item.id === balanceId);
    expect(before).toBeTruthy();

    await page.reload();
    await expectPageReady(page, "Leave balances");
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Apply balance action" }) });
    await form.getByLabel("Employee").selectOption(employee.employee_id);
    await form.getByLabel("Leave policy").selectOption(policyId);
    await form.getByLabel("Action").selectOption("debit_adjustment");
    await form.getByLabel("Units").fill("1.00");
    await form.getByLabel("Effective date").fill("2026-10-18");
    await form.getByLabel("Reason").fill(reason);

    const created = await capturePost<{
      applied: boolean;
      requires_review: boolean;
      balance: { closing_balance: string };
      transaction: { id: string; status: string; can_current_actor_review: boolean };
    }>(page, /\/api\/hr-admin\/leave-balances\/actions\/?$/, () =>
      form.getByRole("button", { name: "Apply balance action" }).click(),
    );
    expect(created.status).toBe(200);
    expect(created.payload).toMatchObject({ applied: false, requires_review: true });
    expect(created.payload.transaction).toMatchObject({ status: "pending", can_current_actor_review: false });
    expect(created.payload.balance.closing_balance).toBe(before?.closing_balance);

    await gotoAuthenticated(
      page,
      `/hr-admin/leave-balances?q=${encodeURIComponent(reason)}&transaction_status=pending`,
      checker,
    );
    await expectPageReady(page, "Leave balances");
    const transactionRow = page.locator("tbody tr").filter({ hasText: reason }).first();
    await expect(transactionRow).toContainText("pending");
    await transactionRow.getByRole("button", { name: "Inspect" }).click();
    const detail = page.getByLabel("Leave balance transaction detail");
    await expect(detail).toContainText(reason);
    await expect(transactionRow).toContainText("Reviewable");

    const approved = await capturePost<{
      applied: boolean;
      transaction: { id: string; status: string; reviewed_by_name: string };
      balance: { id: string; closing_balance: string };
    }>(page, new RegExp(`/api/hr-admin/leave-balances/transactions/${created.payload.transaction.id}/review/?$`), () =>
      detail.getByRole("button", { name: "Approve" }).click(),
    );
    expect(approved.status).toBe(200);
    expect(approved.payload.applied).toBe(true);
    expect(approved.payload.transaction).toMatchObject({ id: created.payload.transaction.id, status: "applied" });
    expect(approved.payload.balance.id).toBe(balanceId);
    expect(Number(approved.payload.balance.closing_balance)).toBe(Number(before?.closing_balance) - 1);

    const duplicateDecision = await requestWithBrowserSession(
      page,
      `/api/hr-admin/leave-balances/transactions/${created.payload.transaction.id}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: "approve", rejection_reason: "" }),
      },
    );
    expect(duplicateDecision.status).toBe(400);

    const persisted = await requestWithBrowserSession(
      page,
      `/api/hr-admin/leave-balances/transactions?q=${encodeURIComponent(reason)}&status=applied`,
    );
    expect(persisted.status).toBe(200);
    const rows = (JSON.parse(persisted.body) as { items: Array<{ id: string; status: string; reviewed_by_name: string }> }).items;
    expect(rows.filter((item) => item.id === created.payload.transaction.id)).toEqual([
      expect.objectContaining({ status: "applied" }),
    ]);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
