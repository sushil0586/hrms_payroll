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

test.afterAll(async () => cleanupIsolatedQaWorkspace(workspace));

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

test("holiday calendar controls, nested rows, validation, persistence, and focus work end to end", async ({ page }) => {
  const suffix = Date.now().toString(36).slice(-6);
  const code = `qa-cal-${suffix}`;
  const createdName = `QA Calendar ${suffix}`;
  const updatedName = `${createdName} Updated`;

  await page.goto("/hr-admin/holiday-calendars");
  const detail = page.getByRole("complementary", { name: "Holiday calendar detail", exact: true });
  const create = page.getByRole("button", { name: "Create calendar", exact: true });
  await create.click();
  let dialog = page.getByRole("dialog", { name: "Create holiday calendar", exact: true });
  await closeDialog(dialog, create, /^Close Create holiday calendar$/);

  await create.click();
  dialog = page.getByRole("dialog", { name: "Create holiday calendar", exact: true });
  const codeInput = dialog.getByLabel("Code", { exact: true });
  await codeInput.fill("");
  await dialog.getByRole("button", { name: "Create holiday calendar", exact: true }).click();
  await expect(codeInput).toBeFocused();

  await codeInput.fill(code);
  await dialog.getByLabel("Name", { exact: true }).fill(createdName);
  await dialog.getByLabel("Year", { exact: true }).fill("1999");
  const invalid = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/holiday-calendars"));
  await dialog.getByRole("button", { name: "Create holiday calendar", exact: true }).click();
  expect((await invalid).status()).toBe(400);
  const alert = dialog.getByRole("alert").filter({ hasText: "Save failed." });
  await expect(alert).toBeFocused();
  await expect(alert).toContainText(/greater than or equal to 2000/i);

  await dialog.getByLabel("Year", { exact: true }).fill("2036");
  await dialog.getByRole("button", { name: "Add holiday", exact: true }).click();
  await dialog.getByRole("button", { name: "Add holiday", exact: true }).click();
  const holidayCards = dialog.locator(".queue-list > .form-section-card--full");
  const firstHoliday = holidayCards.nth(0);
  const secondHoliday = holidayCards.nth(1);
  await firstHoliday.getByLabel("Date", { exact: true }).fill("2036-01-26");
  await firstHoliday.getByLabel("Name", { exact: true }).fill(`Republic Day ${suffix}`);
  await firstHoliday.getByLabel("Description", { exact: true }).fill("Synthetic general holiday");
  await secondHoliday.getByLabel("Date", { exact: true }).fill("2036-08-15");
  await secondHoliday.getByLabel("Name", { exact: true }).fill(`Independence Day ${suffix}`);
  await secondHoliday.locator("select").selectOption("restricted");
  await secondHoliday.locator('input[type="checkbox"]').check();

  let writes = 0;
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.status() === 201 && response.url().endsWith("/api/hr-admin/holiday-calendars")) writes += 1;
  });
  const created = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/holiday-calendars"));
  await dialog.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  expect((await created).status()).toBe(201);
  expect(writes).toBe(1);
  await expect(dialog).toHaveCount(0);

  const search = page.getByPlaceholder("Calendar, code, scope, holiday");
  await search.fill(code);
  const createdRow = page.getByRole("row").filter({ hasText: code });
  await expect(createdRow).toContainText(createdName);
  await expect(createdRow).toContainText("2 holidays");
  let inspect = createdRow.getByRole("button", { name: "Inspect", exact: true });
  await inspect.click();
  await expect(detail).toContainText(`Republic Day ${suffix}`);
  await expect(detail).toContainText(`Independence Day ${suffix} · restricted · optional`);
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(inspect).toBeFocused();
  await inspect.click();

  const edit = detail.getByRole("button", { name: "Edit calendar", exact: true });
  await edit.click();
  dialog = page.getByRole("dialog", { name: `Edit ${createdName}`, exact: true });
  await dialog.getByLabel("Name", { exact: true }).first().fill("Cancelled calendar name");
  await dialog.getByRole("button", { name: "Remove holiday", exact: true }).last().click();
  await closeDialog(dialog, edit, "Cancel");
  await expect(detail).toContainText(createdName);
  await expect(detail).toContainText(`Independence Day ${suffix}`);

  await edit.click();
  dialog = page.getByRole("dialog", { name: `Edit ${createdName}`, exact: true });
  await dialog.getByLabel("Name", { exact: true }).first().fill(updatedName);
  await dialog.getByRole("button", { name: "Remove holiday", exact: true }).last().click();
  const patched = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/holiday-calendars/"));
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patched).status()).toBe(200);
  await expect(dialog).toHaveCount(0);
  await expect(detail).toContainText(updatedName);
  await expect(detail).toContainText(`Republic Day ${suffix}`);
  await expect(detail).not.toContainText(`Independence Day ${suffix}`);

  await page.reload();
  await page.getByPlaceholder("Calendar, code, scope, holiday").fill(code);
  const persistedRow = page.getByRole("row").filter({ hasText: code });
  await expect(persistedRow).toContainText(updatedName);
  await expect(persistedRow).toContainText("1 holidays");
  await persistedRow.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Holiday calendar detail", exact: true })).toContainText(`Republic Day ${suffix}`);
});
