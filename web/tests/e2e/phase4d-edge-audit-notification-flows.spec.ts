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

async function switchTo(page: Page, path: string, persona: Persona) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await gotoAuthenticated(page, path, persona);
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

async function ensureFirstAttendanceRowSelected(page: Page) {
  const firstRecord = page.locator("article.record-card").first();
  await expect(firstRecord).toBeVisible();
  const checkbox = firstRecord.locator("input[type='checkbox']");
  if (!(await checkbox.isChecked())) {
    await checkbox.check();
  }
  await expect(page.getByText("1 selected").first()).toBeVisible();
  return firstRecord;
}

async function clearPendingEmployeeRegularization(page: Page) {
  await switchTo(page, "/hr-admin/attendance-regularizations?status=pending&q=EMP-0042", hrAdmin);
  await expectPageReady(page, "Attendance regularization queue for HR oversight.");
  const pendingCard = page.locator("article.record-card").first();
  if ((await pendingCard.count()) === 0 || !(await pendingCard.getByRole("button", { name: "Reject" }).isEnabled().catch(() => false))) {
    return;
  }
  await field(pendingCard, "Decision note").fill(uniqueRef("HR_REG_CLEANUP"));
  await Promise.all([
    page.waitForResponse((item) => item.url().includes("/api/hr-admin/attendance-regularizations/") && item.url().endsWith("/reject") && item.request().method() === "POST"),
    pendingCard.getByRole("button", { name: "Reject" }).click(),
  ]);
  await expect(page.getByText("Regularization rejected.")).toBeVisible();
}

async function createAndApproveRegularization(page: Page, reason: string, note: string) {
  await clearPendingEmployeeRegularization(page);
  await switchTo(page, "/ess", employee);
  await expectPageReady(page, "Self service");
  await field(page, "Requested status").selectOption("remote");
  await field(page, "Reason", 1).fill(reason);
  const created = await submitAndCapture<{ id: string; status: string }>(
    page,
    "/api/me/attendance-regularizations",
    "POST",
    async () => {
      await page.getByRole("button", { name: "Submit regularization" }).click();
    },
  );
  expect(created.ok).toBeTruthy();
  expect(created.payload.status).toBe("pending");

  await switchTo(page, `/hr-admin/attendance-regularizations/${created.payload.id}/review`, hrAdmin);
  await expectPageReady(page, "Review attendance regularization");
  await field(page, "HR decision note").fill(note);
  const approved = await submitAndCapture<{ id: string; status: string }>(
    page,
    `/api/hr-admin/attendance-regularizations/${created.payload.id}/approve`,
    "POST",
    async () => {
      await page.getByRole("button", { name: "Approve request" }).click();
    },
  );
  expect(approved.ok).toBeTruthy();
  expect(approved.payload.status).toBe("approved");
  return created.payload.id;
}

