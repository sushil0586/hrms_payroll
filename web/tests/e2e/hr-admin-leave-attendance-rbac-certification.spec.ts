import { expect, type APIResponse, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, tenantAdmin } from "../helpers/staging-auth";

type CreatedRole = {
  id: string;
};

type TenantConsole = {
  role_management: {
    roles: Array<{
      id: string;
      code: string;
      permission_keys: string[];
    }>;
  };
  membership_management: {
    memberships?: Array<{
      id: string;
      username: string;
      role_ids: string[];
    }>;
    recent_memberships: Array<{
      id: string;
      username: string;
      role_ids: string[];
    }>;
  };
};

const rbacPassword = "Password@123";

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function authHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

async function loginViaApi(page: Page, persona: { username: string; password: string }) {
  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  const response = await page.request.post("/api/auth/login", {
    data: {
      identifier: persona.username,
      password: persona.password,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function getTenantConsole(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/tenant-admin/console/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as TenantConsole;
}

async function createTenantRole(page: Page, input: { name: string; code: string; description: string; permissions: string[] }) {
  const currentConsole = await getTenantConsole(page).catch(() => null);
  const existingRole = currentConsole?.role_management.roles.find((role) => role.code === input.code);
  if (existingRole) {
    return existingRole;
  }

  const response = await page.request.post("/api/tenant-admin/roles", {
    data: {
      name: input.name,
      code: input.code,
      description: input.description,
      is_active: true,
      permission_keys: input.permissions,
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const payload = (await response.json()) as { role: CreatedRole };
  return payload.role;
}

async function ensureSetupRoleOnSeedAdmin(page: Page, suffix: number) {
  const setupRole = await createTenantRole(page, {
    name: `QA HR RBAC Setup ${suffix}`,
    code: `qa-hr-rbac-setup-${suffix}`,
    description: "Temporary setup role for HR leave and attendance RBAC browser certification.",
    permissions: ["employees.create", "employees.access.manage"],
  });
  const consolePayload = await getTenantConsole(page);
  const memberships = consolePayload.membership_management.memberships ?? consolePayload.membership_management.recent_memberships;
  const seedAdminMembership = memberships.find((membership) => membership.username === tenantAdmin.username || membership.username === hrAdmin.username);
  expect(seedAdminMembership, `Expected seed admin membership for ${tenantAdmin.username} or ${hrAdmin.username}`).toBeTruthy();
  const nextRoleIds = Array.from(new Set([...seedAdminMembership!.role_ids, setupRole.id]));
  const response = await page.request.patch(`/api/tenant-admin/memberships/${seedAdminMembership!.id}`, {
    data: {
      action: "update_roles",
      role_ids: nextRoleIds,
      note: "Temporary HR RBAC setup permissions for browser certification.",
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

async function createRoleBackedUser(page: Page, input: { suffix: number; roleName: string; roleCode: string; permissions: string[] }) {
  await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
  await expectPageReady(page, "Roles & Permissions");

  const rolePayload = await createTenantRole(page, {
    name: `${input.roleName} ${input.suffix}`,
    code: `${input.roleCode}-${input.suffix}`,
    description: "Browser certification role for HR Admin leave and attendance RBAC.",
    permissions: input.permissions,
  });
  await ensureSetupRoleOnSeedAdmin(page, input.suffix);

  const username = `${input.roleCode}.${input.suffix}`;
  const email = `${username}@example.com`;
  const employeeCodePrefix = input.roleCode.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();

  await loginViaApi(page, hrAdmin);

  const employeeResponse = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: `QA-HR-${employeeCodePrefix}-${String(input.suffix).slice(-10)}`,
      employment_status: "active",
      first_name: "QA",
      last_name: "HR RBAC",
      work_email: email,
      date_of_joining: "2026-04-01",
    },
  });
  expect(employeeResponse.ok(), await employeeResponse.text()).toBeTruthy();
  const employeePayload = (await employeeResponse.json()) as { id: string };

  const accessResponse = await page.request.post(`/api/hr-admin/employees/${employeePayload.id}/access`, {
    data: {
      username,
      email,
      first_name: "QA",
      last_name: "HR RBAC",
      display_name: "QA HR RBAC",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: [rolePayload.id],
      password: rbacPassword,
    },
  });
  expect(accessResponse.ok(), await accessResponse.text()).toBeTruthy();

  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  return { username, password: rbacPassword };
}

async function expectForbiddenWithPermission(page: Page, responsePromise: Promise<APIResponse>, permission: string) {
  const response = await responsePromise;
  expect(response.status()).toBe(403);
  expect(JSON.stringify(await response.json())).toContain(permission);
}

test.describe("HR Admin leave and attendance RBAC certification", () => {
  test.setTimeout(120_000);

  test.skip(!process.env.HRMS_API_BASE_URL, "Leave and attendance RBAC proof requires a live HRMS API.");

  test("certifies leave viewer gets read-only setup, balances, and backend denials", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Leave Viewer",
      roleCode: "qa-leave-viewer",
      permissions: ["leave.view"],
    });

    await gotoAuthenticated(page, "/hr-admin/leave-policies", persona);
    await expectPageReady(page, /Leave policy admin/i);
    await expect(page.getByRole("main").getByRole("link", { name: "Create leave policy" })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link", { name: "Edit" })).toHaveCount(0);

    await page.goto("/hr-admin/leave-policies/new", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/hr-admin\/leave-policies$/);
    await expectPageReady(page, /Leave policy admin/i);

    await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments", persona);
    await expectPageReady(page, /Leave policy assignments by scope/i);
    await expect(page.getByRole("main").getByRole("link", { name: "Create leave assignment" })).toHaveCount(0);
    await expect(page.getByText("Read-only leave assignment view.")).toBeVisible();

    await gotoAuthenticated(page, "/hr-admin/leave-balances", persona);
    await expectPageReady(page, "Leave balances");
    await expect(page.getByText("Read-only leave balance view.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply balance action" })).toBeDisabled();

    await expectForbiddenWithPermission(
      page,
      page.request.post("/api/hr-admin/leave-types", {
        data: {
          code: `DENIED-${Date.now()}`,
          name: "Denied Leave Type",
          category: "paid",
          is_active: true,
        },
      }),
      "leave.policies.manage",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post("/api/hr-admin/leave-balances/actions", {
        data: {
          employee_id: "00000000-0000-4000-8000-000000000000",
          leave_policy_id: "00000000-0000-4000-8000-000000000000",
          action: "credit_adjustment",
          units: "1.00",
          effective_date: "2026-09-17",
          reason: "RBAC denial proof",
        },
      }),
      "leave.balances.manage",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("certifies attendance viewer gets read-only records, regularizations, setup, and backend denials", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Attendance Viewer",
      roleCode: "qa-attendance-viewer",
      permissions: ["attendance.view"],
    });

    await gotoAuthenticated(page, "/hr-admin/attendance-records?page_size=5", persona);
    await expectPageReady(page, "Attendance records");
    await expect(page.getByText("Read-only attendance view.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Edit record" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Mark selected|Bulk approve|Bulk reject/i })).toHaveCount(0);

    await gotoAuthenticated(page, "/hr-admin/attendance-regularizations", persona);
    await expectPageReady(page, /Attendance regularization queue/i);
    await expect(page.getByText("Read-only regularization view.").first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Review request" })).toHaveCount(0);

    await gotoAuthenticated(page, "/hr-admin/shifts", persona);
    await expectPageReady(page, /Shift admin/i);
    await expect(page.getByRole("main").getByRole("link", { name: "Create shift" })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link", { name: "Edit" })).toHaveCount(0);

    await page.goto("/hr-admin/shifts/new", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/hr-admin\/shifts$/);
    await expectPageReady(page, /Shift admin/i);

    await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments", persona);
    await expectPageReady(page, /Attendance policy assignments by scope/i);
    await expect(page.getByRole("main").getByRole("link", { name: "Create attendance assignment" })).toHaveCount(0);
    await expect(page.getByText("Read-only attendance assignment view.")).toBeVisible();

    await expectForbiddenWithPermission(
      page,
      page.request.post("/api/hr-admin/shifts", {
        data: {
          code: `DENIED-${Date.now()}`,
          name: "Denied Shift",
          starts_at: "09:00",
          ends_at: "18:00",
          is_active: true,
        },
      }),
      "attendance.policies.manage",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post("/api/hr-admin/attendance-records/bulk-actions", {
        data: {
          action: "mark_present",
          record_ids: ["00000000-0000-4000-8000-000000000000"],
          notes: "RBAC denial proof",
        },
      }),
      "attendance.records.manage",
    );
    await expectNoHorizontalOverflow(page);
  });
});
