import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type Persona = {
  username: string;
  password: string;
};

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field, label.queue-toolbar__search").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card, a.tableish__row").filter({ hasText: text }).first();
}

async function ensureChecked(locator: Locator) {
  if (!(await locator.isChecked())) {
    await locator.check();
  }
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(path) && item.request().method() === method),
    action(),
  ]);
  return {
    ok: response.ok(),
    status: response.status(),
    requestBody: response.request().postDataJSON() as unknown,
    payload: (await response.json().catch(() => ({}))) as T,
  };
}

async function switchTo(page: Page, path: string, persona: Persona) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, path, persona);
}

async function createEssRegularization(page: Page, reason: string) {
  await clearPendingEmployeeRegularization(page);
  await switchTo(page, "/ess", employee);
  await expectPageReady(page, "Self service");
  await field(page, "Requested status").selectOption("remote");
  await field(page, "Reason", 1).fill(reason);
  const result = await submitAndCapture<{ id: string; status: string }>(
    page,
    "/api/me/attendance-regularizations",
    "POST",
    async () => {
      await page.getByRole("button", { name: "Submit regularization" }).click();
    },
  );
  expect(result.ok).toBeTruthy();
  expect(result.status).toBe(201);
  expect(result.payload.status).toBe("pending");
  return result.payload.id;
}

async function clearPendingEmployeeRegularization(page: Page) {
  await switchTo(page, "/hr-admin/attendance-regularizations?status=pending&q=EMP-0042", hrAdmin);
  await expectPageReady(page, "Attendance regularization queue for HR oversight.");
  const pendingCard = page.locator("article.record-card").first();
  if ((await pendingCard.count()) === 0 || !(await pendingCard.getByRole("button", { name: "Reject" }).isEnabled().catch(() => false))) {
    return;
  }
  const cleanupNote = uniqueRef("HR_REG_CLEANUP");
  await field(pendingCard, "Decision note").fill(cleanupNote);
  await Promise.all([
    page.waitForResponse((item) => item.url().includes("/api/hr-admin/attendance-regularizations/") && item.url().endsWith("/reject") && item.request().method() === "POST"),
    pendingCard.getByRole("button", { name: "Reject" }).click(),
  ]);
  await expect(page.getByText("Regularization rejected.")).toBeVisible();
}

