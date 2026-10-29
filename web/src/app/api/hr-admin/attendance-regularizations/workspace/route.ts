import { NextRequest, NextResponse } from "next/server";

import { attendanceDateError } from "@/app/hr-admin/attendance-records/filter-contract";
import { getHrAdminAttendanceRegularization, getHrAdminAttendanceRegularizations } from "@/lib/api";

function positive(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const requestedSize = positive(input.get("page_size"), 25);
  const pageSize = [10, 25, 50, 100].includes(requestedSize) ? requestedSize : 25;
  const fromDate = input.get("from_date") || "";
  const toDate = input.get("to_date") || "";
  const validationError = attendanceDateError(fromDate, toDate);
  if (validationError) return NextResponse.json({ detail: validationError }, { status: 400 });
  const query = {
    page: positive(input.get("page"), 1), page_size: pageSize,
    q: input.get("q") || undefined, status: input.get("status") || undefined,
    requested_status: input.get("requested_status") || undefined,
    current_status: input.get("current_status") || undefined,
    from_date: fromDate || undefined, to_date: toDate || undefined,
  };
  try {
    let result = await getHrAdminAttendanceRegularizations(query);
    const lastPage = Math.max(1, Math.ceil(result.data.total_count / result.data.page_size));
    if (query.page > lastPage) result = await getHrAdminAttendanceRegularizations({ ...query, page: lastPage });
    const reviewId = (input.get("reviewRegularization") || "").trim();
    const reviewItem = reviewId
      ? await getHrAdminAttendanceRegularization(reviewId).then((item) => item.data).catch(() => null)
      : null;
    return NextResponse.json({ ...result.data, state: result.state === "live" ? "live" : "demo", reviewItem });
  } catch {
    return NextResponse.json({ detail: "Attendance regularizations could not be updated." }, { status: 503 });
  }
}
