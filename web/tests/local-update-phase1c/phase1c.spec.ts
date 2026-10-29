import { expect, test, type Page, type Route } from "@playwright/test";

import { documentNavigationCount, expectLocalUpdateShell, expectNoDocumentNavigation, markLocalUpdateShell } from "../helpers/local-update-contract";

test.describe.configure({ timeout: 75_000 });

async function open(page: Page, route: string, heading: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("main[data-hydrated='true']")).toBeVisible();
}

async function approvalFixture(page: Page) {
  return (await (await page.request.get("/api/manager/approval-inbox?leavePage=1&regPage=1&include_leave=1&include_regularizations=1")).json());
}

function approvalResponse(base: any, route: Route, options: { leave?: any[]; attendance?: any[]; failed?: boolean }) {
  if (options.failed) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Approval queue read failed." }) });
  const params = new URL(route.request().url()).searchParams;
  const leavePage = Number(params.get("leavePage") || 1);
  const regPage = Number(params.get("regPage") || 1);
  const leave = options.leave ?? base.pendingLeave.items;
  const attendance = options.attendance ?? base.pendingRegularizations.items;
  const selectedLeave = leave.find((item: any) => item.id === params.get("leaveId")) ?? null;
  const selectedAttendance = attendance.find((item: any) => item.id === params.get("regId")) ?? null;
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    ...base,
    state: "live",
    summary: { ...base.summary, pending_leave_approvals_count: leave.length, pending_attendance_regularizations_count: attendance.length },
    pendingLeave: { ...base.pendingLeave, items: leave.slice((leavePage - 1) * 5, leavePage * 5), total_count: leave.length, page: leavePage, page_size: 5, has_next: leavePage * 5 < leave.length, has_previous: leavePage > 1 },
    pendingRegularizations: { ...base.pendingRegularizations, items: attendance.slice((regPage - 1) * 5, regPage * 5), total_count: attendance.length, page: regPage, page_size: 5, has_next: regPage * 5 < attendance.length, has_previous: regPage > 1 },
    selectedLeaveDetail: selectedLeave,
    selectedRegularizationDetail: selectedAttendance,
  }) });
}

