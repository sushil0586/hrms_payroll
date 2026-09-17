import { expect, type APIResponse, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, tenantAdmin } from "../helpers/staging-auth";

type CreatedRole = {
  id: string;
};

type OutputSetup = {
  output_batches: Array<{ id: string }>;
};

type HandoffSetup = {
  handoffs: Array<{ id: string }>;
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
  expect(response.ok()).toBeTruthy();
}

async function createRoleBackedUser(page: Page, input: { suffix: number; roleName: string; roleCode: string; permissions: string[] }) {
  await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
  await expectPageReady(page, "Roles & Permissions");

  const roleResponse = await page.request.post("/api/tenant-admin/roles", {
    data: {
      name: `${input.roleName} ${input.suffix}`,
      code: `${input.roleCode}-${input.suffix}`,
      description: "Browser certification role for payroll/statutory RBAC.",
      is_active: true,
      permission_keys: input.permissions,
    },
  });
  expect(roleResponse.ok()).toBeTruthy();
  const rolePayload = (await roleResponse.json()) as { role: CreatedRole };

  const username = `${input.roleCode}.${input.suffix}`;
  const email = `${username}@example.com`;

  await loginViaApi(page, hrAdmin);

  const employeeResponse = await page.request.post("/api/hr-admin/employees", {
    data: {
      employee_code: `QA-RBAC-${String(input.suffix).slice(-8)}`,
      employment_status: "active",
      first_name: "QA",
      last_name: "Payroll RBAC",
      work_email: email,
      date_of_joining: "2026-04-01",
    },
  });
  expect(employeeResponse.ok()).toBeTruthy();
  const employeePayload = (await employeeResponse.json()) as { id: string };

  const accessResponse = await page.request.post(`/api/hr-admin/employees/${employeePayload.id}/access`, {
    data: {
      username,
      email,
      first_name: "QA",
      last_name: "Payroll RBAC",
      display_name: "QA Payroll RBAC",
      is_user_active: true,
      must_change_password: false,
      membership_status: "active",
      is_default_membership: true,
      role_ids: [rolePayload.role.id],
      password: rbacPassword,
    },
  });
  expect(accessResponse.ok()).toBeTruthy();

  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  return { username, password: rbacPassword };
}

async function expectForbiddenWithPermission(page: Page, responsePromise: Promise<APIResponse>, permission: string) {
  const response = await responsePromise;
  expect(response.status()).toBe(403);
  expect(JSON.stringify(await response.json())).toContain(permission);
}

async function getOutputSetup(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-output-setup/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as OutputSetup;
}

async function getHandoffSetup(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/payroll-finance-handoff-setup/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as HandoffSetup;
}

test.describe("Payroll and statutory RBAC certification", () => {
  test.skip(!process.env.HRMS_API_BASE_URL, "Payroll/statutory RBAC proof requires a live HRMS API.");

  test("certifies statutory viewer gets evidence view, read-only setup controls, and backend denials", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Statutory Viewer",
      roleCode: "qa-statutory-viewer",
      permissions: ["statutory.setup.view", "statutory.declarations.view"],
    });

    await gotoAuthenticated(page, "/hr-admin/payroll-statutory", persona);
    await expectPageReady(page, "Payroll Statutory");
    await expect(page.getByText("TDS e-file report")).toBeVisible();
    await expect(page.getByText("You can review statutory packs, filings, declarations, and evidence.")).toBeVisible();
    await expect(page.getByTestId("statutory-pack-form")).toHaveCount(0);
    await expect(page.getByTestId("statutory-profile-form")).toHaveCount(0);

    await expectForbiddenWithPermission(
      page,
      page.request.post("/api/hr-admin/payroll-statutory-packs", {
        data: {
          code: `DENIED-${Date.now()}`,
          name: "Denied statutory pack",
          country_code: "IN",
          jurisdiction_ref: "country:IN",
          status: "draft",
          effective_from: "2026-04-01",
          currency_code: "INR",
          statutory_profile_ref: "denied.profile",
          validation_profile_ref: "denied.validation",
        },
      }),
      "statutory.setup.manage",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post("/api/hr-admin/employee-statutory-profiles", {
        data: {
          employee_id: "00000000-0000-4000-8000-000000000000",
          profile_ref: "denied.profile",
          effective_from: "2026-04-01",
          status: "draft",
        },
      }),
      "statutory.declarations.manage",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("certifies payroll output viewer cannot publish outputs or generate finance handoff", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Payroll Output Viewer",
      roleCode: "qa-payroll-output-viewer",
      permissions: ["payroll.outputs.view"],
    });

    await gotoAuthenticated(page, "/hr-admin/payroll-outputs", persona);
    await expectPageReady(page, "Payroll Outputs");
    await expect(page.getByRole("button", { name: "Publish outputs" })).toBeDisabled();
    await expect(page.getByText("Requires payroll.outputs.publish.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate handoff" })).toBeDisabled();
    await expect(page.getByText("Requires finance.handoff.create.")).toBeVisible();

    const setup = await getOutputSetup(page);
    test.skip(!setup.output_batches.length, "No payroll output batch exists for publish denial proof.");
    const batchId = setup.output_batches[0].id;
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-output-batches/${batchId}/publish`, { data: {} }),
      "payroll.outputs.publish",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-output-batches/${batchId}/generate-finance-handoff`, {
        data: { handoff_profile_ref: "rbac.denied.handoff" },
      }),
      "finance.handoff.create",
    );
    await expectNoHorizontalOverflow(page);
  });

  test("certifies finance handoff viewer cannot transmit, acknowledge, or generate audit packs", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Finance Handoff Viewer",
      roleCode: "qa-finance-handoff-viewer",
      permissions: ["finance.handoff.view"],
    });

    await gotoAuthenticated(page, "/hr-admin/payroll-handoff", persona);
    await expectPageReady(page, "Payroll Handoff");
    await expect(page.getByRole("button", { name: "Transmit handoff" })).toBeDisabled();
    await expect(page.getByText("Requires finance.handoff.transmit.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Acknowledge handoff" })).toBeDisabled();
    await expect(page.getByText("Requires finance.handoff.acknowledge.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate audit pack" })).toBeDisabled();
    await expect(page.getByText("Requires finance.bank_advice.export.")).toBeVisible();

    const setup = await getHandoffSetup(page);
    test.skip(!setup.handoffs.length, "No finance handoff exists for handoff action denial proof.");
    const handoffId = setup.handoffs[0].id;
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-finance-handoffs/${handoffId}/transmit`, { data: {} }),
      "finance.handoff.transmit",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-finance-handoffs/${handoffId}/acknowledge`, {
        data: { acknowledgement_profile_ref: "rbac.denied.ack" },
      }),
      "finance.handoff.acknowledge",
    );
    await expectForbiddenWithPermission(
      page,
      page.request.post(`/api/hr-admin/payroll-finance-handoffs/${handoffId}/generate-audit-pack`, {
        data: { audit_pack_profile_ref: "rbac.denied.audit" },
      }),
      "finance.bank_advice.export",
    );
    await expectNoHorizontalOverflow(page);
  });
});
