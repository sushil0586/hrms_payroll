import { expect, test, type Page } from "@playwright/test";

import {
  documentNavigationCount,
  expectLocalUpdateShell,
  expectNoDocumentNavigation,
  markLocalUpdateShell,
} from "../helpers/local-update-contract";

test.describe.configure({ timeout: 60_000 });

async function open(page: Page, path: string, heading: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("main[data-hydrated='true']")).toBeVisible();
}

test("attendance period, pagination state, and failure stay inside the period resource", async ({ page }) => {
  await open(page, "/ess/attendance", "Attendance");
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/attendance-records")).json();
  const day = {
    id: "phase1a-attendance-day",
    attendance_date: "2026-09-08",
    status: "present",
    shift: "General Shift",
    check_in_at: "2026-09-08T09:00:00Z",
    check_out_at: "2026-09-08T18:00:00Z",
    work_duration_hours: "9.00",
    overtime_hours: "0.00",
    late_minutes: 0,
    early_exit_minutes: 0,
    holiday: null,
    is_locked: false,
    is_regularized: false,
    can_regularize: false,
    regularization_unavailable_reason: "No correction needed.",
    derivation_summary: null,
  };
  await page.route("**/api/me/attendance-records**", (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get("page") || "1");
    const item = requestedPage === 1 ? day : { ...day, id: "phase1a-attendance-page-2", attendance_date: "2026-09-09" };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...base, month: "2026-09", period_start: "2026-09-01", period_end: "2026-09-30", days: [day, item], items: [item], total_count: 6, total_pages: 2, page: requestedPage, page_size: 5, has_next: requestedPage === 1, has_previous: requestedPage > 1, summary: { recorded_days: 1, worked_hours: "9.00", locked_days: 0, pending_corrections: 0 } }),
    });
  });
  const form = page.getByRole("form", { name: "Attendance period filters" });
  await form.getByLabel("Month").fill("2026-09");
  await form.getByLabel("Rows per page").selectOption("5");
  await form.getByRole("button", { name: "Show period" }).click();
  await expect(page).toHaveURL(/month=2026-09/);
  await expect(page.getByRole("group", { name: "Attendance period summary" })).toContainText("1 recorded days");
  await page.getByRole("link", { name: "List", exact: true }).click();
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByRole("table", { name: "Attendance days" })).toContainText("09 Sep 2026");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);

  await page.unroute("**/api/me/attendance-records**");
  const confirmedUrl = page.url();
  await page.route("**/api/me/attendance-records**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Period read failed." }) }));
  await form.getByLabel("Month").fill("2026-08");
  await form.getByRole("button", { name: "Show period" }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Period read failed.");
  expect(page.url()).toBe(confirmedUrl);
  await expect(form.getByLabel("Month")).toHaveValue("2026-08");
  await expect(page.getByRole("group", { name: "Attendance period summary" })).toContainText("1 recorded days");
});

