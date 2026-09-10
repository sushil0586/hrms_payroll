import Link from "next/link";

import { ActionMenu } from "@/components/patterns/action-menu";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDashboard } from "@/lib/api";
import { reportCatalog } from "@/lib/report-catalog";

import { ReportCatalogWorkspace } from "./report-catalog-workspace";

function InsightPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="insight-panel insight-panel--compact">
      <div className="insight-panel__header">
        <h2>{title}</h2>
        <p className="section-copy section-copy-soft">{description}</p>
      </div>
      {children}
    </article>
  );
}

function InsightRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

export default async function HrAdminReportsPage() {
  const dashboardResult = await getHrAdminDashboard();
  const { overview, workforce, operations, documents, governance, delivery } = dashboardResult.data;
  const state = dashboardResult.state;

  return (
    <main className="shell">
      <PageIntro
        eyebrow={state === "live" ? "Live reports" : "Demo reports"}
        title="Reports"
        description="Workforce, queues, compliance, and delivery."
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

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile label="Total employees" value={overview.total_employees} trend="Tenant workforce" />
          <MetricTile label="Active employees" value={overview.active_employees} trend="Currently engaged" />
          <MetricTile label="Pending approvals" value={overview.pending_approvals} trend="Operational backlog" />
          <MetricTile label="Failed notifications" value={delivery.failed_notifications} trend="Delivery health" />
        </div>
      </section>

      <section className="section">
        <div className="workspace-grid-modern">
          <article className="workspace-card workspace-card--feature reports-export-card">
            <div className="workspace-card__header">
              <span className="workspace-card__eyebrow">Exports</span>
              <h2>Exports</h2>
            </div>
            <p className="section-copy section-copy-soft">Download core CSVs for review and follow-up.</p>
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
        <div className="reports-grid">
          <InsightPanel
            title="Workforce"
            description="Headcount and setup hygiene."
          >
            <div className="detail-grid">
              <InsightRow label="Joiners this month" value={workforce.joiners_this_month} />
              <InsightRow label="Exits this month" value={workforce.exits_this_month} />
              <InsightRow label="Managers with reports" value={workforce.managers_with_reports} />
              <InsightRow label="Employees without manager" value={workforce.employees_without_manager} />
            </div>
            <div className="selection-list">
              {workforce.employment_status_breakdown.map((item) => (
                <div className="selection-row" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                  </div>
                  <span className="record-chip record-chip--accent">{item.value}</span>
                </div>
              ))}
            </div>
          </InsightPanel>

          <InsightPanel
            title="Departments"
            description="Organization balance."
          >
            <div className="selection-list">
              {workforce.department_headcount.map((item) => (
                <div className="selection-row" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                  </div>
                  <span className="record-chip record-chip--accent">{item.value}</span>
                </div>
              ))}
            </div>
          </InsightPanel>

          <InsightPanel
            title="Operations"
            description="Current queue load."
          >
            <div className="detail-grid">
              <InsightRow label="Pending leave requests" value={operations.pending_leave_requests} />
              <InsightRow label="Pending regularizations" value={operations.pending_regularizations} />
              <InsightRow label="Pending onboardings" value={operations.pending_onboardings} />
              <InsightRow label="Pending probation reviews" value={operations.pending_probation_reviews} />
              <InsightRow label="Open exits" value={operations.open_exits} />
            </div>
          </InsightPanel>

          <InsightPanel
            title="Documents"
            description="Verification and expiry risk."
          >
            <div className="detail-grid">
              <InsightRow label="Pending verification" value={documents.pending_verification} />
              <InsightRow label="Rejected documents" value={documents.rejected_documents} />
              <InsightRow label="Expiring in 30 days" value={documents.expiring_in_30_days} />
              <InsightRow label="Mandatory rules" value={documents.mandatory_requirement_rules} />
              <InsightRow label="Active categories" value={documents.active_document_categories} />
            </div>
          </InsightPanel>

          <InsightPanel
            title="Governance coverage"
            description="Policy and workflow coverage."
          >
            <div className="detail-grid">
              <InsightRow label="Active leave policies" value={governance.active_leave_policies} />
              <InsightRow label="Active attendance policies" value={governance.active_attendance_policies} />
              <InsightRow label="Workflow templates" value={governance.workflow_templates} />
              <InsightRow label="Active notification templates" value={governance.active_notification_templates} />
              <InsightRow label="Active notification events" value={governance.active_notification_events} />
            </div>
          </InsightPanel>

          <InsightPanel
            title="Delivery"
            description="Notifications and follow-up."
          >
            <div className="detail-grid">
              <InsightRow label="Pending notifications" value={delivery.pending_notifications} />
              <InsightRow label="Sent today" value={delivery.sent_today} />
              <InsightRow label="Failed notifications" value={delivery.failed_notifications} />
              <InsightRow label="Expiring documents" value={delivery.documents_expiring_30_days} />
              <InsightRow label="Last activity snapshot" value={new Date(delivery.latest_activity_at).toLocaleString("en-IN")} />
            </div>
          </InsightPanel>
        </div>
      </section>
    </main>
  );
}
