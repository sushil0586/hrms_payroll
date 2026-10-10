import { expect, type Page } from "@playwright/test";

import { expectPageReady } from "./assertions";
import { gotoAuthenticated, hrAdmin, tenantAdmin, type Persona } from "./staging-auth";

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

async function loginViaApi(page: Page, persona: Persona) {
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
  const response = await page.request.get("/api/tenant-admin/console");
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as TenantConsole;
}

async function forcePayrollEntitledPlan(page: Page) {
  await loginViaApi(page, hrAdmin);
  const response = await page.request.patch("/api/hr-admin/saas-control-plane", {
    data: {
      subscription_plan: "enterprise",
      status: "active",
      billing_provider_ref: "manual_billing.v1",
      billing_account_ref: "browser-certification",
      current_period_end: "2027-03-31",
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
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
    name: `QA Payroll Setup ${suffix}`,
    code: `qa-payroll-setup-${suffix}`,
    description: "Temporary setup role for payroll lifecycle browser certification.",
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
      note: "Temporary payroll setup permissions for browser certification.",
    },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
}

export async function createRoleBackedTenantUser(
  page: Page,
  input: { suffix: number; roleName: string; roleCode: string; permissions: string[] },
) {
  await forcePayrollEntitledPlan(page);
  await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
  await expectPageReady(page, "Roles & Permissions");

  const rolePayload = await createTenantRole(page, {
    name: `${input.roleName} ${input.suffix}`,
    code: `${input.roleCode}-${input.suffix}`,
    description: "Browser certification role.",
    permissions: input.permissions,
  });
  await ensureSetupRoleOnSeedAdmin(page, input.suffix);

  const username = `${input.roleCode}.${input.suffix}`;
  const email = `${username}@example.com`;
  const employeeCodePrefix = input.roleCode.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();

  await loginViaApi(page, hrAdmin);

  const employeeResponse = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: `QA-PAY-${employeeCodePrefix}-${String(input.suffix).slice(-10)}`,
      employment_status: "active",
      first_name: "QA",
      last_name: "Payroll Operator",
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
      last_name: "Payroll Operator",
      display_name: "QA Payroll Operator",
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

export function payrollLifecyclePermissions() {
  return [
    "employees.view",
    "payroll.inputs.view",
    "payroll.inputs.manage",
    "payroll.calculate",
    "payroll.review",
    "payroll.approve",
    "payroll.lock",
    "payroll.outputs.view",
    "payroll.outputs.download",
    "payroll.publish",
    "finance.handoff.view",
    "finance.handoff.create",
    "finance.handoff.transmit",
    "finance.handoff.acknowledge",
    "finance.bank_advice.export",
  ];
}

export async function createPayrollLifecycleOperator(page: Page, suffix = Date.now()) {
  return createRoleBackedTenantUser(page, {
    suffix,
    roleName: "QA Payroll Lifecycle Operator",
    roleCode: "qa-payroll-lifecycle",
    permissions: payrollLifecyclePermissions(),
  });
}
