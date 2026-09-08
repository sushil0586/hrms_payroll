import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getTenantAdminEnterpriseSecurityReadiness } from "@/lib/api";
import type { TenantAdminEnterpriseSecurityReadiness } from "@/lib/types";

type ReadinessCheck = TenantAdminEnterpriseSecurityReadiness["checks"][number];

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusLabel(value: string) {
  if (value === "ready") {
    return "Ready";
  }
  if (value === "warning") {
    return "Warning";
  }
  return "Blocked";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not recorded";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not configured";
  }
  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "Not configured";
  }
  if (typeof value === "boolean") {
    return value ? "Enabled" : "Disabled";
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${titleCase(key)}: ${String(item || "pending")}`)
      .join(" / ");
  }
  return String(value);
}

function readinessChip(label: string, ready: boolean) {
  return (
    <span className="record-chip" key={label}>
      {label}: {ready ? "Ready" : "Attention"}
    </span>
  );
}

function GroupPanel({
  title,
  eyebrow,
  checks,
  children,
}: {
  title: string;
  eyebrow: string;
  checks: ReadinessCheck[];
  children: React.ReactNode;
}) {
  const blocked = checks.filter((check) => check.status === "blocked").length;
  const warning = checks.filter((check) => check.status === "warning").length;
  const status = blocked ? "Blocked" : warning ? "Warning" : "Ready";
  return (
    <div className="panel-card-soft tenant-console-panel">
      <div className="tenant-console-panel__header">
        <div>
          <span className="workspace-card__eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <span className="record-chip">{status}</span>
      </div>
      {children}
      <div className="tenant-console-list">
        {checks.map((check) => (
          <div className="tenant-console-row" key={check.ref}>
            <div>
              <strong>{check.label}</strong>
              <span>
                {check.detail} Evidence: {formatValue(check.value)}. Status: {statusLabel(check.status)} / Owner: {titleCase(check.owner_role_ref)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function TenantAdminSecurityReadinessPage() {
  const result = await getTenantAdminEnterpriseSecurityReadiness();
  const data = result.data;
  const checksByPrefix = (prefix: string) => data.checks.filter((check) => check.ref.startsWith(prefix));

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live enterprise security" : "Demo enterprise security"}
        title="Enterprise Security Readiness"
        description="Tenant-visible MFA, SSO, SCIM, session, audit, and data-protection launch posture."
        actions={
          <>
            <Link className="button button--primary" href="/tenant-admin/trust-audit">
              Trust audit
            </Link>
            <Link className="button button--secondary" href="/tenant-admin">
              Console
            </Link>
          </>
        }
        pills={[data.tenant.code, data.profile_source, statusLabel(data.summary.status)]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Readiness" value={statusLabel(data.summary.status)} trend={`${data.summary.passed_check_count}/${data.summary.check_count} checks`} />
          <MetricTile label="Blockers" value={data.summary.blocker_count} trend={`${data.summary.launch_blocker_refs.length} launch refs`} />
          <MetricTile label="Warnings" value={data.summary.warning_count} trend={data.security_profile_ref} />
          <MetricTile label="Tenant" value={data.tenant.subscription_plan} trend={data.tenant.timezone} />
        </div>
      </section>

      <section className="section">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Security domains</span>
              <h2>Launch posture</h2>
            </div>
            <span className="record-chip">{data.summary.check_count} checks</span>
          </div>
          <div className="support-session-scopes">
            {readinessChip("MFA", data.summary.mfa_ready)}
            {readinessChip("SSO", data.summary.sso_ready)}
            {readinessChip("SCIM", data.summary.scim_ready)}
            {readinessChip("Session", data.summary.session_ready)}
            {readinessChip("Audit", data.summary.audit_ready)}
            {readinessChip("Data", data.summary.data_protection_ready)}
          </div>
        </div>
      </section>

      <section className="section tenant-console-grid">
        <GroupPanel eyebrow="Identity assurance" title="MFA and SSO" checks={[...checksByPrefix("mfa."), ...checksByPrefix("sso.")]}>
          <div className="support-session-scopes">
            <span className="record-chip">MFA {data.mfa.enforced ? "enforced" : "not enforced"}</span>
            <span className="record-chip">Methods {data.mfa.allowed_methods.length || 0}</span>
            <span className="record-chip">SSO {data.sso.enabled ? data.sso.protocol.toUpperCase() : "off"}</span>
            <span className="record-chip">Test {formatDateTime(data.sso.last_tested_at)}</span>
          </div>
        </GroupPanel>

        <GroupPanel eyebrow="Lifecycle access" title="SCIM and Sessions" checks={[...checksByPrefix("scim."), ...checksByPrefix("session.")]}>
          <div className="support-session-scopes">
            <span className="record-chip">SCIM {data.scim.enabled ? "enabled" : "disabled"}</span>
            <span className="record-chip">Sync {formatDateTime(data.scim.last_sync_at)}</span>
            <span className="record-chip">Idle {data.session.idle_timeout_minutes}m</span>
            <span className="record-chip">Absolute {data.session.absolute_timeout_hours}h</span>
          </div>
        </GroupPanel>
      </section>

      <section className="section tenant-console-grid">
        <GroupPanel eyebrow="Customer evidence" title="Audit and Data Protection" checks={[...checksByPrefix("audit."), ...checksByPrefix("data.")]}>
          <div className="support-session-scopes">
            <span className="record-chip">Retention {data.audit.retention_days}d</span>
            <span className="record-chip">Export {data.audit.customer_export_enabled ? "enabled" : "disabled"}</span>
            <span className="record-chip">At rest {data.data_protection.encryption_at_rest ? "encrypted" : "pending"}</span>
            <span className="record-chip">Residency {data.data_protection.data_residency_ref || "pending"}</span>
          </div>
        </GroupPanel>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Launch blockers</span>
              <h2>{data.summary.launch_blocker_refs.length ? "Action required" : "No blockers"}</h2>
            </div>
            <span className="record-chip">{data.summary.blocker_count} blockers</span>
          </div>
          <div className="tenant-console-list">
            {data.summary.launch_blocker_refs.length ? (
              data.summary.launch_blocker_refs.map((ref) => (
                <div className="tenant-console-row" key={ref}>
                  <div>
                    <strong>{titleCase(ref)}</strong>
                    <span>Resolve this configured enterprise security blocker before launch.</span>
                  </div>
                  <div className="tenant-console-row__meta">
                    <span>Blocked</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="tenant-console-empty">Enterprise security has no active launch blockers.</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