test("attendance regularization status and Back restore without document navigation", async ({ page }) => {
  await open(page, "/ess/attendance", "Attendance");
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/attendance-regularizations")).json();
  const rejected = { ...base.items[0], id: "phase1a-rejected", status: "rejected", rejection_reason: "Correction evidence was insufficient." };
  await page.route("**/api/me/attendance-regularizations**", (route) => {
    const url = new URL(route.request().url());
    const status = url.searchParams.get("status") || "all";
    const requestedPage = Number(url.searchParams.get("page") || "1");
    const pageTwo = { ...rejected, id: "phase1a-rejected-page-2", rejection_reason: "Second correction page." };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: status === "rejected" ? [requestedPage === 1 ? rejected : pageTwo] : base.items, page: requestedPage, total_count: status === "rejected" ? 6 : base.total_count, has_next: status === "rejected" && requestedPage === 1, has_previous: requestedPage > 1, status_counts: { ...base.status_counts, rejected: 6 } }) });
  });
  await page.getByRole("navigation", { name: "Regularization status" }).getByRole("link", { name: /rejected/i }).click();
  await expect(page).toHaveURL(/status=rejected/);
  await expect(page.getByRole("table", { name: "Attendance regularization history" })).toContainText("Correction evidence was insufficient.");
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/reg_page=2/);
  await expect(page.getByRole("table", { name: "Attendance regularization history" })).toContainText("Second correction page.");
  await page.goBack({ waitUntil: "commit" });
  await expect(page).toHaveURL(/status=rejected/);
  await expect(page).not.toHaveURL(/reg_page=2/);
  await page.goBack({ waitUntil: "commit" });
  await expect(page).not.toHaveURL(/status=rejected/);
  await expect(page.getByRole("table", { name: "Attendance regularization history" })).toContainText("pending");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("leave filters, calendar state, and failed reads retain confirmed UI", async ({ page }) => {
  await open(page, "/ess/leave", "Leave");
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/leave-workspace")).json();
  await page.route("**/api/me/leave-workspace**", (route) => {
    const query = new URL(route.request().url()).searchParams;
    const empty = query.get("q") === "no-phase1a-match";
    const requestedPage = Number(query.get("page") || "1");
    const calendarDays = query.get("month") ? [{ date: `${query.get("month")}-08`, count: 1 }] : undefined;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, requests: { ...base.requests, items: empty ? [] : requestedPage === 1 ? base.requests.items : [base.requests.items[0]], total_count: empty ? 0 : 11, page: requestedPage, has_next: !empty && requestedPage === 1, has_previous: requestedPage > 1, calendar_days: calendarDays, filter_types: base.types.map((item: { code: string; name: string }) => ({ code: item.code, name: item.name })) } }) });
  });
  const form = page.getByRole("form", { name: "Leave history filters" });
  await form.getByRole("button", { name: "Apply filters" }).click();
  await form.getByLabel("Search leave history").fill("no-phase1a-match");
  await form.getByLabel("Type").selectOption("sick-leave");
  await form.getByLabel("Date period").selectOption("upcoming");
  await form.getByLabel("From date").fill("2026-11-01");
  await form.getByLabel("Through date").fill("2026-11-30");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=no-phase1a-match/);
  await expect(page).toHaveURL(/leave_type=sick-leave/);
  await expect(page).toHaveURL(/period=upcoming/);
  await expect(page.getByText("No leave requests match this view.")).toBeVisible();
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);

  await form.getByRole("link", { name: "Clear filters" }).click();
  await page.getByRole("link", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.getByRole("button", { name: "Show calendar" }).click();
  await expect(page.getByRole("region", { name: "Leave request calendar" })).toBeVisible();
  await page.getByRole("region", { name: "Leave request calendar" }).getByRole("link").click();
  await expect(page).toHaveURL(/day=.*-08/);

  await page.unroute("**/api/me/leave-workspace**");
  const confirmedUrl = page.url();
  await page.route("**/api/me/leave-workspace**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Leave filter failed." }) }));
  await form.getByLabel("Search leave history").fill("retained-draft");
  await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator('.notice[role="alert"]')).toContainText("Leave filter failed.");
  expect(page.url()).toBe(confirmedUrl);
  await expect(form.getByLabel("Search leave history")).toHaveValue("retained-draft");
  await expect(page.getByRole("table", { name: "Leave request history" })).toContainText("Casual Leave");
});

test("leave create reconciles history and entitlements without replacing the shell", async ({ page }) => {
  await open(page, "/ess/leave", "Leave");
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/leave-workspace")).json();
  const created = { ...base.requests.items[0], id: "phase1a-created-request", start_date: "2026-11-19", end_date: "2026-11-19", reason: "Phase 1A local create" };
  let saved = false;
  await page.route("**/api/me/leave-workspace**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ...base, state: "live", requests: { ...base.requests, items: saved ? [created, ...base.requests.items] : base.requests.items, total_count: base.requests.total_count + (saved ? 1 : 0) } }),
  }));
  const form = page.getByRole("form", { name: "Leave history filters" });
  await form.getByRole("button", { name: "Apply filters" }).click();
  await page.route("**/api/me/leave-requests", (route) => {
    saved = true;
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) });
  });
  await page.getByRole("button", { name: "Apply leave", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Apply leave", exact: true });
  await dialog.getByLabel("Start date", { exact: true }).fill("2026-11-19");
  await dialog.getByLabel("End date", { exact: true }).fill("2026-11-19");
  await dialog.getByLabel("Reason for leave").fill("Phase 1A local create");
  await dialog.getByRole("button", { name: "Submit leave", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Leave request submitted");
  await expect(page.getByRole("table", { name: "Leave request history" }).locator("tbody tr")).toHaveCount(3);
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});

test("leave withdrawal reconciles the row locally and prevents duplicate navigation", async ({ page }) => {
  await open(page, "/ess/leave", "Leave");
  const shell = await markLocalUpdateShell(page);
  const navigationCount = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/me/leave-workspace")).json();
  let withdrawn = false;
  const pending = base.requests.items[0];
  const updated = { ...pending, status: "withdrawn", can_withdraw: false, withdraw_block_reason: "This request is already withdrawn." };
  await page.route("**/api/me/leave-workspace**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ...base, state: "live", requests: { ...base.requests, items: [withdrawn ? updated : pending], total_count: 1 }, detail: null }),
  }));
  await page.getByRole("form", { name: "Leave history filters" }).getByRole("button", { name: "Apply filters" }).click();
  await page.route(`**/api/me/leave-requests/${pending.id}/withdraw/`, (route) => {
    withdrawn = true;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(updated) });
  });
  await page.getByRole("button", { name: /View Casual Leave/ }).click();
  const dialog = page.getByRole("dialog", { name: "Casual Leave" });
  await dialog.getByRole("button", { name: "Withdraw request", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Leave request history" })).toContainText("withdrawn");
  await expect(page.getByRole("status")).toContainText("Leave request updated");
  await expectLocalUpdateShell(shell);
  await expectNoDocumentNavigation(page, navigationCount);
});
