import { readFile } from "node:fs/promises";
import path from "node:path";

import { getSessionUser } from "@/lib/api";
import { getDocsAssetPath } from "@/lib/docs-content";

type AssetRouteProps = {
  params: Promise<{ path?: string[] }>;
};

const CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(_request: Request, { params }: AssetRouteProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return new Response("Unauthorized", { status: 401 });
  }

  const resolvedParams = await params;
  const assetPath = getDocsAssetPath(resolvedParams.path ?? []);
  if (!assetPath) {
    return new Response("Not found", { status: 404 });
  }

  const body = await readFile(assetPath);
  const contentType = CONTENT_TYPES[path.extname(assetPath).toLowerCase()] ?? "application/octet-stream";
  return new Response(body, {
    headers: {
      "Cache-Control": "private, max-age=300",
      "Content-Type": contentType,
    },
  });
}
