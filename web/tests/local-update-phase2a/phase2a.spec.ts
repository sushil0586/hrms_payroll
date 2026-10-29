import { expect, test, type Page, type Route } from "@playwright/test";

import { documentNavigationCount, expectLocalUpdateShell, expectNoDocumentNavigation, markLocalUpdateShell } from "../helpers/local-update-contract";

test.describe.configure({ timeout: 75_000 });

async function open(page: Page, route: string, heading: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("[data-local-update-hydrated='true']")).toBeVisible();
}

async function recordsFixture(page: Page) {
  return (await (await page.request.get("/api/hr-admin/attendance-records/workspace?page=1&page_size=25")).json());
}

function recordsResponse(base: any, records: any[], route: Route, failed = false) {
  if (failed) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Attendance queue read failed." }) });
  const params = new URL(route.request().url()).searchParams;
  const page = Number(params.get("page") || 1); const pageSize = Number(params.get("page_size") || 25);
  const editId = params.get("editRecord") || "";
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, state: "live", items: records.slice((page - 1) * pageSize, page * pageSize), total_count: records.length, page, page_size: pageSize, has_next: page * pageSize < records.length, has_previous: page > 1, editRecord: records.find((item) => item.id === editId) ?? null }) });
}

test("attendance record filters, pagination, Back, and failed reads remain local", async ({ page }) => {
  await open(page, "/hr-admin/attendance-records", "Attendance records");
  const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await recordsFixture(page); const source = base.items[0];
  const records = Array.from({ length: 26 }, (_, index) => ({ ...source, id: `phase2a-record-${index + 1}`, employee_name: `Phase 2A employee ${index + 1}`, employee_code: `P2A${index + 1}` }));
  let failed = false;
  await page.route("**/api/hr-admin/attendance-records/workspace?**", (route) => recordsResponse(base, records, route, failed));
  const form = page.getByRole("form", { name: "Attendance filters" });
  await form.getByLabel("Search").fill("Phase 2A"); await form.getByLabel("Status").selectOption(source.status); await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/q=Phase(%20|\+)2A/); await expect(page.getByRole("table", { name: "Attendance records" })).toContainText("Phase 2A employee 1");
  await page.getByRole("button", { name: "Next", exact: true }).click(); await expect(page).toHaveURL(/page=2/); await expect(page.getByText("Phase 2A employee 26")).toBeVisible();
  await page.evaluate(() => history.back()); await expect(page).not.toHaveURL(/page=2/);
  failed = true; const confirmed = page.url(); await form.getByLabel("Search").fill("retained attendance draft"); await form.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.locator('.notice[role="alert"]').filter({ hasText: "Attendance queue read failed." })).toBeVisible(); expect(page.url()).toBe(confirmed); await expect(form.getByLabel("Search")).toHaveValue("retained attendance draft");
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

test("attendance bulk and edit mutations reconcile only the records workspace", async ({ page }) => {
  await open(page, "/hr-admin/attendance-records", "Attendance records");
  const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await recordsFixture(page); let records = [{ ...base.items[0], id: "phase2a-mutable", employee_name: "Phase 2A mutable", status: "present", notes: "Before" }];
  await page.route("**/api/hr-admin/attendance-records/workspace?**", (route) => recordsResponse(base, records, route));
  await page.getByRole("form", { name: "Attendance filters" }).getByRole("button", { name: "Apply filters" }).click();
  await page.getByLabel(/Select Phase 2A mutable/).check();
  await page.route("**/api/hr-admin/attendance-records/bulk-actions", async (route) => { const body = route.request().postDataJSON(); records = records.map((item) => body.record_ids.includes(item.id) ? { ...item, status: body.status } : item); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ updated_count: 1 }) }); });
  await page.getByLabel("Bulk status").selectOption({ index: 1 }); const selectedStatus = await page.getByLabel("Bulk status").inputValue();
  await page.getByRole("button", { name: /Set status/ }).click(); await expect(page.getByRole("row").filter({ hasText: "Phase 2A mutable" })).toContainText(new RegExp(selectedStatus.replaceAll("_", " "), "i"));
  await page.getByRole("button", { name: "Inspect" }).click(); await page.getByRole("button", { name: "Edit record" }).click();
  const dialog = page.getByRole("dialog", { name: /Edit Phase 2A mutable/ }); await dialog.getByLabel("Notes").fill("After local edit");
  await page.route("**/api/hr-admin/attendance-records/phase2a-mutable", async (route) => { const body = route.request().postDataJSON(); records = records.map((item) => item.id === "phase2a-mutable" ? { ...item, ...body } : item); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(records[0]) }); });
  await dialog.getByRole("button", { name: "Save attendance record" }).click(); await expect(dialog).toHaveCount(0); await expect(page).not.toHaveURL(/editRecord=/);
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

