import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PageIntro } from "@/components/patterns/page-intro";
import { getHrAdminPayrollSetup } from "@/lib/api";
import type {
  HrAdminPayGroup,
  HrAdminPayGroupAssignment,
  HrAdminPayrollCalendar,
  HrAdminPayrollPeriod,
} from "@/lib/types";

import { PayrollSetupCrudConsole } from "./payroll-setup-crud-console";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

type SetupTab = "overview" | "calendars" | "pay-groups" | "assignments" | "actions";
type PaginationPatch = Record<string, string | number | null | undefined>;

const SETUP_TABS: Array<{ id: SetupTab; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Readiness and setup coverage" },
  { id: "calendars", label: "Calendars & Periods", description: "Payroll cycles and pay windows" },
  { id: "pay-groups", label: "Pay Groups", description: "Employee cohorts and scope" },
  { id: "assignments", label: "Assignments", description: "Employee-to-group coverage" },
  { id: "actions", label: "Setup Actions", description: "Create and maintain records" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function normalizeParam(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTab(value: SearchParamValue): SetupTab {
  const tab = normalizeParam(value);
  return SETUP_TABS.some((item) => item.id === tab) ? (tab as SetupTab) : "overview";
}

function parsePositiveInteger(value: SearchParamValue, fallback: number) {
  const parsed = Number.parseInt(normalizeParam(value) ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizePageSize(value: SearchParamValue, fallback = 10) {
  const parsed = parsePositiveInteger(value, fallback);
  return PAGE_SIZE_OPTIONS.includes(parsed as (typeof PAGE_SIZE_OPTIONS)[number]) ? parsed : fallback;
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  return {
    currentPage,
    totalPages,
    pageItems: items.slice(startIndex, startIndex + pageSize),
    start: items.length ? startIndex + 1 : 0,
    end: Math.min(items.length, startIndex + pageSize),
  };
}

function setupHref(params: Record<string, SearchParamValue>, patch: PaginationPatch = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const normalized = normalizeParam(value);
    if (normalized) {
      query.set(key, normalized);
    }
  });
  Object.entries(patch).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      query.delete(key);
      return;
    }
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `/hr-admin/payroll-setup?${serialized}` : "/hr-admin/payroll-setup";
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

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="payroll-setup-empty-state">
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function PaginationControls({
  currentParams,
  page,
  totalPages,
  pageSize,
  total,
  pageParam,
  sizeParam,
  tab,
}: {
  currentParams: Record<string, SearchParamValue>;
  page: number;
  totalPages: number;
  pageSize: number;
  total: number;
  pageParam: string;
  sizeParam: string;
  tab: SetupTab;
}) {
  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  const className = "button button--secondary payroll-setup-pagination__button";
  return (
    <div className="payroll-setup-pagination" aria-label={`${tab} pagination`}>
      <span className="payroll-setup-count">{total ? `${page} of ${totalPages}` : "0 records"}</span>
      <div className="payroll-setup-page-size" aria-label="Rows per page">
        {PAGE_SIZE_OPTIONS.map((option) => (
          <Link
            aria-current={pageSize === option ? "page" : undefined}
            className={`payroll-setup-size-link${pageSize === option ? " is-active" : ""}`}
            href={setupHref(currentParams, { tab, [sizeParam]: option, [pageParam]: 1 })}
            key={option}
          >
            {option}
          </Link>
        ))}
      </div>
      <div className="payroll-setup-pagination__nav">
        <Link
          aria-disabled={isFirst}
          className={`${className}${isFirst ? " is-disabled" : ""}`}
          href={setupHref(currentParams, { tab, [pageParam]: 1 })}
        >
          First
        </Link>
        <Link
          aria-disabled={isFirst}
          className={`${className}${isFirst ? " is-disabled" : ""}`}
          href={setupHref(currentParams, { tab, [pageParam]: Math.max(1, page - 1) })}
        >
          Previous
        </Link>
        <Link
          aria-disabled={isLast}
          className={`${className}${isLast ? " is-disabled" : ""}`}
          href={setupHref(currentParams, { tab, [pageParam]: Math.min(totalPages, page + 1) })}
        >
          Next
        </Link>
        <Link
          aria-disabled={isLast}
          className={`${className}${isLast ? " is-disabled" : ""}`}
          href={setupHref(currentParams, { tab, [pageParam]: totalPages })}
        >
          Last
        </Link>
      </div>
    </div>
  );
}

function PayrollSetupTabs({ activeTab, currentParams }: { activeTab: SetupTab; currentParams: Record<string, SearchParamValue> }) {
  return (
    <nav className="payroll-setup-tabs" aria-label="Payroll setup sections">
      {SETUP_TABS.map((tab) => (
        <Link
          aria-current={activeTab === tab.id ? "page" : undefined}
          className={`payroll-setup-tab${activeTab === tab.id ? " payroll-setup-tab--active" : ""}`}
          href={setupHref(currentParams, { tab: tab.id })}
          key={tab.id}
        >
          <strong>{tab.label}</strong>
          <span>{tab.description}</span>
        </Link>
      ))}
    </nav>
  );
}

function CalendarRail({ calendars, currentParams }: { calendars: HrAdminPayrollCalendar[]; currentParams: Record<string, SearchParamValue> }) {
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
        {!calendars.length ? <EmptyState title="No calendars yet" detail="Create a calendar before defining periods and pay groups." /> : null}
      </div>
      <Link className="button button--secondary payroll-setup-rail__action" href={`${setupHref(currentParams, { tab: "actions" })}#payroll-calendar-form`}>
        Manage calendars
      </Link>
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

function CalendarTable({
  calendars,
  currentParams,
}: {
  calendars: HrAdminPayrollCalendar[];
  currentParams: Record<string, SearchParamValue>;
}) {
  const pageSize = normalizePageSize(currentParams.calendarSize);
  const pageData = paginate(calendars, parsePositiveInteger(currentParams.calendarPage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Calendars</span>
          <h2>Period control</h2>
          <p>Maintain frequency, timezone, start day, currency, and calendar-level configuration.</p>
        </div>
        <Link className="button button--secondary" href={`${setupHref(currentParams, { tab: "actions" })}#payroll-calendar-form`}>
          New calendar
        </Link>
      </div>
      <div className="payroll-table-scroll">
        <table className="payroll-readiness-table payroll-setup-table">
          <thead>
            <tr>
              <th>Calendar</th>
              <th>Frequency</th>
              <th>Timezone</th>
              <th>Start day</th>
              <th>Open periods</th>
              <th>Active groups</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.pageItems.map((calendar) => (
              <tr key={calendar.id}>
                <td>
                  <strong>{calendar.name}</strong>
                  <span>{calendar.code}</span>
                </td>
                <td>{calendar.frequency_label}</td>
                <td>{calendar.timezone}</td>
                <td>{calendar.period_start_day}</td>
                <td>{calendar.open_period_count}</td>
                <td>{calendar.active_pay_group_count}</td>
                <td><StatusBadge status={calendar.is_active ? "active" : "inactive"} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!calendars.length ? <EmptyState title="No calendars yet" detail="Create the first payroll calendar from Setup Actions." /> : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="calendarPage"
        pageSize={pageSize}
        sizeParam="calendarSize"
        tab="calendars"
        total={calendars.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

function PeriodTable({
  periods,
  currentParams,
}: {
  periods: HrAdminPayrollPeriod[];
  currentParams: Record<string, SearchParamValue>;
}) {
  const pageSize = normalizePageSize(currentParams.periodSize);
  const pageData = paginate(periods, parsePositiveInteger(currentParams.periodPage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Periods</span>
          <h2>Run windows</h2>
          <p>Each period controls source input lock timing, calculation windows, and pay date readiness.</p>
        </div>
        <Link className="button button--secondary" href={`${setupHref(currentParams, { tab: "actions" })}#payroll-period-form`}>
          New period
        </Link>
      </div>
      <div className="payroll-table-scroll">
        <table className="payroll-readiness-table payroll-setup-table">
          <thead>
            <tr>
              <th>Period</th>
              <th>Calendar</th>
              <th>Start</th>
              <th>End</th>
              <th>Pay date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pageData.pageItems.map((period) => (
              <tr key={period.id}>
                <td>
                  <strong>{period.name}</strong>
                  <span>{period.code}</span>
                </td>
                <td>{period.calendar_name}</td>
                <td>{formatDate(period.start_date)}</td>
                <td>{formatDate(period.end_date)}</td>
                <td>{formatDate(period.pay_date)}</td>
                <td><StatusBadge status={period.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!periods.length ? <EmptyState title="No periods yet" detail="Create a period after at least one payroll calendar exists." /> : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="periodPage"
        pageSize={pageSize}
        sizeParam="periodSize"
        tab="calendars"
        total={periods.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

function PayGroupTable({
  payGroups,
  selectedPayGroup,
  currentParams,
}: {
  payGroups: HrAdminPayGroup[];
  selectedPayGroup: HrAdminPayGroup | null;
  currentParams: Record<string, SearchParamValue>;
}) {
  const pageSize = normalizePageSize(currentParams.payGroupSize);
  const pageData = paginate(payGroups, parsePositiveInteger(currentParams.payGroupPage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Pay groups</span>
          <h2>Configuration matrix</h2>
          <p>Keep every payroll cohort mapped to its calendar, currency, organization scope, and config profile.</p>
        </div>
        <Link className="button button--secondary" href={`${setupHref(currentParams, { tab: "actions" })}#pay-group-form`}>
          New pay group
        </Link>
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
            {pageData.pageItems.map((group) => (
              <tr className={selectedPayGroup?.id === group.id ? "is-selected" : ""} key={group.id}>
                <td>
                  <Link href={setupHref(currentParams, { tab: "pay-groups", payGroupId: group.id })}>
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
      {!payGroups.length ? <EmptyState title="No pay groups yet" detail="Create pay groups after calendars and organization masters are ready." /> : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="payGroupPage"
        pageSize={pageSize}
        sizeParam="payGroupSize"
        tab="pay-groups"
        total={payGroups.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

function AssignmentTable({
  assignments,
  currentParams,
  filteredByGroup,
}: {
  assignments: HrAdminPayGroupAssignment[];
  currentParams: Record<string, SearchParamValue>;
  filteredByGroup: HrAdminPayGroup | null;
}) {
  const pageSize = normalizePageSize(currentParams.assignmentSize);
  const pageData = paginate(assignments, parsePositiveInteger(currentParams.assignmentPage, 1), pageSize);
  return (
    <section className="payroll-setup-main-panel">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Assignments</span>
          <h2>{filteredByGroup ? filteredByGroup.name : "Employee coverage"}</h2>
          <p>Review which employees are attached to each pay group and whether the assignment is effective for payroll.</p>
        </div>
        <Link className="button button--secondary" href={`${setupHref(currentParams, { tab: "actions" })}#pay-group-assignment-form`}>
          New assignment
        </Link>
      </div>
      <div className="payroll-table-scroll">
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
            {pageData.pageItems.map((assignment) => (
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
      {!assignments.length ? (
        <EmptyState
          title="No assignments in this view"
          detail={filteredByGroup ? "This pay group has no employees assigned yet." : "Assign employees to pay groups before locking payroll inputs."}
        />
      ) : null}
      <PaginationControls
        currentParams={currentParams}
        page={pageData.currentPage}
        pageParam="assignmentPage"
        pageSize={pageSize}
        sizeParam="assignmentSize"
        tab="assignments"
        total={assignments.length}
        totalPages={pageData.totalPages}
      />
    </section>
  );
}

export default async function HrAdminPayrollSetupPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const activeTab = normalizeTab(currentParams.tab);
  const selectedPayGroupId = normalizeParam(currentParams.payGroupId);
  const result = await getHrAdminPayrollSetup();
  const setup = result.data;
  const selectedPayGroup = setup.pay_groups.find((item) => item.id === selectedPayGroupId) ?? setup.pay_groups[0] ?? null;
  const filteredPayGroup = selectedPayGroupId ? setup.pay_groups.find((item) => item.id === selectedPayGroupId) ?? null : null;
  const selectedAssignments = filteredPayGroup
    ? setup.assignments.filter((assignment) => assignment.pay_group_id === filteredPayGroup.id)
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
            <Link className="button button--secondary" href="/hr-admin/salary-setup">
              Salary Setup
            </Link>
            <Link className="button button--secondary" href="/hr-admin/payroll-rules">
              Rules
            </Link>
            <Link className="button button--secondary" href={`${setupHref(currentParams, { tab: "actions" })}#payroll-calendar-form`}>
              Add setup
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
        <PayrollSetupTabs activeTab={activeTab} currentParams={currentParams} />
      </section>

      {activeTab === "overview" ? (
        <section className="section section--tight">
          <div className="payroll-setup-overview-grid">
            <div className="payroll-setup-main-panel">
              <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
                <div>
                  <span className="workspace-card__eyebrow">Setup status</span>
                  <h2>Payroll setup summary</h2>
                  <p>Start here for coverage. Use tabs when you need to inspect or maintain detailed records.</p>
                </div>
                <Link className="button button--secondary" href={setupHref(currentParams, { tab: "actions" })}>
                  Open setup actions
                </Link>
              </div>
              <div className="payroll-setup-summary-grid">
                <div className="payroll-setup-summary-card">
                  <span>Calendar foundation</span>
                  <strong>{setup.summary.active_calendar_count} active</strong>
                  <p>{setup.summary.open_period_count} open payroll periods.</p>
                </div>
                <div className="payroll-setup-summary-card">
                  <span>Pay group coverage</span>
                  <strong>{setup.summary.active_pay_group_count} active</strong>
                  <p>{setup.pay_groups.length} total groups across scoped cohorts.</p>
                </div>
                <div className="payroll-setup-summary-card">
                  <span>Employee assignment</span>
                  <strong>{setup.summary.assigned_employee_count} assigned</strong>
                  <p>{setup.summary.unassigned_employee_count} employees still need pay group assignment.</p>
                </div>
              </div>
              <div className="payroll-setup-action-strip">
                <Link className="button button--secondary" href={setupHref(currentParams, { tab: "calendars" })}>
                  Review calendars
                </Link>
                <Link className="button button--secondary" href={setupHref(currentParams, { tab: "pay-groups" })}>
                  Review pay groups
                </Link>
                <Link className="button button--primary" href={setupHref(currentParams, { tab: "assignments" })}>
                  Review assignments
                </Link>
              </div>
            </div>
            <PayGroupDetail payGroup={selectedPayGroup} />
          </div>
        </section>
      ) : null}

      {activeTab === "calendars" ? (
        <section className="section section--tight">
          <div className="payroll-setup-grid-two">
            <CalendarTable calendars={setup.calendars} currentParams={currentParams} />
            <PeriodTable currentParams={currentParams} periods={setup.periods} />
          </div>
        </section>
      ) : null}

      {activeTab === "pay-groups" ? (
        <section className="section section--tight">
          <div className="payroll-setup-workspace payroll-setup-workspace--groups">
            <CalendarRail calendars={setup.calendars.slice(0, 4)} currentParams={currentParams} />
            <PayGroupTable currentParams={currentParams} payGroups={setup.pay_groups} selectedPayGroup={selectedPayGroup} />
            <PayGroupDetail payGroup={selectedPayGroup} />
          </div>
        </section>
      ) : null}

      {activeTab === "assignments" ? (
        <section className="section section--tight">
          <div className="payroll-setup-workspace payroll-setup-workspace--assignments">
            <div className="payroll-setup-rail">
              <div className="payroll-setup-panel__header">
                <span className="workspace-card__eyebrow">Pay groups</span>
                <h2>Assignment filter</h2>
              </div>
              <div className="payroll-setup-card-list">
                <Link
                  className={`payroll-setup-mini-card${!filteredPayGroup ? " is-selected" : ""}`}
                  href={setupHref(currentParams, { tab: "assignments", payGroupId: null, assignmentPage: 1 })}
                >
                  <div>
                    <strong>All employees</strong>
                    <span>{setup.assignments.length} assignments</span>
                  </div>
                </Link>
                {setup.pay_groups.slice(0, 12).map((group) => (
                  <Link
                    className={`payroll-setup-mini-card${filteredPayGroup?.id === group.id ? " is-selected" : ""}`}
                    href={setupHref(currentParams, { tab: "assignments", payGroupId: group.id, assignmentPage: 1 })}
                    key={group.id}
                  >
                    <div>
                      <strong>{group.name}</strong>
                      <span>{group.assignment_count} employees</span>
                    </div>
                    <StatusBadge status={group.status} />
                  </Link>
                ))}
              </div>
            </div>
            <AssignmentTable assignments={selectedAssignments} currentParams={currentParams} filteredByGroup={filteredPayGroup} />
          </div>
        </section>
      ) : null}

      {activeTab === "actions" ? (
        <section className="section section--tight">
          <PayrollSetupCrudConsole initialSetup={setup} />
        </section>
      ) : null}

    </main>
  );
}
