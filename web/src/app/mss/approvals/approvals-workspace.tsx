"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore, type MouseEvent } from "react";

import { PageIntro } from "@/components/patterns/page-intro";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { ManagerApprovalReviewAction } from "@/app/mss/approvals/manager-approval-review-action";
import type {
  AttendanceRegularizationItem,
  LeaveRequestItem,
  ManagerAttendanceApprovalListResponse,
  ManagerLeaveApprovalListResponse,
  MssApprovalInboxResponse,
} from "@/lib/types";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";

type SearchParamValue = string | string[] | undefined;
type ApprovalQueue = "leave" | "attendance" | "history";
export type ApprovalQuery = { queue: ApprovalQueue; leavePage: number; regPage: number; historyLeavePage: number; historyAttendancePage: number; historyQuery: string; historyDecision: string; historyStatus: string; historyDateFrom: string; historyDateTo: string; leaveId: string; regId: string };
type ApprovalPermissions = { canApproveLeave: boolean; canReviewAttendance: boolean };
const subscribe = () => () => undefined;
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function formatDate(value: string | null, timeZone: string) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined, timeZone: string) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
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
  timeZone,
  response,
  state,
  canApproveLeave,
  selectedDetail,
  onReconcile,
}: {
  currentParams: Record<string, SearchParamValue>;
  timeZone: string;
  response: ManagerLeaveApprovalListResponse;
  state: "live" | "demo";
  canApproveLeave: boolean;
  selectedDetail?: LeaveRequestItem | null;
  onReconcile: () => Promise<boolean>;
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
                      <strong>{formatDate(request.start_date, timeZone)}</strong>
                      <span className="workspace-table__secondary">to {formatDate(request.end_date, timeZone)}</span>
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
                        <ManagerApprovalReviewAction canDecide={canApproveLeave} item={request} kind="leave" onReconcile={onReconcile} state={state} />
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
              <DetailRow label="Date Range" value={`${formatDate(selected.start_date, timeZone)} to ${formatDate(selected.end_date, timeZone)}`} />
              <DetailRow label="Requested Units" value={selected.requested_units} />
              <DetailRow label="Applied At" value={formatDateTime(selected.applied_at, timeZone)} />
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
                onReconcile={onReconcile}
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
  timeZone,
  response,
  state,
  canReviewAttendance,
  selectedDetail,
  onReconcile,
}: {
  currentParams: Record<string, SearchParamValue>;
  timeZone: string;
  response: ManagerAttendanceApprovalListResponse;
  state: "live" | "demo";
  canReviewAttendance: boolean;
  selectedDetail?: AttendanceRegularizationItem | null;
  onReconcile: () => Promise<boolean>;
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
                      <strong>{formatDate(item.attendance_date, timeZone)}</strong>
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
                        <ManagerApprovalReviewAction canDecide={canReviewAttendance} item={item} kind="attendance" onReconcile={onReconcile} state={state} />
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
              <DetailRow label="Attendance Date" value={formatDate(selected.attendance_date, timeZone)} />
              <DetailRow label="Current Status" value={selected.current_status.replace("_", " ")} />
              <DetailRow label="Requested Status" value={selected.requested_status.replace("_", " ")} />
              <DetailRow label="Actual Check-In" value={formatDateTime(selected.actual_check_in_at, timeZone)} />
              <DetailRow label="Requested Check-In" value={formatDateTime(selected.requested_check_in_at, timeZone)} />
              <DetailRow label="Applied At" value={formatDateTime(selected.applied_at, timeZone)} />
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
                onReconcile={onReconcile}
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
  timeZone,
  canApproveLeave,
  canReviewAttendance,
  leaveHistory,
  regularizationHistory,
}: {
  currentParams: Record<string, SearchParamValue>;
  timeZone: string;
  canApproveLeave: boolean;
  canReviewAttendance: boolean;
  leaveHistory: ManagerLeaveApprovalListResponse;
  regularizationHistory: ManagerAttendanceApprovalListResponse;
}) {
  const hasHistory = leaveHistory.items.length > 0 || regularizationHistory.items.length > 0;
  return (
    <section className="workspace-section">
      <div className="workspace-data-panel mss-history-panel">
        <div className="workspace-data-panel__header mss-history-panel__header">
          <div>
            <span className="eyebrow">Read-only queue</span>
            <h2 className="section-heading-soft">Completed decisions</h2>
            <p className="section-copy section-copy-soft">
              Read-only leave and attendance decisions recorded for your manager identity.
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
        <form action="/mss/approvals" className="workspace-filter-form mss-history-filters" method="get" aria-label="Decision history filters" data-navigation-mode="document">
          <input name="queue" type="hidden" value="history" />
          <div className="workspace-filter-fields">
            <label><span>Employee</span><input defaultValue={normalizeParam(currentParams.historyQuery)} name="historyQuery" placeholder="Name or employee code" /></label>
            <label><span>Your decision</span><select defaultValue={normalizeParam(currentParams.historyDecision)} name="historyDecision"><option value="">All decisions</option><option value="approve">Approved</option><option value="reject">Rejected</option></select></label>
            <label><span>Current status</span><select defaultValue={normalizeParam(currentParams.historyStatus)} name="historyStatus"><option value="">All statuses</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option><option value="withdrawn">Withdrawn</option></select></label>
            <label><span>From</span><input defaultValue={normalizeParam(currentParams.historyDateFrom)} name="historyDateFrom" type="date" /></label>
            <label><span>To</span><input defaultValue={normalizeParam(currentParams.historyDateTo)} name="historyDateTo" type="date" /></label>
          </div>
          <div className="form-actions-bar__buttons"><button className="button button--primary" type="submit">Apply filters</button><a className="button button--secondary" data-navigation-mode="document" href="/mss/approvals?queue=history">Clear filters</a></div>
        </form>
        {hasHistory ? (
          <div className="workspace-stack">
            {canApproveLeave ? <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Completed leave decisions">
              <table className="workspace-table" aria-label="Completed leave decisions"><thead><tr><th>Employee</th><th>Leave</th><th>Period</th><th>Your decision</th><th>Current status</th><th>Decided</th></tr></thead><tbody>
                {leaveHistory.items.map((item) => <tr key={item.id}><td><strong>{item.employee_name}</strong><span className="workspace-table__secondary">{item.employee_code}</span></td><td>{item.leave_type}</td><td>{formatDate(item.start_date, timeZone)} to {formatDate(item.end_date, timeZone)}</td><td><WorkspaceStatusBadge tone={statusTone(item.decision_action || item.status)}>{(item.decision_action || item.status).replaceAll("_", " ")}</WorkspaceStatusBadge></td><td>{item.status.replaceAll("_", " ")}</td><td>{formatDateTime(item.decision_at || item.updated_at, timeZone)}</td></tr>)}
              </tbody></table>
            </WorkspaceTableScrollRegion> : null}
            {canApproveLeave ? <PaginationBar navigationMode="document" page={leaveHistory.page} pageSize={leaveHistory.page_size} totalCount={leaveHistory.total_count} hasPrevious={leaveHistory.has_previous} hasNext={leaveHistory.has_next} firstHref={buildHref("/mss/approvals", currentParams, { historyLeavePage: "1" })} previousHref={buildHref("/mss/approvals", currentParams, { historyLeavePage: String(Math.max(1, leaveHistory.page - 1)) })} nextHref={buildHref("/mss/approvals", currentParams, { historyLeavePage: String(leaveHistory.page + 1) })} lastHref={buildHref("/mss/approvals", currentParams, { historyLeavePage: String(Math.max(1, Math.ceil(leaveHistory.total_count / leaveHistory.page_size))) })} /> : null}
            {canReviewAttendance ? <WorkspaceTableScrollRegion className="workspace-table-scroll workspace-table-region" label="Completed attendance decisions">
              <table className="workspace-table" aria-label="Completed attendance decisions"><thead><tr><th>Employee</th><th>Attendance date</th><th>Requested status</th><th>Your decision</th><th>Current status</th><th>Decided</th></tr></thead><tbody>
                {regularizationHistory.items.map((item) => <tr key={item.id}><td><strong>{item.employee_name}</strong><span className="workspace-table__secondary">{item.employee_code}</span></td><td>{formatDate(item.attendance_date, timeZone)}</td><td>{item.requested_status.replaceAll("_", " ")}</td><td><WorkspaceStatusBadge tone={statusTone(item.decision_action || item.status)}>{(item.decision_action || item.status).replaceAll("_", " ")}</WorkspaceStatusBadge></td><td>{item.status.replaceAll("_", " ")}</td><td>{formatDateTime(item.decision_at || item.resolved_at || item.updated_at, timeZone)}</td></tr>)}
              </tbody></table>
            </WorkspaceTableScrollRegion> : null}
            {canReviewAttendance ? <PaginationBar navigationMode="document" page={regularizationHistory.page} pageSize={regularizationHistory.page_size} totalCount={regularizationHistory.total_count} hasPrevious={regularizationHistory.has_previous} hasNext={regularizationHistory.has_next} firstHref={buildHref("/mss/approvals", currentParams, { historyAttendancePage: "1" })} previousHref={buildHref("/mss/approvals", currentParams, { historyAttendancePage: String(Math.max(1, regularizationHistory.page - 1)) })} nextHref={buildHref("/mss/approvals", currentParams, { historyAttendancePage: String(regularizationHistory.page + 1) })} lastHref={buildHref("/mss/approvals", currentParams, { historyAttendancePage: String(Math.max(1, Math.ceil(regularizationHistory.total_count / regularizationHistory.page_size))) })} /> : null}
          </div>
        ) : <div className="mss-history-panel__empty"><strong>No completed manager decisions are available yet.</strong><span>Completed leave and attendance decisions will appear here.</span></div>}
      </div>
    </section>
  );
}

