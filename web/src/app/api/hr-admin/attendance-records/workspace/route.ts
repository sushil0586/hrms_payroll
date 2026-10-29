import { NextRequest, NextResponse } from "next/server";

import { attendanceDateError } from "@/app/hr-admin/attendance-records/filter-contract";
import { getHrAdminAttendanceRecord, getHrAdminAttendanceRecords } from "@/lib/api";

function positive(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const pageSize = [10, 25, 50, 100].includes(positive(input.get("page_size"), 25))
    ? positive(input.get("page_size"), 25)
    : 25;
  const fromDate = input.get("from_date") || "";
  const toDate = input.get("to_date") || "";
  const validationError = attendanceDateError(fromDate, toDate);
  if (validationError) return NextResponse.json({ detail: validationError }, { status: 400 });
  const query = {
    page: positive(input.get("page"), 1),
    page_size: pageSize,
    q: input.get("q") || undefined,
    status: input.get("status") || undefined,
    source: input.get("source") || undefined,
    shift_id: input.get("shift_id") || undefined,
    lock_state: input.get("lock_state") || undefined,
    regularized_state: input.get("regularized_state") || undefined,
    from_date: fromDate || undefined,
    to_date: toDate || undefined,
    late_only: ["1", "true", "yes"].includes((input.get("late_only") || "").toLowerCase()) || undefined,
  };
  try {
    let result = await getHrAdminAttendanceRecords(query);
    const lastPage = Math.max(1, Math.ceil(result.data.total_count / result.data.page_size));
    if (query.page > lastPage) result = await getHrAdminAttendanceRecords({ ...query, page: lastPage });
    const editRecordId = (input.get("editRecord") || "").trim();
    const editRecord = editRecordId
      ? await getHrAdminAttendanceRecord(editRecordId).then((item) => item.data).catch(() => null)
      : null;
    return NextResponse.json({ ...result.data, state: result.state === "live" ? "live" : "demo", editRecord });
  } catch {
    return NextResponse.json({ detail: "Attendance records could not be updated." }, { status: 503 });
  }
}
