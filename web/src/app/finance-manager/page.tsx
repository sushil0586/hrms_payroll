import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollFinanceHandoffSetup } from "@/lib/api";
import type { HrAdminPayrollFinanceHandoffSetupResponse } from "@/lib/types";

type FinanceActionStatus = "ready" | "warning" | "blocked";

const statusLabel: Record<FinanceActionStatus, string> = {
  ready: "Ready",
  warning: "Review",
  blocked: "Blocked",
};

function chipClass(status: FinanceActionStatus) {
  if (status === "ready") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--ready";
  }
  if (status === "blocked") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--blocked";
  }
  return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--warning";
}

function formatMoney(value: unknown, currency = "INR") {
  const numericValue = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numericValue) ? numericValue : 0);
}

function financeStatus(value: number, blocked = false): FinanceActionStatus {
  if (blocked) {
    return "blocked";
  }
  return value > 0 ? "warning" : "ready";
}

function buildFinanceActions(data: HrAdminPayrollFinanceHandoffSetupResponse) {
  const pendingHandoffs = Math.max(data.summary.handoff_count - data.summary.accepted_handoff_count, 0);
  const pendingDeliveries = Math.max(data.summary.submitted_delivery_count - data.summary.reconciled_delivery_count, 0);
  const failedProviderEvents =
    data.summary.failed_delivery_count +
    data.summary.rejected_delivery_count +
    (data.summary.rejected_provider_callback_event_count ?? 0) +
    (data.summary.dead_lettered_provider_retry_event_count ?? 0) +
    (data.summary.dead_lettered_provider_job_count ?? 0);

  return [
    {
      label: "Finance handoff",
      value: pendingHandoffs,
      detail: "Generated payroll handoffs still waiting for transmit or acceptance.",
      href: "/api/hr-admin/reports/finance-handoff-exceptions?format=manifest",
      action: "Open manifest",
      status: financeStatus(pendingHandoffs),
    },
    {
      label: "Bank advice",
      value: data.artifacts.filter((artifact) => artifact.kind === "bank_advice").length,
      detail: "Payout-ready bank advice artifacts for finance review.",
      href: "/api/hr-admin/reports/bank-advice?format=manifest",
      action: "Open evidence",
      status: financeStatus(data.summary.failed_delivery_count, data.summary.failed_delivery_count > 0),
    },
    {
      label: "Provider delivery",
      value: pendingDeliveries,
      detail: "Submitted provider deliveries not yet reconciled.",
      href: "/api/hr-admin/reports/provider-filing-receipts?format=manifest",
      action: "Review receipts",
      status: financeStatus(pendingDeliveries),
    },
    {
      label: "Statutory liability",
      value: data.summary.statutory_filing_count ?? 0,
      detail: "Filing rows and statutory packs generated from payroll output.",
      href: "/api/hr-admin/reports/statutory-filing-status?format=manifest",
      action: "Open filing proof",
      status: financeStatus(data.summary.statutory_filing_artifact_count ? 0 : 1),
    },
    {
      label: "Provider exceptions",
      value: failedProviderEvents,
      detail: "Failed, rejected, or dead-lettered provider events requiring action.",
      href: "/api/hr-admin/reports/finance-handoff-exceptions?sort=risk&format=manifest",
      action: "Inspect risk",
      status: financeStatus(failedProviderEvents, failedProviderEvents > 0),
    },
    {
      label: "Export audit",
      value: data.summary.provider_audit_pack_count ?? 0,
      detail: "Audit packs and export manifests available for finance signoff.",
      href: "/api/hr-admin/reports/export-audits?format=manifest",
      action: "Open audit",
      status: financeStatus((data.summary.provider_audit_pack_count ?? 0) ? 0 : 1),
    },
  ];
}

