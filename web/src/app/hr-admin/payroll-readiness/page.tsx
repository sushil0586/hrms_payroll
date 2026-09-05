import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReadiness } from "@/lib/api";
import type { HrAdminPayrollReadinessItem } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function buildHref(
  basePath: string,
  currentParams: Record<string, SearchParamValue>,
  updates: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(currentParams).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) {
      params.set(key, normalized);
    }
  });

  Object.entries(updates).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  });

  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not mapped";
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function ReadinessBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

function DetailPanel({ item }: { item: HrAdminPayrollReadinessItem | null }) {
  if (!item) {
    return (
      <aside className="payroll-readiness-detail-panel">
        <div className="payroll-readiness-detail-panel__header">
          <span className="workspace-card__eyebrow">Employee trace</span>
          <h2>No employee selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Select a row to inspect readiness, source counts, and open issues.</p>
      </aside>
    );
  }

  const issueList = [...item.blockers, ...item.warnings];

  return (
    <aside className="payroll-readiness-detail-panel" aria-label={`${item.employee_name} readiness detail`}>
      <div className="payroll-readiness-detail-panel__header">
        <span className="workspace-card__eyebrow">Employee trace</span>
        <div>
          <h2>{item.employee_name}</h2>
          <p className="section-copy section-copy-soft">{item.employee_code} - {item.work_email || "No email"}</p>
        </div>
        <ReadinessBadge status={item.readiness_status} />
      </div>

      <div className="detail-grid">
        <DetailRow label="Legal entity" value={item.legal_entity || "Not mapped"} />
        <DetailRow label="Branch" value={item.branch || "Not mapped"} />
        <DetailRow label="Location" value={item.location || "Not mapped"} />
        <DetailRow label="Department" value={item.department || "Not mapped"} />
        <DetailRow label="Cost center" value={item.cost_center || "Not mapped"} />
        <DetailRow label="Employment type" value={item.employment_type || "Not mapped"} />
        <DetailRow label="Joining date" value={formatDate(item.date_of_joining)} />
        <DetailRow label="Exit date" value={formatDate(item.exit_date)} />
      </div>

      <div className="payroll-source-grid">
        <DetailRow label="Attendance records" value={item.source_counts.attendance_records ?? 0} />
        <DetailRow label="Leave requests" value={item.source_counts.leave_requests ?? 0} />
        <DetailRow label="Regularizations" value={item.source_counts.attendance_regularizations ?? 0} />
        <DetailRow label="Lifecycle events" value={item.source_counts.lifecycle_events ?? 0} />
        <DetailRow label="Documents" value={item.source_counts.documents ?? 0} />
        <DetailRow label="Bank accounts" value={item.source_counts.bank_accounts ?? 0} />
      </div>

      <div className="payroll-issue-stack">
        {issueList.length ? (
          issueList.map((issue) => (
            <div className="notice notice--compact" key={issue}>
              <strong>{item.blockers.includes(issue) ? "Blocker" : "Warning"}</strong>
              <span className="muted">{issue}</span>
            </div>
          ))
        ) : (
          <div className="notice notice--compact notice--success">
            <strong>Ready</strong>
            <span className="muted">No source-data issues for the selected profile.</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export default async function HrAdminPayrollReadinessPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "all";
  const periodStart = normalizeParam(currentParams.period_start);
  const periodEnd = normalizeParam(currentParams.period_end);
  const selectedEmployeeId = normalizeParam(currentParams.employeeId);

  const readinessResult = await getHrAdminPayrollReadiness({
    q,
    status,
    period_start: periodStart,
    period_end: periodEnd,
    page: 1,
    page_size: 50,
  });
  const readiness = readinessResult.data;
  const selectedItem =
    readiness.items.find((item) => item.id === selectedEmployeeId) ??
    readiness.items[0] ??
    null;
  const statusTabs = [
    { value: "all", label: "All" },
    { value: "ready", label: "Ready" },
    { value: "warning", label: "Warning" },
    { value: "blocked", label: "Blocked" },
  ];

  return (
    <main className="shell shell--payroll-readiness">
      <PageIntro
        eyebrow={readinessResult.state === "live" ? "Live payroll phase 0" : "Demo payroll phase 0"}
        title="Payroll Readiness"
        description="Source-data completeness, pending approvals, and tenant profile coverage."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-setup">
              Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-inputs">
              Inputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin">
              Admin
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports">
              Reports
            </Link>
          </>
        }
        pills={["Configurable", "Tenant scoped", readiness.configuration.profile_name]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-readiness-metrics">
          <MetricTile className="metric-tile-soft" label="Employees in scope" value={readiness.summary.total_employees} trend={readiness.period.label} />
          <MetricTile className="metric-tile-soft" label="Ready" value={readiness.summary.ready} trend="No open source issues" />
          <MetricTile className="metric-tile-soft" label="Warnings" value={readiness.summary.warnings} trend="Review before lock" />
          <MetricTile className="metric-tile-soft" label="Blocked" value={readiness.summary.blocked} trend="Needs source correction" />
          <MetricTile className="metric-tile-soft" label="Pending approvals" value={readiness.summary.pending_leave_requests + readiness.summary.pending_attendance_regularizations} trend="Leave and attendance" />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-readiness-workspace">
          <div className="payroll-readiness-main-panel">
            <div className="payroll-toolbar">
              <div>
                <span className="workspace-card__eyebrow">Readiness table</span>
                <h2>Payroll source review</h2>
              </div>
              <form className="payroll-filter-form" action="/hr-admin/payroll-readiness">
                <input type="hidden" name="status" value={status} />
                <input aria-label="Search" className="input-control" defaultValue={q} name="q" placeholder="Search employee, entity, cost center" />
                <input aria-label="Period start" className="input-control" defaultValue={readiness.period.start} name="period_start" type="date" />
                <input aria-label="Period end" className="input-control" defaultValue={readiness.period.end} name="period_end" type="date" />
                <button className="button button--primary" type="submit">Apply</button>
              </form>
            </div>

            <div className="status-tab-row" aria-label="Readiness status filters">
              {statusTabs.map((tab) => (
                <Link
                  className={`status-tab ${status === tab.value ? "status-tab--active" : ""}`}
                  href={buildHref("/hr-admin/payroll-readiness", currentParams, { status: tab.value, employeeId: undefined })}
                  key={tab.value}
                >
                  <span>{tab.label}</span>
                  <strong>{readiness.status_counts[tab.value] ?? 0}</strong>
                </Link>
              ))}
            </div>

            <div className="payroll-table-scroll">
              <table className="payroll-readiness-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Entity</th>
                    <th>Cost Center</th>
                    <th>Attendance</th>
                    <th>Pending</th>
                    <th>Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {readiness.items.map((item) => (
                    <tr className={selectedItem?.id === item.id ? "is-selected" : ""} key={item.id}>
                      <td>
                        <Link href={buildHref("/hr-admin/payroll-readiness", currentParams, { employeeId: item.id })}>
                          <strong>{item.employee_name}</strong>
                          <span>{item.employee_code}</span>
                        </Link>
                      </td>
                      <td><ReadinessBadge status={item.readiness_status} /></td>
                      <td>{item.legal_entity || "Not mapped"}</td>
                      <td>{item.cost_center || "Not mapped"}</td>
                      <td>{item.attendance_record_days}/{item.working_days}</td>
                      <td>{item.pending_leave_requests + item.pending_attendance_regularizations}</td>
                      <td>{item.has_primary_bank_account ? "Ready" : "Missing"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!readiness.items.length ? (
              <div className="notice notice--compact">
                <strong>No rows found.</strong>
                <span className="muted">Adjust the search or status filter.</span>
              </div>
            ) : null}
          </div>

          <DetailPanel item={selectedItem} />
        </div>
      </section>
    </main>
  );
}
