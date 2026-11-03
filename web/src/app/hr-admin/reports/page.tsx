import Link from "next/link";

import { ActionMenu } from "@/components/patterns/action-menu";
import { AsyncDownloadButton } from "@/components/patterns/async-download-button";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminDashboard } from "@/lib/api";
import { reportCatalog } from "@/lib/report-catalog";
import { requireWorkspaceAccess } from "@/lib/workspace-access";

import { ReportInsightsStrip } from "./report-insights-strip";
import { ReportCatalogWorkspace } from "./report-catalog-workspace";

export default async function HrAdminReportsPage() {
  await requireWorkspaceAccess({ roleCodes: ["hr-admin"] });

  const dashboardResult = await getHrAdminDashboard();
  const { overview, delivery } = dashboardResult.data;
  const state = dashboardResult.state;

  return (
    <main className="shell hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
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

      <nav className="section report-family-nav" aria-label="Report workspaces">
        <div className="report-category-tabs">
          {[
            { href: "/hr-admin/reports/hr-core", title: "HR Core Reports", count: reportCatalog.filter((report) => report.category === "HR Core").length },
            { href: "/hr-admin/reports/attendance", title: "Attendance Reports", count: reportCatalog.filter((report) => report.category === "Attendance").length },
            { href: "/hr-admin/reports/payroll", title: "Payroll Reports", count: reportCatalog.filter((report) => report.category === "Payroll Finance").length },
            { href: "/hr-admin/reports/compliance", title: "Compliance Reports", count: reportCatalog.filter((report) => report.category === "Compliance").length },
          ].map((workspace) => (
            <Link className="report-category-tab report-family-nav__link" href={workspace.href} key={workspace.href}>
              <strong>{workspace.title}</strong>
              <span>{workspace.count} reports</span>
            </Link>
          ))}
        </div>
      </nav>

      <section className="section">
        <div className="report-workspace-grid">
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
              <AsyncDownloadButton className="button button--primary" href="/api/hr-admin/reports/workforce" fileName="workforce-report.csv">Workforce CSV</AsyncDownloadButton>
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

      <ReportCatalogWorkspace reports={reportCatalog} />
    </main>
  );
}
