export type ImportBatchAuditStatus = "previewed" | "committed" | "partial" | "failed" | "rollback_review";

export type ImportBatchAuditInput = {
  import_type: string;
  status: ImportBatchAuditStatus;
  file_name?: string;
  source_hash: string;
  row_count: number;
  ready_count?: number;
  created_count?: number;
  blocked_count?: number;
  failed_count?: number;
  rollback_supported?: boolean;
  rollback_status?: string;
  source_ref?: string;
  evidence_snapshot?: Record<string, unknown>;
  row_errors?: Array<Record<string, unknown>>;
};

export type ImportBatchAudit = ImportBatchAuditInput & {
  id: string;
  actor_identifier: string;
  batch_hash: string;
  created_at: string;
  updated_at: string;
};

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function recordImportBatchAudit(input: ImportBatchAuditInput) {
  const response = await fetch("/api/hr-admin/import-batches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as ImportBatchAudit;
}
