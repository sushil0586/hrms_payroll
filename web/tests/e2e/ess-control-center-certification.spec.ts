import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import {
  employee,
  gotoAuthenticated,
  payrollFinanceManager,
  platformAdmin,
  supportAgent,
  type Persona,
} from "../helpers/staging-auth";

test.describe("Employee self service control center certification", () => {
  test("shows personal priorities, shortcuts, and request workspace without layout overflow", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");

    const controlCenter = page.getByTestId("ess-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's priorities" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Self-service shortcuts" })).toBeVisible();

    for (const signal of [
      "Leave requests",
      "Attendance fixes",
      "Payslips",
      "Tax declarations",
    ]) {
      await expect(controlCenter.getByText(signal, { exact: true }).first()).toBeVisible();
    }

    for (const action of [
      "Review leave",
      "Review attendance",
      "Open payslips",
      "Open tax",
      "New request",
      "Documents",
      "Notifications",
    ]) {
      await expect(page.getByRole("link", { name: action }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Profile snapshot" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Attendance today" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave balances" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submit regularization" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave request history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave request detail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regularization history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
    await expect(page.getByText("Reporting manager:", { exact: false }).first()).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();
    await expect(page.locator(".pagination-bar").nth(1)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");
    await expect(page.getByTestId("ess-control-center")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee can navigate every ESS workspace from the control center", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");

    await page.getByRole("link", { name: "Payslips" }).first().click();
    await expect(page).toHaveURL(/\/ess\/payslips/);
    await expectPageReady(page, "Payslips");
    await expect(page.getByRole("heading", { name: /My payslips|Payslip register|No payslip selected/i }).first()).toBeVisible();

    await gotoAuthenticated(page, "/ess", employee);
    await page.getByRole("link", { name: "Documents" }).first().click();
    await expect(page).toHaveURL(/\/ess\/documents/);
    await expectPageReady(page, "Documents");
    await expect(page.getByRole("heading", { name: /Document center|Required documents|Documents/i }).first()).toBeVisible();

    await gotoAuthenticated(page, "/ess", employee);
    await page.getByRole("link", { name: /Tax declarations|Open tax/ }).first().click();
    await expect(page).toHaveURL(/\/ess\/statutory-declarations/);
    await expectPageReady(page, "Statutory Declarations");
    await expect(page.getByRole("heading", { name: "Start declaration" })).toBeVisible();

    await gotoAuthenticated(page, "/ess", employee);
    await page.getByRole("link", { name: "Notifications" }).first().click();
    await expect(page).toHaveURL(/\/ess\/notifications/);
    await expectPageReady(page, /Notifications|Employee notifications/i);
    await expect(page.getByRole("heading", { name: "Inbox filters" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee request forms expose clear validation before submission", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "Self service");

    await expect(page.getByLabel("Leave type")).toBeVisible();
    await expect(page.getByLabel("Start date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(page.getByLabel("End date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(page.getByLabel("Start day portion")).toHaveValue("full_day");
    await expect(page.getByLabel("End day portion")).toHaveValue("full_day");
    await expect(page.getByLabel("Attachment reference")).toBeVisible();
    await expect(page.getByLabel("Reason").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit leave" })).toBeVisible();

    await expect(page.getByLabel("Attendance record")).toBeVisible();
    await expect(page.getByLabel("Requested status")).toBeVisible();
    await expect(page.getByLabel("Requested check-in")).toBeVisible();
    await expect(page.getByLabel("Requested check-out")).toBeVisible();
    await expect(page.getByLabel("Reason").nth(1)).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit regularization" })).toBeVisible();
  });

  test("employee document center exposes upload, requirement, filter, and download controls", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/documents", employee);
    await expectPageReady(page, "Documents");

    for (const metric of ["Required documents", "Missing now", "Expiring soon", "Expired"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Upload required document" })).toBeVisible();
    for (const label of ["Category", "Title", "Document number", "Issued on", "Expires on", "File"]) {
      await expect(page.getByLabel(label).first(), `${label} should be available in ESS documents`).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Upload document" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Document history" })).toBeVisible();
    for (const label of ["Search", "Verification", "Category", "Expiry focus", "Rows per page"]) {
      await expect(page.getByLabel(label).last(), `${label} filter should be available`).toBeVisible();
    }
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear filters" })).toBeVisible();
    await expect(page.locator(".pagination-bar").first()).toBeVisible();

    const download = page.getByRole("link", { name: "Download" }).first();
    if (await download.isVisible().catch(() => false)) {
      await expect(download).toHaveAttribute("href", /\/api\/me\/employee-documents\/.+\/download/);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("employee notification center supports filters, empty state, source links, and read updates", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/notifications", employee);
    await expectPageReady(page, "Notifications");

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
    await expect(page.locator(".pagination-bar").first()).toBeVisible();

    await filterSearch.fill("no-ess-notification-should-match-this");
    await main.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL(/\/ess\/notifications\?.*q=no-ess-notification-should-match-this/);
    await expect(page.getByText("No notifications match the current filters.")).toBeVisible();
    await main.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/ess\/notifications\/?$/);
    await expect(page.getByRole("heading", { name: "Inbox list" })).toBeVisible();

    const openSource = page.getByRole("link", { name: "Open source" }).first();
    if (await openSource.isVisible().catch(() => false)) {
      await expect(openSource).toHaveAttribute("href", /\/ess|\/ess\/documents|\/ess\/payslips/);
    }

    const readToggle = page.getByRole("button", { name: /Mark read|Mark unread/ }).first();
    if (await readToggle.isVisible().catch(() => false)) {
      await expect(readToggle).toBeEnabled();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("cross-role personal API checks fail closed without leaking sensitive fields", async ({ page }) => {
    for (const [label, persona, landingPath] of [
      ["platform admin", platformAdmin, "/platform-admin"],
      ["payroll finance manager", payrollFinanceManager, "/finance-manager"],
      ["support agent", supportAgent, "/support"],
    ] as Array<[string, Persona, string]>) {
      await gotoAuthenticated(page, landingPath, persona);
      await page.goto("/ess", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await expect(page.getByText(/application error|unhandled runtime error/i)).toHaveCount(0);

      for (const [method, path, data] of [
        ["post", "/api/me/leave-requests", { reason: `Denied ${label}` }],
        ["post", "/api/me/attendance-regularizations", { reason: `Denied ${label}` }],
        ["patch", "/api/me/notifications/00000000-0000-4000-8000-000000000000", { read_at: new Date().toISOString() }],
        ["get", "/api/me/payroll-payslips/00000000-0000-4000-8000-000000000000/download", {}],
      ] as Array<["get" | "post" | "patch", string, Record<string, string>]>) {
        const response = method === "post"
          ? await page.request.post(path, { data })
          : method === "patch"
            ? await page.request.patch(path, { data })
            : await page.request.get(path);
        expect([400, 401, 403, 404, 405], `${label} ${method.toUpperCase()} ${path} should fail closed or validate safely`).toContain(response.status());
        const body = JSON.stringify(await response.json().catch(() => ({}))).toLowerCase();
        for (const forbidden of ["password", "secret", "token", "salary_snapshot"]) {
          expect(body, `${label} denial should not leak ${forbidden}`).not.toContain(forbidden);
        }
      }
    }
  });
});
