import { NextResponse } from "next/server";
import { getHrAdminLeavePolicies, getHrAdminPolicyOptions } from "@/lib/api";

export async function GET() {
  try {
    const [policies, options] = await Promise.all([getHrAdminLeavePolicies(), getHrAdminPolicyOptions()]);
    return NextResponse.json({ items: policies.data, options: options.data, state: policies.state === "live" ? "live" : "demo" });
  } catch {
    return NextResponse.json({ detail: "Leave policies could not be updated." }, { status: 503 });
  }
}
