import Link from "next/link";

import { LogoutButton } from "@/app/components/logout-button";
import { MetricTile } from "@/components/patterns/metric-tile";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { PageIntro } from "@/components/patterns/page-intro";
import { ManagerDecisionPanel } from "@/app/mss/approvals/manager-decision-panel";
import { getMssApprovalInbox } from "@/lib/api";
import type {
  AttendanceRegularizationItem,
  LeaveRequestItem,
  ManagerAttendanceApprovalListResponse,
  ManagerLeaveApprovalListResponse,
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

function requestActionLabel(requestAction?: string) {
  return requestAction === "cancellation_request" ? "Cancellation request" : "Leave request";
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

function LeaveApprovalSection({
  currentParams,
  response,
  state,
}: {
  currentParams: Record<string, SearchParamValue>;
  response: ManagerLeaveApprovalListResponse;
  state: "live" | "demo";
}) {
  const items = response.items;
  const page = Math.max(Number(normalizeParam(currentParams.leavePage) || String(response.page)) || response.page, 1);
  const totalPages = Math.max(1, Math.ceil(response.total_count / response.page_size));
  const selected = resolveSelectedItem(items, normalizeParam(currentParams.leaveId));

  return (
    <section className="section queue-review-split">
      <article className="record-card panel-card-soft">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Leave approvals</h2>
            <p className="section-copy section-copy-soft">Pending queue for manager decisions.</p>
          </div>
        </div>
        <div className="tableish">
          {items.length ? (
            items.map((request) => (
              <Link
                className={`tableish__row ${selected?.id === request.id ? "tableish__row--active" : ""}`}
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "leave",
                  leaveId: request.id,
                  regId: undefined,
                })}
                key={request.id}
              >
                <div className="tableish__head">
                  <strong>{request.employee_name}</strong>
                  <span className={statusClass(request.status)}>{request.status.replace("_", " ")}</span>
                </div>
                <div className="tableish__meta">
                  <span>{requestActionLabel(request.request_action)}</span>
                  <span>{request.employee_code}</span>
                  <span>{request.department}</span>
                  <span>{request.designation}</span>
                </div>
                <div className="tableish__meta">
                  <span>{request.leave_type}</span>
                  <span>{formatDate(request.start_date)} to {formatDate(request.end_date)}</span>
                  <span>{request.requested_units} units</span>
                </div>
                <span className="muted">
                  {request.request_action === "cancellation_request"
                    ? `Cancel reason: ${request.reason || "No reason provided."}`
                    : request.reason || "No reason provided."}
                </span>
              </Link>
            ))
          ) : (
            <div className="notice">
              <strong>No pending leave approvals.</strong>
              <span className="muted">This queue is currently clear.</span>
            </div>
          )}
        </div>
      </article>

      <article className="record-card panel-card-soft">
        <div>
          <h2 className="section-heading-soft">Leave approval detail</h2>
          <p className="section-copy section-copy-soft">Detail for the selected leave or cancellation request.</p>
        </div>
        {selected ? (
          <>
            <div className="detail-grid">
              <DetailRow label="Request Type" value={requestActionLabel(selected.request_action)} />
              <DetailRow label="Employee" value={`${selected.employee_name || "Unknown"} (${selected.employee_code || "N/A"})`} />
              <DetailRow label="Department" value={selected.department || "Not mapped"} />
              <DetailRow label="Designation" value={selected.designation || "Not mapped"} />
              <DetailRow label="Leave Type" value={selected.leave_type} />
              <DetailRow label="Date Range" value={`${formatDate(selected.start_date)} to ${formatDate(selected.end_date)}`} />
              <DetailRow label="Requested Units" value={selected.requested_units} />
              <DetailRow label="Applied At" value={formatDateTime(selected.applied_at)} />
              <DetailRow
                label={selected.request_action === "cancellation_request" ? "Cancellation reason" : "Reason"}
                value={selected.reason || "No reason provided."}
              />
              {selected.cancel_requires_reapproval ? (
                <DetailRow
                  label="Cancellation route"
                  value={selected.cancel_approval_route ? selected.cancel_approval_route.replaceAll("_", " ") : "Uses the original leave route"}
                />
              ) : null}
            </div>
            <ManagerDecisionPanel
              description="Capture the manager decision without leaving the selected request."
              employeeReason={selected.reason}
              itemId={selected.id}
              kind="leave"
              requestAction={selected.request_action}
              state={state}
              status={selected.status}
              title={selected.request_action === "cancellation_request" ? "Cancellation decision" : "Leave decision"}
            />
          </>
        ) : (
          <div className="notice">
            <strong>No leave approval selected.</strong>
            <span className="muted">Choose an item from the leave queue to inspect it in detail.</span>
          </div>
        )}
      </article>

      <PaginationBar
        firstHref={buildHref("/mss/approvals", currentParams, { queue: "leave", leaveId: undefined, leavePage: "1" })}
        hasNext={response.has_next}
        hasPrevious={response.has_previous}
        lastHref={buildHref("/mss/approvals", currentParams, { queue: "leave", leaveId: undefined, leavePage: String(totalPages) })}
        nextHref={buildHref("/mss/approvals", currentParams, { queue: "leave", leaveId: undefined, leavePage: String(page + 1) })}
        page={response.page}
        pageSize={response.page_size}
        previousHref={buildHref("/mss/approvals", currentParams, { queue: "leave", leaveId: undefined, leavePage: String(Math.max(1, page - 1)) })}
        totalCount={response.total_count}
      />
    </section>
  );
}

