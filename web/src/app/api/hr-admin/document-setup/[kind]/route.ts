import { NextResponse } from "next/server";

import { getHrAdminDocumentCategories, getHrAdminDocumentOptions, getHrAdminDocumentRequirements } from "@/lib/api";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const { kind } = await params;
    const [list, options] = await Promise.all([
      kind === "categories" ? getHrAdminDocumentCategories() : kind === "requirements" ? getHrAdminDocumentRequirements() : null,
      getHrAdminDocumentOptions(),
    ]);
    if (!list) return NextResponse.json({ detail: "Unsupported document setup workspace." }, { status: 404 });
    if (list.state !== "live" || options.state !== "live") return NextResponse.json({ detail: "Live document setup data could not be confirmed." }, { status: 503 });
    return NextResponse.json({ items: list.data, options: options.data });
  } catch {
    return NextResponse.json({ detail: "Document setup register could not be updated." }, { status: 503 });
  }
}
