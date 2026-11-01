import { NextRequest, NextResponse } from "next/server";

import {
  getMssApprovalInbox,
  getMssAttendanceRegularizationDetail,
  getMssLeaveRequestDetail,
} from "@/lib/api";
import type { MssApprovalInboxResponse } from "@/lib/types";

function positive(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function enabled(value: string | null) {
  return value !== "0" && value !== "false";
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const leavePage = positive(input.get("leavePage"), 1);
  const regPage = positive(input.get("regPage"), 1);
  const historyLeavePage = positive(input.get("historyLeavePage"), 1);
  const historyAttendancePage = positive(input.get("historyAttendancePage"), 1);
  const historyQuery = (input.get("historyQuery") || "").trim();
  const historyDecision = (input.get("historyDecision") || "").trim();
  const historyStatus = (input.get("historyStatus") || "").trim();
  const historyDateFrom = (input.get("historyDateFrom") || "").trim();
  const historyDateTo = (input.get("historyDateTo") || "").trim();
  const includeLeave = enabled(input.get("include_leave"));
  const includeRegularizations = enabled(input.get("include_regularizations"));
  const includeHistory = enabled(input.get("include_history"));
  const leaveId = (input.get("leaveId") || "").trim();
  const regId = (input.get("regId") || "").trim();

  try {
    const inbox = await getMssApprovalInbox({
      leave_page: leavePage,
      leave_page_size: 5,
      regularization_page: regPage,
      regularization_page_size: 5,
      history_leave_page: historyLeavePage,
      history_attendance_page: historyAttendancePage,
      history_query: historyQuery,
      history_decision: historyDecision,
      history_status: historyStatus,
      history_date_from: historyDateFrom,
      history_date_to: historyDateTo,
      include_leave: includeLeave,
      include_regularizations: includeRegularizations,
      include_history: includeHistory,
    });
    const [selectedLeaveDetail, selectedRegularizationDetail] = await Promise.all([
      leaveId && includeLeave
        ? getMssLeaveRequestDetail(leaveId).then((result) => result.data).catch(() => null)
        : Promise.resolve(null),
      regId && includeRegularizations
        ? getMssAttendanceRegularizationDetail(regId).then((result) => result.data).catch(() => null)
        : Promise.resolve(null),
    ]);
    const response: MssApprovalInboxResponse = { ...inbox, state: inbox.state === "live" ? "live" : "demo", selectedLeaveDetail, selectedRegularizationDetail };
    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ detail: "Manager approvals are unavailable." }, { status: 503 });
  }
}
