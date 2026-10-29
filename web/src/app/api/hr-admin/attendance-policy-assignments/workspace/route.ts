import { NextResponse } from "next/server";

import { getHrAdminAttendancePolicyAssignments } from "@/lib/api";

export async function GET() {
  try {
    const result = await getHrAdminAttendancePolicyAssignments();
    return NextResponse.json({ items: result.data, state: result.state === "live" ? "live" : "demo" });
  } catch {
    return NextResponse.json({ detail: "Attendance assignments could not be updated." }, { status: 503 });
  }
}
