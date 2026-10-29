import { NextRequest, NextResponse } from "next/server";

import { getEssNotifications } from "@/lib/api";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

const allowedStatus = ["pending", "sent", "delivered", "read", "failed", "cancelled"];
const allowedChannel = ["in_app", "email", "sms", "push", "whatsapp"];
const allowedPriority = ["low", "normal", "high", "critical"];
const allowedSubject = ["leave_request", "attendance_regularization", "employee_document", "employee_onboarding", "payroll_payslip"];

function positive(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams;
  const params = {
    page: positive(input.get("page"), 1),
    page_size: [10, 25, 50, 100].includes(positive(input.get("page_size"), 10)) ? positive(input.get("page_size"), 10) : 10,
    q: input.get("q") || "",
    status: allowedStatus.includes(input.get("status") || "") ? input.get("status")! : "",
    channel: allowedChannel.includes(input.get("channel") || "") ? input.get("channel")! : "",
    priority: allowedPriority.includes(input.get("priority") || "") ? input.get("priority")! : "",
    subject_type: allowedSubject.includes(input.get("subject_type") || "") ? input.get("subject_type")! : "",
  };
  if (!API_BASE_URL) {
    try {
      return NextResponse.json((await getEssNotifications(params)).data);
    } catch {
      return NextResponse.json({ detail: "Notifications are unavailable." }, { status: 503 });
    }
  }
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== "").map(([key, value]) => [key, String(value)]));
  const upstream = await fetch(`${API_BASE_URL}/me/notifications/?${query}`, { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
  return NextResponse.json(await upstream.json().catch(() => ({})), { status: upstream.status });
}
