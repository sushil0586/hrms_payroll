import { execFileSync } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { cleanupIsolatedQaWorkspace, provisionIsolatedQaWorkspace, workspacePersona, type IsolatedQaWorkspace } from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";
import { expectNoHorizontalOverflow } from "../helpers/assertions";

let workspace: IsolatedQaWorkspace;
let closed: { close_id: string; hash: string };
const evidence = process.env.HRMS_CERT_EVIDENCE_DIR!;
const backend = "http://127.0.0.1:8048/api/v1";
let errors: string[] = [];
const routes = [
  ["dashboard", "/ess"], ["profile", "/ess/profile"], ["attendance", "/ess/attendance?month=2029-03"],
  ["leave", "/ess/leave"], ["documents", "/ess/documents"], ["payslips", "/ess/payslips"],
  ["statutory", "/ess/statutory-declarations"], ["requests", "/ess/requests"],
  ["notifications", "/ess/notifications"], ["settings", "/ess/settings"],
];
function django(code: string) {
  return execFileSync(path.resolve(__dirname, "../../../.venv/bin/python"), ["backend/manage.py", "shell", "-c", code], { cwd: path.resolve(__dirname, "../../.."), env: process.env, encoding: "utf8" }).trim().split("\n").at(-1)!;
}
async function state(kind: string, id: string, page: Page) {
  const result = JSON.parse(django(`import json; from tests.ess6_browser_fixture import verify_journey; print(json.dumps(verify_journey("${workspace.manifest.tenant.id}","${workspace.manifest.credentials.employee.employee_id}",${JSON.stringify(kind)},${JSON.stringify(id)})))`));
  await writeFile(path.join(evidence, `${test.info().project.name}-${kind}-${id}-postgresql.json`), JSON.stringify(result, null, 2));
  expect(result.employee_id).toBe(workspace.manifest.credentials.employee.employee_id);
  expect(await page.url()).toContain("127.0.0.1:3309");
  return result;
}
async function auth(page: Page) {
  const token = (await page.context().cookies()).find(c => c.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy(); return { Authorization: `Token ${token}` };
}
async function open(page: Page, route: string) {
  await gotoAuthenticated(page, route, workspacePersona(workspace, "employee"));
  await expect(page.locator("main h1")).toBeVisible();
}
async function axe(page: Page, label: string) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const result = await page.evaluate(async () => {
    const engine = (window as unknown as { axe: typeof import("axe-core") }).axe;
    return engine.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
  });
  await writeFile(path.join(evidence, `${test.info().project.name}-${label}-axe.json`), JSON.stringify(result, null, 2));
  expect(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), label).toEqual([]);
}
async function capture(page: Page, label: string) {
  await page.screenshot({ path: path.join(evidence, `${test.info().project.name}-${label}.png`), fullPage: true });
}
async function uiLogin(page: Page) {
  await page.getByRole("textbox", { name: "Username or email", exact: true }).fill(workspace.manifest.credentials.employee.username);
  await page.getByLabel("Password", { exact: true }).fill("Password@123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/ess$/);
  await expect(page.locator("main h1")).toBeVisible();
}

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000);
  if (process.env.POSTGRES_DB !== "hrms_ess2" || process.env.POSTGRES_HOST !== "127.0.0.1" || process.env.POSTGRES_PORT !== "55441") throw Error("ESS6 requires isolated owned PostgreSQL");
  await mkdir(evidence, { recursive: true });
  workspace = await provisionIsolatedQaWorkspace(info);
  closed = JSON.parse(django(`import json; from tests.ess6_browser_fixture import prepare; print(json.dumps(prepare(${JSON.stringify(workspace.manifestPath)})))`));
});
test.beforeEach(async ({ page }) => { errors = []; page.on("pageerror", e => errors.push(e.message)); });
test.afterEach(() => { expect(errors, "No uncaught errors, including transport/hydration errors").toEqual([]); });
test.afterAll(async ({}, info) => {
  let preserved = false;
  try {
    if (closed) django(`from tests.ess2_browser_fixture import verify; from tests.ess4_browser_fixture import verify_outputs; verify("${closed.close_id}","${closed.hash}"); assert verify_outputs("${workspace.manifest.tenant.id}")`);
    preserved = Boolean(closed);
  } finally {
    if (workspace) django(`from apps.documents.models import DocumentArtifact; from apps.tenants.models import Tenant; tenant=Tenant.objects.get(pk="${workspace.manifest.tenant.id}",code__startswith="pw-qa-"); files=[(i.stored_file.storage,i.stored_file.name) for i in DocumentArtifact.objects.filter(tenant=tenant) if i.stored_file]; [s.delete(n) for s,n in files]; assert all(not s.exists(n) for s,n in files)`);
    if (workspace) django(`from tests.ess6_browser_fixture import cleanup_ledger; cleanup_ledger("${workspace.manifest.tenant.id}","${workspace.seedRef}")`);
    await cleanupIsolatedQaWorkspace(workspace);
    await writeFile(path.join(evidence, `${info.project.name}-${workspace?.seedRef}-fixture-cleanup.json`), JSON.stringify({ verified_absent: Boolean(workspace), seed_ref: workspace?.seedRef, finalized_and_published_snapshots_preserved: preserved }, null, 2));
  }
});