test.describe("Phase 4D leave and attendance edge, audit, and notification certification", () => {
  test("locked attendance rows are disabled in ESS after HR-admin lock and restored after unlock", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);

    await switchTo(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
    await expectPageReady(page, "Attendance records review window.");
    const firstRecord = await ensureFirstAttendanceRowSelected(page);
    const employeeCode = (await firstRecord.locator(".section-copy").first().textContent())?.split("•")[0]?.trim() ?? "";
    const editHref = await firstRecord.getByRole("link", { name: "Edit record" }).getAttribute("href");
    const recordId = editHref?.match(/attendance-records\/([^/]+)\/edit/)?.[1];
    expect(recordId).toBeTruthy();

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

    await switchTo(page, "/ess", employee);
    await expectPageReady(page, "Self service");
    const lockedOption = field(page, "Attendance record").locator(`option[value="${recordId}"]`);
    if (employeeCode === "EMP-0042") {
      await expect(lockedOption).toBeDisabled();
      await expect(lockedOption).toContainText(/remote|present|absent|late|half day|on leave|weekly off|holiday|unknown/i);
    } else {
      await expect(field(page, "Attendance record").locator(`option[value="${recordId}"]`)).toHaveCount(0);
    }

    await switchTo(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
    await expectPageReady(page, "Attendance records review window.");
    await ensureFirstAttendanceRowSelected(page);
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

    await switchTo(page, "/ess", employee);
    await expectPageReady(page, "Self service");
    if (employeeCode === "EMP-0042") {
      await expect(field(page, "Attendance record").locator(`option[value="${recordId}"]`)).toBeEnabled();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("leave balance over-debit is rejected with browser-visible validation", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);
    const reason = uniqueRef("LEAVE_BALANCE_OVERDEBIT");

    await switchTo(page, "/hr-admin/leave-balances", hrAdmin);
    await expectPageReady(page, "Leave balances");
    await field(page, "Employee").selectOption({ index: 1 });
    await field(page, "Leave policy").selectOption({ index: 1 });
    await field(page, "Action").selectOption("debit_adjustment");
    await field(page, "Units").fill("9999.99");
    await field(page, "Effective date").fill(new Date().toISOString().slice(0, 10));
    await field(page, "Reason").fill(reason);
    const result = await submitAndCapture<Record<string, unknown>>(
      page,
      "/api/hr-admin/leave-balances/actions",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Apply balance action" }).click();
      },
    );
    expect(result.ok).toBeFalsy();
    expect(result.status).toBe(400);
    await expect(page.getByText("Action failed.")).toBeVisible();
    await expect(page.getByText(/Cannot debit .* units when only .* are available\./)).toBeVisible();
    await expect(card(page, reason)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("attendance decision appears in HR audit center and related notification queues", async ({ page }) => {
    test.setTimeout(5 * 60 * 1000);
    const reason = uniqueRef("REG_AUDIT_NOTIFY");
    const note = `${reason}_APPROVED`;
    const regularizationId = await createAndApproveRegularization(page, reason, note);

    await switchTo(page, `/hr-admin/audit?source=attendance_approval&q=${encodeURIComponent(reason)}`, hrAdmin);
    await expectPageReady(page, "Audit center");
    await expect(field(page, "Search")).toHaveValue(reason);
    await expect(field(page, "Source")).toHaveValue("attendance_approval");
    await expect(page.getByText("Approval actions")).toBeVisible();
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("attendance approval");
    await expect(card(page, reason).getByRole("link", { name: "Open source" })).toHaveAttribute("href", `/hr-admin/attendance-regularizations/${regularizationId}/review`);
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/audit$/);

    await switchTo(page, `/hr-admin/notifications?subject_type=attendance_regularization&q=${regularizationId}`, hrAdmin);
    await expectPageReady(page, "Notification queue");
    await expect(field(page, "Search")).toHaveValue(regularizationId);
    await expect(field(page, "Subject type")).toHaveValue("attendance_regularization");
    await expect(page.getByRole("heading", { name: "Notifications", exact: true })).toBeVisible();
    await expect(page.getByText("attendance_regularization").first()).toBeVisible();
    await expect(page.locator("article.record-card").filter({ hasText: "attendance_regularization" }).first().getByRole("link", { name: "Review", exact: true })).toHaveAttribute("href", /\/hr-admin\/notifications\/.+\/review/);

    await switchTo(page, `/ess/notifications?subject_type=attendance_regularization&q=${regularizationId}`, employee);
    await expectPageReady(page, "Notifications");
    await expect(field(page, "Search")).toHaveValue(regularizationId);
    await expect(field(page, "Subject type")).toHaveValue("attendance_regularization");
    await expect(page.locator("article").filter({ hasText: "Notification detail" }).first()).toContainText("Attendance regularization updated");
    await expect(page.locator("article").filter({ hasText: "Notification detail" }).first()).toContainText("attendance_regularization");
    await expect(page.locator("article").filter({ hasText: "Notification detail" }).first().getByRole("link", { name: "Open source" })).toHaveAttribute("href", `/ess?regId=${regularizationId}`);
    await expectNoHorizontalOverflow(page);
  });
});