function approvalQueryFromParams(params: URLSearchParams): ApprovalQuery {
  const requestedQueue = params.get("queue");
  const positive = (key: string) => { const value = Number(params.get(key)); return Number.isSafeInteger(value) && value > 0 ? value : 1; };
  return { queue: requestedQueue === "attendance" || requestedQueue === "history" ? requestedQueue : "leave", leavePage: positive("leavePage"), regPage: positive("regPage"), historyLeavePage: positive("historyLeavePage"), historyAttendancePage: positive("historyAttendancePage"), historyQuery: params.get("historyQuery") || "", historyDecision: params.get("historyDecision") || "", historyStatus: params.get("historyStatus") || "", historyDateFrom: params.get("historyDateFrom") || "", historyDateTo: params.get("historyDateTo") || "", leaveId: params.get("leaveId") || "", regId: params.get("regId") || "" };
}

function approvalQueryFromLocation() {
  return approvalQueryFromParams(new URLSearchParams(window.location.search));
}

function approvalHref(query: ApprovalQuery) {
  const params = new URLSearchParams();
  if (query.queue !== "leave") params.set("queue", query.queue);
  if (query.leavePage !== 1) params.set("leavePage", String(query.leavePage));
  if (query.regPage !== 1) params.set("regPage", String(query.regPage));
  if (query.historyLeavePage !== 1) params.set("historyLeavePage", String(query.historyLeavePage));
  if (query.historyAttendancePage !== 1) params.set("historyAttendancePage", String(query.historyAttendancePage));
  if (query.historyQuery) params.set("historyQuery", query.historyQuery);
  if (query.historyDecision) params.set("historyDecision", query.historyDecision);
  if (query.historyStatus) params.set("historyStatus", query.historyStatus);
  if (query.historyDateFrom) params.set("historyDateFrom", query.historyDateFrom);
  if (query.historyDateTo) params.set("historyDateTo", query.historyDateTo);
  if (query.leaveId) params.set("leaveId", query.leaveId);
  if (query.regId) params.set("regId", query.regId);
  return `/mss/approvals${params.size ? `?${params}` : ""}`;
}

