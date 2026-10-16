import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { openAttendanceMoreFilters, selectFirstAttendanceRecord } from "../helpers/attendance-records";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

type Persona = {
  username: string;
  password: string;
};

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope
    .locator("label.form-field, label.queue-toolbar__search")
    .filter({ has: scope.getByText(label, { exact: true }) })
    .locator("input, select, textarea")
    .nth(index);
}

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
}

async function backendAuthHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card, a.tableish__row, table tbody tr").filter({ hasText: text }).first();
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
  await gotoAuthenticated(page, path, persona);
}

async function firstSelectableRecordValue(select: Locator) {
  return select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    const option = Array.from(selectElement.options).find((item) => item.value && !item.disabled);
    return option?.value ?? "";
  });
}

async function firstRecordValue(select: Locator) {
  return select.evaluate((element) => {
    const selectElement = element as HTMLSelectElement;
    const option = Array.from(selectElement.options).find((item) => item.value);
    return option?.value ?? "";
  });
}

async function unlockAttendanceRecordForCertification(page: Page, recordId: string) {
  await switchTo(page, "/hr-admin/attendance-records", hrAdmin);
  const response = await page.request.post("/api/hr-admin/attendance-records/bulk-actions", {
    data: {
      action: "unlock",
      record_ids: [recordId],
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function createEssRegularization(page: Page, reason: string) {
  await clearPendingEmployeeRegularization(page);
  await switchTo(page, "/ess/attendance", employee);
  await expectPageReady(page, "Attendance");
  await page.getByRole("button", { name: "Regularize attendance" }).first().click();
  let dialog = page.getByRole("dialog", { name: "Regularize attendance" });
  await expect(dialog).toBeVisible();
  let recordSelect = dialog.getByRole("combobox", { name: "Attendance record" });
  let recordId = await firstSelectableRecordValue(recordSelect);
  if (!recordId) {
    const lockedRecordId = await firstRecordValue(recordSelect);
    expect(lockedRecordId, "Employee should have an attendance record available for regularization setup.").toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await unlockAttendanceRecordForCertification(page, lockedRecordId);
    await switchTo(page, "/ess/attendance", employee);
    await expectPageReady(page, "Attendance");
    await page.getByRole("button", { name: "Regularize attendance" }).first().click();
    dialog = page.getByRole("dialog", { name: "Regularize attendance" });
    await expect(dialog).toBeVisible();
    recordSelect = dialog.getByRole("combobox", { name: "Attendance record" });
    recordId = await firstSelectableRecordValue(recordSelect);
  }
  expect(recordId, "Employee should have an unlocked attendance record for regularization setup.").toBeTruthy();
  await recordSelect.selectOption(recordId);
  await dialog.getByRole("combobox", { name: "Requested status" }).selectOption("remote");
  await dialog.getByRole("textbox", { name: "Reason" }).fill(reason);
  const result = await submitAndCapture<{ id: string; status: string }>(
    page,
    "/api/me/attendance-regularizations",
    "POST",
    async () => {
      await dialog.getByRole("button", { name: /Submit (correction|regularization)/ }).click();
    },
  );
  expect(result.ok).toBeTruthy();
  expect(result.status).toBe(201);
  expect(result.payload.status).toBe("pending");
  return result.payload.id;
}

async function clearPendingEmployeeRegularization(page: Page) {
  await switchTo(page, "/hr-admin/attendance-regularizations", hrAdmin);
  const headers = await backendAuthHeaders(page);
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/attendance-regularizations/?status=pending&q=EMP-0042&page_size=100`, { headers });
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = await response.json();
  const items = (Array.isArray(payload) ? payload : payload.items ?? payload.results ?? []) as Array<{ id: string; employee_code?: string }>;
  for (const item of items.filter((entry) => entry.employee_code === "EMP-0042")) {
    const rejection = await page.request.post(`${apiBaseUrl()}/hr-admin/attendance-regularizations/${item.id}/reject/`, {
      headers,
      data: { comment: uniqueRef("HR_REG_CLEANUP") },
    });
    expect([200, 404], await rejection.text()).toContain(rejection.status());
  }
}

test.describe("Phase 4C HR-admin operations certification", () => {
  test("attendance policy preview validates inputs, handles network recovery, and blocks duplicate preview requests", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    await switchTo(page, "/hr-admin/attendance-policies/new", hrAdmin);
    await expectPageReady(page, "Create attendance policy");
    await expect(page.getByRole("heading", { name: "Policy preview" })).toBeVisible();

    await page.getByRole("button", { name: "Preview attendance outcome" }).click();
    await expect(page.getByText("Select an attendance date for preview.")).toBeVisible();

    await field(page, "Attendance date").fill("2026-10-05");
    let previewAttempts = 0;
    await page.route("**/api/hr-admin/attendance-policies/preview", async (route) => {
      if (route.request().method() === "POST") {
        previewAttempts += 1;
        await route.abort("failed");
        return;
      }
      await route.continue();
    });
    await page.getByRole("button", { name: "Preview attendance outcome" }).click();
    await expect(page.getByText("Unable to reach the server. Check your connection and try again.")).toBeVisible();
    expect(previewAttempts).toBe(1);

    await page.unroute("**/api/hr-admin/attendance-policies/preview");
    previewAttempts = 0;
    await page.route("**/api/hr-admin/attendance-policies/preview", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      previewAttempts += 1;
      await new Promise((resolve) => setTimeout(resolve, 600));
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({
          derived_status: "present",
          resolved_shift_name: "General Shift",
          matched_holiday_name: null,
          matched_holiday_type: null,
          work_duration_hours: "8.00",
          overtime_hours: "0.00",
          late_minutes: 0,
          early_exit_minutes: 0,
          current_resolved_policy_name: "Monthly attendance",
          current_assignment_priority: 100,
          current_assignment_scope: ["Tenant default"],
          draft_policy_matches_current_resolution: true,
          resolved_config: {},
        }),
      });
    });
    await page.getByRole("button", { name: "Preview attendance outcome" }).click();
    await page.getByRole("button", { name: "Previewing..." }).click();
    await expect(page.getByText("Derived status")).toBeVisible();
    await expect(page.locator(".detail-row").filter({ hasText: "Resolved shift" }).getByText("General Shift")).toBeVisible();
    expect(previewAttempts).toBe(1);
    await expectNoHorizontalOverflow(page);
  });

  test("attendance record bulk actions recover from network failure without duplicate mutations", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    await switchTo(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
    await expectPageReady(page, "Attendance records");

    await selectFirstAttendanceRecord(page);

    let failedAttempts = 0;
    await page.route("**/api/hr-admin/attendance-records/bulk-actions", async (route) => {
      if (route.request().method() === "POST") {
        failedAttempts += 1;
        await route.abort("failed");
        return;
      }
      await route.continue();
    });
    await page.getByRole("button", { name: "Lock", exact: true }).click();
    await expect(page.getByText("Unable to reach the server. Check your connection and try again.")).toBeVisible();
    expect(failedAttempts).toBe(1);

    await page.unroute("**/api/hr-admin/attendance-records/bulk-actions");
    const recovered = await submitAndCapture<{ updated_count: number }>(
      page,
      "/api/hr-admin/attendance-records/bulk-actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Lock", exact: true }).click();
      },
    );
    expect(recovered.ok).toBeTruthy();
    expect(recovered.requestBody).toMatchObject({ action: "lock" });
    await expect(page.getByText("0 selected").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("attendance regularization queue filters, inline rejection, full approval, and read-only terminal state", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const rejectReason = uniqueRef("HR_REG_REJECT");
    const rejectNote = `${rejectReason}_NOTE`;
    const approveReason = uniqueRef("HR_REG_APPROVE");
    const approveNote = `${approveReason}_NOTE`;
    const rejectId = await createEssRegularization(page, rejectReason);

    await switchTo(page, `/hr-admin/attendance-regularizations?status=pending&q=${encodeURIComponent(rejectReason)}`, hrAdmin);
    await expectPageReady(page, "Regularizations");
    await expect(page.getByRole("heading", { level: 1, name: "Regularizations" })).toBeVisible();
    await expect(field(page, "Search")).toHaveValue(rejectReason);
    await expect(field(page, "Request status")).toHaveValue("pending");
    await expect(field(page, "Requested status")).toBeVisible();
    await openAttendanceMoreFilters(page);
    await expect(field(page, "Current status")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Rows" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    const rejectRow = card(page, rejectReason);
    await expect(rejectRow).toContainText(/pending/i);
    await expect(rejectRow).toContainText(/remote/i);
    await rejectRow.getByRole("button", { name: "Inspect" }).click();
    const rejectDetail = page.locator("article.attendance-detail-drawer");
    await expect(rejectDetail.getByRole("link", { name: "Review request" })).toHaveAttribute("href", new RegExp(`reviewRegularization=${rejectId}`));
    await expect(rejectDetail.getByRole("link", { name: "Full review" })).toHaveAttribute("href", new RegExp(`reviewRegularization=${rejectId}`));
    await rejectDetail.getByRole("textbox", { name: "Decision note" }).fill(rejectNote);
    const inlineReject = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/hr-admin/attendance-regularizations/${rejectId}/reject`,
      "POST",
      async () => {
        await rejectDetail.getByRole("button", { name: "Reject" }).click();
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
    await expectPageReady(page, "Regularizations");
    const approvedRow = card(page, approveReason);
    await expect(approvedRow).toContainText(/approved/i);
    await approvedRow.getByRole("button", { name: "Inspect" }).click();
    const approvedDetail = page.locator("article.attendance-detail-drawer");
    await expect(approvedDetail.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(approvedDetail.getByRole("button", { name: "Reject" })).toBeDisabled();
    await page.getByRole("combobox", { name: "Rows" }).selectOption("10");
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
    await expect(page.getByRole("heading", { level: 1, name: "Attendance records" })).toBeVisible();
    await expect(field(page, "Search")).toBeVisible();
    await expect(field(page, "Status")).toBeVisible();
    await expect(field(page, "Source")).toBeVisible();
    await openAttendanceMoreFilters(page);
    await expect(field(page, "Lock state")).toBeVisible();
    await expect(field(page, "Regularization")).toBeVisible();
    await expect(field(page, "Rows")).toHaveValue("10");
    await expect(field(page, "Late focus")).toBeVisible();
    await expect(field(page, "Bulk status")).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Lock", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Unlock", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Set status (0)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Mark regularized" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Clear regularized" })).toBeDisabled();

    let firstRecord = await selectFirstAttendanceRecord(page);
    await firstRecord.getByRole("button", { name: "Inspect" }).click();
    await expect(page.getByRole("complementary", { name: "Attendance record detail" }).getByRole("link", { name: "Edit record" })).toHaveAttribute("href", /editRecord=.+/);

    const lockResult = await submitAndCapture<{ updated_count: number }>(
      page,
      "/api/hr-admin/attendance-records/bulk-actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Lock", exact: true }).click();
      },
    );
    expect(lockResult.ok).toBeTruthy();
    expect(lockResult.requestBody).toMatchObject({ action: "lock" });
    await expect(page.getByText("0 selected").first()).toBeVisible();

    firstRecord = await selectFirstAttendanceRecord(page);
    const unlockResult = await submitAndCapture<{ updated_count: number }>(
      page,
      "/api/hr-admin/attendance-records/bulk-actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Unlock", exact: true }).click();
      },
    );
    expect(unlockResult.ok).toBeTruthy();
    expect(unlockResult.requestBody).toMatchObject({ action: "unlock" });

    firstRecord = await selectFirstAttendanceRecord(page);
    await field(page, "Bulk status").selectOption("present");
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

    firstRecord = await selectFirstAttendanceRecord(page);
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

    await selectFirstAttendanceRecord(page);
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

    await field(page, "Late focus").check();
    await field(page, "Lock state").selectOption("open");
    await field(page, "Regularization").selectOption("not_regularized");
    await field(page, "Rows").selectOption("25");
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
    await expect(page.locator(".attendance-summary-strip", { hasText: "pending reviews" })).toBeVisible();

    const balanceOperations = page.locator("section").filter({ has: page.getByRole("heading", { name: "Balance operations" }) });
    await expect(field(balanceOperations, "Employee")).toBeVisible();
    await expect(field(balanceOperations, "Leave policy")).toBeVisible();
    await expect(field(balanceOperations, "Action")).toHaveValue("credit_adjustment");
    await expect(field(balanceOperations, "Units")).toHaveValue("0.00");
    await expect(field(balanceOperations, "Effective date")).toBeVisible();
    await expect(field(balanceOperations, "Reason")).toBeVisible();
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

    await field(balanceOperations, "Employee").selectOption({ index: 1 });
    await field(balanceOperations, "Leave policy").selectOption({ index: 1 });
    await field(balanceOperations, "Units").fill("0.01");
    await field(balanceOperations, "Effective date").fill(new Date().toISOString().slice(0, 10));
    await field(balanceOperations, "Reason").fill(reason);
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

    await field(page, "Search").fill(reason);
    const moreFilters = page.locator("details").filter({ hasText: "More filters" }).first();
    if (!(await moreFilters.getAttribute("open"))) {
      await moreFilters.locator("summary").click();
    }
    await field(page, "Transaction status").selectOption(actionResult.payload.transaction.status === "pending" ? "pending" : "applied");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/q=PW_LEAVE_BALANCE_/);
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText(actionResult.payload.transaction.status);
    await expect(card(page, reason)).toContainText("0.01");

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
