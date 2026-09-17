import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminConsole } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TenantMembershipActions } from "../tenant-membership-actions";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default async function TenantAdminUsersPage() {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["tenant.users.view", "tenant.users.manage"],
    workspace: "tenant_admin",
    fallbackPath: "/tenant-admin",
  });
  const result = await getTenantAdminConsole();
  const data = result.data;
  const canManageUsers = sessionHasPermission(sessionUser, "tenant.users.manage");

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live user management" : "Demo user management"}
        title="Tenant User Management"
        description="Invite users, assign roles, and keep tenant access within plan limits."
        actions={
          <>
            <Link className="button button--primary" href="/tenant-admin">
              Back to dashboard
            </Link>
            <Link className="button button--secondary" href="/tenant-admin/trust-audit?event_group=tenant_admin">
              User audit
            </Link>
          </>
        }
        pills={[data.tenant.code, `${data.summary.active_membership_count} active`, `${data.summary.role_count} roles`]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Active members" value={data.summary.active_membership_count} trend={`${data.summary.role_count} roles`} />
          <MetricTile label="Seat usage" value={`${data.seat_usage.current_value}/${data.seat_usage.limit_value || "unlimited"}`} trend={titleCase(data.seat_usage.status)} />
          <MetricTile label="Members" value={data.membership_management.total_membership_count ?? data.membership_management.recent_memberships.length} trend="Searchable directory" />
          <MetricTile label="Available roles" value={data.membership_management.role_options.length} trend="Assignable roles" />
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <TenantMembershipActions canManageUsers={canManageUsers} data={data} />
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Role coverage</span>
              <h2>Seat ownership</h2>
            </div>
            <span className="record-chip">{data.summary.active_membership_count} active</span>
          </div>
          <div className="tenant-console-list">
            {data.role_coverage.map((role) => (
              <div className="tenant-console-row" key={role.role_ref}>
                <div>
                  <strong>{role.label}</strong>
                  <span>{role.role_ref}</span>
                </div>
                <span className="record-chip">{role.active_membership_count} seats</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
