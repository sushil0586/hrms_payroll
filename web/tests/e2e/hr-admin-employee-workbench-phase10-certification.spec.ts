import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";

function directoryPanel(page: Page) {
  return page.locator(".queue-toolbar").filter({ has: page.getByRole("heading", { name: "Employee directory" }) }).first();
}

function detailPanel(page: Page) {
  return page.locator(".record-card").filter({ has: page.getByRole("heading", { name: "Employee master detail" }) }).first();
}

function directoryItems(page: Page) {
  return page.locator(".employee-directory-item");
}

function fieldByLabel(scope: Page | Locator, label: string) {
  return scope
    .locator("label.form-field")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("input, select, textarea")
    .first();
}

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

async function expectEmployeeWorkbenchReady(page: Page) {
  await expect(page.locator("main.hr-employee-workbench")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Employees" })).toBeVisible();
  await expect(page.getByText("Workforce command")).toBeVisible();
  await expect(page.getByText("Operational readiness")).toBeVisible();
  await expect(directoryPanel(page)).toBeVisible();
  await expect(detailPanel(page)).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

test.describe("HR Admin employee workbench phase 10 certification", () => {
  test("certifies directory search, filters, selection, permission-aware actions, and empty state", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoDemoHrAdmin(page, "/hr-admin/employees?page_size=5");
    await expectEmployeeWorkbenchReady(page);

    for (const metric of [
      "Employees in scope",
      "Active employees",
      "Access provisioned",
      "Departments represented",
      "Manager reviews",
    ]) {
      await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
    }

    const panel = directoryPanel(page);
    await expect(fieldByLabel(panel, "Search")).toBeVisible();
    await expect(fieldByLabel(panel, "Department")).toBeVisible();
    await expect(fieldByLabel(panel, "Manager review")).toBeVisible();
    await expect(fieldByLabel(panel, "Page size")).toBeVisible();
    await expect(panel.getByRole("button", { name: "Apply" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "Reset" })).toHaveAttribute("href", "/hr-admin/employees");

    for (const status of ["all", "active", "on notice", "inactive", "exited"]) {
      await expect(panel.locator(".employee-status-filter").getByRole("link", { name: new RegExp(`^${status}\\b`, "i") })).toBeVisible();
    }

    await expect(directoryItems(page)).toHaveCount(5);
    await directoryItems(page).first().click();
    await expect(page).toHaveURL(/employeeId=/);
    await expect(detailPanel(page).locator(".detail-row").filter({ hasText: "Access Provisioned" })).toBeVisible();
    await expect(detailPanel(page).locator(".detail-row").filter({ hasText: "Reporting Manager" })).toBeVisible();

    const actionsSummary = detailPanel(page).locator("details.action-menu summary").first();
    if (await actionsSummary.isVisible().catch(() => false)) {
      await actionsSummary.click();
      await expect(detailPanel(page).getByRole("link", { name: "Edit employee" })).toHaveAttribute("href", /\/hr-admin\/employees\/.+\/edit/);
      await expect(detailPanel(page).getByRole("link", { name: "Manage access" })).toHaveAttribute("href", /\/hr-admin\/employees\/.+\/access/);
      await expect(detailPanel(page).getByRole("link", { name: "Manage bank accounts" })).toHaveAttribute("href", /\/hr-admin\/employees\/.+\/bank-accounts/);
    } else {
      await expect(detailPanel(page).getByText("Focused detail for the selected employee.")).toBeVisible();
      await expect(page.getByRole("link", { name: "New employee" })).toHaveCount(0);
    }

    await gotoDemoHrAdmin(page, "/hr-admin/employees?q=NO_MATCH_EMPLOYEE_PHASE10&status=all&page_size=5");
    await expect(fieldByLabel(directoryPanel(page), "Search")).toHaveValue("NO_MATCH_EMPLOYEE_PHASE10");
    await expect(page.getByText("No employees in this view.")).toBeVisible();
    await expect(page.getByText("No employee selected.")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await expect(directoryPanel(page).getByRole("link", { name: "Reset" })).toHaveAttribute("href", "/hr-admin/employees");
    await gotoDemoHrAdmin(page, "/hr-admin/employees");
    await expectEmployeeWorkbenchReady(page);

    const employeeImport = page.getByTestId("employee-import-workbench");
    if (await employeeImport.isVisible().catch(() => false)) {
      await expect(employeeImport.getByRole("heading", { name: "Employee bulk import" })).toBeVisible();
      await expect(employeeImport.getByRole("link", { name: "Download template" })).toBeVisible();
      await expect(employeeImport.getByRole("button", { name: "Preview import" })).toBeVisible();
      await expect(employeeImport.getByRole("button", { name: "Commit ready rows" })).toBeDisabled();
    } else {
      await expect(employeeImport).toHaveCount(0);
    }

    const bankImport = page.getByTestId("employee-bank-import-workbench");
    if (await bankImport.isVisible().catch(() => false)) {
      await expect(bankImport.getByRole("heading", { name: "Employee bank import" })).toBeVisible();
      await expect(bankImport.getByRole("button", { name: "Preview bank import" })).toBeVisible();
      await expect(bankImport.getByRole("button", { name: "Commit ready bank rows" })).toBeDisabled();
    } else {
      await expect(bankImport).toHaveCount(0);
    }

    const managerImport = page.getByTestId("employee-manager-import-workbench");
    if (await managerImport.isVisible().catch(() => false)) {
      await expect(managerImport.getByRole("heading", { name: "Reporting manager import" })).toBeVisible();
      await expect(managerImport.getByRole("button", { name: "Preview manager import" })).toBeVisible();
      await expect(managerImport.getByRole("button", { name: "Commit ready manager rows" })).toBeDisabled();
    } else {
      await expect(managerImport).toHaveCount(0);
    }
  });

  test("certifies employee workbench responsive integrity at 1366px and tablet width", async ({ page }) => {
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 820, height: 1180 },
    ]) {
      await page.setViewportSize(viewport);
      await gotoDemoHrAdmin(page, "/hr-admin/employees?page_size=5");
      await expectEmployeeWorkbenchReady(page);
      await expect(directoryItems(page).first()).toBeVisible();
      await expect(fieldByLabel(directoryPanel(page), "Search")).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
});
