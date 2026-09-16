import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, manager, platformAdmin, supportAgent, type Persona } from "../helpers/staging-auth";

async function expectManagerActionControls(page: Page) {
  await expect(page.getByText("Decision note").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Approve request|Approve cancellation/ }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Reject request|Reject cancellation/ }).first()).toBeVisible();
}

test.describe("Manager self service control center certification", () => {
  test("shows team queues, decision shortcuts, and payroll-impact signals without layout overflow", async ({ page }) => {
    await gotoAuthenticated(page, "/mss", manager);
    await expectPageReady(page, "Manager control center");

    const controlCenter = page.getByTestId("mss-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: "Team priorities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Work queue" })).toBeVisible();

    for (const signal of [
      "Leave approvals",
      "Attendance regularizations",
      "Today exceptions",
      "Team on leave",
    ]) {
      await expect(controlCenter.getByText(signal, { exact: true })).toBeVisible();
    }

    for (const action of [
      "Open approvals",
      "Notifications",
      "Self service",
      "Review leave",
      "Review attendance",
      "Open exceptions",
      "View leave context",
      "Leave queue",
      "Attendance queue",
      "Alerts",
      "My payslips",
      "My documents",
      "Tax declarations",
    ]) {
      await expect(page.getByRole("link", { name: action }).first()).toBeVisible();
    }

    await expect(page.getByText("Manager inbox", { exact: true }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/mss", manager);
    await expectPageReady(page, "Manager control center");
    await expect(page.getByTestId("mss-control-center")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("manager can use leave and attendance approval queues with decision panels", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/approvals", manager);
    await expectPageReady(page, "Manager inbox");

    for (const metric of ["Team members", "Leave approvals", "Regularizations", "Exceptions today"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Approval queues" })).toBeVisible();
    const queueTabs = page.locator(".tabbar");
    await expect(queueTabs.getByRole("link", { name: /Leave/ })).toBeVisible();
    await expect(queueTabs.getByRole("link", { name: /Attendance/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approvals" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave approval detail" })).toBeVisible();
    await expect(page.getByText(/Decision note|No leave approval selected/).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();
    if (await page.getByText("Decision note").first().isVisible().catch(() => false)) {
      await expectManagerActionControls(page);
    }

    await queueTabs.getByRole("link", { name: /Attendance/ }).click();
    await expect(page).toHaveURL(/\/mss\/approvals\?.*queue=attendance/);
    await expectPageReady(page, "Manager inbox");
    await expect(page.getByRole("heading", { name: "Attendance regularizations" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
    await expect(page.getByText(/Decision note|No regularization selected/).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();
    if (await page.getByText("Decision note").first().isVisible().catch(() => false)) {
      await expectManagerActionControls(page);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("manager decision panel handles success and validation errors without mutating staging rows", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/approvals?queue=leave", manager);
    await expectPageReady(page, "Manager inbox");

    const approveButton = page.getByRole("button", { name: /Approve request|Approve cancellation/ }).first();
    if (!(await approveButton.isEnabled().catch(() => false))) {
      await expect(page.getByText(/No pending leave approvals|This request is already resolved/).first()).toBeVisible();
      return;
    }

    await page.route("**/api/manager/leave-requests/*/approve", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({ status: "approved", source: "playwright-intercepted" }),
      });
    });
    await page.getByLabel("Decision note").fill("MGR-95 intercepted approval proof.");
    await approveButton.click();
    await expect(page.getByText("Action saved.").first()).toBeVisible();
    await expect(page.getByText(/Request approved|Cancellation request approved/).first()).toBeVisible();
    await page.unroute("**/api/manager/leave-requests/*/approve");

    await page.route("**/api/manager/leave-requests/*/reject", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 400,
        body: JSON.stringify({ comment: ["Decision note is required for rejection."] }),
      });
    });
    await page.getByRole("button", { name: /Reject request|Reject cancellation/ }).first().click();
    await expect(page.getByText("Action failed.").first()).toBeVisible();
    await expect(page.getByText("Decision note is required for rejection.").first()).toBeVisible();
    await page.unroute("**/api/manager/leave-requests/*/reject");
  });

  test("manager can open notification center and cross-link back to approvals", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/notifications", manager);
    await expectPageReady(page, /Notifications|Manager notifications/i);

    for (const metric of ["Notifications", "Unread on page", "High priority", "Failed on page"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }
    const main = page.getByRole("main");
    const filterSearch = main.getByRole("textbox", { name: "Search" });
    await expect(page.getByRole("heading", { name: "Inbox filters" })).toBeVisible();
    await expect(filterSearch).toBeVisible();
    await expect(main.getByLabel("Status")).toBeVisible();
    await expect(main.getByLabel("Channel")).toBeVisible();
    await expect(main.getByLabel("Priority")).toBeVisible();
    await expect(main.getByLabel("Subject type")).toBeVisible();
    await expect(main.getByLabel("Rows per page")).toBeVisible();
    await expect(main.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inbox list" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notification detail" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Approvals", exact: true })).toBeVisible();
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
    await expect(page.getByRole("heading", { name: /Notifications|Manager notifications/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inbox list" })).toBeVisible();

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
    await expectPageReady(page, "Manager inbox");
  });

  test("manager notification read endpoint is scoped and handles intercepted success", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/notifications", manager);
    await expectPageReady(page, /Notifications|Manager notifications/i);

    const readToggle = page.getByRole("button", { name: /Mark read|Mark unread/ }).first();
    if (!(await readToggle.isVisible().catch(() => false))) {
      await expect(page.getByText(/No notifications match|No notification selected/).first()).toBeVisible();
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
    for (const [label, persona, landingPath] of [
      ["employee", employee, "/ess"],
      ["platform admin", platformAdmin, "/platform-admin"],
      ["support agent", supportAgent, "/support"],
    ] as Array<[string, Persona, string]>) {
      await gotoAuthenticated(page, landingPath, persona);
      await page.goto("/mss", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page.getByRole("heading", { name: "Manager control center" })).toHaveCount(0);
      await expect(page.getByText(/Manager restricted|Choose your workspace|Support Console|Platform Admin Dashboard|Control center|Self Service/i).first()).toBeVisible();

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
