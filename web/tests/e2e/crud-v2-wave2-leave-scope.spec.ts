import { expect, test, type Page } from "@playwright/test";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";
import { gotoAuthenticated } from "../helpers/staging-auth";

let own: IsolatedQaWorkspace;
let foreign: IsolatedQaWorkspace;

async function login(page: Page, workspace: IsolatedQaWorkspace, role: "hr_admin" | "manager" | "employee") {
  const actor = workspacePersona(workspace, role);
  const target = role === "employee" ? "/ess/overview" : role === "manager" ? "/mss/approvals" : "/hr-admin/leave-policies";
  await gotoAuthenticated(page, target, actor);
}

function rows(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown[] }).items)) {
    return (payload as { items: Array<Record<string, unknown>> }).items;
  }
  return [];
}

async function api(page: Page, path: string, method = "GET", data?: unknown) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  const backendPath = path.replace(/^\/api/, "");
  const [pathname, query] = backendPath.split("?", 2);
  const normalizedPath = `${pathname.endsWith("/") ? pathname : `${pathname}/`}${query ? `?${query}` : ""}`;
  const response = await page.request.fetch(`${process.env.HRMS_API_BASE_URL}${normalizedPath}`, {
    method,
    ...(data === undefined ? {} : { data }),
    headers: token ? { authorization: `Token ${token}` } : {},
  });
  return { status: response.status(), payload: await response.json().catch(() => ({})) };
}

test.describe("CRUD V2 Wave 2 leave scope denial", () => {
  test.beforeAll(async ({}, info) => {
    test.setTimeout(180_000);
    own = await provisionIsolatedQaWorkspace(info);
    foreign = await provisionIsolatedQaWorkspace({ ...info, title: `${info.title}-foreign` } as typeof info);
  });

  test.afterAll(async () => {
    await cleanupIsolatedQaWorkspace(foreign);
    await cleanupIsolatedQaWorkspace(own);
  });

  test("CRUD-00423 CRUD-00449 CRUD-00501 deny employee anonymous and foreign-tenant access without mutation", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page, own, "hr_admin");

    const policyList = await api(page, "/api/hr-admin/leave-policies");
    const typeList = await api(page, "/api/hr-admin/leave-types");
    const assignmentList = await api(page, "/api/hr-admin/leave-policy-assignments?page=1&page_size=50");
    expect(policyList.status).toBe(200);
    expect(typeList.status).toBe(200);
    expect(assignmentList.status).toBe(200);

    const policies = rows(policyList.payload);
    const types = rows(typeList.payload);
    const assignments = rows(assignmentList.payload);
    expect(policies.length).toBeGreaterThan(0);
    expect(types.length).toBeGreaterThan(0);
    expect(assignments.length).toBeGreaterThan(0);
    const policyId = String(policies[0].id);
    const typeId = String(types[0].id);
    const assignmentId = String(assignments[0].id);
    const before = { policies: policies.length, types: types.length, assignments: assignments.length };

    await login(page, own, "employee");
    await page.goto("/hr-admin/leave-policies", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Leave policies" })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(String(policies[0].name ?? ""));

    for (const path of [
      "/api/hr-admin/leave-policies",
      "/api/hr-admin/leave-types",
      "/api/hr-admin/leave-policy-assignments?page=1&page_size=50",
    ]) {
      expect((await api(page, path)).status).toBe(403);
    }
    expect((await api(page, `/api/hr-admin/leave-policies/${policyId}`, "PATCH", { name: "Blocked policy mutation" })).status).toBe(403);
    expect((await api(page, `/api/hr-admin/leave-types/${typeId}`, "PATCH", { name: "Blocked type mutation" })).status).toBe(403);
    expect((await api(page, `/api/hr-admin/leave-policy-assignments/${assignmentId}`, "PATCH", { priority: 9999 })).status).toBe(403);

    await page.request.post("/api/auth/logout");
    for (const path of [
      "/api/hr-admin/leave-policies",
      "/api/hr-admin/leave-types",
      "/api/hr-admin/leave-policy-assignments?page=1&page_size=50",
    ]) {
      expect((await api(page, path)).status).toBe(401);
    }

    await login(page, foreign, "hr_admin");
    for (const path of [
      `/api/hr-admin/leave-policies/${policyId}`,
      `/api/hr-admin/leave-types/${typeId}`,
      `/api/hr-admin/leave-policy-assignments/${assignmentId}`,
    ]) {
      expect([403, 404]).toContain((await api(page, path)).status);
    }
    const crossReportee = await api(page, `/api/manager/leave-requests/${own.manifest.fixtures.leave_request_id}/approve`, "POST", {
      comment: "Forbidden cross-tenant approval",
    });
    expect([403, 404]).toContain(crossReportee.status);

    await login(page, own, "hr_admin");
    const afterPolicies = rows((await api(page, "/api/hr-admin/leave-policies")).payload);
    const afterTypes = rows((await api(page, "/api/hr-admin/leave-types")).payload);
    const afterAssignments = rows((await api(page, "/api/hr-admin/leave-policy-assignments?page=1&page_size=50")).payload);
    expect({ policies: afterPolicies.length, types: afterTypes.length, assignments: afterAssignments.length }).toEqual(before);
    expect(afterPolicies.find((item) => item.id === policyId)?.name).not.toBe("Blocked policy mutation");
    expect(afterTypes.find((item) => item.id === typeId)?.name).not.toBe("Blocked type mutation");
    expect(afterAssignments.find((item) => item.id === assignmentId)?.priority).not.toBe(9999);
  });
});
