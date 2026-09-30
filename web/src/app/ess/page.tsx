import Link from "next/link";

import { MetricTile } from "@/components/patterns/metric-tile";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { EssRequestSubmissionPanel } from "@/app/ess/ess-request-submission-panel";
import { LeaveRequestLifecycleActions } from "@/app/ess/leave-request-lifecycle-actions";
import { getEssDashboard, getEssRequestOptions } from "@/lib/api";
import type {
  AttendanceRegularizationItem,
  EssAttendanceRegularizationListResponse,
  EssLeaveRequestListResponse,
  LeaveRequestItem,
} from "@/lib/types";

type SearchParamValue = string | string[] | undefined;
type PageProps = {
  searchParams?: Promise<Record<string, SearchParamValue>>;
};

function formatDate(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: string) {
  return `status status--${status}`;
}

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

function resolveSelectedItem<T extends { id: string }>(items: T[], selectedId?: string) {
  if (selectedId) {
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      return selected;
    }
  }
  return items[0] ?? null;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  );
}

type EssActionStatus = "ready" | "warning";

const essActionStatusLabel: Record<EssActionStatus, string> = {
  ready: "Ready",
  warning: "Review",
};

function essActionChipClass(status: EssActionStatus) {
  if (status === "ready") {
    return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--ready";
  }
  return "hr-admin-launch-audit__chip hr-admin-launch-audit__chip--warning";
}

function essActionStatus(value: number): EssActionStatus {
  return value > 0 ? "warning" : "ready";
}

