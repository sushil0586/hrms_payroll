import { retainShiftMutationEvidence } from "../shift-pilot/database-evidence";
import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;
const suffix = Date.now().toString(36);
const shiftCode = `qa-${suffix}`;
const shiftName = `QA Shift ${suffix}`;
const templateCode = `qa-roster-${suffix}`;
const templateName = `QA Roster ${suffix}`;

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

test("shift Inspect, Close, Create, validation, duplicate prevention, Edit, Save, and Cancel work", async ({ page }, info) => {
  await retainShiftMutationEvidence(page, info, workspace.manifest.tenant.id, workspace.manifest.credentials.hr_admin.username);
  await page.goto("/hr-admin/shifts");
  let inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await inspect.click();
  const detail = page.getByRole("complementary", { name: "Shift detail", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(inspect).toBeFocused();

  const create = page.getByRole("button", { name: "Create shift", exact: true });
  await create.click();
  let dialog = page.getByRole("dialog", { name: "Create shift", exact: true });
  await closeDialog(dialog, create, /^Close Create shift$/);

  await create.click();
  dialog = page.getByRole("dialog", { name: "Create shift", exact: true });
  await dialog.getByRole("button", { name: "Create shift", exact: true }).click();
  await expect(dialog.getByLabel("Code", { exact: true })).toBeFocused();
  await dialog.getByLabel("Code", { exact: true }).fill(shiftCode);
  await dialog.getByLabel("Name", { exact: true }).fill(shiftName);
  let createdWrites = 0;
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.status() === 201 && response.url().endsWith("/api/hr-admin/shifts")) createdWrites += 1;
  });
  const created = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/shifts"));
  await dialog.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  expect((await created).status()).toBe(201);
  expect(createdWrites).toBe(1);
  await expect(dialog).toHaveCount(0);

  const search = page.getByPlaceholder("Shift name, code, weekly off");
  await search.fill(shiftCode);
  await expect(page.getByRole("table")).toContainText(shiftName);
  inspect = page.getByRole("button", { name: "Inspect", exact: true });
  await inspect.click();
  const edit = detail.getByRole("button", { name: "Edit shift", exact: true });
  await edit.click();
  dialog = page.getByRole("dialog", { name: new RegExp(`Edit ${shiftName}`) });
  await dialog.getByLabel("Name", { exact: true }).fill("Unsaved shift name");
  await closeDialog(dialog, edit, "Cancel");
  await expect(detail).toContainText(shiftName);

  await edit.click();
  dialog = page.getByRole("dialog", { name: new RegExp(`Edit ${shiftName}`) });
  const updatedName = `${shiftName} Updated`;
  await dialog.getByLabel("Name", { exact: true }).fill(updatedName);
  const patched = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/shifts/"));
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patched).status()).toBe(200);
  await expect(detail).toContainText(updatedName);
  await page.reload();
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Shift detail", exact: true })).toContainText(updatedName);
});

test("roster template Create, Inspect, Close, Edit, filter, and rollout preview work", async ({ page }) => {
  await page.goto("/hr-admin/shift-roster-templates");
  const create = page.getByRole("button", { name: "Create template", exact: true });
  await create.click();
  let dialog = page.getByRole("dialog", { name: "Create roster template", exact: true });
  await dialog.getByRole("button", { name: "Create template", exact: true }).click();
  await expect(dialog.getByLabel("Code", { exact: true })).toBeFocused();
  await dialog.getByLabel("Code", { exact: true }).fill(templateCode);
  await dialog.getByLabel("Name", { exact: true }).fill(templateName);
  await dialog.locator("label", { hasText: "Status" }).locator("select").selectOption("published");
  await dialog.locator("label", { hasText: "Base shift" }).locator("select").selectOption({ index: 1 });
  const created = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/shift-roster-templates"));
  await dialog.getByRole("button", { name: "Create template", exact: true }).click();
  expect((await created).status()).toBe(201);
  await expect(dialog).toHaveCount(0);

  await page.getByPlaceholder("Template, code, shift, description").fill(templateCode);
  await page.getByRole("button", { name: "Apply filters", exact: true }).click();
  await expect(page.getByRole("table")).toContainText(templateName);
  let inspect = page.getByRole("button", { name: "Inspect", exact: true });
  await inspect.click();
  const detail = page.getByRole("complementary", { name: "Roster template detail", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(inspect).toBeFocused();

  await inspect.click();
  const edit = detail.getByRole("button", { name: "Edit template", exact: true });
  await edit.click();
  dialog = page.getByRole("dialog", { name: new RegExp(`Edit ${templateName}`) });
  await dialog.getByLabel("Description", { exact: true }).fill("Unsaved roster description");
  await closeDialog(dialog, edit, "Cancel");

  await edit.click();
  dialog = page.getByRole("dialog", { name: new RegExp(`Edit ${templateName}`) });
  await dialog.getByLabel("Description", { exact: true }).fill("Verified synthetic roster template");
  const patched = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/shift-roster-templates/"));
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patched).status()).toBe(200);
  await expect(page.getByRole("table")).toContainText("Verified synthetic roster template");
  await page.reload();
  await expect(page.getByRole("table")).toContainText("Verified synthetic roster template");

  const rollout = page.locator("section").filter({ has: page.getByRole("heading", { name: "Roster rollout", exact: true }) });
  await rollout.locator("label", { hasText: "Roster template" }).locator("select").selectOption({ label: `${templateName} (published)` });
  await rollout.locator("label", { hasText: "Department scope" }).locator("select").selectOption({ index: 1 });
  await rollout.locator("label", { hasText: "Effective from" }).locator("input").fill("2026-11-03");
  const preview = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/shift-roster-templates/rollout"));
  await rollout.getByRole("button", { name: "Preview rollout", exact: true }).click();
  expect((await preview).status()).toBe(200);
  await expect(page.getByText("Targeted", { exact: true }).locator("..")).toContainText(/\d+/);
  await expect(page.getByText("No roster rollout history yet.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("roster-rollout-history")).toHaveCount(0);
});
