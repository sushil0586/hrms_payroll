import { expect, type Locator, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow } from "../helpers/assertions";
import { gotoDemoHrAdmin } from "../helpers/hr-admin-ui-audit";

function directoryPanel(page: Page) {
  return page.locator(".queue-toolbar").filter({ has: page.getByRole("heading", { name: "Employee directory" }) }).first();
}

function detailPanel(page: Page) {
  return page.locator(".record-card").filter({ has: page.getByRole("heading", { name: "Employee master detail" }) }).first();
}

function directoryItems(page: Page) {
  return page.locator(".employee-directory-table tbody tr");
}

function directoryItemLinks(page: Page) {
  return page.locator(".employee-directory-table__identity");
}

function fieldByLabel(scope: Page | Locator, label: string) {
  return scope
    .locator("label.form-field")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("input, select, textarea")
    .first();
}

async function expectEmployeeWorkbenchReady(page: Page) {
  await expect(page.locator("main.shell")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Employees" })).toBeVisible();
  const summary = page.locator(".hr-employee-summary-strip");
  await expect(summary.getByText("employees", { exact: true })).toBeVisible();
  await expect(summary.getByText("access provisioned", { exact: true })).toBeVisible();
  await expect(summary.getByText("need review", { exact: true })).toBeVisible();
  await expect(directoryPanel(page)).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}

async function expectDirectoryAndDetailDoNotOverlap(page: Page) {
  const directoryBox = await directoryPanel(page).boundingBox();
  const detailBox = await detailPanel(page).boundingBox();
  expect(directoryBox).not.toBeNull();
  expect(detailBox).not.toBeNull();
  if (!directoryBox || !detailBox) {
    return;
  }

  const hasVerticalSeparation = directoryBox.y + directoryBox.height <= detailBox.y || detailBox.y + detailBox.height <= directoryBox.y;
  const hasHorizontalSeparation = directoryBox.x + directoryBox.width <= detailBox.x || detailBox.x + detailBox.width <= directoryBox.x;
  expect(hasVerticalSeparation || hasHorizontalSeparation).toBe(true);
}

async function expectDirectoryFiltersStayInsidePanel(page: Page) {
  const panel = directoryPanel(page);
  const panelBox = await panel.boundingBox();
  expect(panelBox).not.toBeNull();
  if (!panelBox) {
    return;
  }

  const controls = panel.locator(".directory-filter-bar input:not([type='hidden']), .directory-filter-bar select, .directory-filter-bar button, .directory-filter-bar a.button");
  const count = await controls.count();
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible().catch(() => false))) {
      continue;
    }
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    if (!box) {
      continue;
    }
    expect(box.x, "Filter control should not escape left edge").toBeGreaterThanOrEqual(panelBox.x - 1);
    expect(box.x + box.width, "Filter control should not escape right edge").toBeLessThanOrEqual(panelBox.x + panelBox.width + 1);
  }
}