function LeaveRequestSection({
  currentParams,
  response,
  isDemo,
}: {
  currentParams: Record<string, SearchParamValue>;
  response: EssLeaveRequestListResponse;
  isDemo: boolean;
}) {
  const leaveStatus = normalizeParam(currentParams.leaveStatus) ?? "all";
  const page = Math.max(Number(normalizeParam(currentParams.leavePage) || String(response.page)) || response.page, 1);
  const filtered = response.items;
  const selected = resolveSelectedItem(filtered, normalizeParam(currentParams.leaveId));
  const tabs = ["all", "pending", "approved", "rejected", "withdrawn", "cancelled"];
  const totalPages = Math.max(1, Math.ceil(response.total_count / response.page_size));

  return (
    <section className="section queue-review-split">
      <article className="record-card panel-card-soft">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Leave request history</h2>
            <p className="section-copy section-copy-soft">Filter requests, then inspect one at a time.</p>
          </div>
        </div>

        <div className="toolbar">
          <div className="tabbar">
            {tabs.map((status) => (
              <Link
                className={`tab ${leaveStatus === status ? "tab--active" : ""}`}
                href={buildHref("/ess", currentParams, {
                  leaveStatus: status,
                  leaveId: undefined,
                  leavePage: "1",
                })}
                key={status}
              >
                <span>{status.replace("_", " ")}</span>
                <span>{response.status_counts[status as keyof typeof response.status_counts] ?? 0}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="tableish">
          {filtered.length ? (
            filtered.map((request) => (
              <Link
                className={`tableish__row ${selected?.id === request.id ? "tableish__row--active" : ""}`}
                href={buildHref("/ess", currentParams, { leaveId: request.id })}
                key={request.id}
              >
                <div className="tableish__head">
                  <strong>{request.leave_type}</strong>
                  <span className={statusClass(request.status)}>{request.status.replace("_", " ")}</span>
                </div>
                <div className="tableish__meta">
                  <span>{formatDate(request.start_date)} to {formatDate(request.end_date)}</span>
                  <span>{request.requested_units} units</span>
                  <span>{request.policy_name || "No policy mapped"}</span>
                </div>
                <span className="muted">{request.reason || "No reason provided."}</span>
              </Link>
            ))
          ) : (
            <div className="notice">
              <strong>No leave requests in this view.</strong>
              <span className="muted">Try another status tab once more data is available.</span>
            </div>
          )}
        </div>
      </article>

      <article className="record-card panel-card-soft">
        <div>
          <h2 className="section-heading-soft">Leave request detail</h2>
          <p className="section-copy section-copy-soft">Detail for the selected request.</p>
        </div>
        {selected ? (
          <div className="stack">
            <div className="detail-grid">
              <DetailRow label="Leave Type" value={selected.leave_type} />
              <DetailRow label="Status" value={selected.status.replace("_", " ")} />
              <DetailRow label="Date Range" value={`${formatDate(selected.start_date)} to ${formatDate(selected.end_date)}`} />
              <DetailRow label="Requested Units" value={selected.requested_units} />
              <DetailRow label="Approved Units" value={selected.approved_units} />
              <DetailRow label="Policy" value={selected.policy_name || "Not mapped"} />
              <DetailRow label="Applied At" value={formatDateTime(selected.applied_at)} />
              <DetailRow label="Manager Comment" value={selected.manager_comment || "No manager comment yet."} />
              <DetailRow label="Reason" value={selected.reason || "No reason provided."} />
            </div>
            <LeaveRequestLifecycleActions isDemo={isDemo} item={selected} />
          </div>
        ) : (
          <div className="notice">
            <strong>No request selected.</strong>
            <span className="muted">Choose a request from the list to inspect its detail panel.</span>
          </div>
        )}
      </article>

      <PaginationBar
        firstHref={buildHref("/ess", currentParams, { leaveId: undefined, leavePage: "1" })}
        hasNext={response.has_next}
        hasPrevious={response.has_previous}
        lastHref={buildHref("/ess", currentParams, { leaveId: undefined, leavePage: String(totalPages) })}
        nextHref={buildHref("/ess", currentParams, { leaveId: undefined, leavePage: String(page + 1) })}
        page={response.page}
        pageSize={response.page_size}
        previousHref={buildHref("/ess", currentParams, { leaveId: undefined, leavePage: String(Math.max(1, page - 1)) })}
        totalCount={response.total_count}
      />
    </section>
  );
}

function RegularizationSection({
  currentParams,
  response,
}: {
  currentParams: Record<string, SearchParamValue>;
  response: EssAttendanceRegularizationListResponse;
}) {
  const regularizationStatus = normalizeParam(currentParams.regStatus) ?? "all";
  const page = Math.max(Number(normalizeParam(currentParams.regPage) || String(response.page)) || response.page, 1);
  const filtered = response.items;
  const selected = resolveSelectedItem(filtered, normalizeParam(currentParams.regId));
  const tabs = ["all", "pending", "approved", "rejected"];
  const totalPages = Math.max(1, Math.ceil(response.total_count / response.page_size));

  return (
    <section className="section queue-review-split">
      <article className="record-card panel-card-soft">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Regularization history</h2>
            <p className="section-copy section-copy-soft">Attendance corrections in one queue.</p>
          </div>
        </div>

        <div className="toolbar">
          <div className="tabbar">
            {tabs.map((status) => (
              <Link
                className={`tab ${regularizationStatus === status ? "tab--active" : ""}`}
                href={buildHref("/ess", currentParams, {
                  regStatus: status,
                  regId: undefined,
                  regPage: "1",
                })}
                key={status}
              >
                <span>{status.replace("_", " ")}</span>
                <span>{response.status_counts[status as keyof typeof response.status_counts] ?? 0}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="tableish">
          {filtered.length ? (
            filtered.map((item) => (
              <Link
                className={`tableish__row ${selected?.id === item.id ? "tableish__row--active" : ""}`}
                href={buildHref("/ess", currentParams, { regId: item.id })}
                key={item.id}
              >
                <div className="tableish__head">
                  <strong>{formatDate(item.attendance_date)}</strong>
                  <span className={statusClass(item.status)}>{item.status.replace("_", " ")}</span>
                </div>
                <div className="tableish__meta">
                  <span>Current: {item.current_status.replace("_", " ")}</span>
                  <span>Requested: {item.requested_status.replace("_", " ")}</span>
                </div>
                <span className="muted">{item.reason || "No reason provided."}</span>
              </Link>
            ))
          ) : (
            <div className="notice">
              <strong>No regularizations in this view.</strong>
              <span className="muted">Try another status tab once more data is available.</span>
            </div>
          )}
        </div>
      </article>

      <article className="record-card panel-card-soft">
        <div>
          <h2 className="section-heading-soft">Regularization detail</h2>
          <p className="section-copy section-copy-soft">Detail for the selected item.</p>
        </div>
        {selected ? (
          <div className="detail-grid">
            <DetailRow label="Attendance Date" value={formatDate(selected.attendance_date)} />
            <DetailRow label="Current Status" value={selected.current_status.replace("_", " ")} />
            <DetailRow label="Requested Status" value={selected.requested_status.replace("_", " ")} />
            <DetailRow label="Actual Check-In" value={formatDateTime(selected.actual_check_in_at)} />
            <DetailRow label="Requested Check-In" value={formatDateTime(selected.requested_check_in_at)} />
            <DetailRow label="Resolved At" value={formatDateTime(selected.resolved_at)} />
            <DetailRow label="Manager Comment" value={selected.manager_comment || "No manager comment yet."} />
            <DetailRow label="Rejection Reason" value={selected.rejection_reason || "No rejection reason."} />
            <DetailRow label="Reason" value={selected.reason || "No reason provided."} />
          </div>
        ) : (
          <div className="notice">
            <strong>No regularization selected.</strong>
            <span className="muted">Choose a regularization from the list to inspect its detail panel.</span>
          </div>
        )}
      </article>

      <PaginationBar
        firstHref={buildHref("/ess", currentParams, { regId: undefined, regPage: "1" })}
        hasNext={response.has_next}
        hasPrevious={response.has_previous}
        lastHref={buildHref("/ess", currentParams, { regId: undefined, regPage: String(totalPages) })}
        nextHref={buildHref("/ess", currentParams, { regId: undefined, regPage: String(page + 1) })}
        page={response.page}
        pageSize={response.page_size}
        previousHref={buildHref("/ess", currentParams, { regId: undefined, regPage: String(Math.max(1, page - 1)) })}
        totalCount={response.total_count}
      />
    </section>
  );
}

export default async function EssPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const leaveStatus = normalizeParam(currentParams.leaveStatus) ?? "all";
  const regStatus = normalizeParam(currentParams.regStatus) ?? "all";
  const leavePage = Math.max(Number(normalizeParam(currentParams.leavePage) || "1") || 1, 1);
  const regPage = Math.max(Number(normalizeParam(currentParams.regPage) || "1") || 1, 1);
  const [{ dashboard, leaveRequests, regularizations, state }, requestOptions] = await Promise.all([
    getEssDashboard({
      leave_status: leaveStatus,
      leave_page: leavePage,
      regularization_status: regStatus,
      regularization_page: regPage,
    }),
    getEssRequestOptions(),
  ]);
  const pendingLeaveCount = dashboard.leave.pending_requests_count;
  const pendingRegularizationCount = dashboard.attendance.pending_regularizations_count;
  const leaveBalanceCount = dashboard.leave.balances.length;
  const attendanceTodayStatus = dashboard.attendance.today.status.replace("_", " ");
  const commandActions = [
    {
      label: "Leave requests",
      value: pendingLeaveCount,
      detail: pendingLeaveCount ? "Requests waiting for approval or follow-up." : "No leave request needs your action.",
      href: "/ess?leaveStatus=pending",
      action: pendingLeaveCount ? "Review" : "History",
      status: essActionStatus(pendingLeaveCount),
    },
    {
      label: "Attendance fixes",
      value: pendingRegularizationCount,
      detail: pendingRegularizationCount ? "Corrections waiting for manager review." : "No attendance correction is pending.",
      href: "/ess?regStatus=pending",
      action: pendingRegularizationCount ? "Review" : "History",
      status: essActionStatus(pendingRegularizationCount),
    },
    {
      label: "Payslips",
      value: "View",
      detail: "Download released payroll files and acknowledge reads.",
      href: "/ess/payslips",
      action: "Open",
      status: "ready" as const,
    },
    {
      label: "Tax declarations",
      value: "Proofs",
      detail: "Review tax regime, declarations, and proof uploads.",
      href: "/ess/statutory-declarations",
      action: "Open",
      status: "ready" as const,
    },
  ];
  const activeSignals = commandActions.filter((item) => item.status !== "ready").length;
  const quickActions = [
    { label: "Apply leave", href: "/ess#request-actions", tone: "primary" },
    { label: "Regularize attendance", href: "/ess#request-actions", tone: "secondary" },
    { label: "Payslips", href: "/ess/payslips", tone: "secondary" },
    { label: "Documents", href: "/ess/documents", tone: "secondary" },
    { label: "Tax declarations", href: "/ess/statutory-declarations", tone: "secondary" },
    { label: "Notifications", href: "/ess/notifications", tone: "secondary" },
  ];

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={state === "live" ? "Live ESS" : "Demo ESS"}
        title="My workspace"
        description="Your leave, attendance, documents, payslips, and tax actions in one simple view."
        actions={
          <>
            <Link className="button button--primary" href="/ess#request-actions">
              New request
            </Link>
            <Link className="button button--secondary" href="/ess/payslips">
              Payslips
            </Link>
            <Link className="button button--secondary" href="/ess/documents">
              Documents
            </Link>
          </>
        }
        pills={["Personal view", dashboard.profile.employee_code, dashboard.profile.department || "No department"]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile className="metric-tile-soft" label="Pending leave requests" labelClassName="metric-label-soft" value={dashboard.leave.pending_requests_count} valueClassName="metric-value-soft" trend="Awaiting action" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Pending regularizations" labelClassName="metric-label-soft" value={dashboard.attendance.pending_regularizations_count} valueClassName="metric-value-soft" trend="Attendance fixes" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Hours this month" labelClassName="metric-label-soft" value={dashboard.attendance.month_to_date.work_duration_hours} valueClassName="metric-value-soft" trend="Logged so far" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Today" labelClassName="metric-label-soft" value={dashboard.attendance.today.status.replace("_", " ")} valueClassName="metric-value-soft" trend="Attendance state" trendClassName="metric-trend-soft" />
        </div>
      </section>

      <section className="section ess-home-grid" data-testid="ess-control-center">
        <article className="panel-card-soft ess-home-card ess-home-card--primary">
          <div className="ess-home-card__header">
            <div>
              <span className="workspace-card__eyebrow">Needs attention</span>
              <h2>Today&apos;s actions</h2>
              <p className="section-copy section-copy-soft">Start with the items that may need your input or review.</p>
            </div>
            <span className="queue-summary-chip"><strong>{activeSignals}</strong> active signals</span>
          </div>
          <div className="ess-action-list">
            {commandActions.map((item) => (
              <div className="ess-action-row" key={item.label}>
                <span className={essActionChipClass(item.status)}>{essActionStatusLabel[item.status]}</span>
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

        <article className="panel-card-soft ess-home-card">
          <div className="ess-home-card__header">
            <div>
              <span className="workspace-card__eyebrow">Quick actions</span>
              <h2>What do you want to do?</h2>
              <p className="section-copy section-copy-soft">Use these shortcuts for the most common employee tasks.</p>
            </div>
            <span className={essActionChipClass(activeSignals ? "warning" : "ready")}>{activeSignals ? "Review" : "Ready"}</span>
          </div>
          <div className="ess-shortcut-grid">
            {quickActions.map((item) => (
              <Link className={`button button--${item.tone}`} href={item.href} key={item.label}>
                {item.label}
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="section ess-snapshot-grid">
        <article className="record-card panel-card-soft ess-profile-card">
          <div className="section-header">
            <div>
              <h2 className="section-heading-soft">My profile</h2>
              <p className="section-copy section-copy-soft">The employee details used for requests and payroll routing.</p>
            </div>
          </div>
          <div className="ess-profile-summary">
            <div>
              <span className="workspace-card__eyebrow">{dashboard.profile.employee_code}</span>
              <strong>{dashboard.profile.full_name}</strong>
              <span>{dashboard.profile.designation || "No designation"} • {dashboard.profile.department || "No department"}</span>
            </div>
            <div className="detail-grid">
              <DetailRow label="Legal entity" value={dashboard.profile.legal_entity || "Not mapped"} />
              <DetailRow label="Branch" value={dashboard.profile.branch || "Not mapped"} />
              <DetailRow label="Location" value={dashboard.profile.location || "Not mapped"} />
              <DetailRow label="Manager" value={dashboard.profile.reporting_manager || "Not mapped"} />
            </div>
          </div>
        </article>

        <article className="record-card panel-card-soft ess-today-card">
          <h2 className="section-heading-soft">Attendance today</h2>
          <div className="ess-today-status">
            <span className={statusClass(dashboard.attendance.today.status)}>{dashboard.attendance.today.status.replace("_", " ")}</span>
            <strong>{formatDate(dashboard.attendance.today.date)}</strong>
            <div className="detail-grid">
              <DetailRow label="Shift" value={dashboard.attendance.today.shift || "Not assigned"} />
              <DetailRow label="Check-in" value={formatDateTime(dashboard.attendance.today.check_in_at)} />
              <DetailRow label="Month hours" value={String(dashboard.attendance.month_to_date.work_duration_hours)} />
            </div>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Leave balances</h2>
            <p className="section-copy section-copy-soft">Available, used, and reserved balances from mapped leave policies.</p>
          </div>
          <Link className="button button--secondary" href="/ess#request-actions">Apply leave</Link>
        </div>
        <div className="workspace-grid-modern balance-grid">
          {dashboard.leave.balances.map((balance) => (
            <article className="workspace-card workspace-card--compact" key={balance.leave_type}>
              <h3>{balance.leave_type}</h3>
              <p className="muted">{balance.policy_name}</p>
              <div className="tableish__meta">
                <span>Available: {balance.closing_balance}</span>
                <span>Used: {balance.consumed_amount}</span>
                <span>Reserved: {balance.reserved_amount}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="request-actions">
        <EssRequestSubmissionPanel
          attendanceRecords={requestOptions.attendanceRecords}
          isDemo={state === "demo" || requestOptions.state === "demo"}
          leaveTypes={requestOptions.leaveTypes}
        />
      </section>

      <LeaveRequestSection currentParams={currentParams} response={leaveRequests} isDemo={state === "demo"} />
      <RegularizationSection currentParams={currentParams} response={regularizations} />

      {state === "demo" ? (
        <section className="section">
          <div className="notice">
            <strong>Web preview is running in demo mode.</strong>
            <span className="muted">
              Set `HRMS_API_BASE_URL` and a working `HRMS_API_BEARER_TOKEN` in the web environment file to use live data.
            </span>
          </div>
        </section>
      ) : null}
    </main>
  );
}
