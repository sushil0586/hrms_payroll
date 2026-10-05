import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { expectDialogStable } from "../helpers/modal-stability";
import { employee, gotoAuthenticated, manager, platformAdmin, supportAgent, type Persona } from "../helpers/staging-auth";

async function expectManagerActionControls(page: Page) {
  await expect(page.getByText("Decision note").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Approve request|Approve cancellation/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Reject request|Reject cancellation/ }).first()).toBeVisible();
}

test.describe("Manager self service dashboard certification", () => {
  test("shows team queues, decision shortcuts, and payroll-impact signals without layout overflow", async ({ page }) => {
    await gotoAuthenticated(page, "/mss", manager);
    await expectPageReady(page, "Manager dashboard");

    const controlCenter = page.getByTestId("mss-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: /No manager decisions pending|Decisions need review|Team signals need a quick look/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What to review next" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Coverage context" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your ESS" })).toBeVisible();

    for (const signal of [
      "Leave approvals",
      "Attendance regularizations",
      "Today exceptions",
      "Team on leave",
    ]) {
      await expect(controlCenter.getByText(signal, { exact: true })).toBeVisible();
    }

    for (const action of [
      "Inbox",
      "Review leave",
      "Review attendance",
      "Open exceptions",
      "View leave context",
      "Open ESS",
      "Payslips",
      "Documents",
      "Tax",
    ]) {
      await expect(page.getByRole("link", { name: action }).first()).toBeVisible();
    }

    await expect(page.getByText("Manager inbox", { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/mss", manager);
    await expectPageReady(page, "Manager dashboard");
    await expect(page.getByTestId("mss-control-center")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("manager can use leave and attendance approval queues with focused review modals", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/approvals", manager);
    await expectPageReady(page, "Manager approvals");

    for (const metric of ["Team members", "Leave approvals", "Regularizations", "Exceptions today"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Approval views" })).toBeVisible();
    const queueTabs = page.locator(".tabbar");
    await expect(queueTabs.getByRole("link", { name: /Leave/ })).toBeVisible();
    await expect(queueTabs.getByRole("link", { name: /Attendance/ })).toBeVisible();
    await expect(queueTabs.getByRole("link", { name: /History/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pending leave requests" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selected leave request" })).toBeVisible();
    await expect(page.getByText(/Open the full decision dialog|No leave approval selected/).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();
    const leaveReview = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).first();
    if (await leaveReview.isVisible().catch(() => false)) {
      await leaveReview.click();
      await expect(page.getByRole("dialog", { name: "Leave approval review" })).toBeVisible();
      await expectManagerActionControls(page);
      await expectDialogStable(page, "Leave approval review");
      await page.getByRole("button", { name: "Close leave approval review" }).click();
    }

    await queueTabs.getByRole("link", { name: /Attendance/ }).click();
    await expect(page).toHaveURL(/\/mss\/approvals\?.*queue=attendance/);
    await expectPageReady(page, "Manager approvals");
    await expect(page.getByRole("heading", { name: "Attendance approvals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pending attendance fixes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selected attendance request" })).toBeVisible();
    await expect(page.getByText(/Open the full decision dialog|No regularization selected/).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();
    const attendanceReview = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).first();
    if (await attendanceReview.isVisible().catch(() => false)) {
      await attendanceReview.click();
      await expect(page.getByRole("dialog", { name: "Attendance approval review" })).toBeVisible();
      await expectManagerActionControls(page);
      await expectDialogStable(page, "Attendance approval review");
      await page.getByRole("button", { name: "Close attendance approval review" }).click();
    }

    await queueTabs.getByRole("link", { name: /History/ }).click();
    await expect(page).toHaveURL(/\/mss\/approvals\?.*queue=history/);
    await expectPageReady(page, "Manager approvals");
    await expect(page.getByRole("heading", { name: "Decision history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Completed decisions" })).toBeVisible();
    await expect(page.getByText("No completed manager decisions are available yet.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("approval review dialog remains stable on compact screens", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/mss/approvals?queue=leave", manager);
    await expectPageReady(page, "Manager approvals");

    const reviewButton = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).first();
    if (!(await reviewButton.isVisible().catch(() => false))) {
      await expect(page.getByText(/No pending leave approvals|No leave approval selected/).first()).toBeVisible();
      return;
    }

    await reviewButton.click();
    await expectManagerActionControls(page);
    await expectDialogStable(page, "Leave approval review");
  });

  test("manager decision panel handles success and validation errors without mutating staging rows", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/approvals?queue=leave", manager);
    await expectPageReady(page, "Manager approvals");

    const reviewButton = page.locator(".mss-selected-review-band").getByRole("button", { name: "Review" }).first();
    if (!(await reviewButton.isVisible().catch(() => false))) {
      await expect(page.getByText(/No pending leave approvals|No leave approval selected/).first()).toBeVisible();
      return;
    }
    await reviewButton.click();
    const dialog = page.getByRole("dialog", { name: "Leave approval review" });
    await expect(dialog).toBeVisible();

    const approveButton = dialog.getByRole("button", { name: /Approve request|Approve cancellation/ }).first();
    if (!(await approveButton.isEnabled().catch(() => false))) {
      await expect(dialog.getByText(/This request is already resolved|Decision is disabled/).first()).toBeVisible();
      return;
    }

    await page.route("**/api/manager/leave-requests/*/approve", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({ status: "approved", source: "playwright-intercepted" }),
      });
    });
    await dialog.getByLabel("Decision note").fill("MGR-95 intercepted approval proof.");
    await approveButton.click();
    await expect(dialog.getByText("Action saved.").first()).toBeVisible();
    await expect(dialog.getByText(/Request approved|Cancellation request approved/).first()).toBeVisible();
    await page.unroute("**/api/manager/leave-requests/*/approve");

    await page.route("**/api/manager/leave-requests/*/reject", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 400,
        body: JSON.stringify({ comment: ["Decision note is required for rejection."] }),
      });
    });
    await dialog.getByRole("button", { name: /Reject request|Reject cancellation/ }).first().click();
    await expect(dialog.getByText("Action failed.").first()).toBeVisible();
    await expect(dialog.getByText("Decision note is required for rejection.").first()).toBeVisible();
    await page.unroute("**/api/manager/leave-requests/*/reject");
  });

  test("manager can open notification center and cross-link back to approvals", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/notifications", manager);
    await expectPageReady(page, "Manager notifications");

    for (const metric of ["Notifications", "Unread on page", "High priority", "Failed on page"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }
    const main = page.getByRole("main");
    const filterSearch = main.getByRole("textbox", { name: "Search" });
    await expect(main.getByText("Manager alerts", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alert filters" })).toBeVisible();
    await expect(filterSearch).toBeVisible();
    await expect(main.getByLabel("Status")).toBeVisible();
    await expect(main.getByLabel("Channel")).toBeVisible();
    await expect(main.getByLabel("Priority")).toBeVisible();
    await expect(main.getByLabel("Subject type")).toBeVisible();
    await expect(main.getByLabel("Rows per page")).toBeVisible();
    await expect(main.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team alert list" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Selected alert" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Approvals", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Decision history" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ESS inbox" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /Search|search/i }).first()).toBeVisible();
    await expect(page.getByText(/Notifications|notification/i).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await filterSearch.fill("no-manager-notification-should-match-this");
    await main.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/mss\/notifications\?.*q=no-manager-notification-should-match-this/);
    await expect(page.getByText("No notifications match the current filters.")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/mss\/notifications\/?$/);
    await expect(page.getByRole("heading", { name: "Manager notifications" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team alert list" })).toBeVisible();

    const readToggle = page.getByRole("button", { name: /Mark read|Mark unread/ }).first();
    if (await readToggle.isVisible().catch(() => false)) {
      await expect(readToggle).toBeVisible();
    }
    const openSource = page.getByRole("link", { name: "Open source" }).first();
    if (await openSource.isVisible().catch(() => false)) {
      await expect(openSource).toHaveAttribute("href", /\/mss\/approvals|\/hr-admin\/employee-documents|\/hr-admin\/payroll-outputs/);
    }

    await page.getByRole("main").getByRole("link", { name: "Approvals", exact: true }).click();
    await expect(page).toHaveURL(/\/mss\/approvals/);
    await expectPageReady(page, "Manager approvals");
  });

  test("manager notification read endpoint is scoped and handles intercepted success", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/notifications", manager);
    await expectPageReady(page, "Manager notifications");

    const reviewButton = page.getByRole("button", { name: "Review notification" }).first();
    if (!(await reviewButton.isVisible().catch(() => false))) {
      await expect(page.getByText(/No notifications match|No notification selected/).first()).toBeVisible();
      return;
    }

    await reviewButton.click();
    await expect(page.getByRole("dialog", { name: /Notification detail/ })).toBeVisible();

    const readToggle = page.getByRole("button", { name: /Mark read|Mark unread/ }).first();
    if (!(await readToggle.isVisible().catch(() => false))) {
      await expect(page.getByRole("dialog", { name: /Notification detail/ })).toBeVisible();
      return;
    }

    const readUpdate = page.waitForRequest((request) =>
      request.url().includes("/api/manager/notifications/") && request.method() === "PATCH",
    );
    await page.route("**/api/manager/notifications/*", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({ status: "read", source: "playwright-intercepted" }),
      });
    });
    await readToggle.click();
    await readUpdate;
    await expect(page.getByText("Unable to update read state.")).toHaveCount(0);
    await page.unroute("**/api/manager/notifications/*");
  });

  test("non-manager roles cannot use manager workspace or manager decision APIs", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await page.goto("/mss", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByRole("heading", { name: "Manager dashboard" })).toHaveCount(0);

    for (const [label, persona] of [
      ["employee", employee],
      ["platform admin", platformAdmin],
      ["support agent", supportAgent],
    ] as Array<[string, Persona]>) {
      await page.request.post("/api/auth/logout").catch(() => null);
      await page.context().clearCookies();
      const login = await page.request.post("/api/auth/login", {
        data: { identifier: persona.username, password: persona.password },
      });
      if (!login.ok()) {
        continue;
      }
      for (const path of [
        "/api/manager/leave-requests/00000000-0000-4000-8000-000000000000/approve",
        "/api/manager/leave-requests/00000000-0000-4000-8000-000000000000/reject",
        "/api/manager/attendance-regularizations/00000000-0000-4000-8000-000000000000/approve",
        "/api/manager/attendance-regularizations/00000000-0000-4000-8000-000000000000/reject",
        "/api/manager/notifications/00000000-0000-4000-8000-000000000000",
      ]) {
        const response = path.includes("/notifications/")
          ? await page.request.patch(path, { data: { read_at: new Date().toISOString() } })
          : await page.request.post(path, { data: { comment: `Denied ${label}` } });
        expect([401, 403, 404, 405], `${label} ${path} should fail closed`).toContain(response.status());
        const body = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
        for (const forbidden of ["password", "secret", "token", "salary_snapshot"]) {
          expect(body, `${label} denial should not leak ${forbidden}`).not.toContain(forbidden);
        }
      }
    }
  });
});
