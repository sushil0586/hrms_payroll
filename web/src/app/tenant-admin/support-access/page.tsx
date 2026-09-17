import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getSessionUser, getTenantAdminConsole } from "@/lib/api";
import { sessionHasPermission } from "@/lib/workspace-access";
import { TenantSupportAccessActions } from "../tenant-support-access-actions";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default async function TenantAdminSupportAccessPage() {
  const [result, sessionUser] = await Promise.all([getTenantAdminConsole(), getSessionUser()]);
  const data = result.data;
  const canRequestSupportAccess = sessionHasPermission(sessionUser, "tenant.support_access.request");
  const canApproveSupportAccess = sessionHasPermission(sessionUser, "tenant.support_access.approve");
  const activeGrants = data.support_access_management.recent_grants.filter((grant) =>
    ["requested", "approved", "active"].includes(grant.status),
  );

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live support access" : "Demo support access"}
        title="Support Access"
        description="Request, approve, start, end, reject, or revoke scoped support sessions."
        actions={
          <>
            <Link className="button button--primary" href="/tenant-admin">
              Back to dashboard
            </Link>
            <Link className="button button--secondary" href="/tenant-admin/trust-audit?event_group=support">
              Support audit
            </Link>
          </>
        }
        pills={[data.tenant.code, `${activeGrants.length} active or pending`, `${data.support_access_management.max_duration_minutes} min max`]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Active or pending" value={activeGrants.length} trend="Support grants" />
          <MetricTile label="Grant rows" value={data.support_access_management.recent_grants.length} trend="Recent support access" />
          <MetricTile label="Scopes" value={data.support_access_management.scope_options.length} trend="Assignable support scopes" />
          <MetricTile label="Max duration" value={`${data.support_access_management.max_duration_minutes}m`} trend={data.support_access_management.enabled ? "Enabled" : "Disabled"} />
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <TenantSupportAccessActions
            canApproveSupportAccess={canApproveSupportAccess}
            canRequestSupportAccess={canRequestSupportAccess}
            data={data}
          />
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Scope guide</span>
              <h2>What support can access</h2>
            </div>
            <span className="record-chip">{data.support_access_management.scope_options.length} scopes</span>
          </div>
          <div className="tenant-console-list">
            {data.support_access_management.scope_options.map((scope) => (
              <div className="tenant-console-row" key={scope.value}>
                <div>
                  <strong>{scope.label}</strong>
                  <span>{titleCase(scope.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
