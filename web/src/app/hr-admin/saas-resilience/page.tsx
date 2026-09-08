import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminSaasResilienceReadiness } from "@/lib/api";
import type { HrAdminSaasResilienceReadiness } from "@/lib/types";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusBadgeClass(status: string) {
  if (status === "ready" || status === "active" || status === "ok" || status === "succeeded" || status === "passed") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "warning" || status === "near_limit" || status === "missing") {
    return "readiness-badge readiness-badge--warning";
  }
  return "readiness-badge readiness-badge--blocked";
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCheckValue(value: HrAdminSaasResilienceReadiness["checks"][number]["value"]) {
  if (value === null || value === undefined || value === "") {
    return "Not recorded";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return Object.values(value).filter(Boolean).join(" / ") || "Not recorded";
  }
  return String(value);
}

export default async function HrAdminSaasResiliencePage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const result = await getHrAdminSaasResilienceReadiness();
  const data = result.data;
  const failedChecks = data.checks.filter((check) => !check.passed);
  const backupChecks = data.checks.filter((check) => check.ref.startsWith("backup."));
  const restoreChecks = data.checks.filter((check) => check.ref.startsWith("restore."));
  const retentionChecks = data.checks.filter((check) => check.ref.startsWith("retention."));

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live resilience" : "Demo resilience"}
        title="SaaS Resilience"
        description="Backup cadence, restore testing, tenant retention, and evidence posture."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/saas-operations">
              Ops health
            </Link>
            <Link className="button button--primary" href="/hr-admin/saas-control-plane">
              Control plane
            </Link>
          </>
        }
        pills={[data.profile_ref, data.profile_source, titleCase(data.summary.status)]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Resilience posture" value={titleCase(data.summary.status)} trend={`${data.summary.blocker_count} blockers`} />
          <MetricTile label="Readiness checks" value={`${data.summary.passed_check_count}/${data.summary.check_count}`} trend={`${data.summary.warning_count} warnings`} />
          <MetricTile label="Backup cadence" value={`${data.backup.frequency_hours}h`} trend={`${data.backup.recovery_point_objective_minutes}m RPO`} />
          <MetricTile label="Restore test" value={titleCase(data.restore.last_restore_test_status)} trend={formatDateTime(data.restore.last_restore_test_at)} />
          <MetricTile label="Payroll retention" value={`${data.retention.payroll_retention_days}d`} trend={`${data.retention.minimum_payroll_retention_days}d minimum`} />
          <MetricTile label="Audit retention" value={`${data.retention.audit_retention_days}d`} trend={`${data.retention.minimum_audit_retention_days}d minimum`} />
        </div>
      </section>

      <section className="section saas-history-grid">
        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Readiness checks</span>
              <h2>Resilience gate review</h2>
            </div>
            <span className={statusBadgeClass(data.summary.status)}>{titleCase(data.summary.status)}</span>
          </div>
          <div className="saas-history-list">
            {(failedChecks.length ? failedChecks : data.checks).slice(0, 8).map((check) => (
              <div className="saas-history-row" key={check.ref}>
                <div>
                  <strong>{check.label}</strong>
                  <span>{check.detail}</span>
                </div>
                <div>
                  <strong>{formatCheckValue(check.value)}</strong>
                  <span>{check.severity}</span>
                </div>
                <span className={statusBadgeClass(check.status)}>{titleCase(check.status)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Backup and restore</span>
              <h2>Backup and restore controls</h2>
            </div>
            <span className="record-chip">{data.tenant.code}</span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Latest backup</span>
              <strong>{formatDateTime(data.backup.last_successful_backup_at)}</strong>
            </div>
            <div className="detail-row">
              <span>Backup status</span>
              <strong>{titleCase(data.backup.last_backup_status)}</strong>
            </div>
            <div className="detail-row">
              <span>Encrypted storage</span>
              <strong>{data.backup.encryption_enabled ? "Enabled" : "Pending"}</strong>
            </div>
            <div className="detail-row">
              <span>Offsite copy</span>
              <strong>{data.backup.offsite_copy_enabled ? "Enabled" : "Pending"}</strong>
            </div>
            <div className="detail-row">
              <span>Latest restore test</span>
              <strong>{formatDateTime(data.restore.last_restore_test_at)}</strong>
            </div>
            <div className="detail-row">
              <span>Restore interval</span>
              <strong>{data.restore.restore_test_interval_days} days</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section tenant-console-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Retention controls</span>
              <h2>Tenant data windows</h2>
            </div>
            <span className={statusBadgeClass(data.summary.retention_ready ? "ready" : "blocked")}>
              {data.summary.retention_ready ? "Ready" : "Blocked"}
            </span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Default retention</span>
              <strong>{data.retention.default_retention_days} days</strong>
            </div>
            <div className="detail-row">
              <span>Payroll records</span>
              <strong>{data.retention.payroll_retention_days} days</strong>
            </div>
            <div className="detail-row">
              <span>Audit evidence</span>
              <strong>{data.retention.audit_retention_days} days</strong>
            </div>
            <div className="detail-row">
              <span>Support sessions</span>
              <strong>{data.retention.support_session_retention_days} days</strong>
            </div>
            <div className="detail-row">
              <span>Deletion policy</span>
              <strong>{data.retention.deletion_policy_ref || "Not configured"}</strong>
            </div>
            <div className="detail-row">
              <span>Legal hold policy</span>
              <strong>{data.retention.legal_hold_policy_ref || "Not configured"}</strong>
            </div>
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Evidence refs</span>
              <h2>Operational proof points</h2>
            </div>
            <span className="record-chip">{formatDateTime(data.evidence.last_evidence_at)}</span>
          </div>
          <div className="tenant-console-detail-grid">
            <div className="detail-row">
              <span>Storage policy</span>
              <strong>{data.evidence.storage_policy_ref || "Not recorded"}</strong>
            </div>
            <div className="detail-row">
              <span>Backup job</span>
              <strong>{data.evidence.backup_job_ref || "Not recorded"}</strong>
            </div>
            <div className="detail-row">
              <span>Restore test</span>
              <strong>{data.evidence.restore_test_ref || "Not recorded"}</strong>
            </div>
            <div className="detail-row">
              <span>Retention policy</span>
              <strong>{data.evidence.retention_policy_ref || "Not recorded"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section saas-history-grid">
        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Backup checks</span>
              <h2>Storage durability gates</h2>
            </div>
            <span className={statusBadgeClass(data.summary.backup_ready ? "ready" : "blocked")}>{data.summary.backup_ready ? "Ready" : "Blocked"}</span>
          </div>
          <div className="saas-history-list">
            {backupChecks.map((check) => (
              <div className="saas-history-row" key={check.ref}>
                <div>
                  <strong>{check.label}</strong>
                  <span>{check.ref}</span>
                </div>
                <span className={statusBadgeClass(check.status)}>{titleCase(check.status)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Restore and retention</span>
              <h2>Recovery and policy gates</h2>
            </div>
            <span className={statusBadgeClass(data.summary.restore_ready && data.summary.retention_ready ? "ready" : "blocked")}>
              {data.summary.restore_ready && data.summary.retention_ready ? "Ready" : "Blocked"}
            </span>
          </div>
          <div className="saas-history-list">
            {[...restoreChecks, ...retentionChecks].map((check) => (
              <div className="saas-history-row" key={check.ref}>
                <div>
                  <strong>{check.label}</strong>
                  <span>{check.ref}</span>
                </div>
                <span className={statusBadgeClass(check.status)}>{titleCase(check.status)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