for (const [name, route] of routes) test(`route audit ${name}: desktop tablet mobile WCAG 2.2 rules`, async ({ page }) => {
  await open(page, route);
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 1000 });
    await expect(page.locator("main h1")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    await axe(page, `${name}-${width}`);
    await capture(page, `${name}-${width}`);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
  if (name === "statutory") {
    await expect(page.locator("main")).not.toContainText("ABCDE1234F");
    await expect(page.locator("main")).not.toContainText("123456789012");
    await expect(page.locator("main")).toContainText("••••234F");
  }
});

test("journey login dashboard profile attendance using real navigation and keyboard", async ({ page }) => {
  await page.goto("/login"); await uiLogin(page);
  const skip = page.getByRole("link", { name: "Skip to employee content" });
  await skip.focus(); await page.keyboard.press("Enter");
  await expect(page.locator("#ess-content")).toBeFocused();
  const nav = page.getByRole("navigation", { name: "Employee navigation", exact: true });
  await nav.getByRole("link", { name: "My Profile", exact: true }).click();
  await expect(page).toHaveURL(/\/ess\/profile/);
  await nav.getByRole("link", { name: "Attendance", exact: true }).click();
  await expect(page).toHaveURL(/\/ess\/attendance/);
  await expect(page.getByRole("heading", { name: "Attendance", exact: true })).toBeVisible();
});

test("journey attendance correction to My Requests retains actual pending state", async ({ page }) => {
  await open(page, "/ess/attendance?month=2029-03&day=2029-03-12");
  await page.getByRole("button", { name: "Request correction for this day" }).click();
  const dialog = page.getByRole("dialog");
  await axe(page, "attendance-correction-dialog");
  await dialog.getByRole("textbox", { name: "Reason", exact: true }).fill("ESS6 integrated correction");
  await dialog.getByLabel("Requested check-in", { exact: true }).fill("2029-03-12T09:00");
  await dialog.getByLabel("Requested check-out", { exact: true }).fill("2029-03-12T17:00");
  const saved = page.waitForResponse(r => r.url().endsWith("/api/me/attendance-regularizations") && r.request().method() === "POST");
  await dialog.getByRole("button", { name: "Submit correction" }).click(); expect((await saved).status()).toBe(201);
  await expect(dialog).toBeHidden();
  await page.goto("/ess/requests?type=attendance&status=pending");
  const row = page.getByRole("table", { name: "My requests", exact: true }).getByRole("row").filter({ hasText: "ESS6 integrated correction" });
  await expect(row).toContainText("pending"); await row.getByRole("link", { name: "Review request" }).click();
  await expect(page.getByRole("dialog")).toContainText("ESS6 integrated correction");
  const response = await page.request.get(`${backend}/me/attendance-regularizations/`, { headers: await auth(page) });
  const item = (await response.json()).items.find((i: { reason: string }) => i.reason === "ESS6 integrated correction");
  expect((await state("attendance", item.id, page)).status).toBe("pending");
});

