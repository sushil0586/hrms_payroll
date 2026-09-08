import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminSaasSlaOperations } from "@/lib/api";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

function titleCase(value: string) {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function statusBadgeClass(status: string) {
  if (status === "ready" || status === "met" || status === "resolved" || status === "canceled") {
    return "readiness-badge readiness-badge--ready";
  }
  if (status === "warning" || status === "at_risk" || status === "acknowledged" || status === "mitigated" || status === "open") {
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

export default async function HrAdminSaasSlaOperationsPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });
  const result = await getHrAdminSaasSlaOperations();
  const data = result.data;
  const openIncidents = data.incidents.filter((incident) => incident.status !== "resolved" && incident.status !== "canceled");
  const impactEntries = Object.entries(data.impact_counts);
  const serviceImpactEntries: Array<[string, number]> = impactEntries.length ? impactEntries : [["none", 0]];
  const targetEntries = Object.entries(data.incident_targets);

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={result.state === "live" ? "Live SLA operations" : "Demo SLA operations"}
        title="SaaS SLA Ops"
        description="Incident response, service impact, SLA breach posture, and escalation ownership."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/saas-operations">
              Ops health
            </Link>
            <Link className="button button--primary" href="/hr-admin/launch-remediation">
              Launch remediation
            </Link>
          </>
        }
        pills={[data.profile_ref, data.profile_source, titleCase(data.summary.status)]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="SLA posture" value={titleCase(data.summary.status)} trend={`${data.summary.blocked_signal_count} blocked signals`} />
          <MetricTile label="Open incidents" value={data.summary.open_incident_count} trend={`${data.summary.breached_incident_count} breached`} />
          <MetricTile label="At risk" value={data.summary.at_risk_incident_count} trend="Response or resolution" />
          <MetricTile label="Notifications" value={data.summary.failed_notification_count} trend="Failed delivery" />
          <MetricTile label="Provider queue" value={data.summary.stale_provider_job_count} trend="Stale jobs" />
          <MetricTile label="Remediation SLA" value={data.summary.overdue_remediation_count} trend="Overdue actions" />
        </div>
      </section>

      <section className="section saas-history-grid">
        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Incident queue</span>
              <h2>Service-impact records</h2>
            </div>
            <span className={statusBadgeClass(data.summary.status)}>{titleCase(data.summary.status)}</span>
          </div>
          <div className="saas-history-list">
            {(openIncidents.length ? openIncidents : data.incidents).slice(0, 8).map((incident) => (
              <div className="saas-history-row" key={incident.id}>
                <div>
                  <strong>{incident.title}</strong>
                  <span>{incident.incident_ref} - {incident.impact_labels.join(", ") || "No impact refs"}</span>
                </div>
                <div>
                  <strong>{titleCase(incident.severity)}</strong>
                  <span>{incident.owner_role_ref}</span>
                </div>
                <span className={statusBadgeClass(incident.breached ? "blocked" : incident.at_risk ? "at_risk" : incident.status)}>
                  {incident.breached ? "Breached" : incident.at_risk ? "At Risk" : titleCase(incident.status)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Health signals</span>
              <h2>SLA triage signals</h2>
            </div>
            <span className="record-chip">{data.sla_profile_ref}</span>
          </div>
          <div className="saas-history-list">
            {data.health_signals.map((signal) => (
              <div className="saas-history-row" key={signal.ref}>
                <div>
                  <strong>{signal.label}</strong>
                  <span>{signal.detail}</span>
                </div>
                <div>
                  <strong>{String(signal.value)}</strong>
                  <span>{signal.owner_role_ref}</span>
                </div>
                <Link className={statusBadgeClass(signal.status)} href={signal.href}>
                  {titleCase(signal.status)}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section tenant-console-grid">
        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">SLA targets</span>
              <h2>Response and resolution windows</h2>
            </div>
            <span className="record-chip">{data.tenant.code}</span>
          </div>
          <div className="tenant-console-detail-grid">
            {targetEntries.map(([severity, target]) => (
              <div className="detail-row" key={severity}>
                <span>{titleCase(severity)}</span>
                <strong>{target.response_minutes}m / {target.resolution_minutes}m</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft tenant-console-panel">
          <div className="tenant-console-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Service impact</span>
              <h2>Impacted tenant surfaces</h2>
            </div>
            <span className="record-chip">{impactEntries.length} surfaces</span>
          </div>
          <div className="tenant-console-detail-grid">
            {serviceImpactEntries.map(([impactRef, count]) => (
              <div className="detail-row" key={impactRef}>
                <span>{titleCase(impactRef)}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section saas-history-grid">
        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">SLA evidence</span>
              <h2>Response timeline</h2>
            </div>
            <span className="record-chip">{data.incidents.length} records</span>
          </div>
          <div className="saas-history-list">
            {data.incidents.slice(0, 6).map((incident) => (
              <div className="saas-history-row" key={`${incident.id}-timeline`}>
                <div>
                  <strong>{incident.incident_ref}</strong>
                  <span>Detected {formatDateTime(incident.detected_at)}</span>
                </div>
                <div>
                  <strong>Response {formatDateTime(incident.response_due_at)}</strong>
                  <span>Resolution {formatDateTime(incident.resolution_due_at)}</span>
                </div>
                <span className={statusBadgeClass(incident.response_state)}>{titleCase(incident.response_state)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-card-soft saas-control-panel">
          <div className="saas-control-panel__header">
            <div>
              <span className="workspace-card__eyebrow">Operational thresholds</span>
              <h2>Configured signal limits</h2>
            </div>
            <span className="record-chip">{Object.keys(data.operational_thresholds).length} limits</span>
          </div>
          <div className="saas-history-list">
            {Object.entries(data.operational_thresholds).map(([metricRef, threshold]) => (
              <div className="saas-history-row" key={metricRef}>
                <div>
                  <strong>{titleCase(metricRef)}</strong>
                  <span>{threshold.owner_role_ref}</span>
                </div>
                <div>
                  <strong>{threshold.max_count}</strong>
                  <span>{threshold.severity}</span>
                </div>
                <Link className="record-chip" href={threshold.href}>
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
