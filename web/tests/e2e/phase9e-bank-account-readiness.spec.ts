import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  type IsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

let workspace: IsolatedQaWorkspace;

const runSuffix = Date.now().toString(36).toUpperCase();

function field(scope: Page | Locator, label: string) {
  return scope.getByText(label, { exact: true }).locator("xpath=ancestor::label[1]").locator("input, select, textarea").first();
}

async function submitAndCapture<T>(page: Page, path: string, method: "POST" | "PATCH", action: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes(path) && item.request().method() === method),
    action(),
  ]);
  const payload = (await response.json().catch(() => ({}))) as T;
  expect(response.ok(), `${method} ${path} failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  return payload;
}

test.describe("Phase 9E employee bank account readiness", () => {
  test.beforeEach(async ({}, testInfo) => {
    workspace = await provisionIsolatedQaWorkspace(testInfo);
  });

  test.afterEach(async () => cleanupIsolatedQaWorkspace(workspace));

  test("HR admin creates and edits employee primary bank accounts through browser UI", async ({ page }) => {
    test.setTimeout(8 * 60 * 1000);

    const employeeId = workspace.manifest.credentials.employee.employee_id;
    await gotoAuthenticated(page, `/hr-admin/employees?employeeId=${employeeId}`, workspacePersona(workspace, "hr_admin"));
    await expectPageReady(page, "Employees");
    const employeeHrefs = [`/hr-admin/employees?employeeId=${employeeId}`];

    let editedCreatedAccount = false;
    for (const employeeHref of employeeHrefs.slice(0, 10)) {
      await page.goto(employeeHref);
      await expectPageReady(page, "Employees");
      await page.locator("details.action-menu summary").click();
      await expect(page.getByRole("link", { name: "Manage bank accounts" })).toBeVisible();
      await page.getByRole("link", { name: "Manage bank accounts" }).click();

      const bankDialog = page.getByRole("dialog", { name: "Manage bank accounts" });
      await expect(bankDialog).toBeVisible();
      await expect(page.getByRole("heading", { name: "Bank accounts", exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "New account" })).toBeVisible();
      await expect(page.getByRole("button", { name: /Create account|Save account/ })).toBeVisible();
      await expect(page.getByRole("button", { name: "Reset" })).toBeVisible();

      const records = page.locator("[aria-label='Employee bank account records']");
      const hasPrimary = await records.getByText("primary", { exact: true }).first().isVisible().catch(() => false);
      const form = bankDialog.locator("form").filter({ has: page.getByRole("button", { name: /Create account|Save account/ }) }).first();
      for (const label of ["Account holder name", "Bank name", "Account number", "IFSC code", "Branch name"]) {
        await expect(field(form, label), `${label} should be visible`).toBeVisible();
      }
      await expect(form.locator("label.selection-row").filter({ hasText: "Primary account" })).toBeVisible();

      if (hasPrimary) {
        if (!editedCreatedAccount) {
          await field(form, "Branch name").fill("Phase 9E Branch Updated");
          const updated = await submitAndCapture<{ branch_name: string }>(
            page,
            "/api/hr-admin/employees/",
            "PATCH",
            async () => {
              await page.getByRole("button", { name: "Save account" }).click();
            },
          );
          expect(updated.branch_name).toBe("Phase 9E Branch Updated");
          await expect(page.getByText("Phase 9E Branch Updated").first()).toBeVisible();
          editedCreatedAccount = true;
        }
        await expectNoHorizontalOverflow(page);
        continue;
      }

      await page.getByRole("button", { name: "New account" }).click();
      await field(form, "Account holder name").fill(`Phase 9E Holder ${runSuffix}`);
      await field(form, "Bank name").fill(`Phase 9E Bank ${runSuffix}`);
      await field(form, "Account number").fill(`900000${Date.now().toString().slice(-8)}`);
      await field(form, "IFSC code").fill("HDFC0001234");
      await field(form, "Branch name").fill("Phase 9E Branch");
      await form.locator("label.selection-row").filter({ hasText: "Primary account" }).locator("input").check();

      const created = await submitAndCapture<{ id: string; is_primary: boolean; bank_name: string }>(
        page,
        "/api/hr-admin/employees/",
        "POST",
        async () => {
          await page.getByRole("button", { name: "Create account" }).click();
        },
      );
      expect(created.id).toBeTruthy();
      expect(created.is_primary).toBe(true);
      await expect(page.getByRole("status").filter({ hasText: "Employee bank account saved." })).toBeVisible();
      await expect(records.filter({ hasText: created.bank_name })).toBeVisible();
      await expect(records.getByText("primary", { exact: true }).first()).toBeVisible();

      if (!editedCreatedAccount) {
        await field(form, "Branch name").fill("Phase 9E Branch Updated");
        const updated = await submitAndCapture<{ id: string; branch_name: string }>(
          page,
          "/api/hr-admin/employees/",
          "PATCH",
          async () => {
            await page.getByRole("button", { name: "Save account" }).click();
          },
        );
        expect(updated.id).toBe(created.id);
        expect(updated.branch_name).toBe("Phase 9E Branch Updated");
        await expect(page.getByText("Phase 9E Branch Updated").first()).toBeVisible();
        editedCreatedAccount = true;
      }
      await expectNoHorizontalOverflow(page);
    }
    expect(editedCreatedAccount).toBe(true);
  });
});
