import Link from "next/link";

import { ActionMenu } from "@/components/patterns/action-menu";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDashboard } from "@/lib/api";
import { reportCatalog } from "@/lib/report-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "./report-insights-strip";
import { ReportCatalogWorkspace } from "./report-catalog-workspace";

export default async function HrAdminReportsPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const dashboardResult = await getHrAdminDashboard();
  const { overview, workforce, operations, documents, governance, delivery } = dashboardResult.data;
  const state = dashboardResult.state;

  return (
    <main className="shell hr-admin-compact-ui">
      <PageIntro
        eyebrow={state === "live" ? "Live reports" : "Demo reports"}
        title="Reports"
        description="Find, export, and audit workforce, payroll, compliance, lifecycle, document, and delivery reports."
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin">
              Admin
            </Link>
            <ActionMenu
              label="Related"
              items={[
                { href: "/hr-admin/employees", title: "Employee masters", description: "Review workforce structure and detail." },
                { href: "/hr-admin/notifications-admin", title: "Notifications admin", description: "Inspect delivery setup and queue health." },
                { href: "/hr-admin/audit", title: "Audit center", description: "Review timeline, document, and delivery history." },
              ]}
            />
          </>
        }
        pills={["Workforce", "Compliance", "Delivery"]}
        showPills
      />

      <ReportInsightsStrip
        current="catalog"
        eyebrow="HR insights"
        title="Report control center"
        description="Use the catalog for daily reports. Use export audit history when finance, compliance, or leadership needs proof of what was downloaded."
        metrics={[
          { label: "reports", value: reportCatalog.length, tone: "neutral" },
          { label: "employees", value: overview.total_employees, tone: "neutral" },
          { label: "approvals", value: overview.pending_approvals, tone: overview.pending_approvals ? "warning" : "ready" },
          { label: "failed delivery", value: delivery.failed_notifications, tone: delivery.failed_notifications ? "blocked" : "ready" },
        ]}
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Total employees" value={overview.total_employees} trend="Tenant workforce" />
          <MetricTile label="Active employees" value={overview.active_employees} trend="Currently engaged" />
          <MetricTile label="Pending approvals" value={overview.pending_approvals} trend="Operational backlog" />
          <MetricTile label="Failed notifications" value={delivery.failed_notifications} trend="Delivery health" />
        </div>
      </section>

      <section className="section" aria-label="Report workspaces">
        <div className="report-workspace-grid">
          {[
            { href: "/hr-admin/reports/hr-core", title: "HR Core Reports", copy: "Workforce, documents, lifecycle, and employee master reporting.", count: reportCatalog.filter((report) => report.category === "HR Core").length },
            { href: "/hr-admin/reports/attendance", title: "Attendance Reports", copy: "Daily attendance, exception SLA, and leave balance reporting.", count: reportCatalog.filter((report) => report.category === "Attendance").length },
            { href: "/hr-admin/reports/payroll", title: "Payroll Reports", copy: "Payroll register, variance, adjustments, payslips, bank advice, and handoff reports.", count: reportCatalog.filter((report) => report.category === "Payroll Finance").length },
            { href: "/hr-admin/reports/compliance", title: "Compliance Reports", copy: "Statutory deductions, filings, challans, provider receipts, and readiness packages.", count: reportCatalog.filter((report) => report.category === "Compliance").length },
          ].map((workspace) => (
            <Link className="report-workspace-card" href={workspace.href} key={workspace.href}>
              <span className="workspace-card__eyebrow">{workspace.count} reports</span>
              <strong>{workspace.title}</strong>
              <span>{workspace.copy}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid-modern">
          <article className="workspace-card workspace-card--feature reports-export-card">
            <div className="workspace-card__header">
              <span className="workspace-card__eyebrow">Evidence</span>
              <h2>Export controls</h2>
            </div>
            <p className="section-copy section-copy-soft">
              Open the compliance hub, review export history, or download the core workforce CSV without leaving the report workspace.
            </p>
            <div className="reports-export-card__meta">
              <span className="queue-summary-chip"><strong>5</strong> export sets</span>
              <span className="queue-summary-chip"><strong>{state === "live" ? "Live" : "Demo"}</strong> source mode</span>
              <span className="queue-summary-chip"><strong>CSV</strong> share-ready output</span>
            </div>
            <div className="reports-export-bar">
              <Link className="button button--secondary" href="/hr-admin/reports/compliance">
                Compliance hub
              </Link>
              <Link className="button button--secondary" href="/hr-admin/reports/export-audits">
                Export audit history
              </Link>
              <Link className="button button--secondary" href="/hr-admin/import-history">
                Import history
              </Link>
              <Link className="button button--primary" href="/api/hr-admin/reports/workforce" prefetch={false}>
                Workforce CSV
              </Link>
              <Link className="button button--secondary" href="/hr-admin/audit">
                Open audit center
              </Link>
              <ActionMenu
                label="More exports"
                items={[
                  { href: "/api/hr-admin/reports/pending-approvals", title: "Pending approvals CSV", description: "Review approval backlog and follow-up." },
                  { href: "/api/hr-admin/reports/document-compliance", title: "Document compliance CSV", description: "Check verification and expiry risk." },
                  { href: "/api/hr-admin/reports/lifecycle-queue", title: "Lifecycle queue CSV", description: "Export the shared lifecycle inbox." },
                  { href: "/api/hr-admin/reports/notification-queue", title: "Notification queue CSV", description: "Inspect delivery activity outside the UI." },
                ]}
              />
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="reports-summary-grid">
          <div className="queue-summary-chip">
            <strong>{workforce.department_headcount.length}</strong>
            department rows tracked
          </div>
          <div className="queue-summary-chip">
            <strong>{workforce.employment_status_breakdown.length}</strong>
            employment states visible
          </div>
          <div className="queue-summary-chip">
            <strong>{delivery.pending_notifications}</strong>
            notifications awaiting delivery
          </div>
        </div>
      </section>

      <ReportCatalogWorkspace reports={reportCatalog} />

      <section className="section">
        <div className="reports-grid reports-grid--compact">
          <article className="workspace-card workspace-card--compact">
            <div className="workspace-card__header">
              <span className="workspace-card__eyebrow">Workflow</span>
              <h2>How to use reports</h2>
            </div>
            <div className="detail-grid detail-grid--compact">
              <div className="detail-row"><span className="detail-label">Find</span><span className="detail-value">Search by report, field, owner, or module.</span></div>
              <div className="detail-row"><span className="detail-label">Open</span><span className="detail-value">Review filtered records before exporting.</span></div>
              <div className="detail-row"><span className="detail-label">Prove</span><span className="detail-value">Use manifests, checksums, and export audit history.</span></div>
            </div>
          </article>

          <article className="workspace-card workspace-card--compact">
            <div className="workspace-card__header">
              <span className="workspace-card__eyebrow">Coverage</span>
              <h2>Current signals</h2>
            </div>
            <div className="reports-summary-grid">
              <span className="queue-summary-chip"><strong>{workforce.joiners_this_month}</strong> joiners</span>
              <span className="queue-summary-chip"><strong>{workforce.exits_this_month}</strong> exits</span>
              <span className="queue-summary-chip"><strong>{operations.pending_leave_requests}</strong> leave approvals</span>
              <span className="queue-summary-chip"><strong>{documents.expiring_in_30_days}</strong> expiring docs</span>
              <span className="queue-summary-chip"><strong>{governance.workflow_templates}</strong> workflows</span>
              <span className="queue-summary-chip"><strong>{delivery.sent_today}</strong> sent today</span>
            </div>
          </article>

          <article className="workspace-card workspace-card--compact">
            <div className="workspace-card__header">
              <span className="workspace-card__eyebrow">Audit</span>
              <h2>Evidence shortcuts</h2>
            </div>
            <p className="section-copy section-copy-soft">
              Keep audit review separate from daily catalog work so reports stay easy to scan.
            </p>
            <div className="reports-export-bar reports-export-bar--right">
              <Link className="button button--secondary" href="/hr-admin/reports/export-audits">
                Export audit history
              </Link>
              <Link className="button button--secondary" href="/hr-admin/audit">
                Audit center
              </Link>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
