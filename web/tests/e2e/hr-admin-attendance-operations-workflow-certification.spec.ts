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
  test.describe.configure({ mode: "serial", timeout: 180_000 });

  test("attendance operations hub and record workbench support navigation, filters, bulk retry, edit failure, and mobile layout", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoAuthenticated(page, "/hr-admin/attendance-operations", hrAdmin);
    await expectPageReady(page, "Attendance operations");

    for (const [name, href] of [
      ["Manage shifts", "/hr-admin/shifts"],
      ["Manage shift assignments", "/hr-admin/employee-shift-assignments"],
      ["Manage roster templates", "/hr-admin/shift-roster-templates"],
      ["Manage calendars", "/hr-admin/holiday-calendars"],
      ["Open records", "/hr-admin/attendance-records"],
      ["Open regularizations", "/hr-admin/attendance-regularizations"],
    ] as const) {
      await expect(page.getByRole("link", { name })).toHaveAttribute("href", href);
    }

    await gotoAuthenticated(page, "/hr-admin/attendance-records?page_size=10", hrAdmin);
    await expectPageReady(page, "Attendance records");
    const toolbar = page.getByTestId("attendance-records-toolbar");
    for (const label of ["Search", "Status", "Source", "Lock state", "Regularization state", "Rows per page", "Late-only focus"]) {
      await expect(field(toolbar, label)).toBeVisible();
    }

    await field(toolbar, "Search").fill("no-attendance-row-should-match-this");
    await toolbar.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-records\?.*q=no-attendance-row-should-match-this/);
    await expect(page.getByText("No attendance rows match the current filters.")).toBeVisible();
    await toolbar.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-records$/);
    await expectPageReady(page, "Attendance records");

    const selectPage = page.getByRole("button", { name: "Select page" }).first();
    if (await selectPage.isEnabled().catch(() => false)) {
      await selectPage.click();
      await expectActionFailureThenSuccess(
        page,
        "**/api/hr-admin/attendance-records/bulk-actions",
        async () => {
          await page.getByRole("button", { name: /Lock \([1-9]/ }).first().click();
        },
        "Attendance bulk action service is temporarily unavailable.",
        async () => {
          await expect(page.getByText("Attendance bulk action service is temporarily unavailable.")).toHaveCount(0);
          await expect(page.getByText("0 selected").first()).toBeVisible();
        },
        { updated_count: 1, skipped_count: 0 },
      );
    }

    const editLink = page.getByRole("link", { name: "Edit record" }).first();
    if (await editLink.isVisible().catch(() => false)) {
      await editLink.click();
      await expectPageReady(page, "Edit attendance record");
      await expect(page.getByRole("heading", { name: "Attendance interpretation" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Operational state" })).toBeVisible();
      await field(page, "Notes").fill(`Playwright attendance edit failure ${Date.now()}`);

      await page.route("**/api/hr-admin/attendance-records/*", async (route) => {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Attendance record save is temporarily unavailable." }),
        });
      });
      await page.getByRole("button", { name: "Save attendance record" }).click();
      await expect(page.getByText("Save failed.")).toBeVisible();
      await expect(page.getByText("Attendance record save is temporarily unavailable.")).toBeVisible();
      await page.unroute("**/api/hr-admin/attendance-records/*");
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

    for (const label of ["Search", "Request status", "Requested attendance status", "Current attendance status", "Rows per page"]) {
      await expect(field(page, label)).toBeVisible();
    }
    await field(page, "Search").fill("no-regularization-should-match-this");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-regularizations\?.*q=no-regularization-should-match-this/);
    await expect(page.getByText("No regularizations match the current filters.")).toBeVisible();
    await page.getByRole("button", { name: "Clear filters" }).click();
    await expectPageReady(page, "Regularizations");
    const visibleRegularizationCards = page.locator("article.record-card").filter({ has: page.locator(".record-chip") });
    if (await visibleRegularizationCards.count()) {
      await expect(visibleRegularizationCards.first().getByText(/Pending approval from|Approved|Rejected|Approval track/i).first()).toBeVisible();
      await expect(visibleRegularizationCards.first().getByText(/approval steps|Approval track/i).first()).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Shift inspector" })).toBeVisible();

    await page.getByRole("button", { name: "Inspect resolution" }).click();
    await expect(page.getByText("Choose both an employee and a start date to inspect resolved shift coverage.")).toBeVisible();

    const employeeId = await selectFirstAvailableOption(field(page, "Employee"));
    test.skip(!employeeId, "No employee options are available for shift resolution certification.");
    await field(page, "Start date").fill("2026-10-06");
    await expectActionFailureThenSuccess(
      page,
      "**/api/hr-admin/employee-shift-assignments/resolve",
      async () => {
        await page.getByRole("button", { name: "Inspect resolution" }).click();
      },
      "Shift resolution service is temporarily unavailable.",
      async () => {
        await expect(page.getByText("Playwright Shift")).toBeVisible();
        await expect(page.getByText("Resolved by Playwright.")).toBeVisible();
      },
      {
        has_resolution: true,
        employee_id: employeeId,
        employee_name: "Playwright Employee",
        attendance_date: "2026-10-06",
        end_date: null,
        shift_id: "playwright-shift",
        shift_name: "Playwright Shift",
        assignment_id: "playwright-assignment",
        assignment_kind: "employee_override",
        scope_labels: ["Employee override"],
        sequence_summary: null,
        sequence: [],
        summary: "Resolved by Playwright.",
      },
    );

    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates", hrAdmin);
    await expectPageReady(page, "Roster templates");
    await expect(page.getByRole("heading", { name: "Roster rollout" })).toBeVisible();

    await page.getByRole("button", { name: "Preview rollout" }).click();
    await expect(page.getByText(/Choose a roster template and an effective start date first|Choose employees directly or target a department for rollout/)).toBeVisible();

    const templateId = await selectFirstAvailableOption(field(page, "Roster template"));
    test.skip(!templateId, "No roster templates are available for rollout certification.");
    await field(page, "Effective from").fill("2026-10-06");
    const targetEmployeeId = await selectFirstAvailableOption(field(page, "Target employees"));
    const departmentId = targetEmployeeId ? "" : await selectFirstAvailableOption(field(page, "Department scope"));
    test.skip(!targetEmployeeId && !departmentId, "No employee or department targets are available for roster rollout certification.");

    await expectActionFailureThenSuccess(
      page,
      "**/api/hr-admin/shift-roster-templates/rollout",
      async () => {
        await page.getByRole("button", { name: "Preview rollout" }).click();
      },
      "Roster rollout service is temporarily unavailable.",
      async () => {
        await expect(page.getByText("Preview ready.")).toBeVisible();
        await expect(page.getByText("Playwright Employee")).toBeVisible();
      },
      {
        rollout_id: null,
        template_id: templateId,
        template_name: "Playwright Roster",
        target_count: 1,
        created_count: 0,
        skipped_count: 0,
        has_blocking_conflicts: false,
        summary: "Preview ready.",
        items: [
          {
            employee_id: targetEmployeeId || "playwright-employee",
            employee_name: "Playwright Employee",
            employee_code: "PW-ATT",
            status: "ready",
            reason: "Preview only.",
            assignment_id: null,
          },
        ],
      },
    );

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
      page.request.post("/api/hr-admin/employee-shift-assignments/resolve", {
        data: { employee_id: "00000000-0000-4000-8000-000000000000", attendance_date: "2026-10-06" },
      }),
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
      expect([401, 403, 404, 405]).toContain(response.status());
      const body = await response.text();
      expect(body).not.toMatch(/Traceback|SECRET_KEY|DATABASE_URL|password/i);
    }
  });
});
