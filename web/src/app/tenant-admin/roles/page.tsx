import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getSessionUser, getTenantAdminConsole } from "@/lib/api";
import { sessionHasPermission } from "@/lib/workspace-access";
import { TenantRoleActions } from "../tenant-role-actions";

export default async function TenantAdminRolesPage() {
  const [result, sessionUser] = await Promise.all([getTenantAdminConsole(), getSessionUser()]);
  const data = result.data;
  const canManageRoles = sessionHasPermission(sessionUser, "tenant.roles.manage");
  const customRoleCount = data.role_management.roles.filter((role) => !role.is_system_role).length;
  const inactiveRoleCount = data.role_management.roles.filter((role) => !role.is_active).length;
  const assignedRoleCount = data.role_management.roles.filter((role) => role.active_membership_count > 0).length;

  return (
    <main className="shell shell--workspace">
      <PageIntro
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
        <div className="metric-grid-modern">
          <MetricTile label="Total roles" value={data.role_management.roles.length} trend="System and custom" />
          <MetricTile label="Custom roles" value={customRoleCount} trend="Tenant-owned" />
          <MetricTile label="Assigned roles" value={assignedRoleCount} trend="Active member coverage" />
          <MetricTile label="Inactive roles" value={inactiveRoleCount} trend="Hidden from assignment" />
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
