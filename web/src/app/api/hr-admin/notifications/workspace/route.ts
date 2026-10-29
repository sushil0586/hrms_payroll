import { NextRequest, NextResponse } from "next/server";
import { getHrAdminNotifications } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const p = request.nextUrl.searchParams;
    const result = await getHrAdminNotifications({
      q: p.get("q") || "", status: p.get("status") || undefined,
      channel: p.get("channel") || undefined, priority: p.get("priority") || undefined,
      audience_type: p.get("audience_type") || undefined, module: p.get("module") || undefined,
      subject_type: p.get("subject_type") || undefined, retry_state: p.get("retry_state") || undefined,
      page: Number(p.get("page")) || 1, page_size: Number(p.get("page_size")) || 25,
    });
    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ detail: "Notification queue could not be updated." }, { status: 503 });
  }
}
