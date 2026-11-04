import { NextResponse } from "next/server";

import {
  getHrAdminDocumentCategories,
  getHrAdminDocumentOptions,
  getHrAdminEmployeeDocument,
  getHrAdminEmployeeDocuments,
  getHrAdminEmployees,
} from "@/lib/api";

function positive(value: string | null, fallback: number, maximum?: number) {
  const parsed = Number(value);
  const safe = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  return maximum ? Math.min(safe, maximum) : safe;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = positive(url.searchParams.get("page"), 1);
  const pageSize = positive(url.searchParams.get("page_size"), 25, 100);
  const reviewDocument = url.searchParams.get("reviewDocument") || "";
  const includeUpload = url.searchParams.get("uploadDocument") === "create";

  try {
    const [list, options, review, employees, categories] = await Promise.all([
      getHrAdminEmployeeDocuments({
        page,
        page_size: pageSize,
        q: url.searchParams.get("q") || undefined,
        verification_status: url.searchParams.get("verification_status") || undefined,
        status: url.searchParams.get("status") || undefined,
        category_id: url.searchParams.get("category_id") || undefined,
        expiry_filter: url.searchParams.get("expiry_filter") || undefined,
        sort: url.searchParams.get("sort") || undefined,
      }),
      getHrAdminDocumentOptions(),
      reviewDocument ? getHrAdminEmployeeDocument(reviewDocument) : null,
      includeUpload ? getHrAdminEmployees() : null,
      includeUpload ? getHrAdminDocumentCategories() : null,
    ]);
    if ([list, options, review, employees, categories].filter(Boolean).some((result) => result?.state !== "live")) {
      return NextResponse.json({ detail: "Live employee document data could not be confirmed." }, { status: 503 });
    }
    return NextResponse.json({
      ...list.data,
      options: options.data,
      reviewDocument: review?.data ?? null,
      employees: employees?.data ?? null,
      uploadCategories: categories?.data ?? null,
    });
  } catch {
    return NextResponse.json({ detail: "Employee document queue could not be updated." }, { status: 503 });
  }
}
