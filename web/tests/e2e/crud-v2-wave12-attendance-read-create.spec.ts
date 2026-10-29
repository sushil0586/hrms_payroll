import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8003/api/v1";
const suffix = Date.now().toString(36).toUpperCase();

async function api(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((item) => item.name === "hrms_access_token")?.value ?? "";
  return page.request.fetch(`${apiBase}${path}`, {
    data,
    headers: token ? { Authorization: `Token ${token}` } : undefined,
    method,
  });
}

function formField(page: Page, label: string): Locator {
  return page.locator("label.form-field").filter({ has: page.locator("span", { hasText: new RegExp(`^${label}$`) }) }).locator("input, select, textarea").first();
}

function employeeSelect(page: Page): Locator {
  return page.locator("label").filter({ has: page.locator("span", { hasText: /^Employee$/ }) }).locator("select").first();
}

async function options(page: Page) {
  const employees = await (await api(page, "/hr-admin/employees/option-search/?limit=25")).json();
  const shifts = await (await api(page, "/hr-admin/attendance-operations/workbench-options/?include_shifts=true")).json();
  return { employees: employees.items as Array<{ id: string; employee_code: string }>, shift: shifts.shifts[0] as { id: string } };
}

async function createTemplate(page: Page, index: number, status = "draft") {
  const { shift } = await options(page);
  const response = await api(page, "/hr-admin/shift-roster-templates/", "POST", {
    assignment_kind: "fixed",
    code: `W12R${suffix.slice(-5)}${String(index).padStart(2, "0")}`,
    config_snapshot: {},
    description: `Wave 12 read fixture ${index}`,
    name: `Wave 12 roster ${suffix} ${String(index).padStart(2, "0")}`,
    shift_id: shift.id,
    status,
  });
  expect(response.status(), await response.text()).toBe(201);
  return response.json();
}

