
import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollReadiness } from "@/lib/api";
import type { HrAdminPayrollReadinessItem } from "@/lib/types";
import { PayrollCycleJourney } from "../payroll-cycle-journey";
import { PayrollReadinessEmployeesWorkspace } from "./payroll-readiness-employees-workspace";

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
  const issueGroups = buildIssueGroups(readiness.items);
  const topBlockers = issueGroups.filter((issue) => issue.severity === "blocked").slice(0, 3);
  const readyPercent = readiness.summary.total_employees
    ? Math.round((readiness.summary.ready / readiness.summary.total_employees) * 100)
    : 0;
  const payrollStatus = readiness.summary.blocked ? "blocked" : readiness.summary.warnings ? "warning" : "ready";
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
    <main className="shell shell--payroll-readiness hr-admin-compact-ui accerio-page">
      <PageIntro appearance="accerio"
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
        <div className="attendance-summary-strip payroll-readiness-summary-strip" aria-label="Payroll readiness summary">
          <span><strong>{readiness.summary.total_employees}</strong> employees in scope</span>
          <span><strong>{readiness.summary.ready}</strong> ready</span>
          <span><strong>{readyPercent}%</strong> clear</span>
          <span><strong>{readiness.summary.warnings}</strong> warnings</span>
          <span><strong>{readiness.summary.blocked}</strong> blocked</span>
          <span><strong>{pendingApprovals}</strong> pending approvals</span>
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
          <PayrollReadinessEmployeesWorkspace
            initialData={readiness}
            initialEmployeeId={selectedEmployeeId}
            initialFilters={{
              q,
              status,
              period_start: readiness.period.start,
              period_end: readiness.period.end,
              page: readiness.page,
              page_size: readiness.page_size,
            }}
          />
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
