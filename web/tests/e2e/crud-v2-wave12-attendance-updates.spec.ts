import { expect, test, type Page } from "@playwright/test";
import { expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8003/api/v1";
const suffix = Date.now().toString(36).toUpperCase();

async function api(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((item) => item.name === "hrms_access_token")?.value ?? "";
  return page.request.fetch(`${apiBase}${path}`, { method, data, headers: token ? { Authorization: `Token ${token}` } : undefined });
}

async function options(page: Page) {
  const employees = await (await api(page, "/hr-admin/employees/option-search/?limit=25")).json();
  const shifts = await (await api(page, "/hr-admin/attendance-operations/workbench-options/?include_shifts=true")).json();
  const assignments = await (await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100")).json();
  const assigned = new Set(assignments.items.map((item: { employee_id: string }) => item.employee_id));
  return { employee: employees.items.find((item: { id: string }) => !assigned.has(item.id)) ?? employees.items.at(-1), shift: shifts.shifts[0] };
}

test.describe.serial("CRUD V2 Wave 12 attendance updates", () => {
  test.beforeEach(async ({ page }) => gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", hrAdmin));

  test("CRUD-00221 CRUD-00223 CRUD-04199 CRUD-04200 CRUD-04201 assignment update persistence, rejection and duplicate prevention", async ({ page }) => {
    const { employee, shift } = await options(page);
    const created = await api(page, "/hr-admin/employee-shift-assignments/", "POST", { employee_id: employee.id, shift_id: shift.id, assignment_kind: "fixed", effective_from: "2031-01-01", effective_to: "2031-12-31", is_primary: true, config_snapshot: {} });
    expect(created.status(), await created.text()).toBe(201);
    const item = await created.json();
    await page.goto(`/hr-admin/employee-shift-assignments/${item.id}/edit`);
    await expectPageReady(page, "Edit assignment");
    await page.getByLabel("Effective to").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/employee-shift-assignments$/);
    expect((await (await api(page, `/hr-admin/employee-shift-assignments/${item.id}/`)).json()).effective_to).toBeNull();

    const rejected = await api(page, `/hr-admin/employee-shift-assignments/${item.id}/`, "PATCH", { effective_from: "2032-02-10", effective_to: "2032-02-01" });
    expect(rejected.status()).toBe(400);
    expect(JSON.stringify(await rejected.json())).toContain("on or after");
    expect((await (await api(page, `/hr-admin/employee-shift-assignments/${item.id}/`)).json()).effective_from).toBe("2031-01-01");
    const assignmentRevision = (await (await api(page, `/hr-admin/employee-shift-assignments/${item.id}/`)).json()).updated_at;
    const [updateA, updateB] = await Promise.all([
      api(page, `/hr-admin/employee-shift-assignments/${item.id}/`, "PATCH", { is_primary: false, expected_updated_at: assignmentRevision }),
      api(page, `/hr-admin/employee-shift-assignments/${item.id}/`, "PATCH", { effective_to: "2033-12-31", expected_updated_at: assignmentRevision }),
    ]);
    expect([updateA.status(), updateB.status()].sort()).toEqual([200, 409]);
    expect((await (await api(page, `/hr-admin/employee-shift-assignments/${item.id}/`)).json()).id).toBe(item.id);

    await page.goto(`/hr-admin/employee-shift-assignments/${item.id}/edit`);
    let patches = 0;
    await page.route(`**/api/hr-admin/employee-shift-assignments/${item.id}`, async route => { if (route.request().method() === "PATCH") { patches += 1; await new Promise(r => setTimeout(r, 400)); } await route.continue(); });
    await page.getByRole("button", { name: "Save changes" }).dblclick();
    await expect(page.getByRole("button", { name: /Saving/ })).toBeDisabled();
    await expect(page).toHaveURL(/employee-shift-assignments$/);
    expect(patches).toBe(1);
  });

  test("foreign assignment identifiers fail closed without claiming CRUD-00225 historical locking", async ({ page }) => {
    const fake = "00000000-0000-4000-8000-000000000001";
    const before = await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100");
    const count = (await before.json()).total_count;
    expect((await api(page, `/hr-admin/employee-shift-assignments/${fake}/`, "PATCH", { effective_to: "2030-01-01" })).status()).toBe(404);
    expect((await (await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100")).json()).total_count).toBe(count);
  });

  test("CRUD-01586 CRUD-01587 CRUD-01588 CRUD-05012 CRUD-05013 CRUD-05014 roster update feedback and canonical state", async ({ page }) => {
    const { shift } = await options(page);
    const created = await api(page, "/hr-admin/shift-roster-templates/", "POST", { code: `W12${suffix.slice(-7)}`, name: `Wave 12 ${suffix}`, status: "draft", assignment_kind: "fixed", shift_id: shift.id, description: "clear me", config_snapshot: {} });
    expect(created.status(), await created.text()).toBe(201);
    const item = await created.json();
    await page.goto(`/hr-admin/shift-roster-templates/${item.id}/edit`);
    await page.getByLabel("Description").fill("");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/shift-roster-templates$/);
    expect((await (await api(page, `/hr-admin/shift-roster-templates/${item.id}/`)).json()).description).toBe("");

    const invalid = await api(page, `/hr-admin/shift-roster-templates/${item.id}/`, "PATCH", { assignment_kind: "weekly_rotation", config_snapshot: { rotation: { anchor_date: null, entries: [] } } });
    expect(invalid.status()).toBe(400);
    const rosterRevision = (await (await api(page, `/hr-admin/shift-roster-templates/${item.id}/`)).json()).updated_at;
    const [a, b] = await Promise.all([
      api(page, `/hr-admin/shift-roster-templates/${item.id}/`, "PATCH", { name: `Concurrent A ${suffix}`, expected_updated_at: rosterRevision }),
      api(page, `/hr-admin/shift-roster-templates/${item.id}/`, "PATCH", { name: `Concurrent B ${suffix}`, expected_updated_at: rosterRevision }),
    ]);
    expect([a.status(), b.status()].sort()).toEqual([200, 409]);
    const canonical = await (await api(page, `/hr-admin/shift-roster-templates/${item.id}/`)).json();
    expect([`Concurrent A ${suffix}`, `Concurrent B ${suffix}`]).toContain(canonical.name);

    await page.goto(`/hr-admin/shift-roster-templates/${item.id}/edit`);
    let patches = 0;
    await page.route(`**/api/hr-admin/shift-roster-templates/${item.id}`, async route => { if (route.request().method() === "PATCH") { patches += 1; await new Promise(r => setTimeout(r, 400)); } await route.continue(); });
    await page.getByRole("button", { name: "Save changes" }).dblclick();
    await expect(page.getByRole("button", { name: /Saving/ })).toBeDisabled();
    await expect(page).toHaveURL(/shift-roster-templates$/);
    expect(patches).toBe(1);
  });

  test("CRUD-01590 rejects updates to locked roster templates", async ({ page }) => {
    const { shift } = await options(page);
    const created = await api(page, "/hr-admin/shift-roster-templates/", "POST", { code: `W12L${suffix.slice(-6)}`, name: "Wave 12 locked", status: "locked", assignment_kind: "fixed", shift_id: shift.id, description: "immutable", config_snapshot: {} });
    expect(created.status()).toBe(201); const item = await created.json();
    const locked = await api(page, `/hr-admin/shift-roster-templates/${item.id}/`, "PATCH", { name: "Must not change" });
    expect(locked.status()).toBe(400);
    expect((await (await api(page, `/hr-admin/shift-roster-templates/${item.id}/`)).json()).name).toBe("Wave 12 locked");
  });
});
