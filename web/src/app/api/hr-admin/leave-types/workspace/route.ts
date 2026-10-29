import { NextResponse } from "next/server";
import { getHrAdminLeaveTypes, getHrAdminPolicyOptions } from "@/lib/api";

export async function GET() {
  try {
    const [types, options] = await Promise.all([getHrAdminLeaveTypes(), getHrAdminPolicyOptions()]);
    return NextResponse.json({ items: types.data, options: options.data, state: types.state === "live" ? "live" : "demo" });
  } catch {
    return NextResponse.json({ detail: "Leave types could not be updated." }, { status: 503 });
  }
}
