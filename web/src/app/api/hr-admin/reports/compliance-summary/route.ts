import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireApiRoutePermission } from "@/lib/api-route-permissions";


const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type ApiSummary = Record<string, number | string | boolean | null | undefined>;
type StatutorySetup = {
  summary?: ApiSummary;
  statutory_components?: Array<Record<string, unknown>>;
  employer_registrations?: Array<Record<string, unknown>>;
  filing_calendars?: Array<Record<string, unknown>>;
};
type HandoffSetup = {
  summary?: ApiSummary;
  artifacts?: Array<Record<string, unknown>>;
  deliveries?: Array<Record<string, unknown>>;
};

const returnTypes = [
  { id: "tds", label: "TDS", pattern: /tds|income.?tax|form.?24q|form.?16/i },
  { id: "pf", label: "PF", pattern: /pf|epf|epfo|uan|ecr/i },
  { id: "esic", label: "ESIC", pattern: /esi|esic|insured/i },
  { id: "pt", label: "Professional Tax", pattern: /professional.?tax|\bpt\b|state_tax/i },
  { id: "lwf", label: "LWF", pattern: /labou?r.?welfare|lwf|welfare.?fund/i },
];

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function matches(pattern: RegExp, values: unknown[]) {
  return pattern.test(values.map((value) => String(value ?? "")).join(" "));
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = ["area", "readiness_status", "active_components", "total_components", "active_registrations", "total_registrations", "filing_calendars", "due_or_overdue_filings", "published_artifacts", "total_artifacts", "acknowledged_deliveries", "total_deliveries", "blocking_reason"];
  const escapeValue = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.map(escapeValue).join(","), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(","))].join("\n");
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

function buildReturnRows(statutory: StatutorySetup, handoff: HandoffSetup) {
  const components = statutory.statutory_components ?? [];
  const registrations = statutory.employer_registrations ?? [];
  const calendars = statutory.filing_calendars ?? [];
  const artifacts = handoff.artifacts ?? [];
  const deliveries = handoff.deliveries ?? [];

  return returnTypes.map((item) => {
    const matchedComponents = components.filter((component) => stringValue(component.statutory_type) === item.id || matches(item.pattern, [component.code, component.name, component.statutory_treatment_ref]));
    const activeComponents = matchedComponents.filter((component) => component.status === "active");
    const matchedRegistrations = registrations.filter((registration) => stringValue(registration.statutory_type) === item.id || matches(item.pattern, [registration.registration_type_ref, registration.registration_number, registration.filing_authority_ref]));
    const activeRegistrations = matchedRegistrations.filter((registration) => registration.status === "active" && registration.registration_number);
    const matchedCalendars = calendars.filter((calendar) => stringValue(calendar.statutory_type) === item.id || matches(item.pattern, [calendar.code, calendar.name, calendar.filing_type_ref]));
    const dueCalendars = matchedCalendars.filter((calendar) => Boolean(calendar.is_due) || Boolean(calendar.is_overdue));
    const matchedArtifacts = artifacts.filter((artifact) => artifact.kind === "statutory_report" && matches(item.pattern, [artifact.title, JSON.stringify(artifact.config_snapshot), JSON.stringify(artifact.line_snapshot)]));
    const publishedArtifacts = matchedArtifacts.filter((artifact) => artifact.status === "published");
    const matchedDeliveries = deliveries.filter((delivery) => delivery.artifact_kind === "statutory_report" && matches(item.pattern, [delivery.output_artifact_title, delivery.provider_ref]));
    const acknowledgedDeliveries = matchedDeliveries.filter((delivery) => ["acknowledged", "reconciled"].includes(stringValue(delivery.status)));
    const blockingReason = [
      activeComponents.length === 0 ? "active component missing" : "",
      activeRegistrations.length === 0 ? "active registration missing" : "",
      matchedCalendars.length === 0 ? "filing calendar missing" : "",
      dueCalendars.length > 0 ? "due or overdue filing exists" : "",
      publishedArtifacts.length === 0 ? "published artifact missing" : "",
    ].filter(Boolean).join("; ");

    return {
      area: item.label,
      readiness_status: blockingReason ? (matchedComponents.length || matchedRegistrations.length || matchedCalendars.length || matchedArtifacts.length || matchedDeliveries.length ? "Warning" : "Blocked") : "Ready",
      active_components: activeComponents.length,
      total_components: matchedComponents.length,
      active_registrations: activeRegistrations.length,
      total_registrations: matchedRegistrations.length,
      filing_calendars: matchedCalendars.length,
      due_or_overdue_filings: dueCalendars.length,
      published_artifacts: publishedArtifacts.length,
      total_artifacts: matchedArtifacts.length,
      acknowledged_deliveries: acknowledgedDeliveries.length,
      total_deliveries: matchedDeliveries.length,
      blocking_reason: blockingReason,
    };
  });
}

