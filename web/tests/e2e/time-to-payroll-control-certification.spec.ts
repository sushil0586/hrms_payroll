import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

test.describe("Phase 8 time to payroll control certification", () => {
  test("HR admin can review roster-to-payroll control journey and drill into evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/time-to-payroll", hrAdmin);
    await expectPageReady(page, "Time to Payroll Control");

    const control = page.getByTestId("time-to-payroll-control");
    await expect(control).toBeVisible();

    for (const metric of ["Journey status", "Payroll findings", "Attendance exceptions", "Post-lock impacts"]) {
      await expect(control.locator(".metric-tile").filter({ hasText: metric }).first()).toBeVisible();
    }

    await expect(control.getByRole("heading", { name: "Close readiness starter" })).toBeVisible();
    await expect(control.getByTestId("time-to-payroll-readiness-grid").locator(".payroll-input-source-card")).toHaveCount(5);
    await expect(control.getByText(/No roster rollout evidence is available yet|rollout runs available for audit/)).toBeVisible();

    const journeyGrid = control.getByTestId("time-to-payroll-journey-grid");
    for (const stage of ["Roster", "Leave", "Attendance", "Payroll Inputs", "Arrears"]) {
      await expect(journeyGrid.locator(".payroll-input-source-card").filter({ hasText: stage }).first()).toBeVisible();
    }

    await expect(control.getByLabel("Roster clearance details")).toContainText("Clearance");
    await expect(control.getByLabel("Leave clearance details")).toContainText("Action");
    await expect(control.getByLabel("Attendance clearance details")).toContainText(/Ready for|exceptions|regularizations/);
    await expect(control.getByLabel("Payroll Inputs clearance details")).toContainText(/payroll input lock|payroll review/);
    await expect(control.getByLabel("Arrears clearance details")).toContainText(/close sign-off|arrear action/);

    for (const link of ["Roster audit", "Collision report", "Derivation report", "Input report", "Adjustment report"]) {
      await expect(control.getByRole("link", { name: link }).first()).toBeVisible();
    }

    await expect(control.getByRole("heading", { name: "Next action" })).toBeVisible();
    await expect(control.getByText("Clearance plan")).toBeVisible();
    await expect(control.locator(".payroll-rule-source-card").filter({ hasText: "Clearance plan" })).toContainText(/Ready for|must be cleared|should be cleared|block payroll input lock|Accepted candidates/);
    await expect(control.getByText("Evidence links")).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await control.getByRole("link", { name: "Input report" }).first().click();
    await expect(page).toHaveURL(/\/hr-admin\/reports\/payroll-input-exceptions/);
    await expectPageReady(page, "Payroll Input Exceptions Report");
  });

  test("employee cannot access time to payroll control", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expectPageReady(page, /My workspace|Manager approvals/);

    await page.goto("/hr-admin/time-to-payroll", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await expect(page.getByTestId("time-to-payroll-control")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /My workspace|Manager approvals/ })).toBeVisible();
  });

  for (const viewport of [
    { label: "tablet", width: 820, height: 1180 },
    { label: "mobile", width: 390, height: 844 },
  ]) {
    test(`time to payroll control remains usable on ${viewport.label}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await gotoAuthenticated(page, "/hr-admin/time-to-payroll", hrAdmin);
      await expectPageReady(page, "Time to Payroll Control");

      const control = page.getByTestId("time-to-payroll-control");
      await expect(control).toBeVisible();
      await expect(control.getByRole("heading", { name: "Close readiness starter" })).toBeVisible();
      await expect(control.getByTestId("time-to-payroll-readiness-grid").locator(".payroll-input-source-card")).toHaveCount(5);
      await expect(control.getByRole("heading", { name: "Roster to payroll close path" })).toBeVisible();
      await expect(control.getByTestId("time-to-payroll-journey-grid").locator(".payroll-input-source-card")).toHaveCount(5);
      await expect(control.getByLabel("Payroll Inputs clearance details")).toBeVisible();
      await expect(control.locator(".payroll-rule-source-card").filter({ hasText: "Clearance plan" })).toBeVisible();
      await expect(control.getByRole("link", { name: "Input report" }).first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }
});