test.describe.serial("CRUD V2 Wave 12 attendance create and read", () => {
  test("CRUD-00210 CRUD-00211 CRUD-04195 block assignment replay and duplicate pending submission", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments/new", hrAdmin);
    const { employees, shift } = await options(page);
    const employeeOption = employees.at(-1)!;
    const body = {
      assignment_kind: "fixed",
      config_snapshot: {},
      effective_from: "2035-01-01",
      effective_to: "2035-01-31",
      employee_id: employeeOption.id,
      is_primary: true,
      shift_id: shift.id,
    };
    const first = await api(page, "/hr-admin/employee-shift-assignments/", "POST", body);
    expect(first.status(), await first.text()).toBe(201);
    const countBefore = (await (await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100")).json()).total_count;

    await page.getByLabel("Find person").fill(employeeOption.employee_code);
    await expect.poll(() => employeeSelect(page).locator("option").count()).toBeGreaterThan(1);
    await employeeSelect(page).selectOption(employeeOption.id);
    await page.getByLabel("Base shift").selectOption(shift.id);
    await page.getByLabel("Effective from").fill(body.effective_from);
    await page.getByLabel("Effective to").fill(body.effective_to);
    await expect(page.getByText(/Blocking overlap detected/i)).toBeVisible();
    await page.getByRole("button", { name: "Create assignment" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Save failed." })).toContainText(/overlap|conflict/i);
    expect((await (await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100")).json()).total_count).toBe(countBefore);

    await page.getByLabel("Effective from").fill("2035-02-01");
    await page.getByLabel("Effective to").fill("2035-02-28");
    await expect(page.getByText(/No blocking|Shift governance check/i).first()).toBeVisible();
    let posts = 0;
    await page.route("**/api/hr-admin/employee-shift-assignments", async (route) => {
      if (route.request().method() === "POST") {
        posts += 1;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await route.continue();
    });
    await page.getByRole("button", { name: "Create assignment" }).dblclick();
    await expect(page.getByRole("button", { name: /Saving shift assignment/ })).toBeDisabled();
    await expect(page).toHaveURL(/employee-shift-assignments$/);
    expect(posts).toBe(1);
  });

  test("CRUD-00216 CRUD-00217 CRUD-00218 assignment pagination empty state and fail-closed scope", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", hrAdmin);
    const { employees, shift } = await options(page);
    for (let index = 0; index < 12; index += 1) {
      const employeeOption = employees[index % employees.length];
      const month = String((index % 12) + 1).padStart(2, "0");
      const response = await api(page, "/hr-admin/employee-shift-assignments/", "POST", {
        assignment_kind: "fixed",
        config_snapshot: {},
        effective_from: `2037-${month}-01`,
        effective_to: `2037-${month}-20`,
        employee_id: employeeOption.id,
        is_primary: false,
        shift_id: shift.id,
      });
      expect([201, 400]).toContain(response.status());
    }
    const pageOne = await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=10");
    const pageTwo = await api(page, "/hr-admin/employee-shift-assignments/?page=2&page_size=10");
    const firstItems = (await pageOne.json()).items as Array<{ id: string }>;
    const secondItems = (await pageTwo.json()).items as Array<{ id: string }>;
    expect(firstItems.length).toBe(10);
    expect(secondItems.length).toBeGreaterThan(0);
    expect(new Set([...firstItems, ...secondItems].map((item) => item.id)).size).toBe(firstItems.length + secondItems.length);

    await page.goto("/hr-admin/employee-shift-assignments?page=1&page_size=10");
    await expectPageReady(page, "Shift assignments");
    await expect(page.getByRole("link", { name: "Next" })).toBeVisible();
    await page.goto("/hr-admin/employee-shift-assignments?q=NO-SUCH-W12-ASSIGNMENT");
    await expect(page.getByText("No shift assignments match these filters.")).toBeVisible();

    await gotoAuthenticated(page, "/ess/attendance", employee);
    expect((await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=10")).status()).toBe(403);
    const anonymous = await page.request.get(`${apiBase}/hr-admin/employee-shift-assignments/`);
    expect(anonymous.status()).toBe(401);
  });

  test("CRUD-01581 CRUD-01582 CRUD-01583 CRUD-05009 roster pagination states refresh and scope", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates", hrAdmin);
    const created = [];
    for (let index = 0; index < 12; index += 1) created.push(await createTemplate(page, index));
    const pageOne = await api(page, "/hr-admin/shift-roster-templates/?page=1&page_size=10");
    const pageTwo = await api(page, "/hr-admin/shift-roster-templates/?page=2&page_size=10");
    const firstItems = (await pageOne.json()).items as Array<{ id: string }>;
    const secondItems = (await pageTwo.json()).items as Array<{ id: string }>;
    expect(firstItems.length).toBe(10);
    expect(secondItems.length).toBeGreaterThan(0);
    expect(new Set([...firstItems, ...secondItems].map((item) => item.id)).size).toBe(firstItems.length + secondItems.length);

    await page.goto("/hr-admin/shift-roster-templates?page=1&page_size=10");
    await expectPageReady(page, "Roster templates");
    await expect(page.getByRole("link", { name: "Next" }).first()).toBeVisible();
    await page.goto(`/hr-admin/shift-roster-templates?q=${created[0].code}`);
    await expect(page.getByText(created[0].code, { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText(created[0].code, { exact: true })).toBeVisible();
    await page.goto("/hr-admin/shift-roster-templates?q=NO-SUCH-W12-ROSTER");
    await expect(page.getByText("No roster templates match these filters.")).toBeVisible();

    await gotoAuthenticated(page, "/ess/attendance", employee);
    expect((await api(page, "/hr-admin/shift-roster-templates/?page=1&page_size=10")).status()).toBe(403);
    expect((await page.request.get(`${apiBase}/hr-admin/shift-roster-templates/`)).status()).toBe(401);
  });

  test("CRUD-01566 CRUD-01567 CRUD-01568 CRUD-01569 CRUD-01570 CRUD-01571 CRUD-05003 rollout history persists and paginates", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates", hrAdmin);
    const { employees } = await options(page);
    const template = await createTemplate(page, 90, "published");
    for (let index = 0; index < 7; index += 1) {
      const month = String(index + 1).padStart(2, "0");
      const response = await api(page, "/hr-admin/shift-roster-templates/rollout/", "POST", {
        dry_run: false,
        effective_from: `2039-${month}-01`,
        effective_to: `2039-${month}-05`,
        employee_ids: [employees[index % employees.length].id],
        is_primary: false,
        template_id: template.id,
      });
      expect(response.status(), await response.text()).toBe(200);
    }
    const first = await (await api(page, "/hr-admin/shift-roster-rollouts/?page=1&page_size=6")).json();
    const second = await (await api(page, "/hr-admin/shift-roster-rollouts/?page=2&page_size=6")).json();
    expect(first.items).toHaveLength(6);
    expect(second.items.length).toBeGreaterThan(0);
    expect(new Set([...first.items, ...second.items].map((item: { id: string }) => item.id)).size).toBe(first.items.length + second.items.length);

    await page.goto("/hr-admin/shift-roster-templates?rollout_page=1&rollout_page_size=6");
    await expect(page.getByTestId("roster-rollout-history")).toContainText("Recent rollout history");
    await expect(page.getByRole("link", { name: "Next" }).last()).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("roster-rollout-history")).toBeVisible();

    await gotoAuthenticated(page, "/ess/attendance", employee);
    expect((await api(page, "/hr-admin/shift-roster-rollouts/?page=1&page_size=6")).status()).toBe(403);
  });
});
