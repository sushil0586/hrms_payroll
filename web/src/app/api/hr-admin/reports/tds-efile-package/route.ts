import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.HRMS_API_BASE_URL;

type Artifact = {
  id: string;
  title?: string;
  kind?: string;
  status?: string;
  source_hash?: string;
  line_snapshot?: Array<Record<string, unknown>>;
};

type StatutorySetup = {
  employer_registrations?: Array<Record<string, unknown>>;
  filing_calendars?: Array<Record<string, unknown>>;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = [
    "record_type",
    "form_ref",
    "filing_code",
    "filing_type_ref",
    "tan",
    "employer_identifier",
    "filing_authority_ref",
    "provider_ref",
    "employee_code",
    "pan_number",
    "component_code",
    "component_name",
    "line_type",
    "amount",
    "statutory_type",
    "statutory_treatment_ref",
    "source_hash",
    "source_artifact_id",
  ];
  const escapeValue = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.map(escapeValue).join(","), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(","))].join("\n");
}

async function upstreamJson<T>(path: string, token: string): Promise<{ ok: boolean; status: number; data: T | null; detail: string }> {
  if (!API_BASE_URL) {
    return { ok: false, status: 503, data: null, detail: "HRMS_API_BASE_URL is not configured." };
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Token ${token}` },
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    return {
      ok: false,
      status: response.status,
      data: null,
      detail: stringValue((payload as { detail?: unknown }).detail) || `Live API request failed with status ${response.status}.`,
    };
  }
  return { ok: true, status: response.status, data: (await response.json()) as T, detail: "" };
}

function isTdsLine(line: Record<string, unknown>) {
  const marker = [
    line.statutory_type,
    line.statutory_component_code,
    line.component_code,
    line.component_name,
    line.statutory_treatment_ref,
  ]
    .map((value) => stringValue(value).toLowerCase())
    .join(" ");
  return marker.includes("tds") || marker.includes("tax_deducted_at_source");
}

function registrationForLine(line: Record<string, unknown>, registrations: Array<Record<string, unknown>>) {
  const registrationNumber = stringValue(line.employer_registration_number || line.registration_number);
  if (registrationNumber) {
    return registrations.find((item) => stringValue(item.registration_number) === registrationNumber) ?? null;
  }
  return registrations.find((item) => {
    const marker = [item.registration_type_ref, item.registration_number, item.provider_ref, item.filing_authority_ref]
      .map((value) => stringValue(value).toLowerCase())
      .join(" ");
    return marker.includes("tds") || marker.includes("tan") || marker.includes("income_tax");
  }) ?? null;
}

function filingForLine(line: Record<string, unknown>, filings: Array<Record<string, unknown>>) {
  const filingCode = stringValue(line.filing_code || line.filing_calendar_code);
  if (filingCode) {
    return filings.find((item) => stringValue(item.code) === filingCode) ?? null;
  }
  return filings.find((item) => {
    const marker = [item.code, item.name, item.filing_type_ref, item.output_profile_ref, item.provider_ref]
      .map((value) => stringValue(value).toLowerCase())
      .join(" ");
    return marker.includes("tds") || marker.includes("24q") || marker.includes("form_24q");
  }) ?? null;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("hrms_access_token")?.value;
  if (!token) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const [statutoryResult, handoffResult] = await Promise.all([
    upstreamJson<StatutorySetup>("/hr-admin/payroll-statutory-setup/", token),
    upstreamJson<{ artifacts?: Artifact[] }>("/hr-admin/payroll-finance-handoff-setup/", token),
  ]);
  if (!statutoryResult.ok) {
    return NextResponse.json({ detail: statutoryResult.detail }, { status: statutoryResult.status });
  }
  if (!handoffResult.ok) {
    return NextResponse.json({ detail: handoffResult.detail }, { status: handoffResult.status });
  }

  const registrations = statutoryResult.data?.employer_registrations ?? [];
  const filings = statutoryResult.data?.filing_calendars ?? [];
  const artifacts = handoffResult.data?.artifacts ?? [];
  const rows = artifacts
    .filter((artifact) => artifact.kind === "statutory_report" && artifact.status === "published")
    .flatMap((artifact) =>
      (artifact.line_snapshot ?? [])
        .filter(isTdsLine)
        .map((line) => {
          const registration = registrationForLine(line, registrations);
          const filing = filingForLine(line, filings);
          return {
            record_type: "form_24q_deductee",
            form_ref: "india.tds.form_24q.configurable",
            filing_code: stringValue(line.filing_code || filing?.code) || "summary",
            filing_type_ref: stringValue(line.filing_type_ref || filing?.filing_type_ref) || "tds.form_24q",
            tan: stringValue(line.employer_registration_number || line.registration_number || registration?.registration_number),
            employer_identifier: stringValue(line.employer_identifier || registration?.employer_identifier),
            filing_authority_ref: stringValue(line.filing_authority_ref || registration?.filing_authority_ref || filing?.filing_authority_ref),
            provider_ref: stringValue(line.provider_ref || registration?.provider_ref || filing?.provider_ref),
            employee_code: stringValue(line.employee_code),
            pan_number: stringValue(line.pan_number),
            component_code: stringValue(line.component_code || line.statutory_component_code),
            component_name: stringValue(line.component_name),
            line_type: stringValue(line.line_type),
            amount: stringValue(line.amount),
            statutory_type: stringValue(line.statutory_type) || "tax_deducted_at_source",
            statutory_treatment_ref: stringValue(line.statutory_treatment_ref),
            source_hash: stringValue(line.source_hash || artifact.source_hash),
            source_artifact_id: artifact.id,
          };
        }),
    );

  const blockingReasons = [];
  if (!rows.length) blockingReasons.push("No published TDS statutory report rows are available.");
  if (rows.some((row) => !row.tan)) blockingReasons.push("TAN/employer registration is missing for one or more rows.");
  if (rows.some((row) => !row.filing_authority_ref)) blockingReasons.push("Filing authority reference is missing for one or more rows.");
  if (rows.some((row) => !row.provider_ref)) blockingReasons.push("Provider route reference is missing for one or more rows.");
  if (rows.some((row) => !row.source_hash)) blockingReasons.push("Source hash is missing for one or more rows.");

  if (blockingReasons.length) {
    return NextResponse.json(
      {
        detail: "TDS e-file package is not ready.",
        blocking_reasons: blockingReasons,
      },
      { status: 400 },
    );
  }

  const csv = toCsv(rows);
  const packageChecksum = createHash("sha256").update(csv).digest("hex");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="tds-form-24q-package.csv"',
      "X-HRMS-Package-Checksum": packageChecksum,
      "X-HRMS-Report-Key": "tds-efile-package",
      "X-HRMS-Source-Row-Count": String(rows.length),
    },
  });
}
