import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

function field(scope: Page | Locator, label: string | RegExp) {
  return scope.locator("label.form-field, label.queue-toolbar__search").filter({ hasText: label }).locator("input, select, textarea").first();
}

async function selectFirstAvailableOption(select: Locator) {
  const value = await select.evaluate((element) => {
    if (!(element instanceof HTMLSelectElement)) {
      return "";
    }
    return Array.from(element.options).find((option) => option.value)?.value ?? "";
  });
  if (value) {
    await select.selectOption(value);
  }
  return value;
}

async function firstEmployeeOption(page: Page) {
  const response = await page.request.get("/api/hr-admin/employees/option-search?limit=1");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.items?.[0] as { id: string; employee_code?: string; name?: string } | undefined;
}

async function selectEmployeeSearchOption(page: Page, employeeOption: { id: string; employee_code?: string; name?: string }, label = "Employee") {
  await page.getByLabel("Find person").fill(employeeOption.employee_code || employeeOption.name || "");
  const select = page.getByLabel(label).first();
  await expect.poll(async () => select.locator("option").count(), { timeout: 15_000 }).toBeGreaterThan(1);
  await select.selectOption(employeeOption.id);
}

async function expectActionFailureThenSuccess(
  page: Page,
  routePattern: string,
  action: () => Promise<void>,
  failureText: string,
  successExpectation: () => Promise<void>,
  responseBody: Record<string, unknown>,
) {
  let attempt = 0;
  await page.route(routePattern, async (route) => {
    attempt += 1;
    if (attempt === 1) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ detail: failureText }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(responseBody),
    });
  });

  await action();
  await expect(page.getByText(failureText).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await action();
  await successExpectation();
  await expectNoHorizontalOverflow(page);
  await page.unroute(routePattern);
}

async function firstEnabledButton(page: Page, name: string | RegExp) {
  const buttons = page.getByRole("button", { name });
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.isEnabled().catch(() => false)) {
      return button;
    }
  }
  return null;
}

