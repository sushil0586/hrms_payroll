import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type ReportExportAuditRecord = {
  id: string;
  tenant_ref: string;
  actor_display: string;
  actor_token_hash: string;
  report_key: string;
  export_type: "csv" | "manifest";
  filters: Record<string, string>;
  row_count: number;
  checksum_sha256: string;
  content_type: string;
  source_endpoints: string[];
  evidence_columns: string[];
  generated_at: string;
  request_identifier: string;
  user_agent: string;
};

export type ReportExportAuditInput = Omit<ReportExportAuditRecord, "id" | "generated_at"> & {
  generated_at?: string;
};

const AUDIT_FILE = path.join(process.cwd(), ".hrms-data", "report-export-audits.jsonl");

function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function readAuditFile() {
  try {
    return await readFile(AUDIT_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return "";
    throw error;
  }
}

export function actorTokenHash(token: string) {
  return token ? stableHash(token).slice(0, 24) : "anonymous";
}

export async function appendReportExportAudit(input: ReportExportAuditInput) {
  const record: ReportExportAuditRecord = {
    ...input,
    id: randomUUID(),
    generated_at: input.generated_at ?? new Date().toISOString(),
  };
  await mkdir(path.dirname(AUDIT_FILE), { recursive: true });
  await writeFile(AUDIT_FILE, `${JSON.stringify(record)}\n`, { flag: "a" });
  return record;
}

export async function appendBackendReportExportAudit(apiBaseUrl: string, token: string, input: ReportExportAuditInput) {
  const response = await fetch(`${apiBaseUrl}/hr-admin/reports/export-audits/`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      actor_display: input.actor_display,
      report_key: input.report_key,
      export_type: input.export_type,
      filters: input.filters,
      row_count: input.row_count,
      checksum_sha256: input.checksum_sha256,
      content_type: input.content_type,
      source_endpoints: input.source_endpoints,
      evidence_columns: input.evidence_columns,
      request_identifier: input.request_identifier,
      user_agent: input.user_agent,
      generated_at: input.generated_at,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`Backend export audit persistence failed with status ${response.status}.`);
  }
  return response.json();
}

export async function listBackendReportExportAudits(
  apiBaseUrl: string,
  token: string,
  filters: {
    exportType?: string;
    reportKey?: string;
    query?: string;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.exportType) params.set("export_type", filters.exportType);
  if (filters.reportKey) params.set("report_key", filters.reportKey);
  if (filters.query) params.set("q", filters.query);
  const response = await fetch(`${apiBaseUrl}/hr-admin/reports/export-audits/?${params.toString()}`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`Backend export audit list failed with status ${response.status}.`);
  }
  return response.json();
}

export async function listReportExportAudits(filters: {
  actorTokenHash?: string;
  exportType?: string;
  reportKey?: string;
  query?: string;
} = {}) {
  const body = await readAuditFile();
  const rows = body
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as ReportExportAuditRecord)
    .filter((row) => !filters.actorTokenHash || row.actor_token_hash === filters.actorTokenHash)
    .filter((row) => !filters.exportType || row.export_type === filters.exportType)
    .filter((row) => !filters.reportKey || row.report_key === filters.reportKey)
    .filter((row) => {
      if (!filters.query) return true;
      return [
        row.actor_display,
        row.report_key,
        row.export_type,
        row.checksum_sha256,
        JSON.stringify(row.filters),
        row.request_identifier,
      ]
        .join(" ")
        .toLowerCase()
        .includes(filters.query.toLowerCase());
    });
  return rows.sort((left, right) => right.generated_at.localeCompare(left.generated_at));
}
