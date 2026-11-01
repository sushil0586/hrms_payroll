import { getMssApprovalInbox, getMssAttendanceRegularizationDetail, getMssLeaveRequestDetail } from "@/lib/api";
import type { MssApprovalInboxResponse } from "@/lib/types";
import { requireWorkspaceAccess, sessionHasPermission } from "@/lib/workspace-access";

import { ApprovalsWorkspace, type ApprovalQuery } from "./approvals-workspace";

type SearchParamValue = string | string[] | undefined;

export default async function MssApprovalsPage({ searchParams }: { searchParams?: Promise<Record<string, SearchParamValue>> }) {
  const sessionUser = await requireWorkspaceAccess({ workspace: "mss" });
  const isDemoAccess = !sessionUser;
  const canApproveLeave = isDemoAccess || sessionHasPermission(sessionUser, "leave.requests.approve");
  const canReviewAttendance = isDemoAccess || sessionHasPermission(sessionUser, "attendance.regularization.review");
  const params = (await searchParams) ?? {};
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  const positive = (key: string) => { const value = Number(first(key)); return Number.isSafeInteger(value) && value > 0 ? value : 1; };
  const requestedQueue = first("queue");
  let queue: ApprovalQuery["queue"] = requestedQueue === "attendance" || requestedQueue === "history" ? requestedQueue : "leave";
  if (queue === "leave" && !canApproveLeave && canReviewAttendance) queue = "attendance";
  const query: ApprovalQuery = { queue, leavePage: positive("leavePage"), regPage: positive("regPage"), historyLeavePage: positive("historyLeavePage"), historyAttendancePage: positive("historyAttendancePage"), historyQuery: first("historyQuery") || "", historyDecision: first("historyDecision") || "", historyStatus: first("historyStatus") || "", historyDateFrom: first("historyDateFrom") || "", historyDateTo: first("historyDateTo") || "", leaveId: first("leaveId") || "", regId: first("regId") || "" };
  const inbox = await getMssApprovalInbox({ leave_page: query.leavePage, leave_page_size: 5, regularization_page: query.regPage, regularization_page_size: 5, history_leave_page: query.historyLeavePage, history_attendance_page: query.historyAttendancePage, history_query: query.historyQuery, history_decision: query.historyDecision, history_status: query.historyStatus, history_date_from: query.historyDateFrom, history_date_to: query.historyDateTo, include_leave: canApproveLeave, include_regularizations: canReviewAttendance, include_history: queue === "history" });
  const [selectedLeaveDetail, selectedRegularizationDetail] = await Promise.all([
    query.leaveId && canApproveLeave ? getMssLeaveRequestDetail(query.leaveId).then((result) => result.data).catch(() => null) : Promise.resolve(null),
    query.regId && canReviewAttendance ? getMssAttendanceRegularizationDetail(query.regId).then((result) => result.data).catch(() => null) : Promise.resolve(null),
  ]);
  const data: MssApprovalInboxResponse = { ...inbox, state: inbox.state === "live" ? "live" : "demo", selectedLeaveDetail, selectedRegularizationDetail };
  return <ApprovalsWorkspace initialData={data} initialQuery={query} permissions={{ canApproveLeave, canReviewAttendance }} />;
}
