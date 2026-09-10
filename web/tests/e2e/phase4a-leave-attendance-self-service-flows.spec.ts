import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, manager } from "../helpers/staging-auth";

function uniqueRef(prefix: string) {
  return `PW_${prefix}_${Date.now()}`;
}

function field(scope: Page | Locator, label: string, index = 0) {
  return scope.locator("label.form-field").filter({ hasText: label }).locator("input, select, textarea").nth(index);
}

function card(page: Page, text: string | RegExp) {
  return page.locator("article.record-card, a.tableish__row").filter({ hasText: text }).first();
}

function isoDateFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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

test.describe("Phase 4A ESS to MSS leave certification", () => {
  test("employee submits leave through ESS and manager approves through MSS", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const reason = uniqueRef("LEAVE_APPROVAL");
    const decisionNote = `${reason}_APPROVED`;
    const startDate = isoDateFromToday(65);
    const endDate = isoDateFromToday(65);

    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toBeVisible();
    await expect(field(page, "Leave type")).toBeVisible();
    await expect(field(page, "Start date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(field(page, "End date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(field(page, "Start day portion")).toHaveValue("full_day");
    await expect(field(page, "End day portion")).toHaveValue("full_day");
    await expect(field(page, "Attachment reference")).toBeVisible();
    await expect(field(page, "Reason")).toBeVisible();

    await field(page, "Start date").fill(startDate);
    await field(page, "End date").fill(endDate);
    await field(page, "Reason").fill(reason);
    const leaveResult = await submitAndCapture<{ id: string; status: string; workflow_reference: string }>(
      page,
      "/api/me/leave-requests",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit leave" }).click();
      },
    );
    expect(leaveResult.ok).toBeTruthy();
    expect(leaveResult.status).toBe(201);
    expect(leaveResult.requestBody).toMatchObject({
      start_date: startDate,
      end_date: endDate,
      reason,
    });
    expect(leaveResult.payload.status).toBe("pending");
    await page.goto(`/ess?leaveStatus=pending&leaveId=${leaveResult.payload.id}`);
    await expectPageReady(page, "Self service");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("pending");
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${leaveResult.payload.id}`, manager);
    await expectPageReady(page, "Manager inbox");
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approval detail" })).toBeVisible();
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("pending");
    await expect(page.getByText(reason).first()).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const approvalResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/manager/leave-requests/${leaveResult.payload.id}/approve`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Approve request" }).click();
      },
    );
    expect(approvalResult.ok).toBeTruthy();
    expect(approvalResult.requestBody).toMatchObject({ comment: decisionNote });
    expect(approvalResult.payload.status).toBe("approved");
    await expect(page.getByText("Request approved.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/ess?leaveStatus=approved&leaveId=${leaveResult.payload.id}`, employee);
    await expectPageReady(page, "Self service");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("approved");
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("leave request validation and manager rejection are visible through the browser", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const invalidReason = uniqueRef("LEAVE_INVALID");
    const rejectReason = uniqueRef("LEAVE_REJECT");
    const decisionNote = `${rejectReason}_MANAGER_REJECTED`;
    const startDate = isoDateFromToday(70);
    const endDate = isoDateFromToday(69);

    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");
    await field(page, "Start date").fill(startDate);
    await field(page, "End date").fill(endDate);
    await field(page, "Reason").fill(invalidReason);
    const invalidResult = await submitAndCapture<Record<string, unknown>>(
      page,
      "/api/me/leave-requests",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit leave" }).click();
      },
    );
    expect(invalidResult.ok).toBeFalsy();
    expect(invalidResult.status).toBe(400);
    await expect(page.getByText("Submission failed.")).toBeVisible();
    await expect(page.getByText("End date must be on or after start date.")).toBeVisible();

    await field(page, "Start date").fill(isoDateFromToday(71));
    await field(page, "End date").fill(isoDateFromToday(71));
    await field(page, "Reason").fill(rejectReason);
    const leaveResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      "/api/me/leave-requests",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit leave" }).click();
      },
    );
    expect(leaveResult.ok).toBeTruthy();
    expect(leaveResult.payload.status).toBe("pending");

    await gotoAuthenticated(page, `/mss/approvals?queue=leave&leaveId=${leaveResult.payload.id}`, manager);
    await expectPageReady(page, "Manager inbox");
    await expect(card(page, rejectReason)).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const rejectionResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/manager/leave-requests/${leaveResult.payload.id}/reject`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Reject request" }).click();
      },
    );
    expect(rejectionResult.ok).toBeTruthy();
    expect(rejectionResult.requestBody).toMatchObject({ comment: decisionNote });
    expect(rejectionResult.payload.status).toBe("rejected");
    await expect(page.getByText("Request rejected.")).toBeVisible();

    await gotoAuthenticated(page, `/ess?leaveStatus=rejected&leaveId=${leaveResult.payload.id}`, employee);
    await expectPageReady(page, "Self service");
    await expect(card(page, rejectReason)).toBeVisible();
    await expect(card(page, rejectReason)).toContainText("rejected");
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee submits attendance regularization and manager approves through MSS", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const reason = uniqueRef("REG_APPROVAL");
    const decisionNote = `${reason}_APPROVED`;

    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");
    await expect(page.getByRole("heading", { name: "Submit regularization" })).toBeVisible();
    await expect(field(page, "Attendance record")).toBeVisible();
    await expect(field(page, "Requested status")).toBeVisible();
    await expect(field(page, "Requested check-in")).toBeVisible();
    await expect(field(page, "Requested check-out")).toBeVisible();
    await expect(field(page, "Reason", 1)).toBeVisible();

    await field(page, "Requested status").selectOption("remote");
    await field(page, "Reason", 1).fill(reason);
    const regularizationResult = await submitAndCapture<{ id: string; status: string; workflow_reference: string }>(
      page,
      "/api/me/attendance-regularizations",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit regularization" }).click();
      },
    );
    expect(regularizationResult.ok).toBeTruthy();
    expect(regularizationResult.status).toBe(201);
    expect(regularizationResult.requestBody).toMatchObject({
      requested_status: "remote",
      reason,
    });
    expect(regularizationResult.payload.status).toBe("pending");

    await page.goto(`/ess?regStatus=pending&regId=${regularizationResult.payload.id}`);
    await expectPageReady(page, "Self service");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("pending");
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/mss/approvals?queue=attendance&regId=${regularizationResult.payload.id}`, manager);
    await expectPageReady(page, "Manager inbox");
    await expect(page.getByRole("heading", { name: "Attendance regularizations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("pending");
    await expect(page.getByText(reason).first()).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const approvalResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/manager/attendance-regularizations/${regularizationResult.payload.id}/approve`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Approve request" }).click();
      },
    );
    expect(approvalResult.ok).toBeTruthy();
    expect(approvalResult.requestBody).toMatchObject({ comment: decisionNote });
    expect(approvalResult.payload.status).toBe("approved");
    await expect(page.getByText("Request approved.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await gotoAuthenticated(page, `/ess?regStatus=approved&regId=${regularizationResult.payload.id}`, employee);
    await expectPageReady(page, "Self service");
    await expect(card(page, reason)).toBeVisible();
    await expect(card(page, reason)).toContainText("approved");
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("attendance regularization validation, duplicate guard, and manager rejection are visible", async ({ page }) => {
    test.setTimeout(4 * 60 * 1000);
    const invalidReason = uniqueRef("REG_INVALID");
    const duplicateReason = uniqueRef("REG_DUPLICATE");
    const rejectReason = uniqueRef("REG_REJECT");
    const decisionNote = `${rejectReason}_MANAGER_REJECTED`;

    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");
    const attendanceRecordId = await field(page, "Attendance record").inputValue();

    await field(page, "Requested check-in").fill("2026-09-09T18:10");
    await field(page, "Requested check-out").fill("2026-09-09T09:05");
    await field(page, "Reason", 1).fill(invalidReason);
    const invalidResult = await submitAndCapture<Record<string, unknown>>(
      page,
      "/api/me/attendance-regularizations",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit regularization" }).click();
      },
    );
    expect(invalidResult.ok).toBeFalsy();
    expect(invalidResult.status).toBe(400);
    await expect(page.getByText("Submission failed.")).toBeVisible();
    await expect(page.getByText("Requested check-out cannot be earlier than requested check-in.")).toBeVisible();

    await field(page, "Requested check-in").fill("");
    await field(page, "Requested check-out").fill("");
    await field(page, "Requested status").selectOption("late");
    await field(page, "Reason", 1).fill(duplicateReason);
    const firstPending = await submitAndCapture<{ id: string; status: string }>(
      page,
      "/api/me/attendance-regularizations",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit regularization" }).click();
      },
    );
    expect(firstPending.ok).toBeTruthy();
    expect(firstPending.payload.status).toBe("pending");

    await page.goto("/ess");
    await expectPageReady(page, "Self service");
    await field(page, "Attendance record").selectOption(attendanceRecordId);
    await field(page, "Requested status").selectOption("remote");
    await field(page, "Reason", 1).fill(`${duplicateReason}_SECOND`);
    const duplicateResult = await submitAndCapture<Record<string, unknown>>(
      page,
      "/api/me/attendance-regularizations",
      "POST",
      async () => {
        await page.getByRole("button", { name: "Submit regularization" }).click();
      },
    );
    expect(duplicateResult.ok).toBeFalsy();
    expect(duplicateResult.status).toBe(400);
    await expect(page.getByText("A pending attendance regularization already exists for this attendance record.")).toBeVisible();

    await gotoAuthenticated(page, `/mss/approvals?queue=attendance&regId=${firstPending.payload.id}`, manager);
    await expectPageReady(page, "Manager inbox");
    await expect(card(page, duplicateReason)).toBeVisible();
    await field(page, "Decision note").fill(decisionNote);
    const rejectionResult = await submitAndCapture<{ id: string; status: string }>(
      page,
      `/api/manager/attendance-regularizations/${firstPending.payload.id}/reject`,
      "POST",
      async () => {
        await page.getByRole("button", { name: "Reject request" }).click();
      },
    );
    expect(rejectionResult.ok).toBeTruthy();
    expect(rejectionResult.requestBody).toMatchObject({ comment: decisionNote });
    expect(rejectionResult.payload.status).toBe("rejected");
    await expect(page.getByText("Request rejected.")).toBeVisible();

    await gotoAuthenticated(page, `/ess?regStatus=rejected&regId=${firstPending.payload.id}`, employee);
    await expectPageReady(page, "Self service");
    await expect(card(page, duplicateReason)).toBeVisible();
    await expect(card(page, duplicateReason)).toContainText("rejected");
    await expect(page.getByText(decisionNote).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
