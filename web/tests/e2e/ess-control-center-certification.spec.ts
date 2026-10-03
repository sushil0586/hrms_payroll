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
    await expectPageReady(page, "My workspace");

    const controlCenter = page.getByTestId("ess-control-center");
    await expect(controlCenter).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's actions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();

    for (const signal of [
      "Leave requests",
      "Attendance fixes",
      "Payslips",
      "Tax declarations",
    ]) {
      await expect(controlCenter.getByText(signal, { exact: true }).first()).toBeVisible();
    }

    for (const action of [
      "Apply leave",
      "Regularize attendance",
      "Payslips",
      "Documents",
      "Tax declarations",
      "Notifications",
    ]) {
      await expect(page.getByRole("link", { name: action }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leave balances" })).toBeVisible();
    await expect(page.getByText("Manager", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Submit regularization" })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");
    await expect(page.getByTestId("ess-control-center")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Today's actions" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee can navigate every ESS workspace from the control center", async ({ page }) => {
    test.setTimeout(90 * 1000);
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, "My workspace");

    await expect(page.getByRole("link", { name: "Apply leave" }).first()).toHaveAttribute("href", /\/ess\/leave/);
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expect(page).toHaveURL(/\/ess\/leave/);
    await expectPageReady(page, "Leave");
    await expect(page.getByRole("heading", { name: "Submit leave request" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Leave requests" })).toBeVisible();
    await page.getByRole("button", { name: "Apply leave" }).click();
    await expect(page.getByRole("dialog", { name: "Apply leave" })).toBeVisible();
    await expect(page.getByLabel("Evidence file")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await gotoAuthenticated(page, "/ess", employee);
    await expect(page.getByRole("link", { name: "Regularize attendance" }).first()).toHaveAttribute("href", /\/ess\/attendance/);
    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expect(page).toHaveURL(/\/ess\/attendance/);
    await expectPageReady(page, "Attendance");
    await expect(page.getByRole("heading", { name: "Submit regularization" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Regularizations" })).toBeVisible();
    await page.getByRole("button", { name: "Regularize attendance" }).click();
    await expect(page.getByRole("dialog", { name: "Regularize attendance" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await gotoAuthenticated(page, "/ess", employee);
    await expect(page.getByRole("link", { name: "Payslips" }).first()).toHaveAttribute("href", /\/ess\/payslips/);
    await gotoAuthenticated(page, "/ess/payslips", employee);
    await expect(page).toHaveURL(/\/ess\/payslips/);
    await expectPageReady(page, "Payslips");
    await expect(page.getByRole("heading", { name: /Published payslips|No payslip published/i }).first()).toBeVisible();

    await gotoAuthenticated(page, "/ess", employee);
    await expect(page.getByRole("link", { name: "Documents" }).first()).toHaveAttribute("href", /\/ess\/documents/);
    await gotoAuthenticated(page, "/ess/documents", employee);
    await expect(page).toHaveURL(/\/ess\/documents/);
    await expectPageReady(page, "Documents");
    await expect(page.getByRole("heading", { name: /Document center|Required documents|Documents/i }).first()).toBeVisible();

    await gotoAuthenticated(page, "/ess", employee);
    await expect(page.getByRole("link", { name: "Tax declarations" }).first()).toHaveAttribute("href", /\/ess\/statutory-declarations/);
    await gotoAuthenticated(page, "/ess/statutory-declarations", employee);
    await expect(page).toHaveURL(/\/ess\/statutory-declarations/);
    await expectPageReady(page, "Statutory Declarations");
    await expect(page.getByRole("heading", { name: /Start declaration|Update declaration/ })).toBeVisible();

    await gotoAuthenticated(page, "/ess", employee);
    await expect(page.getByRole("link", { name: "Notifications" }).first()).toHaveAttribute("href", /\/ess\/notifications/);
    await gotoAuthenticated(page, "/ess/notifications", employee);
    await expect(page).toHaveURL(/\/ess\/notifications/);
    await expectPageReady(page, /Notifications|Employee notifications/i);
    await expect(page.getByRole("heading", { name: "Inbox filters" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("employee request forms expose clear validation before submission", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/leave", employee);
    await expectPageReady(page, "Leave");

    await page.getByRole("button", { name: "Apply leave" }).click();
    await expect(page.getByRole("dialog", { name: "Apply leave" })).toBeVisible();
    await expect(page.getByLabel("Leave type")).toBeVisible();
    await expect(page.getByLabel("Start date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(page.getByLabel("End date")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(page.getByLabel("Start day portion")).toHaveValue("full_day");
    await expect(page.getByLabel("End day portion")).toHaveValue("full_day");
    await expect(page.getByLabel("Evidence file")).toBeVisible();
    await expect(page.getByLabel("Evidence reference")).toBeVisible();
    await expect(page.getByLabel("Reason").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit leave" })).toBeVisible();

    await gotoAuthenticated(page, "/ess/attendance", employee);
    await expectPageReady(page, "Attendance");
    await page.getByRole("button", { name: "Regularize attendance" }).click();
    await expect(page.getByRole("dialog", { name: "Regularize attendance" })).toBeVisible();
    await expect(page.getByLabel("Attendance record")).toBeVisible();
    await expect(page.getByLabel("Requested status")).toBeVisible();
    await expect(page.getByLabel("Requested check-in")).toBeVisible();
    await expect(page.getByLabel("Requested check-out")).toBeVisible();
    await expect(page.getByLabel("Reason").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit regularization" })).toBeVisible();
  });

  test("employee document center exposes upload, requirement, filter, and download controls", async ({ page }) => {
    await gotoAuthenticated(page, "/ess/documents", employee);
    await expectPageReady(page, "Documents");

    for (const metric of ["Required documents", "Missing now", "Expiring soon", "Expired"]) {
      await expect(page.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Required documents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Before sending a file" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Upload required document" })).toHaveCount(0);
    const uploadButton = page.getByRole("button", { name: "Upload document" }).first();
    if (await uploadButton.isEnabled().catch(() => false)) {
      await uploadButton.click();
      const uploadDialog = page.getByRole("dialog", { name: "Upload document" });
      await expect(uploadDialog).toBeVisible();
      for (const label of ["Category", "Title", "Document number", "Issued on", "Expires on", "File"]) {
        await expect(uploadDialog.getByLabel(label).first(), `${label} should be available in the upload dialog`).toBeVisible();
      }
      await uploadDialog.getByRole("button", { name: "Close" }).click();
    } else {
      await expect(uploadButton).toBeDisabled();
    }

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
      const loginResponse = await page.request.post("/api/auth/login", {
        data: { identifier: persona.username, password: persona.password },
      });
      if (!loginResponse.ok()) {
        test.info().annotations.push({
          type: "skipped-persona",
          description: `${label} persona ${persona.username} is not available in this local tenant.`,
        });
        continue;
      }
      await page.request.post("/api/auth/logout").catch(() => null);
      await page.context().clearCookies();

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