function RegularizationApprovalSection({
  currentParams,
  response,
  state,
}: {
  currentParams: Record<string, SearchParamValue>;
  response: ManagerAttendanceApprovalListResponse;
  state: "live" | "demo";
}) {
  const items = response.items;
  const page = Math.max(Number(normalizeParam(currentParams.regPage) || String(response.page)) || response.page, 1);
  const totalPages = Math.max(1, Math.ceil(response.total_count / response.page_size));
  const selected = resolveSelectedItem(items, normalizeParam(currentParams.regId));

  return (
    <section className="section queue-review-split">
      <article className="record-card panel-card-soft">
        <div className="section-header">
          <div>
            <h2 className="section-heading-soft">Attendance regularizations</h2>
            <p className="section-copy section-copy-soft">Attendance exception queue.</p>
          </div>
        </div>
        <div className="tableish">
          {items.length ? (
            items.map((item) => (
              <Link
                className={`tableish__row ${selected?.id === item.id ? "tableish__row--active" : ""}`}
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "attendance",
                  regId: item.id,
                  leaveId: undefined,
                })}
                key={item.id}
              >
                <div className="tableish__head">
                  <strong>{item.employee_name}</strong>
                  <span className={statusClass(item.status)}>{item.status.replace("_", " ")}</span>
                </div>
                <div className="tableish__meta">
                  <span>{item.employee_code}</span>
                  <span>{item.department}</span>
                  <span>{item.designation}</span>
                </div>
                <div className="tableish__meta">
                  <span>{formatDate(item.attendance_date)}</span>
                  <span>Current: {item.current_status.replace("_", " ")}</span>
                  <span>Requested: {item.requested_status.replace("_", " ")}</span>
                </div>
                <span className="muted">{item.reason || "No reason provided."}</span>
              </Link>
            ))
          ) : (
            <div className="notice">
              <strong>No pending regularizations.</strong>
              <span className="muted">This queue is currently clear.</span>
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
          <>
            <div className="detail-grid">
              <DetailRow label="Employee" value={`${selected.employee_name || "Unknown"} (${selected.employee_code || "N/A"})`} />
              <DetailRow label="Attendance Date" value={formatDate(selected.attendance_date)} />
              <DetailRow label="Current Status" value={selected.current_status.replace("_", " ")} />
              <DetailRow label="Requested Status" value={selected.requested_status.replace("_", " ")} />
              <DetailRow label="Actual Check-In" value={formatDateTime(selected.actual_check_in_at)} />
              <DetailRow label="Requested Check-In" value={formatDateTime(selected.requested_check_in_at)} />
              <DetailRow label="Applied At" value={formatDateTime(selected.applied_at)} />
              <DetailRow label="Reason" value={selected.reason || "No reason provided."} />
            </div>
            <ManagerDecisionPanel
              description="Approve or reject the selected attendance exception with a manager note."
              employeeReason={selected.reason}
              itemId={selected.id}
              kind="attendance"
              state={state}
              status={selected.status}
              title="Regularization decision"
            />
          </>
        ) : (
          <div className="notice">
            <strong>No regularization selected.</strong>
            <span className="muted">Choose an item from the attendance queue to inspect it in detail.</span>
          </div>
        )}
      </article>

      <PaginationBar
        firstHref={buildHref("/mss/approvals", currentParams, { queue: "attendance", regId: undefined, regPage: "1" })}
        hasNext={response.has_next}
        hasPrevious={response.has_previous}
        lastHref={buildHref("/mss/approvals", currentParams, { queue: "attendance", regId: undefined, regPage: String(totalPages) })}
        nextHref={buildHref("/mss/approvals", currentParams, { queue: "attendance", regId: undefined, regPage: String(page + 1) })}
        page={response.page}
        pageSize={response.page_size}
        previousHref={buildHref("/mss/approvals", currentParams, { queue: "attendance", regId: undefined, regPage: String(Math.max(1, page - 1)) })}
        totalCount={response.total_count}
      />
    </section>
  );
}

