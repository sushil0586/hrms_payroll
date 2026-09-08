import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function GET() {
  if (!API_BASE_URL) {
    return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  }
  const cookieStore = await cookies();
  const token = cookieStore.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }
  const upstream = await fetch(`${API_BASE_URL}/tenant-admin/security-readiness/`, {
    headers: {
      Authorization: `Token ${token}`,
    },
    cache: "no-store",
  });
  const payload = await upstream.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstream.status });
}