export async function GET(request: NextRequest) {
  const permission = await requireApiRoutePermission(request, "reports.compliance.export");
  if (!permission.ok) return permission.response;
  const token = permission.token;

  const [statutoryResult, handoffResult] = await Promise.all([
    upstreamJson<StatutorySetup>("/hr-admin/payroll-statutory-setup/", token),
    upstreamJson<HandoffSetup>("/hr-admin/payroll-finance-handoff-setup/", token),
  ]);
  if (!statutoryResult.ok) return NextResponse.json({ detail: statutoryResult.detail }, { status: statutoryResult.status });
  if (!handoffResult.ok) return NextResponse.json({ detail: handoffResult.detail }, { status: handoffResult.status });

  const statutory = statutoryResult.data ?? {};
  const handoff = handoffResult.data ?? {};
  const rows = [
    ...buildReturnRows(statutory, handoff),
    {
      area: "Filing calendar",
      readiness_status: numberValue(statutory.summary?.overdue_filing_calendar_count) > 0 ? "Blocked" : "Ready",
      active_components: "",
      total_components: "",
      active_registrations: "",
      total_registrations: "",
      filing_calendars: numberValue(statutory.summary?.filing_calendar_count),
      due_or_overdue_filings: numberValue(statutory.summary?.due_filing_calendar_count) + numberValue(statutory.summary?.overdue_filing_calendar_count),
      published_artifacts: numberValue(handoff.summary?.statutory_filing_artifact_count),
      total_artifacts: numberValue(handoff.summary?.statutory_filing_artifact_count),
      acknowledged_deliveries: numberValue(statutory.summary?.acknowledged_filing_calendar_count),
      total_deliveries: numberValue(handoff.summary?.statutory_filing_count),
      blocking_reason: numberValue(statutory.summary?.overdue_filing_calendar_count) > 0 ? "overdue filing exists" : "",
    },
  ];

  const csv = toCsv(rows);
  const checksum = createHash("sha256").update(csv).digest("hex");
  if (request.nextUrl.searchParams.get("format") === "manifest") {
    return NextResponse.json(
      {
        package_schema_version: "hrms.compliance_summary.manifest.v1",
        report_key: "compliance-summary",
        generated_at: new Date().toISOString(),
        source_row_count: rows.length,
        checksum_sha256: checksum,
        source_endpoints: ["/hr-admin/payroll-statutory-setup/", "/hr-admin/payroll-finance-handoff-setup/"],
      },
      { headers: { "X-HRMS-Package-Checksum": checksum, "X-HRMS-Report-Key": "compliance-summary", "X-HRMS-Source-Row-Count": String(rows.length) } },
    );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="compliance-summary.csv"',
      "X-HRMS-Package-Checksum": checksum,
      "X-HRMS-Report-Key": "compliance-summary",
      "X-HRMS-Source-Row-Count": String(rows.length),
    },
  });
}
