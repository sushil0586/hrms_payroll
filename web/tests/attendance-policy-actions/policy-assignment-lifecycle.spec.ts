import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

let workspace: IsolatedQaWorkspace;
const suffix = Date.now().toString(36);
const policyCode = `qa-policy-${suffix}`;
const policyName = `QA Attendance Policy ${suffix}`;

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

async function findPolicy(page: Page) {
  await page.getByPlaceholder("Policy name, code, shift, calendar").fill(policyCode);
  await expect(page.getByRole("table")).toContainText(policyName);
}

test("attendance policy Inspect, Close, validation, exactly-once Create, Edit, Cancel, Save, and refresh work", async ({ page }) => {
  await page.goto("/hr-admin/attendance-policies");
  let inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await inspect.click();
  const detail = page.getByRole("complementary", { name: "Attendance policy detail", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(inspect).toBeFocused();

  const create = page.getByRole("link", { name: "Create attendance policy", exact: true });
  await create.click();
  let dialog = page.getByRole("dialog", { name: "Create attendance policy", exact: true });
  await dialog.getByRole("button", { name: "Create attendance policy", exact: true }).click();
  await expect(dialog.getByRole("textbox", { name: /^Code/ })).toBeFocused();
  await expect(dialog.getByRole("alert")).toContainText("Review the highlighted attendance policy fields");

  await dialog.getByRole("textbox", { name: /^Code/ }).fill(policyCode);
  await dialog.getByRole("textbox", { name: /^Name/ }).fill(policyName);
  await dialog.getByRole("textbox", { name: /^Full day min hours/ }).fill("8");
  await dialog.getByRole("textbox", { name: /^Half day min hours/ }).fill("4");
  let createdWrites = 0;
  page.on("response", (response) => {
    if (response.request().method() === "POST" && response.status() === 201 && response.url().endsWith("/api/hr-admin/attendance-policies")) createdWrites += 1;
  });
  const created = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/attendance-policies"));
  await dialog.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
  expect((await created).status()).toBe(201);
  expect(createdWrites).toBe(1);
  await expect(dialog).toHaveCount(0);

  await findPolicy(page);
  inspect = page.getByRole("button", { name: "Inspect", exact: true });
  await inspect.click();
  const edit = detail.getByRole("link", { name: "Edit policy", exact: true });
  await edit.click();
  dialog = page.getByRole("dialog", { name: new RegExp(`Edit ${policyName}`) });
  await dialog.getByLabel("Name", { exact: true }).fill("Unsaved attendance policy");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(detail).toContainText(policyName);

  await detail.getByRole("link", { name: "Edit policy", exact: true }).click();
  dialog = page.getByRole("dialog", { name: new RegExp(`Edit ${policyName}`) });
  const updatedName = `${policyName} Updated`;
  await dialog.getByLabel("Name", { exact: true }).fill(updatedName);
  const patched = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/attendance-policies/"));
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patched).status()).toBe(200);
  await page.getByPlaceholder("Policy name, code, shift, calendar").fill(policyCode);
  await expect(page.getByRole("table")).toContainText(updatedName);
  await page.reload();
  await page.getByPlaceholder("Policy name, code, shift, calendar").fill(policyCode);
  await expect(page.getByRole("table")).toContainText(updatedName);
});

test("attendance assignment Inspect, modal focus, validation, conflict check, Create, Edit, and refresh work", async ({ page }) => {
  await page.goto("/hr-admin/attendance-policy-assignments");
  let inspect = page.getByRole("button", { name: "Inspect", exact: true }).first();
  await inspect.click();
  const detail = page.getByRole("complementary", { name: "Attendance assignment detail", exact: true });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Close", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await expect(inspect).toBeFocused();

  const create = page.getByRole("button", { name: "Create attendance assignment", exact: true });
  await create.click();
  let dialog = page.getByRole("dialog", { name: "Create attendance assignment", exact: true });
  await closeDialog(dialog, create, /^Close Create attendance assignment$/);

  await create.click();
  dialog = page.getByRole("dialog", { name: "Create attendance assignment", exact: true });
  await dialog.getByRole("button", { name: "Create assignment", exact: true }).click();
  const policySelect = dialog.getByRole("combobox", { name: /^Attendance policy/ });
  await expect(policySelect).toBeFocused();
  await expect(dialog.getByRole("alert")).toContainText("Review the highlighted attendance policy assignment fields");
  const policyOption = policySelect.locator("option").filter({ hasText: policyName });
  await policySelect.selectOption(await policyOption.getAttribute("value") ?? "");
  await dialog.getByRole("spinbutton", { name: /^Priority/ }).fill("-1");
  await dialog.getByRole("button", { name: "Create assignment", exact: true }).click();
  await expect(dialog.getByText("Priority cannot be negative.", { exact: true })).toBeVisible();
  await dialog.getByRole("spinbutton", { name: /^Priority/ }).fill("901");
  await dialog.getByRole("checkbox", { name: /^Active/ }).uncheck();
  await expect(dialog.getByText("Inactive assignments do not influence rollout.", { exact: true })).toBeVisible();
  const created = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/attendance-policy-assignments"));
  await dialog.getByRole("button", { name: "Create assignment", exact: true }).click();
  expect((await created).status()).toBe(201);
  await expect(dialog).toHaveCount(0);

  const search = page.getByPlaceholder("Policy, employee, scope");
  await search.fill(policyName);
  await expect(page.getByRole("table")).toContainText(/QA Attendance Policy/);
  inspect = page.getByRole("button", { name: "Inspect", exact: true });
  await inspect.click();
  const edit = detail.getByRole("button", { name: "Edit assignment", exact: true });
  await edit.click();
  dialog = page.getByRole("dialog", { name: /Edit QA Attendance Policy/ });
  await dialog.getByRole("spinbutton", { name: /^Priority/ }).fill("902");
  await closeDialog(dialog, edit, "Cancel");
  await expect(detail).toContainText("Priority 901");

  await edit.click();
  dialog = page.getByRole("dialog", { name: /Edit QA Attendance Policy/ });
  await dialog.getByRole("spinbutton", { name: /^Priority/ }).fill("903");
  const patched = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/attendance-policy-assignments/"));
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patched).status()).toBe(200);
  await expect(detail).toContainText("Priority 903");
  await page.reload();
  await search.fill(policyName);
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Attendance assignment detail", exact: true })).toContainText("Priority 903");
});
