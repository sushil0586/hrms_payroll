import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminConsole } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TenantRoleActions } from "../tenant-role-actions";

export default async function TenantAdminRolesPage() {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["tenant.roles.view", "tenant.roles.manage"],
    workspace: "tenant_admin",
    fallbackPath: "/tenant-admin",
  });
  const result = await getTenantAdminConsole();
  const data = result.data;
  const canManageRoles = result.state !== "live" || sessionHasPermission(sessionUser, "tenant.roles.manage");
  const customRoleCount = data.role_management.roles.filter((role) => !role.is_system_role).length;
  const inactiveRoleCount = data.role_management.roles.filter((role) => !role.is_active).length;
  const assignedRoleCount = data.role_management.roles.filter((role) => role.active_membership_count > 0).length;

  return (
    <main className="shell shell--workspace accerio-page">
      <PageIntro appearance="accerio"
        eyebrow={result.state === "live" ? "Live role administration" : "Demo role administration"}
        title="Roles & Permissions"
        description="Create custom tenant roles, document permission intent, and control which roles are available for user assignment."
        actions={
          <>
            <Link className="button button--primary" href="/tenant-admin/users">
              Assign users
            </Link>
            <Link className="button button--secondary" href="/tenant-admin/trust-audit?event_group=tenant_admin">
              Role audit
            </Link>
          </>
        }
        pills={[data.tenant.code, `${data.role_management.roles.length} roles`, `${customRoleCount} custom`]}
        showPills
      />

      <section className="section">
        <div className="tenant-access-summary-strip" role="group" aria-label="Tenant role access summary">
          <article><span>Total roles</span><strong>{data.role_management.roles.length}</strong><small>System and custom</small></article>
          <article><span>Custom roles</span><strong>{customRoleCount}</strong><small>Tenant-owned</small></article>
          <article><span>Assigned roles</span><strong>{assignedRoleCount}</strong><small>Active member coverage</small></article>
          <article><span>Inactive roles</span><strong>{inactiveRoleCount}</strong><small>Hidden from assignment</small></article>
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <TenantRoleActions canManageRoles={canManageRoles} data={data} />
        </div>
      </section>
    </main>
  );
}
