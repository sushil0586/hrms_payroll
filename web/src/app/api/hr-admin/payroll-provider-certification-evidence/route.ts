import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type ProviderSetup = Record<string, unknown>;

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function upstreamJson<T>(path: string, token: string): Promise<{ ok: boolean; status: number; data: T | null; detail: string }> {
  if (!API_BASE_URL) return { ok: false, status: 503, data: null, detail: "HRMS_API_BASE_URL is not configured." };
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return { ok: false, status: response.status, data: null, detail: stringValue((payload as { detail?: unknown }).detail) || `Live API request failed with status ${response.status}.` };
  }
  return { ok: true, status: response.status, data: (await response.json()) as T, detail: "" };
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function summarize(setup: ProviderSetup) {
  const summary = setup.summary && typeof setup.summary === "object" && !Array.isArray(setup.summary) ? setup.summary as Record<string, unknown> : {};
  const connections = arrayValue(setup.connections);
  const certificationRuns = arrayValue(setup.certification_runs);
  const mappingPacks = arrayValue(setup.schema_mapping_packs);
  const simulations = arrayValue(setup.schema_mapping_simulations);
  const launchRehearsals = arrayValue(setup.launch_rehearsals);
  return {
    connection_count: summary.connection_count ?? connections.length,
    certified_connection_count: summary.certified_connection_count ?? 0,
    blocked_connection_count: summary.blocked_connection_count ?? 0,
    certification_run_count: summary.certification_run_count ?? certificationRuns.length,
    failed_certification_run_count: summary.failed_certification_run_count ?? 0,
    schema_mapping_pack_count: summary.schema_mapping_pack_count ?? mappingPacks.length,
    schema_mapping_simulation_count: summary.schema_mapping_simulation_count ?? simulations.length,
    launch_rehearsal_run_count: summary.launch_rehearsal_run_count ?? launchRehearsals.length,
    latest_launch_rehearsal_status: summary.latest_launch_rehearsal_status ?? "pending",
    latest_launch_rehearsal_checksum: summary.latest_launch_rehearsal_checksum ?? "",
  };
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });

  const result = await upstreamJson<ProviderSetup>("/hr-admin/payroll-provider-connection-setup/", token);
  if (!result.ok) return NextResponse.json({ detail: result.detail }, { status: result.status });

  const setup = result.data ?? {};
  const payload = {
    package_schema_version: "hrms.provider_certification_evidence.v1",
    report_key: "provider-certification-evidence",
    generated_at: new Date().toISOString(),
    source_endpoints: ["/hr-admin/payroll-provider-connection-setup/"],
    summary: summarize(setup),
    connections: arrayValue(setup.connections),
    certification_runs: arrayValue(setup.certification_runs),
    schema_mapping_packs: arrayValue(setup.schema_mapping_packs),
    schema_mapping_simulations: arrayValue(setup.schema_mapping_simulations),
    launch_rehearsals: arrayValue(setup.launch_rehearsals),
    adapter_registry: setup.adapter_registry ?? null,
    client_registry: setup.client_registry ?? null,
    package_registry: setup.package_registry ?? null,
    storage_policy_registry: setup.storage_policy_registry ?? null,
  };
  const serialized = JSON.stringify(payload);
  const checksum = createHash("sha256").update(serialized).digest("hex");

  if (request.nextUrl.searchParams.get("format") === "manifest") {
    return NextResponse.json(
      {
        package_schema_version: "hrms.provider_certification_evidence.manifest.v1",
        report_key: "provider-certification-evidence",
        generated_at: payload.generated_at,
        source_row_count: payload.connections.length,
        checksum_sha256: checksum,
        source_endpoints: payload.source_endpoints,
      },
      { headers: { "X-HRMS-Package-Checksum": checksum, "X-HRMS-Report-Key": "provider-certification-evidence", "X-HRMS-Source-Row-Count": String(payload.connections.length) } },
    );
  }

  return NextResponse.json(
    { ...payload, checksum_sha256: checksum },
    {
      headers: {
        "Content-Disposition": 'attachment; filename="provider-certification-evidence.json"',
        "X-HRMS-Package-Checksum": checksum,
        "X-HRMS-Report-Key": "provider-certification-evidence",
        "X-HRMS-Source-Row-Count": String(payload.connections.length),
      },
    },
  );
}