test("journey apply Leave My Requests configured approval and permitted cancellation", async ({ page }) => {
  await open(page, "/ess/leave#apply-leave"); const dialog = page.getByRole("dialog");
  await axe(page, "leave-application-dialog");
  const types = await (await page.request.get(`${backend}/me/leave-types/`, { headers: await auth(page) })).json();
  const kind = types.find((i: { code: string }) => i.code === "ess6-direct");
  await dialog.getByRole("combobox", { name: "Leave type", exact: true }).selectOption(kind.id);
  await dialog.getByLabel("Start date", { exact: true }).fill("2026-11-04");
  await dialog.getByLabel("End date", { exact: true }).fill("2026-11-04");
  await dialog.getByLabel("Reason for leave").fill("ESS6 integrated permitted leave");
  const saved = page.waitForResponse(r => r.url().endsWith("/api/me/leave-requests") && r.request().method() === "POST");
  await dialog.getByRole("button", { name: "Submit leave", exact: true }).click(); expect((await saved).status()).toBe(201);
  await expect(dialog).toBeHidden();
  await page.goto("/ess/requests?type=leave&status=pending");
  let row = page.getByRole("table", { name: "My requests", exact: true }).getByRole("row").filter({ hasText: "ESS6 integrated permitted leave" });
  await expect(row).toContainText("pending"); await row.getByRole("link", { name: "Review request" }).click();
  await expect(page.getByRole("dialog")).toContainText("ESS6 integrated permitted leave");
  const items = await (await page.request.get(`${backend}/me/leave-requests/`, { headers: await auth(page) })).json();
  const item = items.items.find((i: { reason: string }) => i.reason === "ESS6 integrated permitted leave");
  const manager = workspacePersona(workspace, "manager");
  const login = await page.request.post(`${backend}/auth/login/`, { data: { identifier: manager.username, password: manager.password } }); expect(login.status()).toBe(200);
  const token = (await login.json()).token;
  const approved = await page.request.post(`${backend}/manager/leave-requests/${item.id}/approve/`, { headers: { Authorization: `Token ${token}` }, data: { comment: "Synthetic approved configured direct policy" } }); expect(approved.status()).toBe(200);
  await page.goto(`/ess/leave?requestId=${item.id}`);
  await page.getByRole("dialog").getByLabel("Reason", { exact: true }).fill("ESS6 permitted cancellation");
  await page.getByRole("button", { name: "Cancel approved leave", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.goto("/ess/requests?type=leave&status=cancelled");
  row = page.getByRole("table", { name: "My requests", exact: true }).getByRole("row").filter({ hasText: "ESS6 integrated permitted leave" });
  await expect(row).toContainText("cancelled");
  const persisted = await state("leave", item.id, page); expect(persisted.status).toBe("cancelled"); expect(persisted.consumed).toBe("0.00"); expect(persisted.reserved).toBe("0.00");
  expect(persisted.ledger_actions).toContain("consumption_reversal");
});

test("journey governed document upload detail download and durable ownership", async ({ page }) => {
  await open(page, "/ess/documents"); await page.getByRole("button", { name: "Upload document", exact: true }).click();
  const dialog = page.getByRole("dialog"); await axe(page, "document-upload-dialog");
  await dialog.getByRole("combobox", { name: "Category", exact: true }).selectOption({ label: "QA Employee Evidence" });
  await dialog.getByRole("textbox", { name: "Title", exact: true }).fill("ESS6 integrated evidence");
  await dialog.getByLabel("Expires on", { exact: true }).fill("2035-12-31");
  await dialog.getByLabel("File", { exact: false }).setInputFiles({ name: "ess6-proof.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 ESS6 synthetic only\n") });
  await dialog.getByRole("button", { name: "Submit for review", exact: true }).click(); await expect(dialog).toBeHidden();
  const row = page.getByRole("table", { name: "Document history" }).getByRole("row").filter({ hasText: "ESS6 integrated evidence" });
  await expect(row).toBeVisible(); await row.getByRole("button", { name: "Review", exact: true }).click();
  await axe(page, "document-detail-dialog");
  const download = page.waitForEvent("download"); await page.getByRole("dialog").getByRole("link", { name: "Download file", exact: true }).click(); expect((await download).suggestedFilename()).toBe("ess6-proof.pdf");
  const center = await (await page.request.get(`${backend}/me/document-center/`, { headers: await auth(page) })).json();
  const item = center.items.find((i: { title: string }) => i.title === "ESS6 integrated evidence"); expect((await state("document", item.id, page)).artifact_present).toBe(true);
});

test("journey published payslip preview read download refresh and PostgreSQL audit", async ({ page }) => {
  await open(page, "/ess/payslips"); await page.getByRole("button", { name: "Review payslip", exact: true }).click();
  const dialog = page.getByRole("dialog"); await axe(page, "payslip-detail-dialog");
  await dialog.getByRole("button", { name: "Mark as read", exact: true }).click(); await expect(dialog.getByRole("button", { name: "Read acknowledged" })).toBeDisabled();
  const download = page.waitForEvent("download"); await dialog.getByRole("link", { name: "Download payslip", exact: true }).click(); expect((await download).suggestedFilename()).toMatch(/\.html$/);
  await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await page.reload();
  await page.getByRole("button", { name: "Review payslip", exact: true }).click(); await expect(dialog.getByRole("button", { name: "Read acknowledged" })).toBeDisabled();
  const items = await (await page.request.get(`${backend}/me/payroll-payslips/`, { headers: await auth(page) })).json(); const item = items.items.find((i: { access_summary: { is_read_acknowledged: boolean } }) => i.access_summary.is_read_acknowledged);
  const persisted = await state("payslip", item.id, page); expect(persisted.source_hash_valid).toBe(true); expect(persisted.read_events).toBeGreaterThan(0);
});

test("journey notification read unread persistence and canonical related workflow", async ({ page }) => {
  await open(page, "/ess/notifications"); await page.getByRole("button", { name: "Review notification: ESS6 leave update", exact: true }).click();
  const dialog = page.getByRole("dialog"); await axe(page, "notification-detail-dialog");
  await dialog.getByRole("button", { name: "Mark read", exact: true }).click(); await expect(dialog.getByRole("button", { name: "Mark unread", exact: true })).toBeVisible();
  await page.keyboard.press("Escape"); await page.reload(); await page.getByRole("button", { name: "Review notification: ESS6 leave update", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Mark unread", exact: true })).toBeVisible();
  const inbox = await (await page.request.get(`${backend}/me/notifications/`, { headers: await auth(page) })).json(); const item = inbox.items.find((i: { title: string }) => i.title === "ESS6 leave update");
  expect((await state("notification", item.id, page)).read_at).not.toBeNull();
  await dialog.getByRole("button", { name: "Mark unread", exact: true }).click(); expect((await state("notification", item.id, page)).read_at).toBeNull();
  await dialog.getByRole("link", { name: "Open source", exact: true }).click(); await expect(page).toHaveURL(/\/ess\/leave\?requestId=/); await expect(page.getByRole("dialog")).toContainText("Playwright manager queue");
});

test("journey Settings supported navigation and explicit unavailable preferences", async ({ page }) => {
  await open(page, "/ess/settings"); await expect(page.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("currently unavailable"); await expect(page.locator("main form")).toHaveCount(0);
  await page.getByRole("link", { name: /Notification inbox/ }).click(); await expect(page).toHaveURL(/\/ess\/notifications/);
  await page.goto("/ess/settings"); await page.reload(); await expect(page.locator("main")).toContainText(workspace.manifest.credentials.employee.employee_code);
  // No writable preference contract exists: no preference mutation or persistence success is invented.
});

test("journey actual expired cookie revoked token reauthentication and recovery navigation", async ({ page }) => {
  await open(page, "/ess/settings");
  const cookie = (await page.context().cookies()).find(c => c.name === "hrms_access_token")!;
  await page.context().addCookies([{ ...cookie, expires: Math.floor(Date.now()/1000)-60 }]);
  await page.goto("/ess/settings"); await expect(page).toHaveURL(/\/login/); await uiLogin(page);
  django(`from rest_framework.authtoken.models import Token; Token.objects.filter(user__username=${JSON.stringify(workspace.manifest.credentials.employee.username)}).delete()`);
  await page.goto("/ess/settings"); await expect(page).toHaveURL(/\/login/);
  await page.getByRole("link", { name: "Forgot password?", exact: true }).click(); await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole("textbox").first()).toBeVisible(); await capture(page, "recovery-navigation");
  await page.goto("/login"); await uiLogin(page);
});

test("journey statutory draft exact proof amount submission and read-only setup", async ({ page }) => {
  await open(page, "/ess/statutory-declarations?q=FY2027-28"); await page.getByRole("button", { name: "Start declaration", exact: true }).click();
  let dialog = page.getByRole("dialog"); await axe(page, "statutory-create-dialog");
  await dialog.getByLabel("Financial year", { exact: false }).fill("FY2027-28"); await dialog.getByLabel("Tax regime", { exact: false }).selectOption("old");
  await dialog.getByRole("button", { name: "Create declaration", exact: true }).click(); await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: "Update declaration", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add proof", exact: true }).click(); dialog = page.getByRole("dialog"); await axe(page, "statutory-proof-dialog");
  await dialog.getByLabel("Item name", { exact: false }).fill("ESS6 precise statutory proof"); await dialog.getByLabel("Amount", { exact: false }).fill("1234.56");
  await dialog.getByRole("combobox", { name: "Upload category", exact: true }).selectOption({label:"QA ESS6 Tax Proof"});
  await dialog.getByLabel("Proof file", { exact: true }).setInputFiles({name:"ess6-tax-proof.pdf",mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4 ESS6 synthetic tax proof\n")});
  await dialog.getByRole("button", { name: "Upload proof", exact: true }).click(); await expect(dialog).toBeHidden();
  const row = page.getByRole("table", { name: "Declared proof items" }).getByRole("row").filter({ hasText: "ESS6 precise statutory proof" }); await expect(row).toContainText("1234.56");
  await row.getByRole("button", { name: "View details", exact: true }).click(); await axe(page, "statutory-proof-detail-dialog"); await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Submit declaration", exact: true }).click(); await axe(page, "statutory-confirm-dialog");
  await page.getByRole("dialog").getByRole("button", { name: "Submit declaration", exact: true }).click(); await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Add proof", exact: true })).toBeDisabled(); await page.reload();
  await page.getByRole("button", { name: "View setup", exact: true }).click(); await expect(page.getByRole("dialog").getByRole("button", { name: "Read only", exact: true })).toBeDisabled();
  const declarations = await (await page.request.get(`${backend}/me/statutory-declarations/`, { headers: await auth(page) })).json(); const persisted = await state("statutory", declarations.items.find((i: { financial_year_code: string }) => i.financial_year_code === "FY2027-28").id, page);
  expect(persisted.status).toBe("submitted"); expect(persisted.amounts).toContain("1234.56"); expect(persisted.verified_amounts).toContain("0.00"); expect(persisted.submitted_by).toBe(workspace.manifest.credentials.employee.username);
});

test("direct browser APIs reject privileged reads foreign records and closed mutations", async ({ page }) => {
  await open(page, "/ess/profile"); const headers = await auth(page);
  for (const route of ["/hr-admin/employees/", "/platform/tenants/"]) expect([403,404]).toContain((await page.request.get(backend+route, { headers })).status());
  const manager = workspace.manifest.credentials.manager.employee_id;
  const profile = await (await page.request.get(`${backend}/me/profile/?employee_id=${manager}`, { headers })).json(); expect(profile.id).toBe(workspace.manifest.credentials.employee.employee_id); expect(profile.account_number).toBeUndefined(); expect(profile.pan_number).toBeUndefined();
  const closedMonth = await (await page.request.get(`${backend}/me/attendance-records/?month=2029-02`, { headers })).json();
  const attempt = await page.request.post(`${backend}/me/attendance-regularizations/`, { headers, data: { attendance_record_id: closedMonth.days[0].id, requested_status: "present", reason: "ESS6 closed-period rejection" } }); expect(attempt.status()).toBe(400);
  const selfUpdate = await page.request.patch(`${backend}/me/profile/`, { headers, data: { preferred_name: "ESS Scoped Update" } }); expect(selfUpdate.status()).toBe(200);
  expect((await page.request.patch(`${backend}/me/profile/`, { headers, data: { first_name: "Forbidden" } })).status()).toBe(400);
  django(`from tests.ess2_browser_fixture import verify; verify("${closed.close_id}","${closed.hash}")`);
});

test("statutory small-screen dialog scroll keyboard trap accessible actions and focus return", async ({ page }) => {
  await page.setViewportSize({width:320,height:568});
  await open(page,"/ess/statutory-declarations?financial_year=2026-27");
  const trigger=page.getByRole("button",{name:"Add proof",exact:true}); await trigger.click();
  const dialog=page.getByRole("dialog",{name:"Add proof",exact:true});
  await axe(page,"statutory-mobile-proof-dialog"); await capture(page,"statutory-mobile-proof-dialog");
  const bounds=await dialog.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(320); expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(568);
  const body=dialog.getByRole("region",{name:"Add proof content",exact:true}); await body.focus(); await expect(body).toBeFocused(); await page.keyboard.press("PageDown");
  await expect.poll(()=>body.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  const submit=dialog.getByRole("button",{name:"Add proof",exact:true}); await submit.focus(); await expect(submit).toBeInViewport();
  await page.keyboard.press("Tab"); const close=dialog.getByRole("button",{name:"Close Add proof",exact:true}); await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab"); await expect(submit).toBeFocused();
  await page.keyboard.press("Escape"); await expect(dialog).toBeHidden(); await expect(trigger).toBeFocused();
});
