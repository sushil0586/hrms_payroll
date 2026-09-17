import { expect, type APIResponse, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, tenantAdmin } from "../helpers/staging-auth";

type CreatedRole = {
  id: string;
};

async function createRoleBackedUser(page: Page, input: { suffix: number; roleName: string; roleCode: string; permissions: string[] }) {
  await gotoAuthenticated(page, "/tenant-admin/roles", tenantAdmin);
  await expectPageReady(page, "Roles & Permissions");

  const roleResponse = await page.request.post("/api/tenant-admin/roles", {
    data: {
      name: `${input.roleName} ${input.suffix}`,
      code: `${input.roleCode}-${input.suffix}`,
      description: "Browser certification role for HR Admin leave and attendance RBAC.",
      is_active: true,
      permission_keys: input.permissions,
    },
  });
  expect(roleResponse.ok()).toBeTruthy();
  const rolePayload = (await roleResponse.json()) as { role: CreatedRole };

  const username = `${input.roleCode}.${input.suffix}`;
  const membershipResponse = await page.request.post("/api/tenant-admin/memberships", {
    data: {
      username,
      email: `${username}@example.com`,
      first_name: "QA",
      last_name: "RBAC",
      membership_status: "active",
      role_ids: [rolePayload.role.id],
    },
  });
  expect(membershipResponse.ok()).toBeTruthy();
  const membershipPayload = (await membershipResponse.json()) as { generated_password?: string };
  expect(membershipPayload.generated_password).toBeTruthy();

  await page.request.post("/api/auth/logout").catch(() => null);
  await page.context().clearCookies();
  return { username, password: membershipPayload.generated_password! };
}

async function expectForbiddenWithPermission(page: Page, responsePromise: Promise<APIResponse>, permission: string) {
  const response = await responsePromise;
  expect(response.status()).toBe(403);
  expect(JSON.stringify(await response.json())).toContain(permission);
}

test.describe("HR Admin leave and attendance RBAC certification", () => {
  test.skip(!process.env.HRMS_API_BASE_URL, "Leave and attendance RBAC proof requires a live HRMS API.");

  test("certifies leave viewer gets read-only setup, balances, and backend denials", async ({ page }) => {
    const persona = await createRoleBackedUser(page, {
      suffix: Date.now(),
      roleName: "QA Leave Viewer",
      roleCode: "qa-leave-viewer",
      permissions: ["leave.view"],
    });

    await gotoAuthenticated(page, "/hr-admin/leave-policies", persona);
    await expectPageReady(page, "Leave policies");
    await expect(page.getByRole("main").getByRole("link", { name: "Create leave policy" })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link", { name: "Edit" })).toHaveCount(0);

    await page.goto("/hr-admin/leave-policies/new", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/hr-admin\/leave-policies$/);
    await expectPageReady(page, "Leave policies");

    await gotoAuthenticated(page, "/hr-admin/leave-policy-assignments", persona);
    await expectPageReady(page, "Leave policy assignments");
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
    await expectPageReady(page, "Attendance regularizations");
    await expect(page.getByText("Read-only regularization view.")).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "Review request" })).toHaveCount(0);

    await gotoAuthenticated(page, "/hr-admin/shifts", persona);
    await expectPageReady(page, "Shifts");
    await expect(page.getByRole("main").getByRole("link", { name: "Create shift" })).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("link", { name: "Edit" })).toHaveCount(0);

    await page.goto("/hr-admin/shifts/new", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/hr-admin\/shifts$/);
    await expectPageReady(page, "Shifts");

    await gotoAuthenticated(page, "/hr-admin/attendance-policy-assignments", persona);
    await expectPageReady(page, "Attendance policy assignments");
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
