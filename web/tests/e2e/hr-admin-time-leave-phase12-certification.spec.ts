import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";

type RouteExpectation = {
  path: string;
  heading: string | RegExp;
  stripTitle: string | RegExp;
  visibleText: Array<string | RegExp>;
};

const timeLeaveConfigurationRoutes: RouteExpectation[] = [
  {
    path: "/hr-admin/leave-balances",
    heading: "Leave balances",
    stripTitle: "Leave balance ledger",
    visibleText: ["Tracked balances", "Pending reviews"],
  },
  {
    path: "/hr-admin/leave-policies",
    heading: "Leave policy admin for enforceable leave behavior.",
    stripTitle: "Leave policy configuration",
    visibleText: ["Policies", "Active policies"],
  },
  {
    path: "/hr-admin/attendance-policies",
    heading: "Attendance policies",
    stripTitle: "Attendance policy configuration",
    visibleText: ["Policies", "Active policies"],
  },
  {
    path: "/hr-admin/leave-types",
    heading: "Leave type admin for leave behavior building blocks.",
    stripTitle: "Leave type configuration",
    visibleText: ["Leave types", "Active types"],
  },
  {
    path: "/hr-admin/shifts",
    heading: "Shift admin for working-time setup.",
    stripTitle: "Shift master configuration",
    visibleText: ["Shift masters", "Active shifts"],
  },
  {
    path: "/hr-admin/shift-roster-templates",
    heading: "Shift roster templates for repeat rollout.",
    stripTitle: "Roster template rollout",
    visibleText: ["Roster templates", "Published or locked"],
  },
  {
    path: "/hr-admin/leave-policy-assignments",
    heading: "Leave policy assignments by scope.",
    stripTitle: "Leave assignment governance",
    visibleText: ["Assignments", "Active assignments"],
  },
  {
    path: "/hr-admin/attendance-policy-assignments",
    heading: "Attendance policy assignments by scope.",
    stripTitle: "Attendance assignment governance",
    visibleText: ["Assignments", "Active assignments"],
  },
  {
    path: "/hr-admin/employee-shift-assignments",
    heading: "Shift assignments",
    stripTitle: "Employee shift assignment governance",
    visibleText: ["Assignments", "Primary assignments"],
  },
];

async function gotoDemoHrAdmin(page: Page, path: string) {
  await page.context().addCookies([
    {
      name: "hrms_access_token",
      value: "playwright-demo-token",
      url: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
    },
  ]);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
  await suppressBrowserTestNoise(page);
}

async function expectTimeLeaveRoute(page: Page, route: RouteExpectation) {
  await gotoDemoHrAdmin(page, route.path);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${route.path.replaceAll("/", "\\/")}(\\?|$)`));
  await expect(page.locator(".time-leave-strip").first()).toBeVisible();
  await expect(page.locator(".time-leave-strip").getByRole("heading", { name: route.stripTitle })).toBeVisible();
  for (const text of route.visibleText) {
    await expect(page.locator("main").getByText(text).first(), `${route.path} should show ${String(text)}`).toBeVisible();
  }
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe("HR Admin time, leave, attendance phase 12 certification", () => {
  test("certifies the attendance operations hub routes to each intended workspace", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoDemoHrAdmin(page, "/hr-admin/attendance-operations");

    await expect(page.getByRole("heading", { level: 1, name: "Attendance operations" })).toBeVisible();
    await expect(page.locator(".time-leave-strip").getByRole("heading", { name: "Attendance operations command" })).toBeVisible();

    const expectedLinks = [
      ["/hr-admin/shifts", "Manage shifts"],
      ["/hr-admin/employee-shift-assignments", "Manage shift assignments"],
      ["/hr-admin/shift-roster-templates", "Manage roster templates"],
      ["/hr-admin/holiday-calendars", "Manage calendars"],
      ["/hr-admin/attendance-records", "Open records"],
      ["/hr-admin/attendance-regularizations", "Open regularizations"],
    ] as const;

    for (const [href, label] of expectedLinks) {
      await expect(page.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }

    await expect(page.locator(".time-leave-strip__link--active")).toContainText("Operations");
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies attendance records filters, empty state, and permission-safe bulk controls", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoDemoHrAdmin(page, "/hr-admin/attendance-records?page_size=10");

    const toolbar = page.getByTestId("attendance-records-toolbar");
    await expect(page.getByRole("heading", { level: 1, name: "Attendance records review window." })).toBeVisible();
    await expect(toolbar).toBeVisible();
    await expect(toolbar.getByRole("textbox", { name: "Search" })).toBeVisible();
    await expect(toolbar.getByRole("combobox", { name: "Status" })).toBeVisible();
    await expect(toolbar.getByRole("combobox", { name: "Source" })).toBeVisible();
    await expect(toolbar.getByRole("combobox", { name: "Lock state" })).toBeVisible();
    await expect(toolbar.getByRole("combobox", { name: "Regularization state" })).toBeVisible();

    await toolbar.getByPlaceholder("Employee, code, shift, source, date").fill("zz-no-attendance-records-phase12");
    await toolbar.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/attendance-records\?.*q=zz-no-attendance-records-phase12/);
    await expect(page.getByText("No attendance rows match the current filters.")).toBeVisible();

    const disabledBulkButtons = page.getByRole("button", { name: /Lock \(0\)|Unlock \(0\)|Set status \(0\)|Mark regularized|Clear regularized/i });
    const bulkCount = await disabledBulkButtons.count();
    for (let index = 0; index < bulkCount; index += 1) {
      await expect(disabledBulkButtons.nth(index)).toBeDisabled();
    }

    await toolbar.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-records$/);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies regularization queue filters, empty state, and review affordances", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await gotoDemoHrAdmin(page, "/hr-admin/attendance-regularizations?page_size=10");

    await expect(page.getByRole("heading", { level: 1, name: "Attendance regularization queue for HR oversight." })).toBeVisible();
    await expect(page.locator(".time-leave-strip").getByRole("heading", { name: "Attendance correction queue" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Search" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Request status" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Requested attendance status" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Current attendance status" })).toBeVisible();

    await page.getByPlaceholder("Employee, code, date, shift, reason").fill("zz-no-regularizations-phase12");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/attendance-regularizations\?.*q=zz-no-regularizations-phase12/);
    await expect(page.getByText("No regularizations match the current filters.")).toBeVisible();

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/hr-admin\/attendance-regularizations$/);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("certifies time and leave configuration pages use the shared enterprise pattern", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    for (const route of timeLeaveConfigurationRoutes) {
      await expectTimeLeaveRoute(page, route);
    }
  });

  test("certifies key time and leave pages remain usable at tablet width", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    for (const route of [
      { path: "/hr-admin/attendance-operations", heading: "Attendance operations", stripTitle: "Attendance operations command", visibleText: ["Open records", "Open regularizations"] },
      timeLeaveConfigurationRoutes[0],
      timeLeaveConfigurationRoutes[1],
      timeLeaveConfigurationRoutes[4],
      timeLeaveConfigurationRoutes[6],
    ]) {
      await expectTimeLeaveRoute(page, route);
    }
  });
});
