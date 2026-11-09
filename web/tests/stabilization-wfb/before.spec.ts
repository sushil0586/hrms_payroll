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

test("BEFORE confirmed assignment has no success toast and empty history has disabled pager", async ({ page }, info) => {
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

  await info.attach('before-assignment-no-feedback.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
  await expect(page.locator('.action-toast')).toHaveCount(0);
  await page.goto('/hr-admin/shift-roster-templates');
  await expect(page.getByLabel('Roster rollout history pagination')).toBeVisible();
  await expect(page.getByLabel('Roster rollout history pagination').getByRole('button')).toHaveCount(4);
  await info.attach('before-empty-history-pager.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});

test('BEFORE rollout preview remains visible after effective dates change',async({page},info)=>{
 const r=await page.request.post('/api/hr-admin/shift-roster-templates',{data:{code:'before-preview',name:'Before preview fixture',status:'published',shift_id:workspace.manifest.attendance.shift_id}});expect(r.status()).toBe(201);
 await page.goto('/hr-admin/shift-roster-templates');const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Roster rollout',exact:true})});
 await panel.getByRole('combobox',{name:'Roster template',exact:true}).selectOption((await r.json()).id);
 await panel.getByLabel('Find person',{exact:true}).fill(workspace.manifest.credentials.manager_b.employee_code);const target=panel.getByRole('combobox',{name:'Target employee',exact:true});await expect.poll(()=>target.locator('option').count()).toBeGreaterThan(1);await target.selectOption(workspace.manifest.credentials.manager_b.employee_id);
 await panel.getByLabel('Effective from',{exact:true}).fill('2058-01-01');await panel.getByRole('button',{name:'Preview rollout',exact:true}).click();await expect(panel.getByText('Targeted',{exact:true})).toBeVisible();
 await panel.getByLabel('Effective from',{exact:true}).fill('2058-02-01');await expect(panel.getByText('Targeted',{exact:true})).toBeVisible();await info.attach('before-stale-preview.png',{body:await page.screenshot({fullPage:true}),contentType:'image/png'});
});
