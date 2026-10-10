"use client";

import { useMemo, useState } from "react";

import { recordImportBatchAudit, sha256Hex } from "@/lib/import-batch-audit";
import type { HrAdminEmployeeOptionSearchResponse, HrAdminOptionItem, LeaveRequestItem } from "@/lib/types";

type Props = {
  requests: LeaveRequestItem[];
  employees: HrAdminOptionItem[];
  leaveTypes: HrAdminOptionItem[];
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type LeaveImportPayload = {
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  start_day_portion: string;
  end_day_portion: string;
  reason: string;
  attachment_reference: string;
};

type ImportRow = {
  index: number;
  source: Record<string, string>;
  payload: LeaveImportPayload | null;
  status: ImportStatus;
  message: string;
};

const headers = ["employee_code", "leave_type_name", "start_date", "end_date", "start_day_portion", "end_day_portion", "reason", "attachment_reference"];
const dayPortions = new Set(["full_day", "first_half", "second_half"]);

function templateCsv() {
  return `${headers.join(",")}\n`;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];
    if (char === "\"" && inQuotes && nextChar === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], error: "CSV must include a header row and at least one leave request row." };
  const parsedHeaders = splitCsvLine(lines[0]).map((header) => header.trim());
  const missingHeaders = headers.filter((header) => !parsedHeaders.includes(header));
  if (missingHeaders.length) return { rows: [], error: `CSV is missing required columns: ${missingHeaders.join(", ")}.` };
  return {
    rows: lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      return Object.fromEntries(parsedHeaders.map((header, index) => [header, values[index] ?? ""]));
    }),
    error: "",
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isValidDate(value: string) {
  return Boolean(value.trim()) && !Number.isNaN(Date.parse(value.trim()));
}

function rangesOverlap(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

function buildPayload(
  row: Record<string, string>,
  employeesByCode: Map<string, HrAdminOptionItem>,
  leaveTypesByName: Map<string, HrAdminOptionItem>,
  existingRequests: LeaveRequestItem[],
  batchRanges: Map<string, Array<{ start: string; end: string }>>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const leaveTypeName = row.leave_type_name.trim();
  const startDate = row.start_date.trim();
  const endDate = row.end_date.trim();
  const startPortion = normalize(row.start_day_portion || "full_day");
  const endPortion = normalize(row.end_day_portion || "full_day");
  const employee = employeesByCode.get(normalize(employeeCode)) ?? null;
  const leaveType = leaveTypesByName.get(normalize(leaveTypeName)) ?? null;

  if (!employeeCode) errors.push("Employee code is required.");
  if (employeeCode && !employee) errors.push("Employee code must match an existing employee.");
  if (!leaveTypeName) errors.push("Leave type name is required.");
  if (leaveTypeName && !leaveType) errors.push("Leave type name must match an active leave type.");
  if (!isValidDate(startDate)) errors.push("Start date must be a valid date.");
  if (!isValidDate(endDate)) errors.push("End date must be a valid date.");
  if (startDate && endDate && endDate < startDate) errors.push("End date cannot be earlier than start date.");
  if (!dayPortions.has(startPortion)) errors.push("Start day portion must be full_day, first_half, or second_half.");
  if (!dayPortions.has(endPortion)) errors.push("End day portion must be full_day, first_half, or second_half.");
  if (!row.reason.trim()) errors.push("Reason is required for leave request audit context.");

  if (employee && isValidDate(startDate) && isValidDate(endDate)) {
    const existingOverlap = existingRequests.some((request) =>
      request.employee_id === employee.id &&
      ["pending", "partially_approved", "approved"].includes(request.status) &&
      rangesOverlap(startDate, endDate, request.start_date, request.end_date),
    );
    const batchOverlap = (batchRanges.get(employee.id) ?? []).some((range) => rangesOverlap(startDate, endDate, range.start, range.end));
    if (existingOverlap || batchOverlap) errors.push("Leave range overlaps an existing or same-batch active leave request.");
    batchRanges.set(employee.id, [...(batchRanges.get(employee.id) ?? []), { start: startDate, end: endDate }]);
  }

  if (errors.length || !employee || !leaveType) return { payload: null, errors };

  const payload: LeaveImportPayload = {
    employee_id: employee.id,
    leave_type_id: leaveType.id,
    start_date: startDate,
    end_date: endDate,
    start_day_portion: startPortion,
    end_day_portion: endPortion,
    reason: row.reason.trim(),
    attachment_reference: row.attachment_reference.trim(),
  };
  return { payload, errors };
}

function sampleCsv(employees: HrAdminOptionItem[], leaveTypes: HrAdminOptionItem[]) {
  const leaveType = leaveTypes[0]?.name ?? "Casual Leave";
  const rows = employees.slice(0, 2).map((employee, index) => [
    employee.employee_code ?? employee.name,
    leaveType,
    index === 0 ? "2026-04-03" : "2026-04-06",
    index === 0 ? "2026-04-03" : "2026-04-06",
    index === 0 ? "full_day" : "first_half",
    index === 0 ? "full_day" : "first_half",
    index === 0 ? "Phase 9 leave attendance collision" : "Phase 9 half-day leave",
    "",
  ]);
  return `${headers.join(",")}\n${rows.map((row) => row.join(",")).join("\n")}`;
}

async function resolveEmployeesByCode(employeeCodes: string[]) {
  const normalizedCodes = Array.from(new Set(employeeCodes.map(normalize).filter(Boolean)));
  const prefix = normalizedCodes.reduce((left, right) => {
    let index = 0;
    while (index < left.length && left[index] === right[index]) index += 1;
    return left.slice(0, index);
  }, normalizedCodes[0] ?? "");
  const lookup = new Map<string, HrAdminOptionItem>();
  if (prefix.length >= 3) {
    try {
      const params = new URLSearchParams({ q: prefix, limit: "250" });
      const response = await fetch(`/api/hr-admin/employees/option-search?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as HrAdminEmployeeOptionSearchResponse | { detail?: string } | null;
      if (response.ok && payload && "items" in payload) {
        for (const item of payload.items) lookup.set(normalize(item.employee_code ?? item.name), item);
      }
    } catch {
      // Fall back to exact code lookups below.
    }
  }
  const unresolvedCodes = normalizedCodes.filter((employeeCode) => !lookup.has(employeeCode));
  const entries = await Promise.all(unresolvedCodes.map(async (employeeCode) => {
    try {
      const params = new URLSearchParams({ q: employeeCode, limit: "10" });
      const response = await fetch(`/api/hr-admin/employees/option-search?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as HrAdminEmployeeOptionSearchResponse | { detail?: string } | null;
      if (!response.ok || !payload || !("items" in payload)) return null;
      const exactMatch = payload.items.find((item) => normalize(item.employee_code ?? item.name) === employeeCode);
      return [employeeCode, exactMatch ?? payload.items[0] ?? null] as const;
    } catch {
      return null;
    }
  }));

  for (const entry of entries) {
    if (entry?.[1]) lookup.set(entry[0], entry[1]);
  }
  return lookup;
}

