import { NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function POST(request: Request) {
  if (!API_BASE_URL) {
    return NextResponse.json(
      { detail: "HRMS_API_BASE_URL is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { identifier?: string; password?: string };

  const upstreamResponse = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      identifier: body.identifier ?? "",
      password: body.password ?? "",
    }),
    cache: "no-store",
  });

  const payload = await upstreamResponse.json().catch(() => ({}));
  if (!upstreamResponse.ok) {
    return NextResponse.json(
      { detail: payload.detail || payload.non_field_errors?.[0] || "Login failed." },
      { status: upstreamResponse.status },
    );
  }

  const nextResponse = NextResponse.json({ user: payload.user });
  nextResponse.cookies.set("hrms_access_token", payload.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  nextResponse.cookies.set("hrms_user_name", payload.user.display_name || payload.user.first_name || payload.user.username, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return nextResponse;
}