test.describe("HR Admin employee workbench phase 10 certification", () => {
  test("certifies directory search, filters, selection, permission-aware actions, and empty state", async ({ page }) => {
    test.setTimeout(120_000);

    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoDemoHrAdmin(page, "/hr-admin/employees?page_size=5");
    await expectEmployeeWorkbenchReady(page);

    await expect(page.locator(".hr-employee-summary-strip")).toBeVisible();
    await expect(page.locator(".hr-employee-summary-strip").getByText("employees")).toBeVisible();
    await expect(page.locator(".hr-employee-summary-strip").getByText("access provisioned")).toBeVisible();
    await expect(page.locator(".hr-employee-summary-strip").getByText("need review")).toBeVisible();

    const panel = directoryPanel(page);
    await expect(fieldByLabel(panel, "Search")).toBeVisible();
    await expect(fieldByLabel(panel, "Department")).toBeVisible();
    await expect(fieldByLabel(panel, "Status")).toBeVisible();
    await panel.locator(".directory-more-filters summary").click();
    await expect(fieldByLabel(panel, "Manager review")).toBeVisible();
    await expect(fieldByLabel(panel, "Readiness")).toBeVisible();
    await expect(panel.locator(".directory-filter-bar").getByRole("button", { name: "Apply" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "Reset" })).toHaveAttribute("href", "/hr-admin/employees");
    await expectDirectoryFiltersStayInsidePanel(page);

    for (const status of ["all", "active", "on notice", "inactive", "exited"]) {
      await expect(panel.locator(".employee-status-filter").getByRole("link", { name: new RegExp(`^${status}\\b`, "i") })).toBeVisible();
    }

    await expect(directoryItems(page)).toHaveCount(5);
    const firstEmployeeHref = await directoryItemLinks(page).first().getAttribute("href");
    expect(firstEmployeeHref, "Employee directory item should expose a selectable detail route").toMatch(/employeeId=/);
    await page.goto(firstEmployeeHref!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/employeeId=/);
    await expect(detailPanel(page)).toBeVisible();
    await expect(detailPanel(page).locator(".detail-row").filter({ hasText: "Work email" })).toBeVisible();
    await expect(detailPanel(page).getByText("Structure", { exact: true })).toBeVisible();

    const actionsButton = detailPanel(page).getByRole("button", { name: "Actions" }).first();
    if (await actionsButton.isVisible().catch(() => false)) {
      await actionsButton.click();
      await expect(page.getByRole("link", { name: "Edit employee" })).toHaveAttribute("href", /action=edit/);
      await expect(page.getByRole("link", { name: "Manage access" })).toHaveAttribute("href", /action=access/);
      await expect(page.getByRole("link", { name: "Manage bank accounts" })).toHaveAttribute("href", /action=bank/);
    } else {
      await expect(detailPanel(page)).toBeVisible();
    }

    await page.goto("/hr-admin/employees?q=NO_MATCH_EMPLOYEE_PHASE10&status=all&page_size=5", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page).toHaveURL(/NO_MATCH_EMPLOYEE_PHASE10/);
    await expect(fieldByLabel(directoryPanel(page), "Search")).toHaveValue("NO_MATCH_EMPLOYEE_PHASE10");
    await expect(page.getByText("No employees in this view.")).toBeVisible();
    await expect(detailPanel(page)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    await expect(directoryPanel(page).getByRole("link", { name: "Reset" })).toHaveAttribute("href", "/hr-admin/employees");
    await gotoDemoHrAdmin(page, "/hr-admin/employees");
    await expectEmployeeWorkbenchReady(page);

    const importsDisclosure = page.locator(".employee-imports-disclosure").first();
    const employeeImport = page.getByTestId("employee-import-workbench");
    const bankImport = page.getByTestId("employee-bank-import-workbench");
    const managerImport = page.getByTestId("employee-manager-import-workbench");

    if (await importsDisclosure.isVisible().catch(() => false)) {
      await expect(importsDisclosure).toContainText("Bulk imports");
      await expect(importsDisclosure).toContainText("Open only when loading employees, bank accounts, or manager mappings from CSV.");
      if (await employeeImport.count()) {
        await expect(employeeImport).toBeHidden();
      }
      if (await bankImport.count()) {
        await expect(bankImport).toBeHidden();
      }
      if (await managerImport.count()) {
        await expect(managerImport).toBeHidden();
      }

      await importsDisclosure.getByText("Open tools").click();
    }

    if (await employeeImport.isVisible().catch(() => false)) {
      await expect(employeeImport.getByRole("heading", { name: "Employee bulk import" })).toBeVisible();
      await expect(employeeImport.getByRole("link", { name: "Download template" })).toBeVisible();
      await expect(employeeImport.getByRole("button", { name: "Preview import" })).toBeVisible();
      await expect(employeeImport.getByRole("button", { name: "Commit ready rows" })).toBeDisabled();
    } else {
      await expect(employeeImport).toHaveCount(0);
    }

    if (await bankImport.isVisible().catch(() => false)) {
      await expect(bankImport.getByRole("heading", { name: "Employee bank import" })).toBeVisible();
      await expect(bankImport.getByRole("button", { name: "Preview bank import" })).toBeVisible();
      await expect(bankImport.getByRole("button", { name: "Commit ready bank rows" })).toBeDisabled();
    } else {
      await expect(bankImport).toHaveCount(0);
    }

    if (await managerImport.isVisible().catch(() => false)) {
      await expect(managerImport.getByRole("heading", { name: "Reporting manager import" })).toBeVisible();
      await expect(managerImport.getByRole("button", { name: "Preview manager import" })).toBeVisible();
      await expect(managerImport.getByRole("button", { name: "Commit ready manager rows" })).toBeDisabled();
    } else {
      await expect(managerImport).toHaveCount(0);
    }
  });

  test("certifies employee workbench responsive integrity at wide desktop and tablet widths", async ({ page }) => {
    test.setTimeout(90_000);

    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 1366, height: 900 },
      { width: 820, height: 1180 },
    ]) {
      await page.setViewportSize(viewport);
      await gotoDemoHrAdmin(page, "/hr-admin/employees?page_size=5");
      await expectEmployeeWorkbenchReady(page);
      await expect(directoryItemLinks(page).first()).toBeVisible();
      await expect(fieldByLabel(directoryPanel(page), "Search")).toBeVisible();
      const selectedHref = await directoryItemLinks(page).first().getAttribute("href");
      expect(selectedHref).toMatch(/employeeId=/);
      await page.goto(selectedHref!, { waitUntil: "domcontentloaded" });
      await expect(detailPanel(page)).toBeVisible();
      await expectDirectoryAndDetailDoNotOverlap(page);
      await expectDirectoryFiltersStayInsidePanel(page);
      await expectNoHorizontalOverflow(page);
    }
  });
});
