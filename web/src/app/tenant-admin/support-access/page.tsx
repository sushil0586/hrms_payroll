import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminConsole } from "@/lib/api";
import { requireSessionPermission, sessionHasPermission } from "@/lib/workspace-access";
import { TenantSupportAccessActions } from "../tenant-support-access-actions";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export default async function TenantAdminSupportAccessPage() {
  const sessionUser = await requireSessionPermission({
    permissionKeys: ["tenant.support_access.request", "tenant.support_access.approve"],
    workspace: "tenant_admin",
    fallbackPath: "/tenant-admin",
  });
  const result = await getTenantAdminConsole();
  const data = result.data;
  const canRequestSupportAccess = sessionHasPermission(sessionUser, "tenant.support_access.request");
  const canApproveSupportAccess = sessionHasPermission(sessionUser, "tenant.support_access.approve");
  const activeGrants = data.support_access_management.recent_grants.filter((grant) =>
    ["requested", "approved", "active"].includes(grant.status),
  );
  const supportGuardrails = [
    {
      label: "Time-bound",
      value: `${data.support_access_management.max_duration_minutes} min max`,
      detail: "Every session needs a duration and should be closed after work is complete.",
    },
    {
      label: "Scope-bound",
      value: `${data.support_access_management.scope_options.length} scopes`,
      detail: "Only the selected product areas are available to the support operator.",
    },
    {
      label: "Audit-bound",
      value: "Full trail",
      detail: "Request, approval, start, end, reject, and revoke decisions remain reviewable.",
    },
  ];

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
        <div className="tenant-plan-command-band tenant-support-command-band--phase7">
          <div>
            <span className="workspace-card__eyebrow">Support workflow</span>
            <h2>Controlled assistance</h2>
            <p className="tenant-section-copy">
              Request only the help needed, approve it with a time limit, and keep the evidence available for customer review.
            </p>
          </div>
          <ol aria-label="Support access workflow">
            <li>
              <strong>1</strong>
              <span>Request scoped support</span>
            </li>
            <li>
              <strong>2</strong>
              <span>Approve, start, or reject</span>
            </li>
            <li>
              <strong>3</strong>
              <span>End, revoke, and audit</span>
            </li>
          </ol>
        </div>
      </section>

      <section className="section tenant-support-workspace tenant-support-workspace--phase4">
        <div className="panel-card-soft tenant-console-panel">
          <TenantSupportAccessActions
            canApproveSupportAccess={canApproveSupportAccess}
            canRequestSupportAccess={canRequestSupportAccess}
            data={data}
          />
        </div>
      </section>

      <section className="section tenant-support-scope-workspace tenant-support-scope-workspace--phase4">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Scope guide</span>
              <h2>What support can access</h2>
              <p className="tenant-section-copy">Use scopes to keep assisted operations narrow, time-bound, and auditable.</p>
            </div>
            <span className="record-chip">{data.support_access_management.scope_options.length} scopes</span>
          </div>
          <div className="tenant-support-guardrail-grid">
            {supportGuardrails.map((guardrail) => (
              <div className="tenant-support-guardrail-card" key={guardrail.label}>
                <span>{guardrail.label}</span>
                <strong>{guardrail.value}</strong>
                <p>{guardrail.detail}</p>
              </div>
            ))}
          </div>
          <div className="tenant-scope-grid">
            {data.support_access_management.scope_options.map((scope) => (
              <div className="tenant-console-row tenant-scope-card" key={scope.value}>
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