test("accepted attendance bulk mutation blocks duplicates when confirmation fails", async ({ page }) => {
  await open(page, "/hr-admin/attendance-records", "Attendance records");
  const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await recordsFixture(page); const records = [{ ...base.items[0], id: "phase2a-uncertain", employee_name: "Phase 2A uncertain" }]; let failRead = false; let writes = 0;
  await page.route("**/api/hr-admin/attendance-records/workspace?**", (route) => recordsResponse(base, records, route, failRead));
  await page.getByRole("form", { name: "Attendance filters" }).getByRole("button", { name: "Apply filters" }).click(); await page.getByLabel(/Select Phase 2A uncertain/).check();
  await page.route("**/api/hr-admin/attendance-records/bulk-actions", (route) => { writes += 1; failRead = true; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ updated_count: 1 }) }); });
  await page.getByRole("button", { name: "Lock", exact: true }).click(); await expect(page.locator('.notice[role="alert"]').filter({ hasText: "Do not repeat the action" })).toBeVisible(); await page.getByRole("button", { name: "Lock", exact: true }).click({ force: true }).catch(() => undefined); expect(writes).toBe(1);
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

test("attendance CSV upload previews blocked rows and reconciles committed rows locally", async ({ page }) => {
  await open(page, "/hr-admin/attendance-records", "Attendance records"); const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await recordsFixture(page); let records = [...base.items]; const employeeCode = records[0].employee_code; let writes = 0;
  await page.route("**/api/hr-admin/attendance-records/workspace?**", (route) => recordsResponse(base, records, route)); await page.getByRole("form", { name: "Attendance filters" }).getByRole("button", { name: "Apply filters" }).click();
  await page.getByText("Attendance import tools", { exact: true }).click();
  await page.route("**/api/hr-admin/employees/option-search?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [{ id: records[0].employee_id, name: records[0].employee_name, employee_code: employeeCode }], total_count: 1 }) }));
  await page.route("**/api/hr-admin/import-batches", (route) => route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id: "phase2a-audit" }) }));
  await page.route("**/api/hr-admin/attendance-records", async (route) => { writes += 1; const body = route.request().postDataJSON(); records = [...records, { ...records[0], id: "phase2a-imported", attendance_date: body.attendance_date, notes: body.notes }]; return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(records.at(-1)) }); });
  const csv = `employee_code,attendance_date,status,source,shift_name,check_in_at,check_out_at,work_duration_hours,overtime_hours,late_minutes,early_exit_minutes,is_regularized,is_locked,notes\n${employeeCode},2026-12-20,present,manual,,2026-12-20T09:00:00+05:30,2026-12-20T18:00:00+05:30,8.00,0.00,0,0,false,false,Phase 2A imported\n${employeeCode},2026-12-21,not_a_status,manual,,,8.00,0.00,0,0,false,false,Blocked row\n`;
  await page.locator('input[type="file"][accept*="csv"]').setInputFiles({ name: "phase2a.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Preview attendance import" }).click(); await expect(page.getByText("ready", { exact: true })).toBeVisible(); await expect(page.getByText("blocked", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Commit ready attendance rows" }).click(); await expect(page.getByText("created", { exact: true })).toBeVisible(); expect(writes).toBe(1);
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

async function regularizationFixture(page: Page) { return (await (await page.request.get("/api/hr-admin/attendance-regularizations/workspace?page=1&page_size=25")).json()); }
function regularizationResponse(base: any, items: any[], route: Route, failed = false) {
  if (failed) return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Regularization queue read failed." }) });
  const params = new URL(route.request().url()).searchParams; const page = Number(params.get("page") || 1); const size = Number(params.get("page_size") || 25); const review = params.get("reviewRegularization") || "";
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, state: "live", items: items.slice((page - 1) * size, page * size), total_count: items.length, page, page_size: size, has_next: page * size < items.length, has_previous: page > 1, reviewItem: items.find((item) => item.id === review) ?? null }) });
}

