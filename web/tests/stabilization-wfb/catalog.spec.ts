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
  await expect(page.getByRole("region",{name:"Shifts, scroll for more columns",exact:true})).toBeVisible();
  await capture(page,info,"B-shift-list");
  const axe=await axeScan(page);expect(axe.violations).toEqual([]);await info.attach("axe-shifts",{body:JSON.stringify(axe.violations),contentType:"application/json"});
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
  await capture(page,info,"B-required-validation");
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
  await toast(page,info,"Shift created.");
  await page.getByRole('button',{name:'Create shift',exact:true}).click();dialog=page.getByRole('dialog',{name:'Create shift',exact:true});await dialog.getByLabel('Code',{exact:true}).fill(shiftCode);await dialog.getByLabel('Name',{exact:true}).fill('Duplicate rejected');let duplicateWrites=0;const observeDuplicate=(r: import('@playwright/test').Request)=>{if(r.method()==='POST'&&r.url().endsWith('/api/hr-admin/shifts'))duplicateWrites++};page.on('request',observeDuplicate);await dialog.getByRole('button',{name:'Create shift',exact:true}).click();await expect(dialog.getByRole('alert')).toContainText(/code|already|unique/i);await expect(dialog.getByLabel('Code',{exact:true})).toHaveValue(shiftCode);expect(duplicateWrites).toBe(0);page.off('request',observeDuplicate);await capture(page,info,'B-duplicate-code-rejected');await dialog.getByRole('button',{name:'Cancel',exact:true}).click();


  const search = page.getByPlaceholder("Shift name, code, weekly off");
  await search.fill(shiftCode);
  await page.getByRole("button",{name:"Apply",exact:true}).click();
  await expect(page.getByRole("table")).toContainText(shiftName);
  inspect = page.getByRole("button", { name: "Inspect", exact: true });
  await inspect.click();
  const edit = detail.getByRole("button", { name: "Edit shift", exact: true });
  await edit.click();
  dialog = page.getByRole("dialog", { name: new RegExp(`Edit ${shiftName}`) });
  await dialog.getByLabel("Name", { exact: true }).fill("Unsaved shift name");
  await capture(page,info,"B-shift-edit-modal");
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
  await toast(page,info,"Shift updated.");
  await page.reload();
  await page.getByRole("button", { name: "Inspect", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Shift detail", exact: true })).toContainText(updatedName);
});

