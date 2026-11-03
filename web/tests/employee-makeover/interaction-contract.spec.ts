import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let fixture: IsolatedQaWorkspace;

const employeeId = () => fixture.manifest.credentials.employee.employee_id;
const scope = () => `/hr-admin/employees?q=QA&page_size=5&employeeId=${employeeId()}`;

async function login(page: Page) {
  const user = workspacePersona(fixture, "hr_admin");
  expect((await page.request.post("/api/auth/login", { data: { identifier: user.username, password: user.password } })).status()).toBe(200);
}

test.beforeAll(async ({}, testInfo) => {
  fixture = await provisionIsolatedQaWorkspace(testInfo);
});

test.afterAll(async () => {
  await cleanupIsolatedQaWorkspace(fixture);
});

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("detail Close follows browser history without reopening the drawer", async ({ page }) => {
  await page.goto(scope());
  const drawer = page.locator(".employee-detail-drawer");
  await expect(drawer).toContainText(fixture.manifest.credentials.employee.employee_code);

  await drawer.getByRole("link", { name: "Close details", exact: true }).click();
  await expect(drawer).toHaveCount(0);
  await expect(page).not.toHaveURL(/employeeId=/);

  await page.goBack();
  await expect(drawer).toContainText(fixture.manifest.credentials.employee.employee_code);
  await page.goForward();
  await expect(drawer).toHaveCount(0);
  await expect(page).not.toHaveURL(/employeeId=/);
});

test("Edit saves durably and returns focus to its trigger", async ({ page }) => {
  await page.goto(scope());
  const edit = page.locator(".employee-detail-drawer").getByRole("button", { name: "Edit", exact: true });
  await edit.click();

  const dialog = page.getByRole("dialog", { name: "Edit employee", exact: true });
  const form = dialog.locator(".employee-master-form");
  const preferredName = "Action verified employee";
  await form.locator("[name=preferred_name]").fill(preferredName);
  await form.getByRole("navigation", { name: "Employee form progress" }).getByRole("button", { name: /Review$/ }).click();
  const response = page.waitForResponse(item => item.url().endsWith(`/api/hr-admin/employees/${employeeId()}`) && item.request().method() === "PATCH");
  await form.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await expect(edit).toBeFocused();
  expect((await (await page.request.get(`/api/hr-admin/employees/${employeeId()}`)).json()).preferred_name).toBe(preferredName);
});

test("Access and Bank buttons open the correct dialog and Close restores focus", async ({ page }) => {
  await page.goto(scope());
  const drawer = page.locator(".employee-detail-drawer");

  for (const action of [
    { button: "Manage access", dialog: "Manage access" },
    { button: "Bank accounts", dialog: "Manage bank accounts" },
  ]) {
    const trigger = drawer.getByRole("button", { name: action.button, exact: true });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: action.dialog, exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: `Close ${action.dialog}`, exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

test("failed Access loading exposes Retry and Dismiss without a false dialog", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/hr-admin/employees/workspace?**", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("action") !== "access") return route.continue();
    attempts += 1;
    if (attempts === 1) {
      return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Synthetic access loading failure." }) });
    }
    return route.continue();
  });

  await page.goto(scope());
  await page.locator(".employee-detail-drawer").getByRole("button", { name: "Manage access", exact: true }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Access details could not be opened." });
  await expect(alert).toContainText("Synthetic access loading failure.");
  await expect(page.getByRole("dialog", { name: "Manage access", exact: true })).toHaveCount(0);
  await alert.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Manage access", exact: true })).toBeVisible();
  expect(attempts).toBe(2);
});

test("New employee Close and Cancel return to the directory trigger", async ({ page }) => {
  await page.goto("/hr-admin/employees");
  const trigger = page.getByRole("button", { name: "New employee", exact: true });

  await trigger.click();
  let dialog = page.getByRole("dialog", { name: "Create employee", exact: true });
  await dialog.getByRole("button", { name: "Close Create employee", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();

  await trigger.click();
  dialog = page.getByRole("dialog", { name: "Create employee", exact: true });
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
