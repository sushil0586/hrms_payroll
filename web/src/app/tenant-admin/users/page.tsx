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
  const canManageUsers = result.state !== "live" || sessionHasPermission(sessionUser, "tenant.users.manage");
  const visibleRoleCoverage = data.role_coverage.slice(0, 6);
  const hiddenRoleCoverageCount = Math.max(0, data.role_coverage.length - visibleRoleCoverage.length);

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live user management" : "Demo user management"}
        title="Tenant User Management"
        description="Invite members, assign workspace roles, and manage access status from one focused directory."
        actions={
          <>
            <Link className="button button--secondary" href="/tenant-admin">
              Dashboard
            </Link>
            <Link className="button button--secondary" href="/tenant-admin/roles">
              Open roles
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
        <div className="tenant-user-access-guide">
          <div className="tenant-user-access-guide__copy">
            <span className="workspace-card__eyebrow">Access workspace</span>
            <h2>Focused member access</h2>
            <p>Use this page only for member access: invite, assign roles, suspend, reactivate, or revoke. Role design and permission changes stay on the Roles page.</p>
          </div>
          <div className="tenant-user-access-guide__steps" aria-label="User access workflow">
            <span>1. Find or invite member</span>
            <span>2. Assign role</span>
            <span>3. Confirm access change</span>
          </div>
        </div>
        <div className="panel-card-soft tenant-console-panel">
          <TenantMembershipActions canManageUsers={canManageUsers} data={data} />
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel tenant-seat-ownership-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Role coverage</span>
              <h2>Seat ownership</h2>
              <p className="tenant-console-empty">A quick usage check for who occupies each access role. Edit permissions on the Roles page.</p>
            </div>
            <div className="tenant-membership-actions__header-actions">
              <span className="record-chip">{data.summary.active_membership_count} active</span>
              <Link className="button button--secondary button--compact" href="/tenant-admin/roles">
                Manage roles
              </Link>
            </div>
          </div>
          <div className="tenant-seat-ownership-grid">
            {visibleRoleCoverage.map((role) => (
              <div className="tenant-role-coverage-card" key={role.role_ref}>
                <div>
                  <strong>{role.label}</strong>
                  <span>{role.role_ref}</span>
                </div>
                <span className="record-chip">{role.active_membership_count} seats</span>
              </div>
            ))}
            {hiddenRoleCoverageCount ? (
              <div className="tenant-role-coverage-card tenant-role-coverage-card--muted">
                <div>
                  <strong>{hiddenRoleCoverageCount} more roles</strong>
                  <span>Open Roles for full permission design and coverage.</span>
                </div>
                <Link className="button button--secondary button--compact" href="/tenant-admin/roles">
                  View all
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
