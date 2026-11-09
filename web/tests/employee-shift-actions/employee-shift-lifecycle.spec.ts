import { retainShiftMutationEvidence } from "../shift-pilot/database-evidence";
import { expect, test, type Locator } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({}, testInfo) => {
  test.setTimeout(180_000);
  workspace = await provisionIsolatedQaWorkspace(testInfo);
});

test.afterAll(async ({}, info) => cleanupIsolatedQaWorkspace(workspace, info));

test.beforeEach(async ({ page }) => {
  const actor = workspacePersona(workspace, "hr_admin");
  const response = await page.request.post("/api/auth/login", {
    data: { identifier: actor.username, password: actor.password },
  });
  expect(response.status()).toBe(200);
});

async function closeDialog(dialog: Locator, trigger: Locator, name: string | RegExp) {
  await dialog.getByRole("button", { name, exact: typeof name === "string" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

test("employee shift assignment buttons, validation, conflicts, persistence, and focus work end to end", async ({ page }, info) => {
  await retainShiftMutationEvidence(page, info, workspace.manifest.tenant.id, workspace.manifest.credentials.hr_admin.username);
  await page.goto("/hr-admin/employee-shift-assignments");
  let inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await inspect.click();
  const detail = page.getByRole("complementary", { name: "Shift assignment detail", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(inspect).toBeFocused();

  const create = page.getByRole("button", { name: "Create assignment", exact: true });
  await create.click();
  let dialog = page.getByRole("dialog", { name: "Create shift assignment", exact: true });
  await closeDialog(dialog, create, /^Close Create shift assignment$/);

  await create.click();
  dialog = page.getByRole("dialog", { name: "Create shift assignment", exact: true });
  let blankWrites = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/hr-admin/employee-shift-assignments")) blankWrites += 1;
  });
  await dialog.getByRole("button", { name: "Create assignment", exact: true }).click();
  const alert = dialog.getByRole("alert").filter({ hasText: "Save failed." });
  await expect(alert).toContainText("Review the highlighted fields.");
  await expect(dialog.getByRole("combobox", { name: "Employee", exact: true })).toBeFocused();
  await expect(dialog.getByRole("combobox", { name: "Employee", exact: true })).toHaveAttribute("aria-invalid", "true");
  expect(blankWrites).toBe(0);
  // A distinct real backend guard probe retains rejection/SQL non-effect coverage.
  const rejectedStatus = await page.evaluate(async () => (await fetch("/api/hr-admin/employee-shift-assignments", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employee_id: null, shift_id: null, effective_from: "" }),
  })).status);
  expect(rejectedStatus).toBe(400);

  const target = workspace.manifest.credentials.manager_b;
  await dialog.getByLabel("Find person", { exact: true }).fill(target.employee_code);
  const employee = dialog.getByRole("combobox", { name: "Employee", exact: true });
  await expect.poll(() => employee.locator("option").count()).toBeGreaterThan(1);
  await employee.selectOption(target.employee_id);
  await dialog.getByRole("combobox", { name: /^Base shift/ }).selectOption(workspace.manifest.attendance.shift_id);
  await dialog.getByLabel("Effective from", { exact: true }).fill("2035-01-01");
  await dialog.getByLabel("Effective to", { exact: true }).fill("2035-01-31");
  await expect(dialog.getByText(/Shift governance check|Window overlap review/, { exact: false })).toBeVisible();

  let writes = 0;
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.status() === 201 && response.url().endsWith("/api/hr-admin/employee-shift-assignments")) writes += 1;
  });
  const created = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/employee-shift-assignments"));
  await dialog.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  expect((await created).status()).toBe(201);
  expect(writes).toBe(1);
  await expect(dialog).toHaveCount(0);

  const search = page.getByPlaceholder("Employee, code, shift, scope");
  await search.fill(target.employee_code);
  const filtered = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === "GET" && url.pathname === "/api/hr-admin/employee-shift-assignments/workspace" && url.searchParams.get("q") === target.employee_code;
  });
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  expect((await filtered).status()).toBe(200);
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(target.employee_code);
  await expect(page.locator('[data-local-update-hydrated][aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole("table")).toContainText(target.employee_code);
  const createdRow = page.getByRole("row").filter({ hasText: target.employee_code }).filter({ hasText: "2035-01-01" });
  inspect = createdRow.getByRole("button", { name: "Inspect", exact: true });
  await inspect.click();
  await expect(detail).toBeVisible();
  const edit = detail.getByRole("button", { name: "Edit assignment", exact: true });
  await edit.click();
  dialog = page.getByRole("dialog", { name: /Edit / });
  await dialog.getByLabel("Effective to", { exact: true }).fill("2035-02-15");
  await closeDialog(dialog, edit, "Cancel");
  await expect(detail).toContainText("2035-01-31");

  await edit.click();
  dialog = page.getByRole("dialog", { name: /Edit / });
  await dialog.getByLabel("Effective to", { exact: true }).fill("2035-02-15");
  const patched = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/employee-shift-assignments/"));
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patched).status()).toBe(200);
  await expect(detail).toContainText("2035-02-15");
  await page.reload();
  await page.getByPlaceholder("Employee, code, shift, scope").fill(target.employee_code);
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await page.getByRole("row").filter({ hasText: target.employee_code }).filter({ hasText: "2035-01-01" }).getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Shift assignment detail", exact: true })).toContainText("2035-02-15");
});