test("regularization filters, review decision, pagination, and Back remain local", async ({ page }) => {
  await open(page, "/hr-admin/attendance-regularizations", "Regularizations");
  const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page); const base = await regularizationFixture(page); const source = base.items[0];
  let items = Array.from({ length: 26 }, (_, index) => ({ ...source, id: `phase2a-reg-${index + 1}`, employee_name: `Phase 2A regularization ${index + 1}`, status: "pending" }));
  await page.route("**/api/hr-admin/attendance-regularizations/workspace?**", (route) => regularizationResponse(base, items, route));
  const form = page.getByRole("form", { name: "Regularization filters" }); await form.getByLabel("Search").fill("Phase 2A"); await form.getByRole("button", { name: "Apply filters" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click(); await expect(page.getByText("Phase 2A regularization 26")).toBeVisible(); await page.evaluate(() => history.back()); await expect(page).not.toHaveURL(/page=2/);
  await page.getByRole("button", { name: "Inspect" }).first().click(); await page.getByRole("button", { name: "Review request" }).click(); const dialog = page.getByRole("dialog", { name: /Review Phase 2A regularization 1/ });
  await dialog.getByLabel("HR decision note").fill("Approved by HR after local review.");
  await page.route("**/api/hr-admin/attendance-regularizations/phase2a-reg-1/approve", (route) => { items = items.map((item) => item.id === "phase2a-reg-1" ? { ...item, status: "approved", manager_comment: "Approved by HR after local review." } : item); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(items[0]) }); });
  await dialog.getByRole("button", { name: "Approve request" }).click(); await expect(dialog).toHaveCount(0); await expect(page.getByText("Phase 2A regularization 1", { exact: true }).locator("xpath=ancestor::tr")).toContainText("Approved");
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

test("regularization accepted decision preserves note and prevents resubmission on uncertain confirmation", async ({ page }) => {
  await open(page, "/hr-admin/attendance-regularizations", "Regularizations"); const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page); const base = await regularizationFixture(page);
  const items = [{ ...base.items[0], id: "phase2a-reg-uncertain", employee_name: "Phase 2A uncertain request", status: "pending" }]; let failed = false; let writes = 0;
  await page.route("**/api/hr-admin/attendance-regularizations/workspace?**", (route) => regularizationResponse(base, items, route, failed));
  await page.getByRole("form", { name: "Regularization filters" }).getByRole("button", { name: "Apply filters" }).click(); await page.getByRole("button", { name: "Inspect" }).click(); const note = page.getByLabel("Decision note"); await note.fill("Retain this HR note.");
  await page.route("**/api/hr-admin/attendance-regularizations/phase2a-reg-uncertain/reject", (route) => { writes += 1; failed = true; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...items[0], status: "rejected" }) }); });
  await page.getByRole("button", { name: "Reject", exact: true }).click(); await expect(page.locator('.notice[role="alert"]').filter({ hasText: "Do not submit it again" })).toBeVisible(); await expect(note).toHaveValue("Retain this HR note."); await page.getByRole("button", { name: "Reject", exact: true }).click({ force: true }).catch(() => undefined); expect(writes).toBe(1);
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