test("approval queues, selection, pagination, Back, and failed reads remain local", async ({ page }) => {
  await open(page, "/mss/approvals", "Manager approvals");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await approvalFixture(page);
  const attendanceBase = base.pendingRegularizations.items[0];
  const attendance = Array.from({ length: 6 }, (_, index) => ({ ...attendanceBase, id: `phase1c-attendance-${index + 1}`, employee_name: `Phase 1C employee ${index + 1}` }));
  let failed = false;
  await page.route("**/api/manager/approval-inbox?**", (route) => approvalResponse(base, route, { attendance, failed }));
  await page.getByRole("link", { name: /Attendance/ }).click();
  await expect(page).toHaveURL(/queue=attendance/);
  await expect(page.getByRole("table", { name: "Pending attendance fixes" })).toContainText("Phase 1C employee 1");
  await page.getByRole("link", { name: "Select", exact: true }).first().click();
  await expect(page).toHaveURL(/regId=phase1c-attendance-1/);
  await expect(page.getByRole("heading", { name: "Selected attendance request" })).toBeVisible();
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/regPage=2/);
  await expect(page.getByRole("table", { name: "Pending attendance fixes" })).toContainText("Phase 1C employee 6");
  await page.evaluate(() => window.history.back());
  await expect(page).toHaveURL(/regId=phase1c-attendance-1/);
  failed = true;
  const confirmed = page.url();
  await page.getByRole("link", { name: /History/ }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Approval queue read failed.");
  expect(page.url()).toBe(confirmed);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("leave approval comment and evidence reconcile the queue without replacing the shell", async ({ page }) => {
  await open(page, "/mss/approvals", "Manager approvals");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await approvalFixture(page);
  const source = base.pendingLeave.items[0];
  const item = { ...source, id: "phase1c-leave", employee_name: "Phase 1C leave employee", status: "pending", attachments: [{ id: "phase1c-evidence", file_name: "manager-evidence.pdf", label: "Employee evidence", action: "submitted" }] };
  let decided = false;
  await page.route("**/api/manager/approval-inbox?**", (route) => approvalResponse(base, route, { leave: decided ? [] : [item] }));
  await page.getByRole("link", { name: /Leave/ }).click();
  const row = page.getByRole("row").filter({ hasText: item.employee_name });
  await row.getByRole("button", { name: "Review", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Review leave approval" });
  await expect(dialog.getByRole("link", { name: /manager-evidence.pdf/ })).toBeVisible();
  await dialog.getByLabel("Decision note").fill("Approved after checking employee evidence.");
  await page.route("**/api/manager/leave-requests/phase1c-leave/approve", (route) => { decided = true; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...item, status: "approved" }) }); });
  await dialog.getByRole("button", { name: "Approve request", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("No pending leave approvals.")).toBeVisible();
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("attendance rejection validates and reconciles locally", async ({ page }) => {
  await open(page, "/mss/approvals", "Manager approvals");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await approvalFixture(page);
  const item = { ...base.pendingRegularizations.items[0], id: "phase1c-regularization", employee_name: "Phase 1C attendance employee", status: "pending" };
  let decided = false;
  await page.route("**/api/manager/approval-inbox?**", (route) => approvalResponse(base, route, { attendance: decided ? [] : [item] }));
  await page.getByRole("link", { name: /Attendance/ }).click();
  await page.getByRole("row").filter({ hasText: item.employee_name }).getByRole("button", { name: "Review", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Review attendance approval" });
  await dialog.getByRole("button", { name: "Reject request", exact: true }).click();
  await expect(dialog.getByText("Enter a decision note before rejecting this request.")).toBeVisible();
  await dialog.getByLabel("Decision note").fill("Requested correction does not match the submitted evidence.");
  await page.route("**/api/manager/attendance-regularizations/phase1c-regularization/reject", (route) => { decided = true; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...item, status: "rejected" }) }); });
  await dialog.getByRole("button", { name: "Reject request", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("No pending regularizations.")).toBeVisible();
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("accepted decisions preserve the dialog and note when queue confirmation is uncertain", async ({ page }) => {
  await open(page, "/mss/approvals", "Manager approvals");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await approvalFixture(page);
  const item = { ...base.pendingLeave.items[0], id: "phase1c-uncertain", employee_name: "Phase 1C uncertain employee", status: "pending" };
  let followUpFails = false;
  await page.route("**/api/manager/approval-inbox?**", (route) => followUpFails
    ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Confirmation read failed." }) })
    : approvalResponse(base, route, { leave: [item] }));
  await page.getByRole("link", { name: /Leave/ }).click();
  await page.getByRole("row").filter({ hasText: item.employee_name }).getByRole("button", { name: "Review", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Review leave approval" });
  const note = dialog.getByLabel("Decision note");
  await note.fill("Preserve this note until the queue confirms the decision.");
  await page.route("**/api/manager/leave-requests/phase1c-uncertain/approve", (route) => { followUpFails = true; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...item, status: "approved" }) }); });
  await dialog.getByRole("button", { name: "Approve request", exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toContainText("Do not submit it again");
  await expect(note).toHaveValue("Preserve this note until the queue confirms the decision.");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});

test("manager notification filters, pagination, Back, read state, and failures stay local", async ({ page }) => {
  await open(page, "/mss/notifications", "Manager notifications");
  const shell = await markLocalUpdateShell(page);
  const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/manager/notifications?page=1&page_size=10")).json();
  const source = base.items[0];
  const items = Array.from({ length: 11 }, (_, index) => ({ ...source, id: `phase1c-notification-${index + 1}`, title: `Phase 1C alert ${index + 1}`, status: "delivered", channel: "email", priority: "high", subject_type: "leave_request", read_at: null }));
  let failed = false;
  await page.route("**/api/manager/notifications?**", (route) => {
    if (failed) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Manager inbox read failed." }) });
    const params = new URL(route.request().url()).searchParams;
    const requestedPage = Number(params.get("page") || 1);
    const pageSize = Number(params.get("page_size") || 10);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: items.slice((requestedPage - 1) * pageSize, requestedPage * pageSize), total_count: items.length, page: requestedPage, page_size: pageSize, has_next: requestedPage * pageSize < items.length, has_previous: requestedPage > 1 }) });
  });
  const form = page.locator(".user-notification-filters form");
  await form.getByLabel("Search").fill("Phase 1C");
  await form.getByLabel("Status").selectOption("delivered");
  await form.getByLabel("Channel").selectOption("email");
  await form.getByLabel("Priority").selectOption("high");
  await form.getByLabel("Subject type").selectOption("leave_request");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/status=delivered/);
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.evaluate(() => window.history.back());
  await expect(page).not.toHaveURL(/page=2/);
  const first = page.getByRole("row").filter({ has: page.getByText("Phase 1C alert 1", { exact: true }) });
  await expect(first).toBeVisible();
  await first.getByRole("button", { name: "Review notification" }).click();
  const dialog = page.getByRole("dialog");
  await page.route("**/api/manager/notifications/phase1c-notification-1", async (route) => { const body = route.request().postDataJSON(); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...items[0], read_at: body.read_at }) }); });
  await dialog.getByRole("button", { name: "Mark read" }).click();
  await expect(dialog.getByRole("button", { name: "Mark unread" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByText("9 unread on page", { exact: true })).toBeVisible();
  failed = true;
  const confirmed = page.url();
  await page.locator(".user-notification-filters form").getByLabel("Search").fill("retained manager draft");
  await page.locator(".user-notification-filters form").getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Manager inbox read failed.");
  expect(page.url()).toBe(confirmed);
  await expect(page.locator(".user-notification-filters form").getByLabel("Search")).toHaveValue("retained manager draft");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigations);
});
