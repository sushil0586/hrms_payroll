import { NextResponse } from "next/server";

import { getHrAdminShifts } from "@/lib/api";

export async function GET() {
  try {
    const result = await getHrAdminShifts();
    return NextResponse.json({ items: result.data, state: result.state === "live" ? "live" : "demo" });
  } catch {
    return NextResponse.json({ detail: "Shifts could not be updated." }, { status: 503 });
  }
}
