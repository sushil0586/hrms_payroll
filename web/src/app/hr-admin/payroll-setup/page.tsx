import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollSetup } from "@/lib/api";
import type { HrAdminPayGroup, HrAdminPayrollCalendar } from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Open";
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

function SnapshotRows({ snapshot }: { snapshot: Record<string, unknown> }) {
  const entries = Object.entries(snapshot).slice(0, 5);
  if (!entries.length) {
    return <span className="muted">No custom configuration</span>;
  }
  return (
    <div className="payroll-setup-snapshot">
      {entries.map(([key, value]) => (
        <div className="detail-row" key={key}>
          <span className="detail-label">{titleCase(key)}</span>
          <span className="detail-value">{String(value)}</span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`readiness-badge readiness-badge--${status}`}>{titleCase(status)}</span>;
}

function CalendarRail({ calendars }: { calendars: HrAdminPayrollCalendar[] }) {
  return (
    <div className="payroll-setup-rail">
      <div className="payroll-setup-panel__header">
        <span className="workspace-card__eyebrow">Calendars</span>
        <h2>Period control</h2>
      </div>
      <div className="payroll-setup-card-list">
        {calendars.map((calendar) => (
          <article className="payroll-setup-mini-card" key={calendar.id}>
            <div>
              <strong>{calendar.name}</strong>
              <span>{calendar.frequency_label} / {calendar.currency_code}</span>
            </div>
            <div className="payroll-setup-mini-card__meta">
              <span>Start day {calendar.period_start_day}</span>
              <span>{calendar.timezone}</span>
            </div>
            <SnapshotRows snapshot={calendar.config_snapshot} />
          </article>
        ))}
      </div>
    </div>
  );
}

function PayGroupDetail({ payGroup }: { payGroup: HrAdminPayGroup | null }) {
  if (!payGroup) {
    return (
      <aside className="payroll-setup-detail-panel">
        <div className="payroll-setup-panel__header">
          <span className="workspace-card__eyebrow">Pay group</span>
          <h2>No group selected</h2>
        </div>
        <p className="section-copy section-copy-soft">Create a pay group to anchor employees to calendar, scope, and payroll configuration.</p>
      </aside>
    );
  }

  return (
    <aside className="payroll-setup-detail-panel" aria-label={`${payGroup.name} configuration`}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Pay group</span>
          <h2>{payGroup.name}</h2>
        </div>
        <StatusBadge status={payGroup.status} />
      </div>

      <div className="detail-grid">
        <div className="detail-row"><span className="detail-label">Calendar</span><span className="detail-value">{payGroup.calendar_name}</span></div>
        <div className="detail-row"><span className="detail-label">Currency</span><span className="detail-value">{payGroup.default_currency_code}</span></div>
        <div className="detail-row"><span className="detail-label">Legal entity</span><span className="detail-value">{payGroup.legal_entity || "All"}</span></div>
        <div className="detail-row"><span className="detail-label">Branch</span><span className="detail-value">{payGroup.branch || "All"}</span></div>
        <div className="detail-row"><span className="detail-label">Location</span><span className="detail-value">{payGroup.location || "All"}</span></div>
        <div className="detail-row"><span className="detail-label">Department</span><span className="detail-value">{payGroup.department || "All"}</span></div>
        <div className="detail-row"><span className="detail-label">Employment type</span><span className="detail-value">{payGroup.employment_type || "All"}</span></div>
        <div className="detail-row"><span className="detail-label">Assignments</span><span className="detail-value">{payGroup.assignment_count}</span></div>
      </div>

      <div className="payroll-setup-config-block">
        <span className="workspace-card__eyebrow">Configuration snapshot</span>
        <SnapshotRows snapshot={payGroup.config_snapshot} />
      </div>
    </aside>
  );
}

export default async function HrAdminPayrollSetupPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const selectedPayGroupId = normalizeParam(currentParams.payGroupId);
  const result = await getHrAdminPayrollSetup();
  const setup = result.data;
  const selectedPayGroup = setup.pay_groups.find((item) => item.id === selectedPayGroupId) ?? setup.pay_groups[0] ?? null;
  const selectedAssignments = selectedPayGroup
    ? setup.assignments.filter((assignment) => assignment.pay_group_id === selectedPayGroup.id)
    : setup.assignments;

  return (
    <main className="shell shell--payroll-setup">
      <PageIntro
        eyebrow={result.state === "live" ? "Live payroll phase 1A" : "Demo payroll phase 1A"}
        title="Payroll Setup"
        description="Configurable payroll calendars, periods, pay groups, and employee assignment coverage."
        className="page-header-surface page-header-surface--compact"
        titleClassName="text-heading-premium page-title-soft"
        descriptionClassName="text-body-premium"
        actions={
          <>
            <Link className="button button--secondary" href="/hr-admin/payroll-readiness">
              Readiness
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-inputs">
              Inputs
            </Link>
            <Link className="button button--secondary" href="/hr-admin/salary-setup">
              Salary Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-rules">
              Rules
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-calculations">
              Calculations
            </Link>
            <Link className="button button--secondary" href="/hr-admin/organization">
              Organization
            </Link>
          </>
        }
        pills={["Tenant scoped", "Config snapshots", "Effective dated"]}
        showPills
      />

      <section className="section section--tight">
        <div className="metric-grid-modern payroll-setup-metrics">
          <MetricTile className="metric-tile-soft" label="Calendars" value={setup.summary.calendar_count} trend={`${setup.summary.active_calendar_count} active`} />
          <MetricTile className="metric-tile-soft" label="Open periods" value={setup.summary.open_period_count} trend="Ready for input locking" />
          <MetricTile className="metric-tile-soft" label="Active groups" value={setup.summary.active_pay_group_count} trend="Scoped payroll cohorts" />
          <MetricTile className="metric-tile-soft" label="Assigned employees" value={setup.summary.assigned_employee_count} trend={`${setup.summary.unassigned_employee_count} unassigned`} />
        </div>
      </section>

      <section className="section section--tight">
        <div className="payroll-setup-workspace">
          <CalendarRail calendars={setup.calendars} />

          <div className="payroll-setup-main-panel">
            <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
              <div>
                <span className="workspace-card__eyebrow">Pay groups</span>
                <h2>Configuration matrix</h2>
              </div>
              <span className="payroll-setup-count">{setup.pay_groups.length} groups</span>
            </div>

            <div className="payroll-table-scroll">
              <table className="payroll-readiness-table payroll-setup-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Status</th>
                    <th>Scope</th>
                    <th>Calendar</th>
                    <th>Employees</th>
                    <th>Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {setup.pay_groups.map((group) => (
                    <tr className={selectedPayGroup?.id === group.id ? "is-selected" : ""} key={group.id}>
                      <td>
                        <Link href={`/hr-admin/payroll-setup?payGroupId=${group.id}`}>
                          <strong>{group.name}</strong>
                          <span>{group.code}</span>
                        </Link>
                      </td>
                      <td><StatusBadge status={group.status} /></td>
                      <td>{[group.legal_entity, group.branch, group.department].filter(Boolean).join(" / ") || "All employees"}</td>
                      <td>{group.calendar_name}</td>
                      <td>{group.assignment_count}</td>
                      <td>{group.default_currency_code}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="payroll-setup-period-strip">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Periods</span>
                <h2>Run windows</h2>
              </div>
              <div className="payroll-setup-period-grid">
                {setup.periods.map((period) => (
                  <article className="payroll-setup-period" key={period.id}>
                    <div>
                      <strong>{period.name}</strong>
                      <span>{formatDate(period.start_date)} - {formatDate(period.end_date)}</span>
                    </div>
                    <StatusBadge status={period.status} />
                    <span>Pay date {formatDate(period.pay_date)}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="payroll-setup-assignment-panel">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Assignments</span>
                <h2>{selectedPayGroup ? selectedPayGroup.name : "Employees"}</h2>
              </div>
              <div className="payroll-table-scroll payroll-table-scroll--compact">
                <table className="payroll-readiness-table payroll-setup-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Group</th>
                      <th>Effective</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <strong>{assignment.employee_name}</strong>
                          <span>{assignment.employee_code}</span>
                        </td>
                        <td>{assignment.pay_group_name}</td>
                        <td>{formatDate(assignment.effective_from)} - {formatDate(assignment.effective_to)}</td>
                        <td><StatusBadge status={assignment.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <PayGroupDetail payGroup={selectedPayGroup} />
        </div>
      </section>
    </main>
  );
}