export function LeaveRequestImportWorkbench({ requests, employees, leaveTypes }: Props) {
  const [csvText, setCsvText] = useState(templateCsv());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const leaveTypesByName = useMemo(() => new Map(leaveTypes.map((leaveType) => [normalize(leaveType.name), leaveType])), [leaveTypes]);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const createdCount = rows.filter((row) => row.status === "created").length;

  async function preview() {
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      setRows([]);
      setMessage(parsed.error);
      return;
    }
    const employeeCodes = Array.from(new Set(parsed.rows.map((row) => normalize(row.employee_code ?? "")).filter(Boolean)));
    const seededEmployeesByCode = new Map(employees.map((employee) => [normalize(employee.employee_code ?? employee.name), employee]));
    const missingEmployeeCodes = employeeCodes.filter((employeeCode) => !seededEmployeesByCode.has(employeeCode));
    const resolvedEmployeesByCode = missingEmployeeCodes.length ? await resolveEmployeesByCode(missingEmployeeCodes) : new Map<string, HrAdminOptionItem>();
    const resolvedEmployeeMap = new Map([...seededEmployeesByCode, ...resolvedEmployeesByCode]);
    const batchRanges = new Map<string, Array<{ start: string; end: string }>>();
    const nextRows = parsed.rows.map((row, index) => {
      const result = buildPayload(row, resolvedEmployeeMap, leaveTypesByName, requests, batchRanges);
      return {
        index: index + 1,
        source: row,
        payload: result.payload,
        status: result.errors.length ? "blocked" : "ready",
        message: result.errors.join(" "),
      } satisfies ImportRow;
    });
    setRows(nextRows);
    setMessage("Preview ready. Commit ready leave requests after checking blocked rows.");
    await recordImportBatchAudit({
      import_type: "leave_requests",
      status: "previewed",
      file_name: "leave-request-import.csv",
      source_hash: await sha256Hex(csvText),
      row_count: nextRows.length,
      ready_count: nextRows.filter((row) => row.status === "ready").length,
      blocked_count: nextRows.filter((row) => row.status === "blocked").length,
      rollback_supported: false,
      evidence_snapshot: { headers, ui: "leave-request-import-workbench" },
      row_errors: nextRows.filter((row) => row.status === "blocked").map((row) => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
    });
  }

  async function commitReadyRows() {
    setIsCommitting(true);
    const nextRows = [...rows];
    const readyIndexes = nextRows.map((row, index) => ({ row, index })).filter(({ row }) => row.status === "ready" && row.payload).map(({ index }) => index);
    const response = await fetch("/api/hr-admin/leave-requests/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: readyIndexes.map((index) => nextRows[index].payload) }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok || response.status === 207) {
      const failedRows = new Map<number, string>((payload.errors ?? []).map((item: { row: number; message: unknown }) => [item.row, typeof item.message === "string" ? item.message : JSON.stringify(item.message)]));
      const createdRows = payload.created ?? [];
      readyIndexes.forEach((rowIndex, resultIndex) => {
        const failure = failedRows.get(resultIndex + 1);
        const createdStatus = createdRows[resultIndex]?.status ?? "workflow";
        nextRows[rowIndex] = {
          ...nextRows[rowIndex],
          status: failure ? "failed" : "created",
          message: failure || `Leave request created with ${createdStatus} status.`,
        };
      });
    } else {
      readyIndexes.forEach((rowIndex) => {
        nextRows[rowIndex] = { ...nextRows[rowIndex], status: "failed", message: payload.detail || Object.values(payload).flat().join(" ") || "Create failed." };
      });
    }
    setRows([...nextRows]);
    setIsCommitting(false);
    setMessage("Commit complete. Open leave-attendance collisions or Time to Payroll to verify impact.");
    await recordImportBatchAudit({
      import_type: "leave_requests",
      status: nextRows.some((row) => row.status === "failed") ? "partial" : "committed",
      file_name: "leave-request-import.csv",
      source_hash: await sha256Hex(csvText),
      row_count: nextRows.length,
      ready_count: nextRows.filter((row) => row.status === "ready").length,
      created_count: nextRows.filter((row) => row.status === "created").length,
      blocked_count: nextRows.filter((row) => row.status === "blocked").length,
      failed_count: nextRows.filter((row) => row.status === "failed").length,
      rollback_supported: false,
      evidence_snapshot: { headers, ui: "leave-request-import-workbench" },
      row_errors: nextRows.filter((row) => row.status === "blocked" || row.status === "failed").map((row) => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
    });
  }

  return (
    <section className="section" data-testid="leave-request-import-workbench">
      <article className="panel-card-soft organization-import-workbench">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave request import</h2>
            <p className="section-copy section-copy-soft">Load employee leave scenarios by employee code, leave type, date range, day portions, reason, and evidence reference.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{readyCount}</strong> ready</span>
            <span className="queue-summary-chip"><strong>{createdCount}</strong> created</span>
          </div>
        </div>
        <div className="organization-import-grid">
          <label className="form-field">
            <span className="text-label-premium">Leave request CSV data</span>
            <textarea className="input-control organization-import-textarea" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setCsvText(sampleCsv(employees, leaveTypes))}>Load sample template</button>
            <button className="button button--secondary" type="button" onClick={() => navigator.clipboard.writeText(templateCsv())}>Copy template</button>
            <a className="button button--secondary" download="leave-request-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`}>Download template</a>
            <label className="button button--secondary">
              <span>Upload CSV</span>
              <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                file.text().then(setCsvText);
              }} />
            </label>
            <button className="button button--primary" type="button" onClick={preview}>Preview leave import</button>
            <button className="button button--primary" type="button" disabled={!readyCount || isCommitting} onClick={commitReadyRows}>
              {isCommitting ? "Committing..." : "Commit ready leave rows"}
            </button>
          </div>
        </div>
        {message ? <div className="notice notice--success" role="status"><strong>Leave import update completed.</strong><span>{message}</span></div> : null}
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee</th>
                  <th>Leave type</th>
                  <th>Dates</th>
                  <th>Portions</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.index}-${row.source.employee_code}-${row.source.start_date}`}>
                    <td>{row.index}</td>
                    <td>{row.source.employee_code || "Missing employee"}</td>
                    <td>{row.source.leave_type_name || "Missing type"}</td>
                    <td>{row.source.start_date || "Missing date"} to {row.source.end_date || "Missing date"}</td>
                    <td>{row.source.start_day_portion || "full_day"} to {row.source.end_day_portion || "full_day"}</td>
                    <td><span className="readiness-badge">{row.status}</span></td>
                    <td>{row.message || "Valid for import"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
