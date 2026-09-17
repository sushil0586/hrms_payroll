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

type CommercialControl = {
  tenant: {
    subscription_plan: string;
  };
  subscription: {
    status: string;
    billing_provider_ref: string;
    billing_account_ref: string;
    current_period_end: string;
  };
};

type InputSetup = {
  runs: Array<{ id: string }>;
};

type CalculationSetup = {
  runs: Array<{ id: string }>;
};

type ReviewSetup = {
  reviews: Array<{ id: string }>;
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

async function getCommercialControl(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/saas-control-plane/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as CommercialControl;
}

async function patchCommercialControl(page: Page, payload: Record<string, string>) {
  const response = await page.request.patch("/api/hr-admin/saas-control-plane", { data: payload });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as CommercialControl;
}

async function forcePayrollEntitledPlan(page: Page) {
  await loginViaApi(page, hrAdmin);
  const original = await getCommercialControl(page);
  await patchCommercialControl(page, {
    subscription_plan: "enterprise",
    status: "active",
    billing_provider_ref: original.subscription.billing_provider_ref || "manual_billing.v1",
    billing_account_ref: original.subscription.billing_account_ref,
    current_period_end: original.subscription.current_period_end,
  });
  return original;
}

async function restoreCommercialControl(page: Page, original: CommercialControl | null) {
  if (!original) {
    return;
  }
  await loginViaApi(page, hrAdmin);
  await patchCommercialControl(page, {
    subscription_plan: original.tenant.subscription_plan,
    status: original.subscription.status,
    billing_provider_ref: original.subscription.billing_provider_ref,
    billing_account_ref: original.subscription.billing_account_ref,
    current_period_end: original.subscription.current_period_end,
  });
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
    name: `QA Lifecycle Setup ${suffix}`,
    code: `qa-lifecycle-setup-${suffix}`,
    description: "Temporary setup role for payroll lifecycle RBAC browser certification.",
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
      note: "Temporary payroll lifecycle RBAC setup permissions for browser certification.",
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
    description: "Browser certification role for payroll lifecycle RBAC.",
    permissions: input.permissions,
  });
  await ensureSetupRoleOnSeedAdmin(page, input.suffix);

  const username = `${input.roleCode}.${input.suffix}`;
  const email = `${username}@example.com`;
  const employeeCodePrefix = input.roleCode.replace(/[^a-z0-9]/gi, "").slice(0, 12).toUpperCase();

  await loginViaApi(page, hrAdmin);

  const employeeResponse = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: `QA-LIFE-${employeeCodePrefix}-${String(input.suffix).slice(-10)}`,
      employment_status: "active",
      first_name: "QA",
      last_name: "Lifecycle RBAC",
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
      last_name: "Lifecycle RBAC",
      display_name: "QA Lifecycle RBAC",
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

async function getInputSetup(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-input-snapshot-setup/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as InputSetup;
}

async function getCalculationSetup(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-calculation-setup/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as CalculationSetup;
}

async function getReviewSetup(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-review-setup/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return (await response.json()) as ReviewSetup;
}

test.describe("Payroll lifecycle RBAC certification", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);
  test.skip(!process.env.HRMS_API_BASE_URL, "Payroll lifecycle RBAC proof requires a live HRMS API.");

  let originalCommercialControl: CommercialControl | null = null;

  test.beforeEach(async ({ page }) => {
    originalCommercialControl = await forcePayrollEntitledPlan(page);
  });

  test.afterEach(async ({ page }) => {
    await restoreCommercialControl(page, originalCommercialControl);
    originalCommercialControl = null;
  });

  test("certifies payroll input viewer cannot manage runs, snapshots, or locks", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Payroll Input Viewer",
      roleCode: "qa-payroll-input-viewer",
      permissions: ["payroll.inputs.view"],
    });

    await gotoAuthenticated(page, "/hr-admin/payroll-inputs", persona);
    await expectPageReady(page, "Payroll Inputs");
    await expect(page.getByRole("button", { name: /^(Create|Save) run$/ })).toBeDisabled();
    await expect(page.getByText("Requires payroll.inputs.manage.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Create snapshot" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Lock selected run inputs" })).toBeDisabled();
    await expect(page.getByText("Requires payroll.lock.").first()).toBeVisible();

    const setup = await getInputSetup(page);
    test.skip(!setup.runs.length, "No payroll run exists for input lock denial proof.");
    await expectForbiddenWithPermission(
      page,
      page.request.post("/api/hr-admin/payroll-runs", {
        data: {
          period_id: "00000000-0000-4000-8000-000000000000",
          code: `DENIED-${Date.now()}`,
          name: "Denied payroll run",
          status: "draft",
          input_profile_ref: "rbac.denied.inputs",
          snapshot_schema_ref: "rbac.denied.snapshot",
          config_snapshot: {},
        },
      }),
      "payroll.inputs.manage",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-runs/${setup.runs[0].id}/lock-inputs`, { data: {} }),
      "payroll.lock",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("certifies payroll reviewer cannot calculate draft payroll", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Payroll Reviewer",
      roleCode: "qa-payroll-reviewer",
      permissions: ["payroll.review"],
    });

    await gotoAuthenticated(page, "/hr-admin/payroll-calculations", persona);
    await expectPageReady(page, "Payroll Calculations");
    await expect(page.getByRole("button", { name: "Calculate draft" })).toBeDisabled();
    await expect(page.getByText("Requires payroll.calculate.").first()).toBeVisible();

    const setup = await getCalculationSetup(page);
    test.skip(!setup.runs.length, "No payroll run exists for calculation denial proof.");
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-runs/${setup.runs[0].id}/calculate-draft`, {
        data: { calculation_profile_ref: "rbac.denied.calculate" },
      }),
      "payroll.calculate",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("certifies payroll reviewer cannot approve, final-lock, or generate outputs", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Payroll Review Only",
      roleCode: "qa-payroll-review-only",
      permissions: ["payroll.review"],
    });

    await gotoAuthenticated(page, "/hr-admin/payroll-review", persona);
    await expectPageReady(page, "Payroll Review");
    await expect(page.getByRole("button", { name: "Approve review" })).toBeDisabled();
    await expect(page.getByText("Requires payroll.approve.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Final lock" })).toBeDisabled();
    await expect(page.getByText("Requires payroll.lock.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate outputs" })).toBeDisabled();
    await expect(page.getByText("Requires payroll.publish.").first()).toBeVisible();

    const setup = await getReviewSetup(page);
    test.skip(!setup.reviews.length, "No payroll review exists for review action denial proof.");
    const reviewId = setup.reviews[0].id;
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-reviews/${reviewId}/approve`, {
        data: { comment: "Denied by RBAC", approval_profile_ref: "rbac.denied.approve" },
      }),
      "payroll.approve",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-reviews/${reviewId}/lock`, { data: {} }),
      "payroll.lock",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-reviews/${reviewId}/generate-outputs`, {
        data: { output_profile_ref: "rbac.denied.outputs" },
      }),
      "payroll.publish",
    );
    await expectNoHorizontalOverflow(page);
  });
});
