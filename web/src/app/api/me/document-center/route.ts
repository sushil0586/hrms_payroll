import { NextRequest, NextResponse } from "next/server";

import { getEssDocumentCenter } from "@/lib/api";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;
const ALLOWED_QUERY_KEYS = new Set(["page", "page_size", "q", "verification_status", "category_id", "expiry_filter"]);

export async function GET(request: NextRequest) {
  const query = new URLSearchParams();
  request.nextUrl.searchParams.forEach((value, key) => {
    if (ALLOWED_QUERY_KEYS.has(key) && value) query.set(key, value);
  });

  if (!API_BASE_URL) {
    try {
      const page = Number(query.get("page") || "1");
      const pageSize = Number(query.get("page_size") || "10");
      const result = await getEssDocumentCenter({
        page: Number.isSafeInteger(page) && page > 0 ? page : 1,
        page_size: [5, 10, 25].includes(pageSize) ? pageSize : 10,
        q: query.get("q") || undefined,
        verification_status: query.get("verification_status") || undefined,
        category_id: query.get("category_id") || undefined,
        expiry_filter: query.get("expiry_filter") || undefined,
      });
      return NextResponse.json(result.data);
    } catch {
      return NextResponse.json({ detail: "Document center is unavailable." }, { status: 503 });
    }
  }

  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const suffix = query.size ? `?${query.toString()}` : "";
  const upstreamResponse = await fetch(`${API_BASE_URL}/me/document-center/${suffix}`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });
  const payload = await upstreamResponse.json().catch(() => ({}));
  return NextResponse.json(payload, { status: upstreamResponse.status });
}