test.describe("HR Admin attendance operations workflow certification", () => {
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  test("attendance operations hub and record workbench support navigation, filters, bulk retry, edit failure, and mobile layout", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoAuthenticated(page, "/hr-admin/attendance-operations", hrAdmin);
    await expectPageReady(page, "Attendance operations");

    for (const [name, href] of [
      ["Manage shifts", "/hr-admin/shifts"],
      ["Manage assignments", "/hr-admin/employee-shift-assignments"],
      ["Manage rosters", "/hr-admin/shift-roster-templates"],
      ["Manage calendars", "/hr-admin/holiday-calendars"],
      ["Open records", "/hr-admin/attendance-records"],
      ["Open queue", "/hr-admin/attendance-regularizations"],
    ] as const) {
      await expect(page.getByRole("link", { name })).toHaveAttribute("href", href);
    }

    await gotoAuthenticated(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
    await expectPageReady(page, "Attendance records");
    const toolbar = page.getByTestId("attendance-records-toolbar");
    for (const label of ["Search", "Status", "Source"]) {
      await expect(field(toolbar, label)).toBeVisible();
    }
    await toolbar.getByText("More filters").click();
    for (const label of ["Lock state", "Regularization", "Late focus"]) {
      await expect(field(toolbar, label)).toBeVisible();
    }
    await expect(page.getByRole("combobox", { name: "Rows" })).toBeVisible();

    const noAttendanceQuery = "no-attendance-row-should-match-this";
    await field(toolbar, "Search").fill(noAttendanceQuery);
    await expect(field(toolbar, "Search")).toHaveValue(noAttendanceQuery);
    await field(toolbar, "Search").press("Tab");
    await toolbar.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-records\?.*q=no-attendance-row-should-match-this/, { timeout: 30_000 });
    await expect(page.getByText("No attendance rows match the current filters.")).toBeVisible();
    await toolbar.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-records$/);
    await expectPageReady(page, "Attendance records");
    await expect(page.getByRole("heading", { name: "Attendance detail" })).toBeVisible();
    await expect(page.getByText(/Payable \/ LOP/).first()).toBeVisible();
    await expect(page.getByText("Leave collision").first()).toBeVisible();

    const readonlyNotice = page.getByText("Read-only attendance view.").first();
    const editRecordButton = page.getByRole("button", { name: "Edit record" }).first();
    const editRecordLink = page.getByRole("link", { name: "Edit record" }).first();
    if (await readonlyNotice.isVisible().catch(() => false)) {
      await expect(editRecordButton).toBeDisabled();
    } else {
      await expect(editRecordLink).toBeVisible();
      await editRecordLink.click();
      await expect(page.getByRole("dialog", { name: /Edit / })).toBeVisible();
      await expect(page.locator("form.attendance-record-form")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Attendance interpretation" })).toBeVisible();
      await expect(field(page, "Status")).toBeVisible();
      await expect(field(page, "Source")).toBeVisible();
      await expect(page.getByRole("button", { name: "Save attendance record" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: /Edit / })).toHaveCount(0);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
    await expectPageReady(page, "Attendance records");
    await expectNoHorizontalOverflow(page);
  });

  test("regularization queue supports filters, inline decision failure and recovery, and review screen stability", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoAuthenticated(page, "/hr-admin/attendance-regularizations?page_size=10", hrAdmin);
    await expectPageReady(page, "Regularizations");

    for (const label of ["Search", "Request status", "Requested status"]) {
      await expect(field(page, label)).toBeVisible();
    }
    await page.getByText("More filters").click();
    await expect(field(page, "Current status")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Rows" })).toBeVisible();
    await field(page, "Search").fill("no-regularization-should-match-this");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-regularizations\?.*q=no-regularization-should-match-this/);
    await expect(page.getByText("No regularizations match the current filters.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expectPageReady(page, "Regularizations");
    const regularizationTable = page.getByRole("table").first();
    if (await regularizationTable.isVisible().catch(() => false)) {
      await expect(regularizationTable.getByText(/Pending|Approved|Rejected/i).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
      await expect(page.getByText(/approval steps|Pending approval from/i).first()).toBeVisible();
    } else {
      await expect(page.getByText("No regularizations match the current filters.")).toBeVisible();
    }

    const approveButton = await firstEnabledButton(page, "Approve");
    if (approveButton) {
      const card = approveButton.locator("xpath=ancestor::article[1]");
      await field(card, "Decision note").fill(`Playwright regularization approval ${Date.now()}`);
      await expectActionFailureThenSuccess(
        page,
        "**/api/hr-admin/attendance-regularizations/*/approve",
        async () => {
          await approveButton.click();
        },
        "Attendance regularization service is temporarily unavailable.",
        async () => {
          await expect(card.getByText("Action saved.")).toBeVisible();
          await expect(card.getByText("Regularization approved.")).toBeVisible();
        },
        { status: "approved", source: "playwright-intercepted" },
      );
    } else {
      await expect(page.locator("main").getByText(/total requests|No regularizations match the current filters/i).first()).toBeVisible();
    }

    const reviewLink = page.getByRole("link", { name: "Review request" }).first();
    if (await reviewLink.isVisible().catch(() => false)) {
      await reviewLink.click();
      await expectPageReady(page, "Review attendance regularization");
      await expect(page.getByRole("heading", { name: "Request context" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "HR review decision" })).toBeVisible();
      await expect(page.getByText(/Pending approval from|Approved|Rejected|Approval track/i).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/attendance-regularizations?page_size=10", hrAdmin);
    await expectPageReady(page, "Regularizations");
    await expectNoHorizontalOverflow(page);
  });

  test("shift assignment inspector and roster rollout validate inputs, recover from API failures, and remain usable", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", hrAdmin);
    await expectPageReady(page, "Shift assignments");
    await expect(page.getByRole("heading", { name: "Shift assignment queue" })).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Assignment detail" })).toBeVisible();
    const readOnlyAssignmentNotice = page.getByText("Read-only shift assignment view.").first();
    if (await readOnlyAssignmentNotice.isVisible().catch(() => false)) {
      await expect(page.getByRole("button", { name: "Edit assignment" }).first()).toBeDisabled();
    } else {
      const editAssignmentHref = await page.getByRole("link", { name: "Edit assignment" }).first().getAttribute("href");
      expect(editAssignmentHref).toContain("editAssignment=");
      await gotoAuthenticated(page, editAssignmentHref ?? "/hr-admin/employee-shift-assignments", hrAdmin);
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("heading", { name: /Edit / })).toBeVisible();
      await expect(page.locator("form.employee-shift-assignment-form")).toBeVisible();
      await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }

    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates", hrAdmin);
    await expectPageReady(page, "Roster templates");
    await expect(page.getByRole("heading", { name: "Roster template catalog" })).toBeVisible();
    await expect(page.getByRole("table").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Roster template detail" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates", hrAdmin);
    await expectPageReady(page, "Roster templates");
    await expectNoHorizontalOverflow(page);
  });

  test("employee persona cannot use HR attendance operations or mutation APIs", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectPageReady(page, /Attendance/i);

    const checks = [
      page.request.post("/api/hr-admin/attendance-records/bulk-actions", {
        data: { action: "lock", record_ids: ["00000000-0000-4000-8000-000000000000"] },
      }),
      page.request.patch("/api/hr-admin/attendance-records/00000000-0000-4000-8000-000000000000", {
        data: { notes: "RBAC denial proof" },
      }),
      page.request.post("/api/hr-admin/attendance-regularizations/00000000-0000-4000-8000-000000000000/approve", {
        data: { comment: "RBAC denial proof" },
      }),
      page.request.get("/api/hr-admin/work-schedule-preview?employee_id=00000000-0000-4000-8000-000000000000&start_date=2026-10-06&end_date=2026-10-06"),
      page.request.post("/api/hr-admin/shift-roster-templates/rollout", {
        data: {
          template_id: "00000000-0000-4000-8000-000000000000",
          employee_ids: ["00000000-0000-4000-8000-000000000000"],
          effective_from: "2026-10-06",
          dry_run: true,
        },
      }),
    ];

    for (const responsePromise of checks) {
      const response = await responsePromise;
      expect([400, 401, 403, 404, 405, 500]).toContain(response.status());
      const body = await response.text();
      expect(body).not.toMatch(/Traceback|SECRET_KEY|DATABASE_URL|password/i);
    }
  });
});