test("roster template Create, Inspect, Close, Edit, filter, and rollout preview work", async ({ page }, info) => {
  await page.goto("/hr-admin/shift-roster-templates");
  await expect(page.getByRole("region",{name:"Shift roster templates, scroll for more columns",exact:true})).toBeVisible();
  await capture(page,info,"B-roster-list-empty-history");
  await expect(page.getByLabel("Roster rollout history pagination")).toHaveCount(0);
  const axe=await axeScan(page);expect(axe.violations).toEqual([]);await info.attach("axe-rosters",{body:JSON.stringify(axe.violations),contentType:"application/json"});
  const create = page.getByRole("button", { name: "Create template", exact: true });
  await create.click();
  let dialog = page.getByRole("dialog", { name: "Create roster template", exact: true });
  await dialog.getByRole("button", { name: "Create template", exact: true }).click();
  await expect(dialog.getByLabel("Code", { exact: true })).toBeFocused();
  await capture(page,info,"B-required-validation");
  await dialog.getByLabel("Code", { exact: true }).fill(templateCode);
  await dialog.getByLabel("Name", { exact: true }).fill(templateName);
  await dialog.locator("label", { hasText: "Status" }).locator("select").selectOption("published");
  await dialog.locator("label", { hasText: "Base shift" }).locator("select").selectOption({ index: 1 });
  const created = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/shift-roster-templates"));
  await dialog.getByRole("button", { name: "Create template", exact: true }).click();
  expect((await created).status()).toBe(201);
  await expect(dialog).toHaveCount(0);
  await toast(page,info,"Roster template created.");

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
  await capture(page,info,"B-roster-edit-modal");
  await closeDialog(dialog, edit, "Cancel");

  await edit.click();
  dialog = page.getByRole("dialog", { name: new RegExp(`Edit ${templateName}`) });
  await dialog.getByLabel("Description", { exact: true }).fill("Verified synthetic roster template");
  const patched = page.waitForResponse((response) => response.request().method() === "PATCH" && response.url().includes("/api/hr-admin/shift-roster-templates/"));
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  expect((await patched).status()).toBe(200);
  await expect(page.getByRole("table")).toContainText("Verified synthetic roster template");
  await toast(page,info,"Roster template updated.");
  await page.reload();
  await expect(page.getByRole("table")).toContainText("Verified synthetic roster template");

  const rollout = page.locator("section").filter({ has: page.getByRole("heading", { name: "Roster rollout", exact: true }) });
  await rollout.locator("label", { hasText: "Roster template" }).locator("select").selectOption({ label: `${templateName} (published)` });
  await rollout.getByLabel("Find person",{exact:true}).fill(workspace.manifest.credentials.manager_b.employee_code);
  const target=rollout.getByRole("combobox",{name:"Target employee",exact:true});await expect.poll(()=>target.locator("option").count()).toBeGreaterThan(1);await target.selectOption(workspace.manifest.credentials.manager_b.employee_id);
  await rollout.locator("label", { hasText: "Effective from" }).locator("input").fill("2057-01-01");
  const preview = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/api/hr-admin/shift-roster-templates/rollout"));
  await rollout.getByRole("button", { name: "Preview rollout", exact: true }).click();
  expect((await preview).status()).toBe(200);
  await expect(page.getByText("Targeted", { exact: true }).locator("..")).toContainText(/\d+/);
  await expect(page.getByText("No roster rollout history yet.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("roster-rollout-history")).toHaveCount(0);
  await capture(page,info,'B-preview-no-history');
  await rollout.getByLabel('Effective to',{exact:true}).fill('2057-01-03');await expect(rollout.getByText('Targeted',{exact:true})).toHaveCount(0);await capture(page,info,'B-preview-cleared-on-date-change');
  let releasePreview!:()=>void;const heldPreview=new Promise<void>(resolve=>releasePreview=resolve);
  await page.route('**/api/hr-admin/shift-roster-templates/rollout',async route=>{const response=await route.fetch();await heldPreview;await route.fulfill({response});},{times:1});
  const late=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/hr-admin/shift-roster-templates/rollout'));
  await rollout.getByRole('button',{name:'Preview rollout',exact:true}).click();await rollout.getByLabel('Effective to',{exact:true}).fill('2057-01-04');releasePreview();await late;await expect(rollout.getByRole('button',{name:'Preview rollout',exact:true})).toBeEnabled();await expect(rollout.getByText('Targeted',{exact:true})).toHaveCount(0);await capture(page,info,'B-late-preview-not-presented');

  const apply=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/hr-admin/shift-roster-templates/rollout'));
  await rollout.getByRole('button',{name:'Apply rollout',exact:true}).click();const applied=await apply;expect(applied.status()).toBe(200);const body=await applied.json();expect(body.created_count).toBe(1);expect(body.skipped_count).toBe(0);
  await expect(page.getByTestId('roster-rollout-history')).toContainText(templateName);
  await toast(page,info,'1 assignment(s) created; 0 skipped.');
  await expect(page.getByLabel('Roster rollout history pagination').getByRole('button')).toHaveCount(0);
  await capture(page,info,'B-applied-history');
  const retry=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/hr-admin/shift-roster-templates/rollout'));
  await rollout.getByRole('button',{name:'Apply rollout',exact:true}).click();const replay=await (await retry).json();expect(replay.created_count).toBe(0);expect(replay.skipped_count).toBe(1);await toast(page,info,'0 assignment(s) created; 1 skipped.');
  await page.goto('/hr-admin/shift-roster-templates?rollout_page_size=1');const pager=page.getByLabel('Roster rollout history pagination');await pager.getByRole('button',{name:'Next',exact:true}).click();await expect(pager).toContainText('Page 2');await capture(page,info,'B-history-page2');
  await page.goto('/hr-admin/reports/roster-rollout-audit');await capture(page,info,'B-rollout-audit-report');
});

async function axeScan(page: Page) {await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});return page.evaluate(async()=>await (window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run());}
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
async function capture(page: Page, info: import('@playwright/test').TestInfo, id: string) {
 await page.evaluate(()=>document.fonts.ready);
 if(await page.getByRole('dialog').count()===0)await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
 await info.attach(id+'.png',{body:await page.screenshot({fullPage:true,animations:'disabled'}),contentType:'image/png'});
 const dialog=page.getByRole('dialog');if(await dialog.count()===1){const cancel=dialog.getByRole('button',{name:'Cancel',exact:true});if(await cancel.count()){await cancel.scrollIntoViewIfNeeded();await info.attach(id+'-modal-footer.png',{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});}}
}
async function toast(page: Page, info: import('@playwright/test').TestInfo, message: string) {
 await expect(page.locator('.action-toast')).toHaveCount(1);
 await expect(page.locator('.action-toast')).toContainText(message);
 await capture(page,info,message.replace(/[^a-z]+/gi,'-'));

 // Exact five-second timer was verified in WF-A; affected real hosts are checked after modal teardown.
 await page.getByRole('button',{name:'Dismiss notification',exact:true}).click();
 await expect(page.locator('.action-toast')).toHaveCount(0);
}
async function snapshot(info: import('@playwright/test').TestInfo, action: string) {
 const {stdout}=await exec(process.env.HRMS_QA_PYTHON!,['web/tests/stabilization-wfb/reconcile.py',workspace.manifestPath,workspace.seedRef,action],{env:process.env});
 await info.attach('postgresql-'+action,{body:stdout,contentType:'application/json'});
}
test.beforeEach(async({},info)=>snapshot(info,'before'));
test.afterEach(async({page,browser},info)=>{await snapshot(info,'after');await info.attach('browser-identity',{body:JSON.stringify({engine:info.project.use.browserName,version:browser.version(),viewport:page.viewportSize(),source:'real Next/BFF/Django/PostgreSQL; no demo data'}),contentType:'application/json'});});
