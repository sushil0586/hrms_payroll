import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { employee, hrAdmin, manager, type Persona } from "../helpers/staging-auth";

type BrowserRoute = {
  path: string;
  heading: string | RegExp;
  visibleText?: Array<string | RegExp>;
};

const demoFallbackPattern = /demo .*mode|seeded demo data|web preview is running in demo mode/i;

const hrAdminSectionRoutes: BrowserRoute[] = [
  { path: "/hr-admin", heading: "HR Control Center" },
  { path: "/hr-admin/organization", heading: "Organization masters" },
  { path: "/hr-admin/employees", heading: "Employees" },
  { path: "/hr-admin/policies", heading: "Policy control" },
  { path: "/hr-admin/attendance-operations", heading: "Attendance operations" },
  { path: "/hr-admin/documents", heading: "Documents control" },
  { path: "/hr-admin/workflows", heading: "Workflow control" },
  { path: "/hr-admin/lifecycle", heading: "Lifecycle" },
  { path: "/hr-admin/notifications", heading: "Notification queue" },
  { path: "/hr-admin/reports", heading: "Reports" },
];

const timeLeaveAttendanceRoutes: BrowserRoute[] = [
  { path: "/hr-admin/leave-types", heading: "Leave types", visibleText: ["Leave type configuration"] },
  { path: "/hr-admin/leave-policies", heading: "Leave policies", visibleText: ["Leave policy configuration"] },
  { path: "/hr-admin/leave-policy-assignments", heading: "Leave assignments", visibleText: ["Leave assignment governance"] },
  { path: "/hr-admin/leave-balances", heading: "Leave balances", visibleText: ["Leave balance ledger"] },
  { path: "/hr-admin/shifts", heading: "Shifts", visibleText: ["Shift master configuration"] },
  { path: "/hr-admin/holiday-calendars", heading: "Holiday calendars", visibleText: ["Holiday"] },
  { path: "/hr-admin/attendance-policies", heading: "Attendance policies", visibleText: ["Attendance policy configuration"] },
  { path: "/hr-admin/attendance-policy-assignments", heading: "Attendance assignments", visibleText: ["Attendance assignment governance"] },
  { path: "/hr-admin/attendance-records", heading: "Attendance records", visibleText: ["Attendance records workbench"] },
  { path: "/hr-admin/attendance-regularizations", heading: "Regularizations", visibleText: ["Attendance correction queue"] },
];

async function loginThroughBrowser(page: Page, persona: Persona) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await expect(page.getByLabel("Username or email")).toBeVisible();
  await page.getByLabel("Username or email").fill(persona.username);
  await page.getByLabel("Password").fill(persona.password);
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST",
    { timeout: 15_000 },
  );
  await page.getByLabel("Password").press("Enter");
  const loginResponse = await loginResponsePromise;
  const loginPayload = await loginResponse.json().catch(() => ({}));
  expect(
    loginResponse.ok(),
    `Browser login failed for ${persona.username} with status ${loginResponse.status()}: ${JSON.stringify(loginPayload)}`,
  ).toBeTruthy();
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
}

async function openAs(page: Page, persona: Persona, path: string) {
  await loginThroughBrowser(page, persona);
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  await suppressBrowserTestNoise(page);
}

async function expectLiveBrowserPage(page: Page, route: BrowserRoute) {
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: route.heading }).first()).toBeVisible();
  for (const text of route.visibleText ?? []) {
    await expect(page.locator("main").getByText(text).first(), `${route.path} should show ${String(text)}`).toBeVisible();
  }
  await expect(page.getByText(demoFallbackPattern)).toHaveCount(0);
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

async function firstSelectOptionText(selectLocator: Locator) {
  return selectLocator.evaluate((element) => {
    const select = element as HTMLSelectElement;
    const selected = select.options[select.selectedIndex];
    return selected?.textContent?.trim() ?? "";
  });
}

test.describe("HR Admin browser workflow gate", () => {
  test.skip(!process.env.HRMS_API_BASE_URL, "HR Admin browser workflow gate requires a live HRMS API.");
  test.setTimeout(180_000);

  test("loads every HR Admin workflow section through browser login", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await openAs(page, hrAdmin, "/hr-admin");

    for (const route of hrAdminSectionRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await suppressBrowserTestNoise(page);
      await expectLiveBrowserPage(page, route);
    }
  });

  test("loads leave and attendance setup workspaces through browser login", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await openAs(page, hrAdmin, "/hr-admin/leave-types");

    for (const route of timeLeaveAttendanceRoutes) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await suppressBrowserTestNoise(page);
      await expectLiveBrowserPage(page, route);
    }
  });

  test("employee ESS shows mapped leave balances and attendance records through browser", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await openAs(page, employee, "/ess/leave");
    await expectLiveBrowserPage(page, {
      path: "/ess/leave",
      heading: "Leave",
      visibleText: ["Leave balances"],
    });
    await expect(page.getByText("No leave balances are mapped yet.")).toHaveCount(0);

    await page.goto("/ess/attendance", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await suppressBrowserTestNoise(page);
    await expectLiveBrowserPage(page, {
      path: "/ess/attendance",
      heading: "Attendance",
      visibleText: ["Today", "Monthly summary", "Regularizations"],
    });

    await page.getByRole("button", { name: "Regularize attendance" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Regularize attendance" });
    await expect(dialog).toBeVisible();
    const recordSelect = dialog.locator("label.form-field").filter({ hasText: "Attendance record" }).locator("select");
    await expect(recordSelect).toBeVisible();
    await expect(dialog.getByText("No attendance record available.")).toHaveCount(0);
    await expect(dialog.getByText("HR needs to create attendance records before you can request a correction.")).toHaveCount(0);
    await expect.poll(async () => firstSelectOptionText(recordSelect)).not.toMatch(/No attendance records available/i);
  });

  test("manager approval workspace is reachable through browser login", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await openAs(page, manager, "/mss/approvals");
    await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: /Approvals|Manager/i }).first()).toBeVisible();
    await expect(page.getByText(demoFallbackPattern)).toHaveCount(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });
});
