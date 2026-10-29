import { NextResponse } from "next/server";

import { getHrAdminHolidayCalendars } from "@/lib/api";

export async function GET() {
  try {
    const result = await getHrAdminHolidayCalendars();
    return NextResponse.json({ items: result.data, state: result.state === "live" ? "live" : "demo" });
  } catch {
    return NextResponse.json({ detail: "Holiday calendars could not be updated." }, { status: 503 });
  }
}
