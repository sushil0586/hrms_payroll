import Link from "next/link";

import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { ManagerApprovalReviewAction } from "@/app/mss/approvals/manager-approval-review-action";
import { getMssApprovalInbox, getMssAttendanceRegularizationDetail, getMssLeaveRequestDetail } from "@/lib/api";
import { requireWorkspaceAccess, sessionHasPermission } from "@/lib/workspace-access";
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
type ApprovalQueue = "leave" | "attendance" | "history";

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

function statusTone(status: string) {
  if (status === "approved" || status === "completed") return "success";
  if (status === "rejected" || status === "cancelled") return "danger";
  if (status === "pending" || status === "partially_approved") return "warning";
  return "info";
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

function resolveSelectedItem<T extends { id: string }>(items: T[], selectedId?: string, selectedDetail?: T | null) {
  if (selectedId) {
    if (selectedDetail?.id === selectedId) {
      return selectedDetail;
    }
    const selected = items.find((item) => item.id === selectedId);
    if (selected) {
      return selected;
    }
    return null;
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

function QueueAccessNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="section">
      <div className="notice">
        <strong>{title}</strong>
        <span className="muted">{description}</span>
      </div>
    </section>
  );
}

function LeaveApprovalSection({
  currentParams,
  response,
  state,
  canApproveLeave,
  selectedDetail,
}: {
  currentParams: Record<string, SearchParamValue>;
  response: ManagerLeaveApprovalListResponse;
  state: "live" | "demo";
  canApproveLeave: boolean;
  selectedDetail?: LeaveRequestItem | null;
}) {
  const items = response.items;
  const page = Math.max(Number(normalizeParam(currentParams.leavePage) || String(response.page)) || response.page, 1);
  const totalPages = Math.max(1, Math.ceil(response.total_count / response.page_size));
  const selectedId = normalizeParam(currentParams.leaveId);
  const selected = resolveSelectedItem(items, selectedId, selectedDetail);
  const selectedOutsidePage = Boolean(selectedId && selectedDetail?.id === selectedId && !items.some((item) => item.id === selectedId));

  if (!canApproveLeave) {
    return (
      <QueueAccessNotice
        title="Leave approvals are not enabled for your role."
        description="Ask HR to add leave approval access if you should decide leave requests for this team."
      />
    );
  }

  return (
    <section className="workspace-section queue-review-split mss-approval-queue-grid workspace-review-grid">
      <div className="workspace-review-grid__list">
      <article className="workspace-data-panel record-card">
        <div className="workspace-data-panel__header section-header">
          <div>
            <h2 className="section-heading-soft">Pending leave requests</h2>
            <p className="section-copy section-copy-soft">Pending queue for manager decisions.</p>
          </div>
        </div>
        <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Pending leave requests, scroll for more columns">
          {items.length ? (
            <table className="workspace-table attendance-directory-table mss-approval-table" aria-label="Pending leave requests">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((request) => (
                  <tr className={selected?.id === request.id ? "is-selected" : ""} key={request.id}>
                    <td className="workspace-table__primary-cell">
                      <div>
                        <strong>{request.employee_name}</strong>
                        <span>{request.employee_code} - {request.department || "No department"}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{request.leave_type}</strong>
                      <span className="workspace-table__secondary">{requestActionLabel(request.request_action)} - {request.requested_units} units</span>
                    </td>
                    <td>
                      <strong>{formatDate(request.start_date)}</strong>
                      <span className="workspace-table__secondary">to {formatDate(request.end_date)}</span>
                    </td>
                    <td><WorkspaceStatusBadge tone={statusTone(request.status)}>{request.status.replace("_", " ")}</WorkspaceStatusBadge></td>
                    <td><span className="workspace-table__secondary">{request.reason || "No reason provided."}</span></td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="button button--ghost"
                          href={buildHref("/mss/approvals", currentParams, {
                            queue: "leave",
                            leaveId: request.id,
                            regId: undefined,
                          })}
                        >
                          Select
                        </Link>
                        <ManagerApprovalReviewAction canDecide={canApproveLeave} item={request} kind="leave" state={state} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="notice">
              <strong>No pending leave approvals.</strong>
              <span className="muted">This queue is currently clear.</span>
            </div>
          )}
        </WorkspaceTableScrollRegion>
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
      </div>

      <article className="workspace-data-panel record-card mss-approval-detail-panel">
        <div className="workspace-data-panel__header">
          <h2 className="section-heading-soft">Selected leave request</h2>
          <p className="section-copy section-copy-soft">Detail for the selected leave or cancellation request.</p>
        </div>
        {selected ? (
          <>
            {selectedOutsidePage ? (
              <div className="notice notice--compact">
                <strong>Opened from direct link.</strong>
                <span className="muted">This approval is selected even though it is outside the current queue page.</span>
              </div>
            ) : null}
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
              <DetailRow
                label="Attendance Collision"
                value={selected.attendance_collision_summary?.collision_count ? `${selected.attendance_collision_summary.collision_count} payroll-impacting overlap` : "Clear"}
              />
              {selected.cancel_requires_reapproval ? (
                <DetailRow
                  label="Cancellation route"
                  value={selected.cancel_approval_route ? selected.cancel_approval_route.replaceAll("_", " ") : "Uses the original leave route"}
                />
              ) : null}
            </div>
            <div className="mss-selected-review-band">
              <div>
                <span className="eyebrow">Focused review</span>
                <strong>Open the full decision dialog</strong>
                <p>Review the employee context, then approve or reject with a manager note.</p>
              </div>
              <ManagerApprovalReviewAction
                canDecide={canApproveLeave}
                item={selected}
                kind="leave"
                state={state}
                variant="primary"
              />
            </div>
          </>
        ) : (
          <div className="notice">
            <strong>No leave approval selected.</strong>
            <span className="muted">Choose an item from the leave queue to inspect it in detail.</span>
          </div>
        )}
      </article>


    </section>
  );
}

function RegularizationApprovalSection({
  currentParams,
  response,
  state,
  canReviewAttendance,
  selectedDetail,
}: {
  currentParams: Record<string, SearchParamValue>;
  response: ManagerAttendanceApprovalListResponse;
  state: "live" | "demo";
  canReviewAttendance: boolean;
  selectedDetail?: AttendanceRegularizationItem | null;
}) {
  const items = response.items;
  const page = Math.max(Number(normalizeParam(currentParams.regPage) || String(response.page)) || response.page, 1);
  const totalPages = Math.max(1, Math.ceil(response.total_count / response.page_size));
  const selectedId = normalizeParam(currentParams.regId);
  const selected = resolveSelectedItem(items, selectedId, selectedDetail);
  const selectedOutsidePage = Boolean(selectedId && selectedDetail?.id === selectedId && !items.some((item) => item.id === selectedId));

  if (!canReviewAttendance) {
    return (
      <QueueAccessNotice
        title="Attendance approvals are not enabled for your role."
        description="Ask HR to add attendance regularization review access if you should clear attendance fixes."
      />
    );
  }

  return (
    <section className="workspace-section queue-review-split mss-approval-queue-grid workspace-review-grid">
      <div className="workspace-review-grid__list">
      <article className="workspace-data-panel record-card">
        <div className="workspace-data-panel__header section-header">
          <div>
            <h2 className="section-heading-soft">Pending attendance fixes</h2>
            <p className="section-copy section-copy-soft">Attendance exception queue.</p>
          </div>
        </div>
        <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Pending attendance requests, scroll for more columns">
          {items.length ? (
            <table className="workspace-table attendance-directory-table mss-approval-table" aria-label="Pending attendance fixes">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Correction</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className={selected?.id === item.id ? "is-selected" : ""} key={item.id}>
                    <td className="workspace-table__primary-cell">
                      <div>
                        <strong>{item.employee_name}</strong>
                        <span>{item.employee_code} - {item.department || "No department"}</span>
                      </div>
                    </td>
                    <td>
                      <strong>{formatDate(item.attendance_date)}</strong>
                      <span className="workspace-table__secondary">{item.designation || "No designation"}</span>
                    </td>
                    <td>
                      <strong>{item.requested_status.replace("_", " ")}</strong>
                      <span className="workspace-table__secondary">from {item.current_status.replace("_", " ")}</span>
                    </td>
                    <td><WorkspaceStatusBadge tone={statusTone(item.status)}>{item.status.replace("_", " ")}</WorkspaceStatusBadge></td>
                    <td><span className="workspace-table__secondary">{item.reason || "No reason provided."}</span></td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="button button--ghost"
                          href={buildHref("/mss/approvals", currentParams, {
                            queue: "attendance",
                            regId: item.id,
                            leaveId: undefined,
                          })}
                        >
                          Select
                        </Link>
                        <ManagerApprovalReviewAction canDecide={canReviewAttendance} item={item} kind="attendance" state={state} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="notice">
              <strong>No pending regularizations.</strong>
              <span className="muted">This queue is currently clear.</span>
            </div>
          )}
        </WorkspaceTableScrollRegion>
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
      </div>

      <article className="workspace-data-panel record-card mss-approval-detail-panel">
        <div className="workspace-data-panel__header">
          <h2 className="section-heading-soft">Selected attendance request</h2>
          <p className="section-copy section-copy-soft">Detail for the selected item.</p>
        </div>
        {selected ? (
          <>
            {selectedOutsidePage ? (
              <div className="notice notice--compact">
                <strong>Opened from direct link.</strong>
                <span className="muted">This regularization is selected even though it is outside the current queue page.</span>
              </div>
            ) : null}
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
            <div className="mss-selected-review-band">
              <div>
                <span className="eyebrow">Focused review</span>
                <strong>Open the full decision dialog</strong>
                <p>Verify the correction and payroll impact, then approve or reject with a manager note.</p>
              </div>
              <ManagerApprovalReviewAction
                canDecide={canReviewAttendance}
                item={selected}
                kind="attendance"
                state={state}
                variant="primary"
              />
            </div>
          </>
        ) : (
          <div className="notice">
            <strong>No regularization selected.</strong>
            <span className="muted">Choose an item from the attendance queue to inspect it in detail.</span>
          </div>
        )}
      </article>


    </section>
  );
}

function DecisionHistorySection({
  currentParams,
  canApproveLeave,
  canReviewAttendance,
}: {
  currentParams: Record<string, SearchParamValue>;
  canApproveLeave: boolean;
  canReviewAttendance: boolean;
}) {
  return (
    <section className="workspace-section">
      <div className="workspace-data-panel mss-history-panel">
        <div className="workspace-data-panel__header mss-history-panel__header">
          <div>
            <span className="eyebrow">Read-only queue</span>
            <h2 className="section-heading-soft">Completed decisions</h2>
            <p className="section-copy section-copy-soft">
              Completed-decision history is currently unavailable in this workspace.
            </p>
          </div>
          <div className="mss-history-panel__actions">
            {canApproveLeave ? (
              <a
                className="button button--secondary"
                data-navigation-mode="document"
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "leave",
                  leavePage: "1",
                  regId: undefined,
                })}
              >
                Leave queue
              </a>
            ) : null}
            {canReviewAttendance ? (
              <a
                className="button button--secondary"
                data-navigation-mode="document"
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "attendance",
                  regPage: "1",
                  leaveId: undefined,
                })}
              >
                Attendance queue
              </a>
            ) : null}
          </div>
        </div>
        <div className="mss-history-panel__empty">
          <strong>No completed manager decisions are available yet.</strong>
          <span>
            Pending work remains in the Leave and Attendance queues. Contact HR if you need a completed decision record.
          </span>
        </div>
      </div>
    </section>
  );
}

