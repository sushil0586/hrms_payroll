import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

export async function GET(request: NextRequest) {
  if (!API_BASE_URL) return NextResponse.json({ detail: "HRMS_API_BASE_URL is not configured." }, { status: 500 });
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });

  const upstream = await fetch(`${API_BASE_URL}/tenant-admin/commercial-support-audit/download/`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });
  const payload = await upstream.arrayBuffer();
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("content-type") || "application/json");
  const contentDisposition = upstream.headers.get("content-disposition");
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
  const checksum = upstream.headers.get("x-saas-audit-pack-checksum");
  if (checksum) headers.set("X-SaaS-Audit-Pack-Checksum", checksum);
  const auditPackRef = upstream.headers.get("x-saas-audit-pack-ref");
  if (auditPackRef) headers.set("X-SaaS-Audit-Pack-Ref", auditPackRef);
  return new NextResponse(payload, { status: upstream.status, headers });
}
