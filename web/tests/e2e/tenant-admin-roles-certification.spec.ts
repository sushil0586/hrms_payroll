import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin, tenantAdmin } from "../helpers/staging-auth";

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

type TenantRole = {
  id: string;
  code: string;
  description: string;
  name: string;
  permission_keys: string[];
};

function apiBaseUrl() {
  return process.env.HRMS_API_BASE_URL ?? "http://127.0.0.1:8012/api/v1";
}

async function authHeaders(page: Page) {
  const token = (await page.context().cookies()).find((cookie) => cookie.name === "hrms_access_token")?.value;
  expect(token).toBeTruthy();
  return { Authorization: `Token ${token}` };
}

async function getCommercialControl(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/hr-admin/saas-control-plane/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CommercialControl;
}

async function patchCommercialControl(page: Page, payload: Record<string, string>) {
  const response = await page.request.patch("/api/hr-admin/saas-control-plane", { data: payload });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as CommercialControl;
}

async function getTenantRoles(page: Page) {
  const response = await page.request.get(`${apiBaseUrl()}/tenant-admin/console/`, {
    headers: await authHeaders(page),
  });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.role_management.roles as TenantRole[];
}

async function patchTenantRole(page: Page, role: TenantRole, permissionKeys: string[]) {
  const response = await page.request.patch(`/api/tenant-admin/roles/${role.id}`, {
    data: {
      name: role.name,
      code: role.code,
      description: role.description,
      permission_keys: permissionKeys,
    },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("Tenant admin roles certification", () => {
  test.skip(!process.env.HRMS_API_BASE_URL, "Tenant role certification requires a live HRMS API.");

  test("certifies custom role creation, edit dialog, protected system roles, and search", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
    await expectPageReady(page, "Roles & Permissions");
    await expect(page.getByRole("main").getByRole("button", { name: "Add role" })).toBeVisible();
    await expect(page.getByText("System role is protected.").first()).toBeVisible();

    await page.getByRole("main").getByRole("button", { name: "Add role" }).click();
    const createDialog = page.getByRole("dialog", { name: "Create tenant role" });
    await expect(createDialog).toBeVisible();
    await expect(createDialog.getByLabel("Role name")).toBeFocused();
    await expect(createDialog.getByRole("alert")).toContainText("Role name is required.");
    await expect(createDialog.getByRole("button", { name: "Create role" })).toBeDisabled();

    const suffix = Date.now();
    await createDialog.getByLabel("Role name").fill(`QA Reviewer ${suffix}`);
    await createDialog.getByLabel("Role code").fill(`qa-reviewer-${suffix}`);
    await createDialog.getByLabel("Description").fill("Reviews tenant QA evidence before payroll closure.");
    await expect(createDialog.getByRole("tab", { name: "All" })).toHaveAttribute("aria-selected", "true");
    await createDialog.getByRole("tab", { name: "Payroll" }).click();
    await expect(createDialog.getByRole("tab", { name: "Payroll" })).toHaveAttribute("aria-selected", "true");
    await expect(createDialog.locator(".tenant-permission-group").first()).toContainText("Payroll");
    await createDialog.getByRole("checkbox", { name: /^Review payroll\b/ }).check();
    await expect(createDialog.locator(".tenant-permission-summary")).toContainText("1 selected");
    await expect(createDialog.locator(".tenant-permission-summary")).toContainText("Review payroll");
    await expect(createDialog.getByRole("status")).toContainText("Role is ready to save.");
    await createDialog.getByRole("button", { name: "Create role" }).click();
    await expect(createDialog).toHaveCount(0);
    await expect(page.getByText("Role created.")).toBeVisible();
    await expect(page.getByText(`QA Reviewer ${suffix}`)).toBeVisible();

    const roleRow = page.locator(".tenant-role-row").filter({ hasText: `QA Reviewer ${suffix}` });
    await roleRow.getByRole("button", { name: "Edit" }).click();
    const editDialog = page.getByRole("dialog", { name: "Update tenant role" });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel("Description").fill("Updated QA evidence owner.");
    await editDialog.getByRole("button", { name: "Update role" }).click();
    await expect(editDialog).toHaveCount(0);
    await expect(page.getByText("Role updated.")).toBeVisible();

    await page.getByLabel("Search roles").fill(`qa-reviewer-${suffix}`);
    await expect(page.locator(".tenant-role-row")).toHaveCount(1);
    await expect(page.locator(".tenant-role-row")).toContainText(`QA Reviewer ${suffix}`);

    await page.getByLabel("Search roles").fill("no-role-for-this-query");
    await expect(page.getByRole("status").filter({ hasText: "No roles match the current search." })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("shows plan-unavailable permissions as disabled with a clear reason", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin/saas-control-plane", hrAdmin);
    const original = await getCommercialControl(page);

    try {
      await patchCommercialControl(page, {
        subscription_plan: "starter",
        status: "active",
        billing_provider_ref: original.subscription.billing_provider_ref || "manual_billing.v1",
        billing_account_ref: original.subscription.billing_account_ref,
        current_period_end: original.subscription.current_period_end,
      });

      await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
      await expectPageReady(page, "Roles & Permissions");
      await page.getByRole("main").getByRole("button", { name: "Add role" }).click();
      const createDialog = page.getByRole("dialog", { name: "Create tenant role" });
      await createDialog.getByRole("tab", { name: "Payroll" }).click();
      const payrollReviewOption = createDialog.locator(".tenant-permission-option").filter({ hasText: "Review payroll" });
      await expect(payrollReviewOption).toBeVisible();
      await expect(payrollReviewOption).toContainText("Unavailable for this plan");
      await expect(payrollReviewOption).toContainText("Requires the Payroll entitlement");
      await expect(payrollReviewOption.getByRole("checkbox")).toBeDisabled();
      await expectNoHorizontalOverflow(page);
    } finally {
      await gotoAuthenticated(page, "/hr-admin/saas-control-plane", hrAdmin);
      await patchCommercialControl(page, {
        subscription_plan: original.tenant.subscription_plan,
        status: original.subscription.status,
        billing_provider_ref: original.subscription.billing_provider_ref,
        billing_account_ref: original.subscription.billing_account_ref,
        current_period_end: original.subscription.current_period_end,
      });
    }
  });

  test("certifies limited role menu visibility, disabled actions, and backend denials", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
    await expectPageReady(page, "Roles & Permissions");

    const suffix = Date.now();
    const roleResponse = await page.request.post("/api/tenant-admin/roles", {
      data: {
        name: `QA Limited Tenant Viewer ${suffix}`,
        code: `qa-limited-tenant-viewer-${suffix}`,
        description: "Browser certification role with Tenant Admin view-only access.",
        is_active: true,
        permission_keys: ["tenant.dashboard.view", "tenant.users.view", "tenant.roles.view"],
      },
    });
    expect(roleResponse.ok()).toBeTruthy();
    const rolePayload = await roleResponse.json();
    const roleId = rolePayload.role.id as string;

    const username = `qa.limited.${suffix}`;
    const inviteResponse = await page.request.post("/api/tenant-admin/memberships", {
      data: {
        username,
        email: `${username}@example.com`,
        first_name: "QA",
        last_name: "Limited",
        membership_status: "active",
        role_ids: [roleId],
      },
    });
    expect(inviteResponse.ok()).toBeTruthy();
    const invitePayload = await inviteResponse.json();
    const generatedPassword = invitePayload.generated_password as string;
    expect(generatedPassword).toBeTruthy();

    await page.request.post("/api/auth/logout").catch(() => null);
    await page.context().clearCookies();
    await gotoAuthenticated(page, "/tenant-admin/roles", { username, password: generatedPassword });
    await expectPageReady(page, "Roles & Permissions");

    await expect(page.getByRole("navigation").getByRole("link", { name: /Dashboard/ })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /Users/ })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /Roles/ })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /Plan/ })).toHaveCount(0);
    await expect(page.getByRole("navigation").getByRole("link", { name: /Support Access/ })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("button", { name: "Add role" })).toBeDisabled();
    await expect(page.getByText("Role changes require tenant.roles.manage.")).toBeVisible();
    await expect(page.locator(".tenant-role-row").first().getByRole("button", { name: "Edit" })).toBeDisabled();

    const blockedRoleResponse = await page.request.post("/api/tenant-admin/roles", {
      data: {
        name: `Blocked Browser Role ${suffix}`,
        code: `blocked-browser-role-${suffix}`,
        permission_keys: ["tenant.roles.view"],
      },
    });
    expect(blockedRoleResponse.status()).toBe(403);
    expect(JSON.stringify(await blockedRoleResponse.json())).toContain("tenant.roles.manage");

    await page.goto("/tenant-admin/users", { waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Tenant User Management");
    await expect(page.getByRole("main").getByRole("button", { name: "Invite member" })).toBeDisabled();
    await expect(page.getByText("User changes require tenant.users.manage.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Update roles" }).first()).toBeDisabled();

    const blockedInviteResponse = await page.request.post("/api/tenant-admin/memberships", {
      data: {
        username: `blocked.member.${suffix}`,
        email: `blocked.member.${suffix}@example.com`,
        membership_status: "active",
        role_ids: [roleId],
      },
    });
    expect(blockedInviteResponse.status()).toBe(403);
    expect(JSON.stringify(await blockedInviteResponse.json())).toContain("tenant.users.manage");
    await expectNoHorizontalOverflow(page);
  });

  test("certifies last-admin lockout guard in the role edit dialog", async ({ page }) => {
    test.skip(
      process.env.HRMS_ENABLE_RBAC_LOCKOUT_BROWSER_PROOF !== "1",
      "Set HRMS_ENABLE_RBAC_LOCKOUT_BROWSER_PROOF=1 to run the guarded staging lockout proof.",
    );

    await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
    await expectPageReady(page, "Roles & Permissions");

    const criticalPermissions = ["tenant.users.manage", "tenant.roles.manage"];
    const originalRoles = await getTenantRoles(page);
    const targetRole =
      originalRoles.find((role) => role.code === "hr-admin" && criticalPermissions.every((key) => role.permission_keys.includes(key))) ??
      originalRoles.find((role) => criticalPermissions.every((key) => role.permission_keys.includes(key)));
    expect(targetRole).toBeTruthy();
    const rolesToTemporarilyReduce = originalRoles.filter(
      (role) => role.id !== targetRole!.id && criticalPermissions.some((key) => role.permission_keys.includes(key)),
    );

    try {
      for (const role of rolesToTemporarilyReduce) {
        await patchTenantRole(page, role, role.permission_keys.filter((key) => !criticalPermissions.includes(key)));
      }

      await page.reload({ waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Roles & Permissions");
      await page.getByLabel("Search roles").fill(targetRole!.code);
      const roleRow = page.locator(".tenant-role-row").filter({ hasText: targetRole!.code });
      await roleRow.getByRole("button", { name: "Edit" }).click();
      const editDialog = page.getByRole("dialog", { name: "Update tenant role" });
      await expect(editDialog).toBeVisible();
      await editDialog.getByRole("tab", { name: "Tenant Admin" }).click();
      await editDialog.getByRole("checkbox", { name: /^Manage tenant users\b/ }).uncheck();
      await editDialog.getByRole("checkbox", { name: /^Manage tenant roles\b/ }).uncheck();
      await editDialog.getByRole("button", { name: "Update role" }).click();
      await expect(editDialog.getByRole("alert")).toContainText("At least one active tenant admin must retain");
      await expect(editDialog.getByRole("alert")).toContainText("tenant.users.manage");
      await expect(editDialog.getByRole("alert")).toContainText("tenant.roles.manage");
      await expect(editDialog).toBeVisible();
      await expectNoHorizontalOverflow(page);
    } finally {
      for (const role of originalRoles) {
        await patchTenantRole(page, role, role.permission_keys).catch(() => null);
      }
    }
  });
});
