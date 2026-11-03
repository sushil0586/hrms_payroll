import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, type Persona } from "../helpers/staging-auth";

const password = process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "Password@123";
const hrAdmin: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_HR_ADMIN_USERNAME ?? "pw_statutory_phase7_hr_admin",
  password,
};
const finance: Persona = {
  username: process.env.PLAYWRIGHT_LIVE_PAYROLL_FINANCE_USERNAME ?? "pw_statutory_phase7_finance",
  password,
};

test.describe("Statutory Phase 7 year-close certification", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("HR filters reconciled declarations and closes the ready financial year", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory?tab=declarations", hrAdmin);
    await expectPageReady(page, "Statutory Compliance");

    await page.getByRole("textbox", { name: "Employee", exact: true }).fill("QA-EMP-001");
    await page.getByLabel("Financial year").selectOption("2026-27");
    await page.getByLabel("Lifecycle status").selectOption("locked");
    await page.getByLabel("Reconciliation").selectOption("matched");
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/declarationQuery=QA-EMP-001/, { timeout: 20_000 });
    await expect(page.getByText("QA-EMP-001", { exact: false }).first()).toBeVisible();
    await expect(page.getByLabel("Reconciliation")).toHaveValue("matched");

    await page.goto("/hr-admin/payroll-statutory?tab=catalog");
    await expectPageReady(page, "Statutory Compliance");
    const controls = page.getByLabel("2026-27 lifecycle controls");
    await controls.getByLabel("Close reason").fill("Phase 7 local readiness certification complete.");
    await controls.getByLabel("Approval reference").fill("PHASE7-LOCAL-001");
    await controls.getByRole("button", { name: "Close financial year" }).click();
    await expect(controls.getByRole("status")).toHaveText("Financial year close completed and audited.");
    await expect(controls.getByRole("button", { name: "Reopen financial year" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("Finance filters only pseudonymous locked reconciliation", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory?tab=declarations", finance);
    await expectPageReady(page, "Statutory Compliance");
    await expect(page.getByRole("heading", { name: "Locked statutory totals" })).toBeVisible();

    await page.getByLabel("Financial year").selectOption("2026-27");
    await page.getByLabel("Lifecycle status").selectOption("locked");
    await page.getByLabel("Reconciliation").selectOption("matched");
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page.getByText(/Declaration [a-f0-9]{12}/).first()).toBeVisible();
    await expect(page.getByText("QA-EMP-001", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Phase 7 synthetic matched proof", { exact: true })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test("Payroll Approval reopens the same financial year with an approval reference", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/payroll-statutory?tab=catalog", hrAdmin);
    await expectPageReady(page, "Statutory Compliance");
    const controls = page.getByLabel("2026-27 lifecycle controls");
    await controls.getByLabel("Reopen reason").fill("Reopen after the bounded Phase 7 close certification.");
    await controls.getByLabel("Approval reference").fill("PHASE7-LOCAL-002");
    await controls.getByRole("button", { name: "Reopen financial year" }).click();
    await expect(controls.getByRole("status")).toHaveText("Financial year reopen completed and audited.");
    await expect(controls.getByRole("button", { name: "Close financial year" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
