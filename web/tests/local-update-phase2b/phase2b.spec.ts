import { expect, test, type Page, type Route } from "@playwright/test";

import { documentNavigationCount, expectLocalUpdateShell, expectNoDocumentNavigation, markLocalUpdateShell } from "../helpers/local-update-contract";

test.describe.configure({ timeout: 75_000 });

async function open(page: Page, route: string, heading: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("[data-local-update-hydrated='true']")).toBeVisible();
}

test("shift filters remain local and view-only actions stay unavailable", async ({ page }) => {
  await open(page, "/hr-admin/shifts", "Shifts"); const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/hr-admin/shifts/workspace")).json(); let items = [...base.items];
  await page.route("**/api/hr-admin/shifts/workspace", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items, state: "live" }) }));
  const toolbar = page.getByTestId("shifts-toolbar"); await toolbar.getByLabel("Search").fill(items[0].name); await expect(page.getByRole("table")).toContainText(items[0].name); await toolbar.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("button", { name: "Edit shift" })).toBeDisabled(); await expect(page.getByRole("button", { name: "Create shift" })).toHaveCount(0);
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

test("holiday filters remain local and view-only actions stay unavailable", async ({ page }) => {
  await open(page, "/hr-admin/holiday-calendars", "Holiday calendars"); const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/hr-admin/holiday-calendars/workspace")).json(); let items = [...base.items];
  await page.route("**/api/hr-admin/holiday-calendars/workspace", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items, state: "live" }) }));
  const toolbar = page.getByTestId("holiday-calendars-toolbar"); await toolbar.getByLabel("Search").fill(items[0].name); await expect(page.getByRole("table")).toContainText(items[0].name); await toolbar.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("button", { name: "Edit calendar" })).toBeDisabled(); await expect(page.getByRole("button", { name: "Create calendar" })).toHaveCount(0);
  await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

function pagedResponse(base: any, source: any[], route: Route) { const p = new URL(route.request().url()).searchParams; const page = Number(p.get("page") || 1); const size = Number(p.get("page_size") || 10); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...base, items: source.slice((page - 1) * size, page * size), total_count: source.length, total_pages: Math.max(1, Math.ceil(source.length / size)), page, page_size: size, state: "live" }) }); }

test("shift assignment filters, pagination, Back, and failed reads remain local", async ({ page }) => {
  await open(page, "/hr-admin/employee-shift-assignments", "Shift assignments"); const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/hr-admin/employee-shift-assignments/workspace?page=1&page_size=10")).json(); const source = base.items[0]; let items = Array.from({ length: 11 }, (_, index) => ({ ...source, id: `phase2b-assignment-${index + 1}`, employee: `Phase 2B employee ${index + 1}`, employee_code: `P2B${index + 1}` }));
  let failed = false; await page.route("**/api/hr-admin/employee-shift-assignments/workspace?**", (route) => failed ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Assignment queue read failed." }) }) : pagedResponse(base, items, route)); const form = page.getByRole("form", { name: "Shift assignment filters" }); await form.getByLabel("Search").fill("Phase 2B"); await form.getByRole("button", { name: "Apply filters" }).click(); await expect(page).toHaveURL(/q=Phase(%20|\+)2B/);
  await page.getByRole("link", { name: "Next", exact: true }).click(); await expect(page).toHaveURL(/page=2/); await expect(page.getByText("Phase 2B employee 11")).toBeVisible(); await page.evaluate(() => history.back()); await expect(page).not.toHaveURL(/page=2/);
  failed = true; const confirmed = page.url(); await form.getByLabel("Search").fill("retained assignment draft"); await form.getByRole("button", { name: "Apply filters" }).click(); await expect(page.locator('.notice[role="alert"]')).toContainText("Assignment queue read failed."); expect(page.url()).toBe(confirmed); await expect(form.getByLabel("Search")).toHaveValue("retained assignment draft"); await expect(page.getByRole("button", { name: "Create assignment" })).toHaveCount(0); await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});

test("roster filters, pagination, Back, and failed reads remain local", async ({ page }) => {
  await open(page, "/hr-admin/shift-roster-templates", "Roster templates"); const shell = await markLocalUpdateShell(page); const navigations = await documentNavigationCount(page);
  const base = await (await page.request.get("/api/hr-admin/shift-roster-templates/workspace?page=1&page_size=10")).json(); const source = base.items[0]; let items = Array.from({ length: 11 }, (_, index) => ({ ...source, id: `phase2b-roster-${index + 1}`, name: `Phase 2B roster ${index + 1}`, code: `P2BR${index + 1}` }));
  let failed = false; await page.route("**/api/hr-admin/shift-roster-templates/workspace?**", (route) => failed ? route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Roster queue read failed." }) }) : pagedResponse(base, items, route)); const form = page.getByRole("form", { name: "Roster template filters" }); await form.getByLabel("Search").fill("Phase 2B"); await form.getByRole("button", { name: "Apply filters" }).click(); await expect(page).toHaveURL(/q=Phase(%20|\+)2B/);
  await page.getByRole("link", { name: "Next", exact: true }).click(); await expect(page).toHaveURL(/page=2/); await expect(page.getByText("Phase 2B roster 11")).toBeVisible(); await page.evaluate(() => history.back()); await expect(page).not.toHaveURL(/page=2/);
  failed = true; const confirmed = page.url(); await form.getByLabel("Search").fill("retained roster draft"); await form.getByRole("button", { name: "Apply filters" }).click(); await expect(page.locator('.notice[role="alert"]').first()).toContainText("Roster queue read failed."); expect(page.url()).toBe(confirmed); await expect(form.getByLabel("Search")).toHaveValue("retained roster draft"); await expect(page.getByRole("button", { name: "Create template" })).toHaveCount(0); await expectLocalUpdateShell(shell); await expectNoDocumentNavigation(page, navigations);
});
