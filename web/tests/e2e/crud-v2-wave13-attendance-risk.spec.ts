import { expect, test } from "@playwright/test";

import { expectPageReady } from "../helpers/assertions";
import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated, requestWithBrowserSession } from "../helpers/staging-auth";

const apiBase = process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8003/api/v1";

async function backendGet(page: import("@playwright/test").Page, path: string) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  return page.request.get(`${apiBase}${path}`, { headers: token ? { Authorization: `Token ${token}` } : undefined });
}

async function backendPost(page: import("@playwright/test").Page, path: string, data: unknown = {}) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value ?? "";
  return page.request.post(`${apiBase}${path}`, { data, headers: token ? { Authorization: `Token ${token}` } : undefined });
}

test("CRUD-00225 CRUD-04200 closed attendance history rejects assignment edits with truthful feedback", async ({ page }, testInfo) => {
  test.setTimeout(4 * 60 * 1000);
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const admin = workspacePersona(workspace, "hr_admin");
  try {
    await gotoAuthenticated(page, "/hr-admin/employee-shift-assignments", admin);
    const list = await requestWithBrowserSession(page, "/api/hr-admin/employee-shift-assignments?page=1&page_size=25");
    expect(list.status).toBe(200);
    const assignment = JSON.parse(list.body).items[0] as { id: string; employee_id: string; is_primary: boolean; updated_at: string };
    const dateUpdate = await requestWithBrowserSession(page, `/api/hr-admin/employee-shift-assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effective_from: "2029-03-01", effective_to: "2029-03-31", expected_updated_at: assignment.updated_at }),
    });
    expect(dateUpdate.status).toBe(200);

    const employeeResponse = await backendGet(page, `/hr-admin/employees/${assignment.employee_id}/`);
    expect(employeeResponse.status()).toBe(200);
    const legalEntityId = (await employeeResponse.json()).legal_entity_id as string;
    const createdResponse = await backendPost(page, "/hr-admin/attendance-closes/", {
      legal_entity_id: legalEntityId,
      period_start: "2029-03-01",
      period_end: "2029-03-31",
      idempotency_key: `wave13-${assignment.id}`,
    });
    expect(createdResponse.status()).toBe(201);
    const closeId = (await createdResponse.json()).id as string;
    for (const action of ["submit", "approve", "close"]) {
      const transition = await backendPost(page, `/hr-admin/attendance-closes/${closeId}/${action}/`);
      expect(transition.status()).toBe(200);
    }

    await gotoAuthenticated(page, `/hr-admin/employee-shift-assignments/${assignment.id}/edit`, admin);
    await expectPageReady(page, "Edit shift assignment");
    const primary = page.getByRole("checkbox", { name: "Primary assignment" });
    const original = await primary.isChecked();
    await primary.setChecked(!original);
    await page.getByRole("button", { name: "Save changes" }).click();
    const alert = page.getByRole("alert").filter({ hasText: "Save failed." });
    await expect(alert).toContainText("overlaps a closed attendance period and cannot be edited");
    await expect(primary).toBeChecked({ checked: !original });
    await expect(page).toHaveURL(new RegExp(`${assignment.id}/edit`));

    const after = await backendGet(page, `/hr-admin/employee-shift-assignments/${assignment.id}/`);
    expect(after.status()).toBe(200);
    expect((await after.json()).is_primary).toBe(assignment.is_primary);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});

test("CRUD-01349 CRUD-01350 CRUD-01353 CRUD-01354 CRUD-04871 attendance-policy assignment read package", async ({ page }, testInfo) => {
  const workspace = await provisionIsolatedQaWorkspace(testInfo);
  const admin = workspacePersona(workspace, "hr_admin");
  try {
    await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments", admin);
    await expectPageReady(page, "Attendance assignments");
    const list = await backendGet(page, "/hr-admin/attendance-policy-assignments/");
    expect(list.status()).toBe(200);
    const items = await list.json() as Array<{ id: string; policy_name: string; priority: number }>;
    expect(items.length).toBeGreaterThan(0);
    const target = items[0];

    const toolbar = page.getByTestId("attendance-policy-assignments-toolbar");
    await toolbar.getByPlaceholder("Policy, employee, scope").fill(target.policy_name);
    await expect(page.getByRole("row").filter({ hasText: target.policy_name })).toBeVisible();
    await page.getByRole("button", { name: "Inspect" }).first().click();
    const detail = page.getByRole("complementary", { name: "Attendance assignment detail" });
    await expect(detail).toContainText(target.policy_name);
    await expect(detail).toContainText(String(target.priority));
    await page.reload();
    await expect(page.getByText(target.policy_name, { exact: true }).first()).toBeVisible();

    await gotoAuthenticated(page, "/ess/attendance", workspacePersona(workspace, "employee"));
    const denied = await backendGet(page, "/hr-admin/attendance-policy-assignments/");
    expect(denied.status()).toBe(403);
  } finally {
    await cleanupIsolatedQaWorkspace(workspace);
  }
});
