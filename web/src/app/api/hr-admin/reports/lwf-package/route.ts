import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireApiRoutePermission } from "@/lib/api-route-permissions";


const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type Artifact = {
  id: string;
  kind?: string;
  status?: string;
  source_hash?: string;
  line_snapshot?: Array<Record<string, unknown>>;
};

type StatutorySetup = {
  employer_registrations?: Array<Record<string, unknown>>;
  employee_profiles?: Array<Record<string, unknown>>;
  filing_calendars?: Array<Record<string, unknown>>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function textIncludesLwf(value: unknown) {
  return typeof value === "string" && /labou?r.?welfare|lwf|welfare.?fund|lwf_return/i.test(value);
}

function isLwfLine(line: Record<string, unknown>) {
  return textIncludesLwf([line.statutory_type, line.statutory_component_code, line.component_code, line.component_name, line.statutory_treatment_ref].join(" "));
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = [
    "record_type",
    "return_ref",
    "filing_code",
    "filing_type_ref",
    "lwf_state",
    "employer_lwf_number",
    "employer_identifier",
    "filing_authority_ref",
    "provider_ref",
    "employee_code",
    "component_code",
    "component_name",
    "gross_wages",
    "employee_lwf_amount",
    "employer_lwf_amount",
    "lwf_amount",
    "statutory_type",
    "statutory_treatment_ref",
    "source_hash",
    "source_artifact_id",
  ];
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

function registrationForLine(line: Record<string, unknown>, registrations: Array<Record<string, unknown>>) {
  const registrationNumber = stringValue(line.employer_registration_number || line.registration_number);
  if (registrationNumber) return registrations.find((item) => stringValue(item.registration_number) === registrationNumber) ?? null;
  return registrations.find((item) => textIncludesLwf([item.registration_type_ref, item.registration_number, item.provider_ref, item.filing_authority_ref].join(" "))) ?? null;
}

function filingForLine(line: Record<string, unknown>, filings: Array<Record<string, unknown>>) {
  const filingCode = stringValue(line.filing_code || line.filing_calendar_code);
  if (filingCode) return filings.find((item) => stringValue(item.code) === filingCode) ?? null;
  return filings.find((item) => textIncludesLwf([item.code, item.name, item.filing_type_ref, item.output_profile_ref, item.provider_ref].join(" "))) ?? null;
}

function profileForLine(line: Record<string, unknown>, profiles: Array<Record<string, unknown>>) {
  const employeeCode = stringValue(line.employee_code);
  if (!employeeCode) return null;
  return profiles.find((profile) => stringValue(profile.employee_code) === employeeCode) ?? null;
}

function amountFor(line: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const raw = line[key];
    if (raw !== undefined && raw !== null && raw !== "") return String(raw);
  }
  return "";
}

export async function GET(request: NextRequest) {
  const permission = await requireApiRoutePermission(request, "reports.compliance.export");
  if (!permission.ok) return permission.response;
  const token = permission.token;

  const [statutoryResult, handoffResult] = await Promise.all([
    upstreamJson<StatutorySetup>("/hr-admin/payroll-statutory-setup/", token),
    upstreamJson<{ artifacts?: Artifact[] }>("/hr-admin/payroll-finance-handoff-setup/", token),
  ]);
  if (!statutoryResult.ok) return NextResponse.json({ detail: statutoryResult.detail }, { status: statutoryResult.status });
  if (!handoffResult.ok) return NextResponse.json({ detail: handoffResult.detail }, { status: handoffResult.status });

  const registrations = statutoryResult.data?.employer_registrations ?? [];
  const filings = statutoryResult.data?.filing_calendars ?? [];
  const profiles = statutoryResult.data?.employee_profiles ?? [];
  const artifacts = handoffResult.data?.artifacts ?? [];
  const rows = artifacts
    .filter((artifact) => artifact.kind === "statutory_report" && artifact.status === "published")
    .flatMap((artifact) =>
      (artifact.line_snapshot ?? [])
        .filter(isLwfLine)
        .map((line) => {
          const registration = registrationForLine(line, registrations);
          const filing = filingForLine(line, filings);
          const profile = profileForLine(line, profiles);
          return {
            record_type: "lwf_return_employee",
            return_ref: "india.lwf.return.configurable",
            filing_code: stringValue(line.filing_code || filing?.code) || "summary",
            filing_type_ref: stringValue(line.filing_type_ref || filing?.filing_type_ref) || "lwf.return",
            lwf_state: stringValue(line.lwf_state || profile?.lwf_state),
            employer_lwf_number: stringValue(line.employer_registration_number || line.registration_number || registration?.registration_number),
            employer_identifier: stringValue(line.employer_identifier || registration?.employer_identifier),
            filing_authority_ref: stringValue(line.filing_authority_ref || registration?.filing_authority_ref || filing?.filing_authority_ref),
            provider_ref: stringValue(line.provider_ref || registration?.provider_ref || filing?.provider_ref),
            employee_code: stringValue(line.employee_code),
            component_code: stringValue(line.component_code || line.statutory_component_code),
            component_name: stringValue(line.component_name),
            gross_wages: amountFor(line, ["gross_wages", "wage_base", "lwf_wages"]),
            employee_lwf_amount: amountFor(line, ["employee_lwf_amount", "employee_amount"]),
            employer_lwf_amount: amountFor(line, ["employer_lwf_amount", "employer_amount"]),
            lwf_amount: amountFor(line, ["lwf_amount", "amount"]),
            statutory_type: stringValue(line.statutory_type) || "lwf",
            statutory_treatment_ref: stringValue(line.statutory_treatment_ref),
            source_hash: stringValue(line.source_hash || artifact.source_hash),
            source_artifact_id: artifact.id,
          };
        }),
    );

  const blockingReasons = [];
  if (!rows.length) blockingReasons.push("No published Labour Welfare Fund statutory report rows are available.");
  if (profiles.length > 0 && profiles.some((profile) => !stringValue(profile.lwf_state))) blockingReasons.push("Labour Welfare Fund state is missing for one or more employee profiles.");
  if (rows.some((row) => !row.lwf_state)) blockingReasons.push("Labour Welfare Fund state is missing for one or more rows.");
  if (rows.some((row) => !row.employer_lwf_number)) blockingReasons.push("Employer Labour Welfare Fund registration is missing for one or more rows.");
  if (rows.some((row) => !row.filing_authority_ref)) blockingReasons.push("Filing authority reference is missing for one or more rows.");
  if (rows.some((row) => !row.provider_ref)) blockingReasons.push("Provider route reference is missing for one or more rows.");
  if (rows.some((row) => !row.source_hash)) blockingReasons.push("Source hash is missing for one or more rows.");

  if (blockingReasons.length) return NextResponse.json({ detail: "Labour Welfare Fund package is not ready.", blocking_reasons: blockingReasons }, { status: 400 });

  const csv = toCsv(rows);
  const packageChecksum = createHash("sha256").update(csv).digest("hex");
  if (request.nextUrl.searchParams.get("format") === "manifest") {
    return NextResponse.json(
      {
        package_schema_version: "hrms.lwf.package.manifest.v1",
        report_key: "lwf-package",
        generated_at: new Date().toISOString(),
        source_row_count: rows.length,
        checksum_sha256: packageChecksum,
        source_endpoints: ["/hr-admin/payroll-statutory-setup/", "/hr-admin/payroll-finance-handoff-setup/"],
      },
      { headers: { "X-HRMS-Package-Checksum": packageChecksum, "X-HRMS-Report-Key": "lwf-package", "X-HRMS-Source-Row-Count": String(rows.length) } },
    );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="lwf-package.csv"',
      "X-HRMS-Package-Checksum": packageChecksum,
      "X-HRMS-Report-Key": "lwf-package",
      "X-HRMS-Source-Row-Count": String(rows.length),
    },
  });
}