export default async function FinanceManagerLandingPage() {
  const result = await getHrAdminPayrollFinanceHandoffSetup();
  const data = result.data;
  const financeActions = buildFinanceActions(data);
  const openActionCount = financeActions.filter((action) => action.status !== "ready").length;
  const latestHandoff = data.handoffs[0] ?? null;

  return (
    <main className="shell shell--finance-manager">
      <PageIntro
        eyebrow={result.state === "live" ? "Live finance" : "Demo finance"}
        title="Finance control center"
        description="Payroll close, payout handoff, statutory liability, provider delivery, and audit evidence for finance signoff."
        actions={
          <>
            <Link className="button button--primary" href="/api/hr-admin/reports/bank-advice?format=csv">
              Export bank advice
            </Link>
            <Link className="button button--secondary" href="/api/hr-admin/reports/statutory-filing-status?format=csv">
              Export filings
            </Link>
            <Link className="button button--secondary" href="/api/hr-admin/reports/export-audits?format=csv">
              Export audit
            </Link>
          </>
        }
        pills={["Payout evidence", "Statutory proof", "Audit manifests"]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Latest net pay" value={formatMoney(data.summary.latest_net_pay)} trend="Current finance exposure" />
          <MetricTile label="Handoffs" value={data.summary.handoff_count} trend={`${data.summary.accepted_handoff_count} accepted`} />
          <MetricTile label="Bank artifacts" value={data.summary.finance_artifact_count} trend="Finance output files" />
          <MetricTile label="Reconciled deliveries" value={data.summary.reconciled_delivery_count} trend={`${data.summary.submitted_delivery_count} submitted`} />
          <MetricTile label="Provider exceptions" value={data.summary.failed_delivery_count + data.summary.rejected_delivery_count} trend="Failed or rejected deliveries" />
        </div>
      </section>

      <section className="section finance-control-center" data-testid="finance-manager-control-center">
        <article className="panel-card-soft hr-admin-control-card hr-admin-control-card--primary">
          <div className="hr-admin-control-card__header">
            <div>
              <span className="workspace-card__eyebrow">Finance command queue</span>
              <h2>Close and payout priorities</h2>
            </div>
            <span className="queue-summary-chip"><strong>{openActionCount}</strong> active signals</span>
          </div>
          <div className="hr-admin-command-list">
            {financeActions.map((item) => (
              <div className="hr-admin-command-row" key={item.label}>
                <span className={chipClass(item.status)}>{statusLabel[item.status]}</span>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <span className="record-chip">{item.value}</span>
                <Link className="button button--secondary" href={item.href}>{item.action}</Link>
              </div>
            ))}
          </div>
        </article>

        <article className="panel-card-soft hr-admin-control-card" id="payments">
          <div className="hr-admin-control-card__header">
            <div>
              <span className="workspace-card__eyebrow">Payments</span>
              <h2>Latest handoff snapshot</h2>
            </div>
            <span className={chipClass(latestHandoff?.status === "accepted" ? "ready" : "warning")}>
              {latestHandoff?.status_label ?? "Pending"}
            </span>
          </div>
          <div className="detail-grid">
            <div className="detail-row">
              <span>Payroll run</span>
              <strong>{latestHandoff?.payroll_run_name ?? "No handoff"}</strong>
            </div>
            <div className="detail-row">
              <span>Bank profile</span>
              <strong>{latestHandoff?.bank_file_profile_ref ?? "Not generated"}</strong>
            </div>
            <div className="detail-row">
              <span>Accounting export</span>
              <strong>{latestHandoff?.accounting_export_profile_ref ?? "Not generated"}</strong>
            </div>
            <div className="detail-row">
              <span>Artifacts</span>
              <strong>{latestHandoff?.artifact_count ?? 0}</strong>
            </div>
          </div>
          <div className="hr-admin-shortcut-grid" id="compliance">
            <Link className="button button--primary" href="/api/hr-admin/reports/payroll-register?format=csv">Payroll register</Link>
            <Link className="button button--secondary" href="/api/hr-admin/reports/bank-advice?format=csv">Bank advice</Link>
            <Link className="button button--secondary" href="/api/hr-admin/reports/challan-reconciliation?format=csv">Challan proof</Link>
            <Link className="button button--secondary" href="/api/hr-admin/reports/statutory-deductions?format=csv">Statutory deductions</Link>
            <Link className="button button--secondary" href="/finance-manager#audit">Audit evidence</Link>
            <Link className="button button--secondary" href="/api/hr-admin/reports/finance-handoff-exceptions?format=csv">Exceptions</Link>
          </div>
        </article>
      </section>

      <section className="section" id="audit">
        <div className="panel-card-soft finance-audit-panel">
          <div>
            <span className="workspace-card__eyebrow">Audit posture</span>
            <h2>Evidence coverage</h2>
            <p>Use these numbers to decide whether finance can sign off the payroll package or needs provider remediation first.</p>
          </div>
          <div className="finance-audit-grid">
            <article>
              <strong>{data.summary.provider_callback_event_count ?? 0}</strong>
              <span>Provider callbacks</span>
            </article>
            <article>
              <strong>{data.summary.provider_retry_event_count ?? 0}</strong>
              <span>Retry events</span>
            </article>
            <article>
              <strong>{data.summary.completed_provider_job_count ?? 0}</strong>
              <span>Completed jobs</span>
            </article>
            <article>
              <strong>{data.summary.stale_provider_job_count ?? 0}</strong>
              <span>Stale jobs</span>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