test.describe("Phase 4C HR-admin operations certification", () => {
  test("attendance regularization queue filters, inline rejection, full approval, and read-only terminal state", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const rejectReason = uniqueRef("HR_REG_REJECT");
    const rejectNote = `${rejectReason}_NOTE`;
    const approveReason = uniqueRef("HR_REG_APPROVE");
    const approveNote = `${approveReason}_NOTE`;
    const rejectId = await createEssRegularization(page, rejectReason);

    await switchTo(page, `/hr-admin/attendance-regularizations?status=pending&q=${encodeURIComponent(rejectReason)}`, hrAdmin);
    await expectPageReady(page, "Attendance regularization queue for HR oversight.");
    await expect(page.getByRole("heading", { name: "Regularizations" })).toBeVisible();
    await expect(field(page, "Search")).toHaveValue(rejectReason);
    await expect(field(page, "Request status")).toHaveValue("pending");
    await expect(field(page, "Requested attendance status")).toBeVisible();
    await expect(field(page, "Current attendance status")).toBeVisible();
    await expect(field(page, "Rows per page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await expect(card(page, rejectReason)).toContainText("pending");
    await expect(card(page, rejectReason)).toContainText("remote");
    await expect(card(page, rejectReason).getByRole("link", { name: "Review request" })).toHaveAttribute("href", `/hr-admin/attendance-regularizations/${rejectId}/review`);
    await expect(card(page, rejectReason).getByRole("link", { name: "Full review" })).toHaveAttribute("href", `/hr-admin/attendance-regularizations/${rejectId}/review`);
    await field(card(page, rejectReason), "Decision note").fill(rejectNote);
    const inlineReject = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/hr-admin/attendance-regularizations/${rejectId}/reject`,
      "POST",
      async () => {
        await card(page, rejectReason).getByRole("button", { name: "Reject" }).click();
      },
    );
    expect(inlineReject.ok).toBeTruthy();
    expect(inlineReject.requestBody).toMatchObject({ comment: rejectNote });
    expect(inlineReject.payload.status).toBe("rejected");
    await expect(page.getByText("Regularization rejected.")).toBeVisible();

    const approveId = await createEssRegularization(page, approveReason);
    await switchTo(page, `/hr-admin/attendance-regularizations/${approveId}/review`, hrAdmin);
    await expectPageReady(page, "Review attendance regularization");
    await expect(page.getByRole("heading", { name: "Request context" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "HR review decision" })).toBeVisible();
    await expect(page.getByText(approveReason).first()).toBeVisible();
    await expect(field(page, "HR decision note")).toBeVisible();
    await field(page, "HR decision note").fill(approveNote);
    const fullApprove = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/hr-admin/attendance-regularizations/${approveId}/approve`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Approve request" }).click();
      },
    );
    expect(fullApprove.ok).toBeTruthy();
    expect(fullApprove.requestBody).toMatchObject({ comment: approveNote });
    expect(fullApprove.payload.status).toBe("approved");
    await expect(page).toHaveURL(/\/hr-admin\/attendance-regularizations$/);

    await switchTo(page, `/hr-admin/attendance-regularizations?status=approved&q=${encodeURIComponent(approveReason)}`, hrAdmin);
    await expectPageReady(page, "Attendance regularization queue for HR oversight.");
    await expect(card(page, approveReason)).toContainText("approved");
    await expect(card(page, approveReason).getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(card(page, approveReason).getByRole("button", { name: "Reject" })).toBeDisabled();
    await field(page, "Rows per page").selectOption("10");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/page_size=10/);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-regularizations$/);
    await expectNoHorizontalOverflow(page);
  });

  test("attendance record bulk manager covers filters, selection, lock, unlock, status, and regularized flags", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);

    await switchTo(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
    await expectPageReady(page, "Attendance records");
    await expect(page.getByRole("heading", { name: "Attendance records", exact: true })).toBeVisible();
    await expect(field(page, "Search")).toBeVisible();
    await expect(field(page, "Status")).toBeVisible();
    await expect(field(page, "Source")).toBeVisible();
    await expect(field(page, "Lock state")).toBeVisible();
    await expect(field(page, "Regularization state")).toBeVisible();
    await expect(field(page, "Rows per page")).toHaveValue("10");
    await expect(field(page, "Late-only focus")).toBeVisible();
    await expect(field(page, "Bulk attendance status")).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Lock \(0\)$/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Unlock (0)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Set status (0)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Mark regularized" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Clear regularized" })).toBeDisabled();

    const firstRecord = page.locator("article.record-card").first();
    await expect(firstRecord).toBeVisible();
    await expect(firstRecord.getByRole("link", { name: "Edit record" })).toHaveAttribute("href", /\/hr-admin\/attendance-records\/.+\/edit/);
    await ensureChecked(firstRecord.locator("input[type='checkbox']"));
    await expect(page.getByText("1 selected").first()).toBeVisible();

    const lockResult = await submitAndCapture<{ updated_count: number }>(
      page,
      "/api/hr-admin/attendance-records/bulk-actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: /^Lock \(1\)$/ }).click();
      },
    );
    expect(lockResult.ok).toBeTruthy();
    expect(lockResult.requestBody).toMatchObject({ action: "lock" });
    await expect(page.getByText("0 selected").first()).toBeVisible();

    await ensureChecked(firstRecord.locator("input[type='checkbox']"));
    const unlockResult = await submitAndCapture<{ updated_count: number }>(
      page,
      "/api/hr-admin/attendance-records/bulk-actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: /^Unlock \(1\)$/ }).click();
      },
    );
    expect(unlockResult.ok).toBeTruthy();
    expect(unlockResult.requestBody).toMatchObject({ action: "unlock" });

    await ensureChecked(firstRecord.locator("input[type='checkbox']"));
    await field(page, "Bulk attendance status").selectOption("present");
    const statusResult = await submitAndCapture<{ updated_count: number }>(
      page,
      "/api/hr-admin/attendance-records/bulk-actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Set status (1)" }).click();
      },
    );
    expect(statusResult.ok).toBeTruthy();
    expect(statusResult.requestBody).toMatchObject({ action: "set_status", status: "present" });

    await ensureChecked(firstRecord.locator("input[type='checkbox']"));
    const markResult = await submitAndCapture<{ updated_count: number }>(
      page,
      "/api/hr-admin/attendance-records/bulk-actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Mark regularized" }).click();
      },
    );
    expect(markResult.ok).toBeTruthy();
    expect(markResult.requestBody).toMatchObject({ action: "mark_regularized" });

    await ensureChecked(firstRecord.locator("input[type='checkbox']"));
    const clearResult = await submitAndCapture<{ updated_count: number }>(
      page,
      "/api/hr-admin/attendance-records/bulk-actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Clear regularized" }).click();
      },
    );
    expect(clearResult.ok).toBeTruthy();
    expect(clearResult.requestBody).toMatchObject({ action: "clear_regularized" });

    await field(page, "Late-only focus").check();
    await field(page, "Lock state").selectOption("open");
    await field(page, "Regularization state").selectOption("not_regularized");
    await field(page, "Rows per page").selectOption("25");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/late_only=true/);
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-records$/);
    await expectNoHorizontalOverflow(page);
  });

  test("leave balance operations cover metrics, validation, adjustment, filtering, and transaction review controls", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const reason = uniqueRef("LEAVE_BALANCE");

    await switchTo(page, "/hr-admin/leave-balances", hrAdmin);
    await expectPageReady(page, "Leave balances");
    await expect(page.getByRole("link", { name: "Leave policies" })).toHaveAttribute("href", "/hr-admin/leave-policies");
    await expect(page.getByRole("link", { name: "Back to policies" })).toHaveAttribute("href", "/hr-admin/policies");
    await expect(page.getByText("Tracked balances")).toBeVisible();
    await expect(page.getByText("Encashed units")).toBeVisible();
    await expect(page.getByText("Net adjustments")).toBeVisible();
    await expect(page.getByText("Pending reviews")).toBeVisible();

    await expect(field(page, "Employee")).toBeVisible();
    await expect(field(page, "Leave policy")).toBeVisible();
    await expect(field(page, "Action")).toHaveValue("credit_adjustment");
    await expect(field(page, "Units")).toHaveValue("0.00");
    await expect(field(page, "Effective date")).toBeVisible();
    await expect(field(page, "Reason")).toBeVisible();
    const invalid = await submitAndCapture<Record<string, unknown>>(
      page,
      "/api/hr-admin/leave-balances/actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Apply balance action" }).click();
      },
    );
    expect(invalid.ok).toBeFalsy();
    expect(invalid.status).toBe(400);
    await expect(page.getByText("Action failed.")).toBeVisible();

    await field(page, "Employee").selectOption({ index: 1 });
    await field(page, "Leave policy").selectOption({ index: 1 });
    await field(page, "Units").fill("0.01");
    await field(page, "Effective date").fill(new Date().toISOString().slice(0, 10));
    await field(page, "Reason").fill(reason);
    const actionResult = await submitAndCapture<{ message: string; transaction: { id: string; status: string; reason: string } }>(
      page,
      "/api/hr-admin/leave-balances/actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Apply balance action" }).click();
      },
    );
    expect(actionResult.ok).toBeTruthy();
    expect(actionResult.requestBody).toMatchObject({ action: "credit_adjustment", units: "0.01", reason });
    await expect(page.getByText("Update recorded.")).toBeVisible();
    await expect(page.getByText(actionResult.payload.message)).toBeVisible();
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText(actionResult.payload.transaction.status);

    await field(page, "Search").fill(reason);
    await field(page, "Transaction status").selectOption(actionResult.payload.transaction.status === "pending" ? "pending" : "applied");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("0.01 units");

    const transactionCard = card(page, reason);
    if (actionResult.payload.transaction.status === "pending") {
      if ((await transactionCard.getByRole("button", { name: "Approve" }).count()) > 0) {
        await expect(transactionCard.getByRole("button", { name: "Approve" })).toBeVisible();
        await expect(transactionCard.getByRole("button", { name: "Reject" })).toBeVisible();
        await transactionCard.getByPlaceholder("Reason if rejecting").fill("");
        const reviewResult = await submitAndCapture<Record<string, unknown>>(
          page,
          `/api/hr-admin/leave-balances/transactions/${actionResult.payload.transaction.id}/review`,
          "POST",
          async () => {
            await transactionCard.getByRole("button", { name: "Reject" }).click();
          },
        );
        expect(reviewResult.ok).toBeFalsy();
        await expect(page.getByText("Action failed.")).toBeVisible();
      } else {
        await expect(transactionCard.getByText("Pending review. A different authorized reviewer must approve this action before balances change.")).toBeVisible();
      }
    }
    await expectNoHorizontalOverflow(page);
  });
});
