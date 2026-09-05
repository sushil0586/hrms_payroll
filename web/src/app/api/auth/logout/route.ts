import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hrms_access_token")?.value;

  if (API_BASE_URL && token) {
    await fetch(`${API_BASE_URL}/auth/logout/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
      },
      cache: "no-store",
    }).catch(() => null);
  }

  const nextResponse = NextResponse.json({ ok: true });
  nextResponse.cookies.delete("hrms_access_token");
  nextResponse.cookies.delete("hrms_user_name");
  return nextResponse;
}
