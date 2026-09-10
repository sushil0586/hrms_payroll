import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

function directoryPanel(page: Page) {
  return page.locator(".queue-toolbar").filter({ has: page.getByRole("heading", { name: "Employee directory" }) }).first();
}

function detailPanel(page: Page) {
  return page.locator(".record-card").filter({ has: page.getByRole("heading", { name: "Employee master detail" }) }).first();
}

function directoryItems(page: Page) {
  return page.locator(".employee-directory-item");
}

function pagination(page: Page) {
  return directoryPanel(page).locator(".pagination-bar");
}

function fieldByLabel(scope: Page | Locator, label: string) {
  const control = scope
    .locator("label.form-field")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("input, select, textarea")
    .first();
  return control;
}

async function expectFieldByLabel(scope: Page | Locator, label: string) {
  const control = fieldByLabel(scope, label);
  await expect(control, `${label} should be visible`).toBeVisible();
  return control;
}

async function expectDirectoryPageCertified(page: Page) {
  await expectPageReady(page, "Employees");
  await expect(page.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/hr-admin");
  await expect(page.getByRole("link", { name: "New employee" })).toHaveAttribute("href", "/hr-admin/employees/new");

  for (const metric of [
    "Employees in scope",
    "Active employees",
    "Access provisioned",
    "Departments represented",
    "Managers in reporting chain",
  ]) {
    await expect(page.locator(".metric-tile, .metric-tile-soft").filter({ hasText: metric }).first()).toBeVisible();
  }

  const panel = directoryPanel(page);
  await expect(panel).toBeVisible();
  await expectFieldByLabel(panel, "Search");
  await expectFieldByLabel(panel, "Department");
  await expectFieldByLabel(panel, "Manager review");
  await expectFieldByLabel(panel, "Page size");
  await expect(panel.getByRole("button", { name: "Apply" })).toBeVisible();
  await expect(panel.getByRole("link", { name: "Reset" })).toHaveAttribute("href", "/hr-admin/employees");

  for (const status of ["all", "active", "on notice", "inactive", "exited"]) {
    await expect(
      panel.locator(".employee-status-filter").getByRole("link", { name: new RegExp(`^${status}\\b`, "i") }),
    ).toBeVisible();
  }

  await expect(pagination(page)).toBeVisible();
  await expect(pagination(page).getByRole("button", { name: "First" }).or(pagination(page).getByRole("link", { name: "First" }))).toBeVisible();
  await expect(pagination(page).getByRole("button", { name: "Previous" }).or(pagination(page).getByRole("link", { name: "Previous" }))).toBeVisible();
  await expect(pagination(page).getByRole("button", { name: "Next" }).or(pagination(page).getByRole("link", { name: "Next" }))).toBeVisible();
  await expect(pagination(page).getByRole("button", { name: "Last" }).or(pagination(page).getByRole("link", { name: "Last" }))).toBeVisible();

  await expect(detailPanel(page)).toBeVisible();
  for (const label of [
    "Employee",
    "Preferred Name",
    "Employment Status",
    "Date of Joining",
    "Legal Entity",
    "Branch",
    "Location",
    "Business Unit",
    "Department",
    "Cost Center",
    "Designation",
    "Grade",
    "Employment Type",
    "Reporting Manager",
    "Access Provisioned",
    "Membership Status",
    "Assigned Roles",
  ]) {
    await expect(detailPanel(page).locator(".detail-row").filter({ hasText: label }).first()).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
}

test.describe("Certification: HR admin employee directory", () => {
  test("directory controls, pagination, selection, detail, actions, and empty state are certified", async ({ page }) => {
    test.setTimeout(180_000);

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5");
    await expectDirectoryPageCertified(page);
    await expect(directoryItems(page)).toHaveCount(5);

    const firstEmployeeText = (await directoryItems(page).first().innerText()).trim();
    expect(firstEmployeeText).toMatch(/Access provisioned|No access yet/);
    expect(firstEmployeeText).toMatch(/direct reports/);

    const next = pagination(page).getByRole("link", { name: "Next" });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await expect(page).toHaveURL(/page=2/);
      await expect(directoryItems(page).first()).toBeVisible();
      await expect(directoryItems(page).count()).resolves.toBeLessThanOrEqual(5);
    }

    await directoryItems(page).first().click();
    await expect(page).toHaveURL(/employeeId=/);
    await expect(detailPanel(page).getByText(/Access Provisioned/)).toBeVisible();

    const actionsSummary = detailPanel(page).locator("details.action-menu summary").first();
    await expect(actionsSummary).toBeVisible();
    await actionsSummary.click();
    await expect(detailPanel(page).getByRole("link", { name: "Edit employee" })).toHaveAttribute("href", /\/hr-admin\/employees\/.+\/edit/);
    await expect(detailPanel(page).getByRole("link", { name: "Manage access" })).toHaveAttribute("href", /\/hr-admin\/employees\/.+\/access/);
    await expect(detailPanel(page).getByRole("link", { name: "Manage bank accounts" })).toHaveAttribute("href", /\/hr-admin\/employees\/.+\/bank-accounts/);

    await gotoAuthenticated(page, "/hr-admin/employees?page_size=5");
    await fieldByLabel(directoryPanel(page), "Search").fill("NO_MATCH_EMPLOYEE_CERTIFICATION_VALUE");
    await Promise.all([
      page.waitForURL((url) => url.searchParams.get("q") === "NO_MATCH_EMPLOYEE_CERTIFICATION_VALUE"),
      directoryPanel(page).getByRole("button", { name: "Apply" }).click(),
    ]);
    await expect(page.getByText("No employees in this view.")).toBeVisible();
    await expect(page.getByText("No employee selected.")).toBeVisible();
    await expect(pagination(page).getByText("0-0")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await Promise.all([
      page.waitForURL((url) => url.pathname === "/hr-admin/employees" && !url.search),
      directoryPanel(page).getByRole("link", { name: "Reset" }).click(),
    ]);
    await expect(page).toHaveURL(/\/hr-admin\/employees$/);
    await expectDirectoryPageCertified(page);
  });
});