export default async function MssApprovalsPage({ searchParams }: PageProps) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "mss" });
  const isDemoAccess = !sessionUser;
  const canApproveLeave = isDemoAccess || sessionHasPermission(sessionUser, "leave.requests.approve");
  const canReviewAttendance = isDemoAccess || sessionHasPermission(sessionUser, "attendance.regularization.review");
  const currentParams = (await searchParams) ?? {};
  const requestedQueue = normalizeParam(currentParams.queue);
  let queue: ApprovalQueue =
    requestedQueue === "attendance" || requestedQueue === "history" ? requestedQueue : "leave";
  if (queue === "leave" && !canApproveLeave && canReviewAttendance) {
    queue = "attendance";
  }
  const leavePage = Math.max(Number(normalizeParam(currentParams.leavePage) || "1") || 1, 1);
  const regPage = Math.max(Number(normalizeParam(currentParams.regPage) || "1") || 1, 1);
  const { summary, pendingLeave, pendingRegularizations, state } = await getMssApprovalInbox({
    leave_page: leavePage,
    leave_page_size: 5,
    regularization_page: regPage,
    regularization_page_size: 5,
    include_leave: canApproveLeave,
    include_regularizations: canReviewAttendance,
  });
  const selectedLeaveId = normalizeParam(currentParams.leaveId);
  const selectedRegularizationId = normalizeParam(currentParams.regId);
  const [selectedLeaveDetail, selectedRegularizationDetail] = await Promise.all([
    selectedLeaveId && canApproveLeave
      ? getMssLeaveRequestDetail(selectedLeaveId).then((result) => result.data).catch(() => null)
      : Promise.resolve(null),
    selectedRegularizationId && canReviewAttendance
      ? getMssAttendanceRegularizationDetail(selectedRegularizationId).then((result) => result.data).catch(() => null)
      : Promise.resolve(null),
  ]);
  const inboxState = state === "live" ? "live" : "demo";
  const queueMeta = {
    leave: {
      eyebrow: "Leave decisions",
      title: "Leave approvals",
      description: "Review leave dates, employee reason, policy context, and manager decision notes.",
      nextAction: "Select a pending leave request, confirm context, then approve or reject with a useful comment.",
    },
    attendance: {
      eyebrow: "Attendance decisions",
      title: "Attendance approvals",
      description: "Review attendance correction requests separately from leave so payroll-impact fixes stay clear.",
      nextAction: "Open one regularization, verify the requested correction, then decide with a manager note.",
    },
    history: {
      eyebrow: "Manager audit",
      title: "Decision history",
      description: "Completed-decision history is not available in this workspace.",
      nextAction: "Use Leave or Attendance for pending work, or contact HR for a completed decision record.",
    },
  }[queue];

  return (
    <main className="shell shell--workspace shell--mss-approvals accerio-page">
      <PageIntro appearance="accerio" eyebrow="Manager workspace" title="Manager approvals"
        description="Review requests, confirm context and record a decision." />

      <section className="workspace-section" aria-label="Manager approval metrics">
        <div className="attendance-summary-strip">
          <span><strong>{summary.team_size}</strong> team members</span>
          <span><strong>{summary.pending_leave_approvals_count}</strong> leave approvals</span>
          <span><strong>{summary.pending_attendance_regularizations_count}</strong> regularizations</span>
          <span><strong>{summary.attendance_exceptions_today}</strong> exceptions today</span>
        </div>
      </section>

      <section className="workspace-standard-panel workspace-queue-context" aria-label="Approval views and guidance">
            <nav className="tabbar" aria-label="Approval views">
              <a
                aria-current={queue === "leave" ? "page" : undefined} className={`tab ${queue === "leave" ? "tab--active" : ""}`}
                data-navigation-mode="document"
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "leave",
                  regId: undefined,
                  leavePage: "1",
                })}
              >
                <span>Leave</span>
                <span>{summary.pending_leave_approvals_count}</span>
              </a>
              <a
                aria-current={queue === "attendance" ? "page" : undefined} className={`tab ${queue === "attendance" ? "tab--active" : ""}`}
                data-navigation-mode="document"
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "attendance",
                  leaveId: undefined,
                  regPage: "1",
                })}
              >
                <span>Attendance</span>
                <span>{summary.pending_attendance_regularizations_count}</span>
              </a>
              <a
                aria-current={queue === "history" ? "page" : undefined} className={`tab ${queue === "history" ? "tab--active" : ""}`}
                data-navigation-mode="document"
                href={buildHref("/mss/approvals", currentParams, {
                  queue: "history",
                  leaveId: undefined,
                  regId: undefined,
                })}
              >
                <span>History</span>
                <span>Audit</span>
              </a>
            </nav>
        <div className="workspace-queue-context__copy"><h2>{queueMeta.title}</h2><p>{queueMeta.description}</p><p className="muted">{queueMeta.nextAction}</p></div>
      </section>

      {queue === "history" ? (
        <DecisionHistorySection currentParams={currentParams} canApproveLeave={canApproveLeave} canReviewAttendance={canReviewAttendance} />
      ) : queue === "attendance" ? (
        <RegularizationApprovalSection currentParams={currentParams} response={pendingRegularizations} state={inboxState} canReviewAttendance={canReviewAttendance} selectedDetail={selectedRegularizationDetail} />
      ) : (
        <LeaveApprovalSection currentParams={currentParams} response={pendingLeave} state={inboxState} canApproveLeave={canApproveLeave} selectedDetail={selectedLeaveDetail} />
      )}

      {inboxState === "demo" ? (
        <section className="workspace-section">
          <div className="notice">
            <strong>Manager approvals are currently using seeded demo data.</strong>
            <span className="muted">
              This page can switch to live pending approval endpoints once auth wiring is complete.
            </span>
          </div>
        </section>
      ) : null}
    </main>
  );
}
