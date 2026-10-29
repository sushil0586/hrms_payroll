import { expect, request, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8003/api/v1";

async function api(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((item) => item.name === "hrms_access_token")?.value ?? "";
  return page.request.fetch(`${apiBase}${path}`, {
    data,
    headers: token ? { Authorization: `Token ${token}` } : undefined,
    method,
  });
}

async function createRollout(page: Page, marker: string) {
  const optionsResponse = await api(page, "/hr-admin/policy-workbench-options/?include=employees%2Cshifts");
  expect(optionsResponse.status()).toBe(200);
  const options = await optionsResponse.json();
  const employee = options.employees[0] as { id: string };
  const shift = options.shifts[0] as { id: string };
  const templateResponse = await api(page, "/hr-admin/shift-roster-templates/", "POST", {
    assignment_kind: "fixed",
    code: `W16-${marker}`,
    config_snapshot: {},
    description: "Wave 16 tenant-scope fixture",
    name: `Wave 16 ${marker}`,
    shift_id: shift.id,
    status: "published",
  });
  expect(templateResponse.status(), await templateResponse.text()).toBe(201);
  const template = await templateResponse.json();
  const rolloutResponse = await api(page, "/hr-admin/shift-roster-templates/rollout/", "POST", {
    dry_run: false,
    effective_from: "2041-01-01",
    effective_to: "2041-01-05",
    employee_ids: [employee.id],
    is_primary: false,
    template_id: template.id,
  });
  expect(rolloutResponse.status(), await rolloutResponse.text()).toBe(200);
  const listResponse = await api(page, "/hr-admin/shift-roster-rollouts/?page=1&page_size=25");
  expect(listResponse.status()).toBe(200);
  const list = await listResponse.json();
  const rollout = list.items.find((item: { template_id: string }) => item.template_id === template.id);
  expect(rollout).toBeTruthy();
  return { rollout, template };
}

test("CRUD-01570 rollout history rejects anonymous, ESS, and foreign-tenant access", async ({ page }, testInfo) => {
  let tenantA: IsolatedQaWorkspace | undefined;
  let tenantB: IsolatedQaWorkspace | undefined;
  try {
    tenantA = await provisionIsolatedQaWorkspace(testInfo);
    tenantB = await provisionIsolatedQaWorkspace(testInfo);

    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates", workspacePersona(tenantA, "hr_admin"));
    const a = await createRollout(page, `A-${tenantA.seedRef.slice(-8)}`);
    await page.goto("/hr-admin/shift-roster-templates?rollout_page=1&rollout_page_size=25");
    await expect(page.getByTestId("roster-rollout-history")).toContainText(a.template.name);

    const anonymous = await request.newContext();
    try {
      expect((await anonymous.get(`${apiBase}/hr-admin/shift-roster-rollouts/?page=1&page_size=25`)).status()).toBe(401);
    } finally {
      await anonymous.dispose();
    }

    await gotoAuthenticated(page, "/ess/attendance", workspacePersona(tenantA, "employee"));
    expect((await api(page, "/hr-admin/shift-roster-rollouts/?page=1&page_size=25")).status()).toBe(403);

    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates", workspacePersona(tenantB, "hr_admin"));
    const bBefore = await (await api(page, "/hr-admin/shift-roster-rollouts/?page=1&page_size=25")).json();
    expect(bBefore.items.some((item: { id: string }) => item.id === a.rollout.id)).toBe(false);
    const b = await createRollout(page, `B-${tenantB.seedRef.slice(-8)}`);
    await page.goto("/hr-admin/shift-roster-templates?rollout_page=1&rollout_page_size=25");
    await expect(page.getByTestId("roster-rollout-history")).toContainText(b.template.name);
    await expect(page.getByTestId("roster-rollout-history")).not.toContainText(a.template.name);

    await gotoAuthenticated(page, "/hr-admin/shift-roster-templates", workspacePersona(tenantA, "hr_admin"));
    const aAfter = await (await api(page, "/hr-admin/shift-roster-rollouts/?page=1&page_size=25")).json();
    expect(aAfter.items.some((item: { id: string }) => item.id === a.rollout.id)).toBe(true);
    expect(aAfter.items.some((item: { id: string }) => item.id === b.rollout.id)).toBe(false);
  } finally {
    await cleanupIsolatedQaWorkspace(tenantB);
    await cleanupIsolatedQaWorkspace(tenantA);
  }
});

test("CRUD-04196 assignment read success agrees across browser, API, reload, and durable state", async ({ page }, testInfo) => {
  let workspace: IsolatedQaWorkspace | undefined;
  try {
    workspace = await provisionIsolatedQaWorkspace(testInfo);
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", workspacePersona(workspace, "hr_admin"));
    const beforeResponse = await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100");
    expect(beforeResponse.status()).toBe(200);
    const before = await beforeResponse.json();
    const assignment = before.items.find(
      (item: { employee_code: string }) => item.employee_code === workspace!.manifest.credentials.employee.employee_code,
    );
    expect(assignment).toBeTruthy();

    await page.goto(`/hr-admin/employee-shift-assignments?q=${encodeURIComponent(assignment.employee_code)}`);
    await expect(page.getByRole("heading", { name: "Shift assignments" })).toBeVisible();
    await expect(page.getByText(assignment.employee_code, { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Inspect" }).first().click();
    const detail = page.getByRole("complementary", { name: "Shift assignment detail" });
    await expect(detail).toContainText(assignment.employee_code);
    await expect(detail).toContainText(assignment.shift);
    await expect(page.locator(".notice[role='alert']")).toHaveCount(0);

    await page.reload();
    await expect(page.getByText(assignment.employee_code, { exact: true }).first()).toBeVisible();
    const after = await (await api(page, "/hr-admin/employee-shift-assignments/?page=1&page_size=100")).json();
    const persisted = after.items.find((item: { id: string }) => item.id === assignment.id);
    expect(persisted).toMatchObject({
      effective_from: assignment.effective_from,
      effective_to: assignment.effective_to,
      employee_code: assignment.employee_code,
      shift: assignment.shift,
    });
    expect(after.total_count).toBe(before.total_count);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