export default async function MssApprovalsPage({ searchParams }: PageProps) {
  const currentParams = (await searchParams) ?? {};
  const queue = normalizeParam(currentParams.queue) ?? "leave";
  const leavePage = Math.max(Number(normalizeParam(currentParams.leavePage) || "1") || 1, 1);
  const regPage = Math.max(Number(normalizeParam(currentParams.regPage) || "1") || 1, 1);
  const { summary, pendingLeave, pendingRegularizations, state } = await getMssApprovalInbox({
    leave_page: leavePage,
    regularization_page: regPage,
  });
  const inboxState = state === "live" ? "live" : "demo";

  return (
    <main className="shell shell--workspace">
      <PageIntro
        eyebrow={state === "live" ? "Live MSS" : "Demo MSS"}
        title="Manager inbox"
        description="Leave and attendance decisions in one compact queue."
        actions={
          <>
            <Link className="button button--secondary" href="/">
              Home
            </Link>
            <Link className="button button--secondary" href="/ess">
              Open ESS
            </Link>
            <LogoutButton />
          </>
        }
        pills={["Pending decisions", "Team context"]}
        showPills
      />

      <section className="section">
        <div className="metric-grid-modern">
          <MetricTile className="metric-tile-soft" label="Team members" labelClassName="metric-label-soft" value={summary.team_size} valueClassName="metric-value-soft" trend="Current span" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Leave approvals" labelClassName="metric-label-soft" value={summary.pending_leave_approvals_count} valueClassName="metric-value-soft" trend="Pending decisions" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Regularizations" labelClassName="metric-label-soft" value={summary.pending_attendance_regularizations_count} valueClassName="metric-value-soft" trend="Attendance fixes" trendClassName="metric-trend-soft" />
          <MetricTile className="metric-tile-soft" label="Exceptions today" labelClassName="metric-label-soft" value={summary.attendance_exceptions_today} valueClassName="metric-value-soft" trend="Daily pulse" trendClassName="metric-trend-soft" />
        </div>
      </section>

      <section className="section">
        <div className="queue-toolbar panel-card-soft">
          <div className="toolbar">
            <div>
              <h2 className="section-heading-soft">Approval queues</h2>
              <p className="section-copy section-copy-soft">Switch queues without losing context.</p>
            </div>
            <div className="tabbar">
              <Link
                className={`tab ${queue === "leave" ? "tab--active" : ""}`}
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "leave",
                  regId: undefined,
                  leavePage: "1",
                })}
              >
                <span>Leave</span>
                <span>{summary.pending_leave_approvals_count}</span>
              </Link>
              <Link
                className={`tab ${queue === "attendance" ? "tab--active" : ""}`}
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "attendance",
                  leaveId: undefined,
                  regPage: "1",
                })}
              >
                <span>Attendance</span>
                <span>{summary.pending_attendance_regularizations_count}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {queue === "attendance" ? (
        <RegularizationApprovalSection currentParams={currentParams} response={pendingRegularizations} state={inboxState} />
      ) : (
        <LeaveApprovalSection currentParams={currentParams} response={pendingLeave} state={inboxState} />
      )}

      {inboxState === "demo" ? (
        <section className="section">
          <div className="notice">
            <strong>Manager inbox is currently using seeded demo data.</strong>
            <span className="muted">
              This page can switch to live pending approval endpoints once auth wiring is complete.
            </span>
          </div>
        </section>
      ) : null}
    </main>
  );
}
