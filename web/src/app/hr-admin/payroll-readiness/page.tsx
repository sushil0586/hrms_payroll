import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReadiness } from "@/lib/api";
import type { HrAdminPayrollReadinessItem } from "@/lib/types";
import { PayrollCycleJourney } from "../payroll-cycle-journey";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};
type PayrollReadinessTab = "summary" | "issues" | "employees" | "setup" | "evidence";
type IssueGroup = {
  key: string;
  label: string;
  severity: "blocked" | "warning";
  count: number;
  actionHref: string;
  actionLabel: string;
  help: string;
  sampleEmployees: string[];
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value: SearchParamValue): PayrollReadinessTab {
  const tab = normalizeParam(value);
  if (tab === "issues" || tab === "employees" || tab === "setup" || tab === "evidence") {
    return tab;
  }
  return "summary";
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

function getIssueTarget(issue: string) {
  const normalized = issue.toLowerCase();
  if (normalized.includes("bank")) {
    return {
      href: "/hr-admin/employees",
      label: "Open employee bank data",
      help: "Update employee bank details or use bank import before payroll close.",
    };
  }
  if (normalized.includes("attendance regularization")) {
    return {
      href: "/hr-admin/attendance-regularizations",
      label: "Open attendance review",
      help: "Approve, reject, or correct regularization requests for the payroll period.",
    };
  }
  if (normalized.includes("attendance")) {
    return {
      href: "/hr-admin/attendance-records",
      label: "Open attendance records",
      help: "Complete attendance records and resolve unknown or incomplete days.",
    };
  }
  if (normalized.includes("leave")) {
    return {
      href: "/hr-admin/leave-balances",
      label: "Open leave operations",
      help: "Resolve leave approvals and balances that can affect paid days.",
    };
  }
  if (
    normalized.includes("cost center") ||
    normalized.includes("entity") ||
    normalized.includes("branch") ||
    normalized.includes("location") ||
    normalized.includes("department")
  ) {
    return {
      href: "/hr-admin/employees",
      label: "Open employee master",
      help: "Complete missing organization assignments on affected employees.",
    };
  }
  if (normalized.includes("salary") || normalized.includes("pay group")) {
    return {
      href: "/hr-admin/salary-setup",
      label: "Open salary setup",
      help: "Complete employee compensation and payroll assignment setup.",
    };
  }
  return {
    href: "/hr-admin/payroll-readiness?tab=employees",
    label: "Review employees",
    help: "Open the employee rows and inspect source details.",
  };
}

function buildIssueGroups(items: HrAdminPayrollReadinessItem[]) {
  const issueMap = new Map<string, IssueGroup>();

  items.forEach((item) => {
    [
      ...item.blockers.map((issue) => ({ issue, severity: "blocked" as const })),
      ...item.warnings.map((issue) => ({ issue, severity: "warning" as const })),
    ].forEach(({ issue, severity }) => {
      const target = getIssueTarget(issue);
      const key = `${severity}:${issue.toLowerCase()}`;
      const existing = issueMap.get(key);

      if (existing) {
        existing.count += 1;
        if (existing.sampleEmployees.length < 3) {
          existing.sampleEmployees.push(item.employee_name);
        }
        return;
      }

      issueMap.set(key, {
        key,
        label: issue,
        severity,
        count: 1,
        actionHref: target.href,
        actionLabel: target.label,
        help: target.help,
        sampleEmployees: [item.employee_name],
      });
    });
  });

  return [...issueMap.values()].sort((first, second) => {
    if (first.severity !== second.severity) {
      return first.severity === "blocked" ? -1 : 1;
    }
    return second.count - first.count;
  });
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
  const activeTab = normalizeTab(currentParams.tab);
  const q = normalizeParam(currentParams.q) ?? "";
  const status = normalizeParam(currentParams.status) ?? "all";
  const periodStart = normalizeParam(currentParams.period_start);
  const periodEnd = normalizeParam(currentParams.period_end);
  const selectedEmployeeId = normalizeParam(currentParams.employeeId);
  const page = Math.max(Number(normalizeParam(currentParams.page) ?? "1") || 1, 1);
  const pageSize = Math.min(Math.max(Number(normalizeParam(currentParams.page_size) ?? "20") || 20, 1), 100);

  const readinessResult = await getHrAdminPayrollReadiness({
    q,
    status,
    period_start: periodStart,
    period_end: periodEnd,
    page,
    page_size: pageSize,
  });
  const readiness = readinessResult.data;
  const selectedItem =
    readiness.items.find((item) => item.id === selectedEmployeeId) ??
    readiness.items[0] ??
    null;
  const issueGroups = buildIssueGroups(readiness.items);
  const topBlockers = issueGroups.filter((issue) => issue.severity === "blocked").slice(0, 3);
  const readyPercent = readiness.summary.total_employees
    ? Math.round((readiness.summary.ready / readiness.summary.total_employees) * 100)
    : 0;
  const payrollStatus = readiness.summary.blocked ? "blocked" : readiness.summary.warnings ? "warning" : "ready";
  const statusTabs = [
    { value: "all", label: "All" },
    { value: "ready", label: "Ready" },
    { value: "warning", label: "Warning" },
    { value: "blocked", label: "Blocked" },
  ];
  const workspaceTabs: { value: PayrollReadinessTab; label: string; count?: number }[] = [
    { value: "summary", label: "Summary" },
    { value: "issues", label: "Issues", count: readiness.summary.blocked + readiness.summary.warnings },
    { value: "employees", label: "Employees", count: readiness.summary.total_employees },
    { value: "setup", label: "Setup Health" },
    { value: "evidence", label: "Evidence" },
  ];
  const pendingApprovals = readiness.summary.pending_leave_requests + readiness.summary.pending_attendance_regularizations;
  const setupHealth = [
    {
      label: "Payroll profile",
      status: "ready",
      value: readiness.configuration.profile_name,
      href: "/hr-admin/payroll-setup",
      cta: "Open setup",
    },
    {
      label: "Employee scope",
      status: readiness.summary.total_employees ? "ready" : "warning",
      value: `${readiness.summary.total_employees} employees`,
      href: "/hr-admin/employees",
      cta: "Open employees",
    },
    {
      label: "Bank accounts",
      status: readiness.summary.missing_primary_bank_accounts ? "warning" : "ready",
      value: `${readiness.summary.missing_primary_bank_accounts} missing`,
      href: "/hr-admin/employees",
      cta: "Review bank data",
    },
    {
      label: "Attendance and leave",
      status: pendingApprovals ? "warning" : "ready",
      value: `${pendingApprovals} pending approvals`,
      href: "/hr-admin/attendance-regularizations",
      cta: "Review approvals",
    },
    {
      label: "Salary setup",
      status: issueGroups.some((issue) => issue.actionHref.includes("salary-setup")) ? "blocked" : "ready",
      value: "Assignments checked",
      href: "/hr-admin/salary-setup",
      cta: "Open salary setup",
    },
    {
      label: "Provider readiness",
      status: "ready",
      value: "Mapped for next stages",
      href: "/hr-admin/payroll-providers",
      cta: "Open providers",
    },
  ];

  return (
    <main className="shell shell--payroll-readiness">
      <PageIntro
        eyebrow={readinessResult.state === "live" ? "Live payroll phase 0" : "Demo payroll phase 0"}
        title="Payroll Readiness"
        description="Review payroll blockers, source setup, employee exceptions, and audit evidence before opening inputs."
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
            <Link className="button button--secondary" href="/hr-admin/payroll-review">
              Review
            </Link>
            <Link className="button button--secondary" href="/hr-admin/reports/payroll-close-readiness">
              Report
            </Link>
          </>
        }
        pills={["Configurable", "Tenant scoped", readiness.configuration.profile_name]}
        showPills
      />

      <PayrollCycleJourney
        current="readiness"
        selectedRunName={readiness.period.label}
        selectedRunStatus={payrollStatus}
        primaryMetricLabel="ready"
        primaryMetricValue={readiness.summary.ready}
        secondaryMetricLabel="blocked"
        secondaryMetricValue={readiness.summary.blocked}
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-readiness-metrics">
          <MetricTile className="metric-tile-soft" label="Employees in scope" value={readiness.summary.total_employees} trend={readiness.period.label} />
          <MetricTile className="metric-tile-soft" label="Ready" value={readiness.summary.ready} trend={`${readyPercent}% clear`} />
          <MetricTile className="metric-tile-soft" label="Warnings" value={readiness.summary.warnings} trend="Can proceed with review" />
          <MetricTile className="metric-tile-soft" label="Blocked" value={readiness.summary.blocked} trend="Must fix before payroll" />
          <MetricTile className="metric-tile-soft" label="Pending approvals" value={pendingApprovals} trend="Leave and attendance" />
        </div>
      </section>

      <section className="section section--tight">
        <nav className="payroll-readiness-tabs" aria-label="Payroll readiness sections">
          {workspaceTabs.map((tab) => (
            <Link
              aria-current={activeTab === tab.value ? "page" : undefined}
              className={`payroll-readiness-tab ${activeTab === tab.value ? "payroll-readiness-tab--active" : ""}`}
              href={buildHref("/hr-admin/payroll-readiness", currentParams, {
                tab: tab.value === "summary" ? undefined : tab.value,
                page: tab.value === "employees" ? String(readiness.page) : undefined,
                employeeId: tab.value === "employees" ? selectedEmployeeId : undefined,
              })}
              key={tab.value}
            >
              <span>{tab.label}</span>
              {typeof tab.count === "number" ? <strong>{tab.count}</strong> : null}
            </Link>
          ))}
        </nav>
      </section>

      {activeTab === "summary" ? (
        <section className="section section--tight">
          <div className="payroll-readiness-summary-grid">
            <div className={`payroll-readiness-status-card payroll-readiness-status-card--${payrollStatus}`}>
              <span className="workspace-card__eyebrow">Current decision</span>
              <h2>{payrollStatus === "blocked" ? "Fix blockers before payroll inputs" : payrollStatus === "warning" ? "Review warnings before lock" : "Ready to open payroll inputs"}</h2>
              <p className="section-copy section-copy-soft">
                {payrollStatus === "blocked"
                  ? `${readiness.summary.blocked} employees have source issues that can produce incorrect payroll.`
                  : payrollStatus === "warning"
                    ? `${readiness.summary.warnings} employees need payroll team review, but no hard blockers are open.`
                    : "The current period has no open source-data blockers or warnings."}
              </p>
              <div className="payroll-readiness-action-row">
                <Link
                  className="button button--primary"
                  href={buildHref("/hr-admin/payroll-readiness", currentParams, {
                    tab: payrollStatus === "ready" ? "employees" : "issues",
                    status: payrollStatus === "blocked" ? "blocked" : payrollStatus === "warning" ? "warning" : "all",
                    page: "1",
                  })}
                >
                  {payrollStatus === "blocked" ? "Fix blockers" : payrollStatus === "warning" ? "Review warnings" : "Review employees"}
                </Link>
                <Link
                  className="button button--secondary"
                  href={payrollStatus === "blocked" ? buildHref("/hr-admin/payroll-readiness", currentParams, { tab: "setup" }) : "/hr-admin/payroll-inputs"}
                >
                  {payrollStatus === "blocked" ? "Check setup health" : "Open inputs"}
                </Link>
              </div>
            </div>

            <div className="payroll-readiness-next-panel">
              <span className="workspace-card__eyebrow">Top action list</span>
              <h2>What to do next</h2>
              {topBlockers.length ? (
                <div className="payroll-readiness-top-list">
                  {topBlockers.map((issue) => (
                    <Link className="payroll-readiness-top-item" href={issue.actionHref} key={issue.key}>
                      <ReadinessBadge status={issue.severity} />
                      <span>{issue.label}</span>
                      <strong>{issue.count}</strong>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="payroll-readiness-top-list">
                  <Link className="payroll-readiness-top-item" href="/hr-admin/payroll-inputs">
                    <ReadinessBadge status="ready" />
                    <span>Open payroll inputs for this period</span>
                    <strong>{readiness.summary.ready}</strong>
                  </Link>
                  <Link className="payroll-readiness-top-item" href="/hr-admin/payroll-review">
                    <ReadinessBadge status={readiness.summary.warnings ? "warning" : "ready"} />
                    <span>Prepare review checklist</span>
                    <strong>{readiness.summary.warnings}</strong>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "issues" ? (
        <section className="section section--tight">
          <div className="payroll-readiness-main-panel">
            <div className="payroll-toolbar">
              <div>
                <span className="workspace-card__eyebrow">Issue board</span>
                <h2>Payroll readiness worklist</h2>
              </div>
              <Link className="button button--secondary" href={buildHref("/hr-admin/payroll-readiness", currentParams, { tab: "employees", status: "blocked", page: "1" })}>
                Open blocked employees
              </Link>
            </div>
            <div className="payroll-readiness-issue-grid">
              {issueGroups.length ? (
                issueGroups.map((issue) => (
                  <article className={`payroll-readiness-issue-card payroll-readiness-issue-card--${issue.severity}`} key={issue.key}>
                    <div className="payroll-readiness-issue-card__header">
                      <ReadinessBadge status={issue.severity} />
                      <strong>{issue.count} affected</strong>
                    </div>
                    <h3>{issue.label}</h3>
                    <p className="section-copy section-copy-soft">{issue.help}</p>
                    <p className="muted">Examples: {issue.sampleEmployees.join(", ")}</p>
                    <Link className="button button--secondary" href={issue.actionHref}>
                      {issue.actionLabel}
                    </Link>
                  </article>
                ))
              ) : (
                <div className="payroll-readiness-empty-state">
                  <ReadinessBadge status="ready" />
                  <h2>No open issues in the current view</h2>
                  <p className="section-copy section-copy-soft">The visible employee set has no blockers or warnings for the selected period.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "employees" ? (
        <section className="section section--tight">
          <div className="payroll-readiness-workspace">
            <div className="payroll-readiness-main-panel">
              <div className="payroll-toolbar">
                <div>
                  <span className="workspace-card__eyebrow">Employee table</span>
                  <h2>Payroll source review</h2>
                </div>
                <form className="payroll-filter-form" action="/hr-admin/payroll-readiness">
                  <input type="hidden" name="tab" value="employees" />
                  <input type="hidden" name="status" value={status} />
                  <input type="hidden" name="page" value="1" />
                  <input aria-label="Search" className="input-control" defaultValue={q} name="q" placeholder="Search employee, entity, cost center" />
                  <input aria-label="Period start" className="input-control" defaultValue={readiness.period.start} name="period_start" type="date" />
                  <input aria-label="Period end" className="input-control" defaultValue={readiness.period.end} name="period_end" type="date" />
                  <select aria-label="Page size" className="input-control" defaultValue={String(readiness.page_size)} name="page_size">
                    {[10, 20, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>
                  <button className="button button--primary" type="submit">Apply</button>
                </form>
              </div>

              <div className="status-tab-row" aria-label="Readiness status filters">
                {statusTabs.map((tab) => (
                  <Link
                    className={`status-tab ${status === tab.value ? "status-tab--active" : ""}`}
                    href={buildHref("/hr-admin/payroll-readiness", currentParams, {
                      tab: "employees",
                      status: tab.value,
                      employeeId: undefined,
                      page: "1",
                      page_size: String(readiness.page_size),
                    })}
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
                          <Link href={buildHref("/hr-admin/payroll-readiness", currentParams, { tab: "employees", employeeId: item.id })}>
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

              <PaginationBar
                firstHref={buildHref("/hr-admin/payroll-readiness", currentParams, { tab: "employees", page: "1", page_size: String(readiness.page_size), employeeId: undefined })}
                hasNext={readiness.has_next}
                hasPrevious={readiness.has_previous}
                lastHref={buildHref("/hr-admin/payroll-readiness", currentParams, {
                  tab: "employees",
                  page: String(Math.max(1, Math.ceil(readiness.total_count / Math.max(readiness.page_size, 1)))),
                  page_size: String(readiness.page_size),
                  employeeId: undefined,
                })}
                nextHref={buildHref("/hr-admin/payroll-readiness", currentParams, { tab: "employees", page: String(readiness.page + 1), page_size: String(readiness.page_size), employeeId: undefined })}
                page={readiness.page}
                pageSize={readiness.page_size}
                previousHref={buildHref("/hr-admin/payroll-readiness", currentParams, { tab: "employees", page: String(readiness.page - 1), page_size: String(readiness.page_size), employeeId: undefined })}
                totalCount={readiness.total_count}
              />
            </div>

            <DetailPanel item={selectedItem} />
          </div>
        </section>
      ) : null}

      {activeTab === "setup" ? (
        <section className="section section--tight">
          <div className="payroll-readiness-main-panel">
            <div className="payroll-toolbar">
              <div>
                <span className="workspace-card__eyebrow">Setup health</span>
                <h2>Source systems and payroll prerequisites</h2>
              </div>
              <Link className="button button--secondary" href="/hr-admin/payroll-providers">
                Open providers
              </Link>
            </div>
            <div className="payroll-readiness-setup-grid">
              {setupHealth.map((item) => (
                <article className="payroll-readiness-setup-card" key={item.label}>
                  <ReadinessBadge status={item.status} />
                  <h3>{item.label}</h3>
                  <p>{item.value}</p>
                  <Link className="button button--secondary" href={item.href}>
                    {item.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "evidence" ? (
        <section className="section section--tight">
          <div className="payroll-readiness-main-panel">
            <div className="payroll-toolbar">
              <div>
                <span className="workspace-card__eyebrow">Evidence</span>
                <h2>Readiness audit snapshot</h2>
              </div>
              <Link className="button button--secondary" href="/hr-admin/reports/payroll-close-readiness">
                Open close readiness report
              </Link>
            </div>
            <div className="payroll-readiness-evidence-grid">
              <DetailRow label="Period" value={readiness.period.label} />
              <DetailRow label="Working days" value={readiness.period.working_days} />
              <DetailRow label="Readiness profile" value={`${readiness.configuration.profile_name} v${readiness.configuration.version}`} />
              <DetailRow label="Profile source" value={readiness.configuration.source} />
              <DetailRow label="Employees in scope" value={readiness.summary.total_employees} />
              <DetailRow label="Ready employees" value={readiness.summary.ready} />
              <DetailRow label="Blocked employees" value={readiness.summary.blocked} />
              <DetailRow label="Warnings" value={readiness.summary.warnings} />
              <DetailRow label="Joiners" value={readiness.summary.joiners} />
              <DetailRow label="Exits" value={readiness.summary.exits} />
              <DetailRow label="Missing bank accounts" value={readiness.summary.missing_primary_bank_accounts} />
              <DetailRow label="Pending approvals" value={pendingApprovals} />
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