export function ApprovalsWorkspace({ initialData, initialQuery, permissions }: { initialData: MssApprovalInboxResponse; initialQuery: ApprovalQuery; permissions: ApprovalPermissions }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const { canApproveLeave, canReviewAttendance } = permissions;
  const request = useCallback(async (query: ApprovalQuery, signal: AbortSignal) => {
    const read = async (value: ApprovalQuery) => {
      const params = new URLSearchParams({ ...Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)])), include_leave: canApproveLeave ? "1" : "0", include_regularizations: canReviewAttendance ? "1" : "0", include_history: value.queue === "history" ? "1" : "0" });
      const response = await fetch(`/api/manager/approval-inbox?${params}`, { cache: "no-store", signal });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) throw new ScopedResourceError("Your session has expired.", 401);
      if (!response.ok || !payload || typeof payload !== "object" || !(payload as MssApprovalInboxResponse).summary || !Array.isArray((payload as MssApprovalInboxResponse).pendingLeave?.items)) throw new ScopedResourceError(typeof payload.detail === "string" ? payload.detail : "Manager approvals could not be updated.", response.status);
      return payload as MssApprovalInboxResponse;
    };
    const data = await read(query);
    const leaveLast = Math.max(1, Math.ceil(data.pendingLeave.total_count / data.pendingLeave.page_size));
    const regLast = Math.max(1, Math.ceil(data.pendingRegularizations.total_count / data.pendingRegularizations.page_size));
    const historyLeaveLast = Math.max(1, Math.ceil(data.leaveHistory.total_count / data.leaveHistory.page_size));
    const historyAttendanceLast = Math.max(1, Math.ceil(data.regularizationHistory.total_count / data.regularizationHistory.page_size));
    return query.leavePage > leaveLast || query.regPage > regLast || query.historyLeavePage > historyLeaveLast || query.historyAttendancePage > historyAttendanceLast ? read({ ...query, leavePage: Math.min(query.leavePage, leaveLast), regPage: Math.min(query.regPage, regLast), historyLeavePage: Math.min(query.historyLeavePage, historyLeaveLast), historyAttendancePage: Math.min(query.historyAttendancePage, historyAttendanceLast) }) : data;
  }, [canApproveLeave, canReviewAttendance]);
  const resource = useScopedWorkspaceResource({
    initialData,
    initialQuery,
    request,
    resolveQuery: (query, data) => ({
      ...query,
      leavePage: data.pendingLeave.page,
      regPage: data.pendingRegularizations.page,
      historyLeavePage: data.leaveHistory.page,
      historyAttendancePage: data.regularizationHistory.page,
      leaveId: data.selectedLeaveDetail && ["pending", "partially_approved"].includes(data.selectedLeaveDetail.status) ? query.leaveId : "",
      regId: data.selectedRegularizationDetail && data.selectedRegularizationDetail.status === "pending" ? query.regId : "",
    }),
    historyHref: (query) => approvalHref(query),
    readHistoryQuery: approvalQueryFromLocation,
    fallbackError: "Manager approvals could not be updated. The last confirmed queue is still shown.",
  });
  const { summary, pendingLeave, pendingRegularizations, leaveHistory, regularizationHistory, selectedLeaveDetail, selectedRegularizationDetail, state } = resource.data;
  const query = resource.query;
  const queue = query.queue;
  const currentParams: Record<string, string> = { queue, leavePage: String(query.leavePage), regPage: String(query.regPage), historyLeavePage: String(query.historyLeavePage), historyAttendancePage: String(query.historyAttendancePage), historyQuery: query.historyQuery, historyDecision: query.historyDecision, historyStatus: query.historyStatus, historyDateFrom: query.historyDateFrom, historyDateTo: query.historyDateTo };
  if (query.leaveId) currentParams.leaveId = query.leaveId;
  if (query.regId) currentParams.regId = query.regId;
  const inboxState = state === "live" ? "live" : "demo";
  const reconcile = async () => (await resource.load(query, "none")).ok;
  const navigate = (event: MouseEvent<HTMLElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!anchor) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== "/mss/approvals") return;
    event.preventDefault();
    void resource.load(approvalQueryFromParams(url.searchParams));
  };
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
      description: "Review completed leave and attendance decisions for your manager scope.",
      nextAction: "Use this read-only record to confirm previous decisions and their resolution time.",
    },
  }[queue];

  return (
    <main aria-busy={resource.isPending} className="shell shell--workspace shell--mss-approvals accerio-page" data-hydrated={hydrated} onClickCapture={navigate}>
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

      {resource.error ? <section className="workspace-section"><div className="notice notice--error" role="alert"><strong>Approval queue could not be refreshed.</strong><span className="muted">{resource.error}</span><button className="button button--secondary" disabled={resource.isPending} onClick={() => void resource.load(query, "none")} type="button">Retry queue</button></div></section> : null}

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
        <DecisionHistorySection currentParams={currentParams} timeZone={summary.timezone} canApproveLeave={canApproveLeave} canReviewAttendance={canReviewAttendance} leaveHistory={leaveHistory} regularizationHistory={regularizationHistory} />
      ) : queue === "attendance" ? (
        <RegularizationApprovalSection currentParams={currentParams} timeZone={summary.timezone} response={pendingRegularizations} state={inboxState} canReviewAttendance={canReviewAttendance} selectedDetail={selectedRegularizationDetail} onReconcile={reconcile} />
      ) : (
        <LeaveApprovalSection currentParams={currentParams} timeZone={summary.timezone} response={pendingLeave} state={inboxState} canApproveLeave={canApproveLeave} selectedDetail={selectedLeaveDetail} onReconcile={reconcile} />
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