test("attendance assignment filters, create, edit, and conflict checks remain local", async ({ page }) => {
  await open(page, "/hr-admin/attendance-policy-assignments", "Attendance assignments"); const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await (await (await page.request.get("/api/hr-admin/attendance-policy-assignments/workspace")).json()); let items = [...base.items];
  await page.route("**/api/hr-admin/attendance-policy-assignments/workspace", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items, state: "live" }) }));
  const toolbar = page.getByTestId("attendance-policy-assignments-toolbar"); await toolbar.getByRole("textbox", { name: "Search" }).fill(items[0].policy_name); await expect(page.getByRole("table")).toContainText(items[0].policy_name); await toolbar.getByRole("button", { name: "Clear filters" }).click();
  await page.route("**/api/hr-admin/attendance-policy-assignments/conflicts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ has_conflicts: false, has_blocking_conflict: false, summary: "No active overlaps.", candidate_scope: [], conflicts: [] }) }));
  await page.getByRole("button", { name: "Create attendance assignment" }).click(); const create = page.getByRole("dialog", { name: "Create attendance assignment" }); await create.getByLabel("Attendance policy").selectOption({ index: 1 });
  await page.route("**/api/hr-admin/attendance-policy-assignments", async (route) => { const body = route.request().postDataJSON(); const created = { ...items[0], id: "phase2a-created-assignment", policy_id: body.attendance_policy_id, policy_name: "Phase 2A created policy", priority: body.priority, is_active: body.is_active }; items = [...items, created]; return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(created) }); });
  await create.getByRole("button", { name: "Create assignment" }).click(); await expect(create).toHaveCount(0); await expect(page.getByRole("table")).toContainText("Phase 2A created policy");
  await page.getByRole("row").filter({ hasText: "Phase 2A created policy" }).getByRole("button", { name: "Inspect" }).click(); await page.getByRole("button", { name: "Edit assignment" }).click(); const edit = page.getByRole("dialog", { name: /Edit Phase 2A created policy/ }); await edit.getByLabel("Priority").fill("777");
  await page.route("**/api/hr-admin/attendance-policy-assignments/phase2a-created-assignment", async (route) => { const body = route.request().postDataJSON(); items = items.map((item) => item.id === "phase2a-created-assignment" ? { ...item, priority: body.priority } : item); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(items.find((item) => item.id === "phase2a-created-assignment")) }); });
  await edit.getByRole("button", { name: "Save changes" }).click(); await expect(edit).toHaveCount(0); await expect(page.getByRole("row").filter({ hasText: "Phase 2A created policy" })).toContainText("777");
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

test("assignment resolution keeps the last confirmed result when a later lookup fails", async ({ page }) => {
  await open(page, "/hr-admin/attendance-policy-assignments", "Attendance assignments"); const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const employee = { id: "phase2a-employee", name: "Phase 2A Resolver", employee_code: "P2AR" }; let fail = false;
  await page.route("**/api/hr-admin/employees/option-search?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [employee], total_count: 1 }) }));
  await page.route("**/api/hr-admin/attendance-policy-assignments/resolve", (route) => fail ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Resolution read failed." }) }) : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ has_resolution: true, employee_id: employee.id, employee_name: employee.name, policy_id: "policy", policy_name: "Phase 2A resolved policy", assignment_id: "assignment", priority: 500, scope_labels: ["Employee override"], summary: "Employee override wins." }) }));
  const inspector = page.locator(".workspace-card--compact").filter({ has: page.getByRole("heading", { name: "Resolution inspector" }) }); await inspector.getByPlaceholder("Code, name, or email").fill("P2AR"); await inspector.getByLabel("Employee").selectOption(employee.id); await inspector.getByRole("button", { name: "Inspect resolution" }).click(); await expect(inspector).toContainText("Phase 2A resolved policy");
  fail = true; await inspector.getByRole("button", { name: "Inspect resolution" }).click(); await expect(inspector.getByRole("alert")).toContainText("Resolution read failed."); await expect(inspector).toContainText("Phase 2A resolved policy");
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});
