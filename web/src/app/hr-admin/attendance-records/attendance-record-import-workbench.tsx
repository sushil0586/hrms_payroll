"use client";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { useMemo, useState } from "react";
import { AsyncActionButton } from "@/components/patterns/async-action-button";

import { recordImportBatchAudit, sha256Hex } from "@/lib/import-batch-audit";
import { submitImportRequest } from "@/lib/ui/import-request";
import { useLatestEmployeeCodeResolution } from "@/lib/ui/use-latest-employee-code-resolution";
import type { HrAdminAttendanceRecord, HrAdminAttendanceRecordWriteInput, HrAdminEnumOption, HrAdminOptionItem } from "@/lib/types";

type Props = {
  records: HrAdminAttendanceRecord[];
  employees?: HrAdminOptionItem[];
  shifts: HrAdminOptionItem[];
  statusOptions: HrAdminEnumOption[];
  sourceOptions: HrAdminEnumOption[];
  canManageRecords?: boolean;
};

type AttendanceImportPayload = HrAdminAttendanceRecordWriteInput & {
  employee_id: string;
  attendance_date: string;
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type ImportRow = {
  index: number;
  source: Record<string, string>;
  payload: AttendanceImportPayload | null;
  status: ImportStatus;
  message: string;
};

const headers = [
  "employee_code",
  "attendance_date",
  "status",
  "source",
  "shift_name",
  "check_in_at",
  "check_out_at",
  "work_duration_hours",
  "overtime_hours",
  "late_minutes",
  "early_exit_minutes",
  "is_regularized",
  "is_locked",
  "notes",
];
const commitBatchSize = 10;

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
  if (lines.length < 2) return { rows: [], error: "CSV must include a header row and at least one attendance row." };
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

function parseBoolean(value: string) {
  return ["true", "yes", "y", "1", "locked", "regularized"].includes(normalize(value));
}

function isValidDate(value: string) {
  return Boolean(value.trim()) && !Number.isNaN(Date.parse(value.trim()));
}

function isValidDateTime(value: string) {
  return !value.trim() || !Number.isNaN(Date.parse(value.trim()));
}

function toDecimal(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : fallback;
}

function toInteger(value: string) {
  const parsed = Number.parseInt(value.trim() || "0", 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function buildPayload(
  row: Record<string, string>,
  employeesByCode: Map<string, HrAdminOptionItem>,
  shiftsByName: Map<string, HrAdminOptionItem>,
  statusValues: Set<string>,
  sourceValues: Set<string>,
  existingKeys: Set<string>,
  batchKeys: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const attendanceDate = row.attendance_date.trim();
  const status = normalize(row.status || "present");
  const source = normalize(row.source || "manual");
  const shiftName = row.shift_name.trim();
  const employee = employeesByCode.get(normalize(employeeCode)) ?? null;
  const shift = shiftName ? shiftsByName.get(normalize(shiftName)) ?? null : null;
  const key = `${normalize(employeeCode)}|${attendanceDate}`;

  if (!employeeCode) errors.push("Employee code is required.");
  if (employeeCode && !employee) errors.push("Employee code must match an existing employee.");
  if (!isValidDate(attendanceDate)) errors.push("Attendance date must be a valid date.");
  if (!statusValues.has(status)) errors.push("Status must match an attendance status option.");
  if (!sourceValues.has(source)) errors.push("Source must match an attendance source option.");
  if (shiftName && !shift) errors.push("Shift name must match an active shift.");
  if (!isValidDateTime(row.check_in_at)) errors.push("Check-in time must be a valid date-time.");
  if (!isValidDateTime(row.check_out_at)) errors.push("Check-out time must be a valid date-time.");
  if (existingKeys.has(key) || batchKeys.has(key)) errors.push("Only one attendance row per employee and date can be committed in one import batch.");
  if (employeeCode && attendanceDate) batchKeys.add(key);

  if (errors.length || !employee) return { payload: null, errors };

  const payload: AttendanceImportPayload = {
    employee_id: employee.id,
    attendance_date: attendanceDate,
    status,
    source,
    shift_id: shift?.id ?? null,
    check_in_at: row.check_in_at.trim() || null,
    check_out_at: row.check_out_at.trim() || null,
    work_duration_hours: toDecimal(row.work_duration_hours, "0.00"),
    overtime_hours: toDecimal(row.overtime_hours, "0.00"),
    late_minutes: toInteger(row.late_minutes),
    early_exit_minutes: toInteger(row.early_exit_minutes),
    is_regularized: parseBoolean(row.is_regularized),
    is_locked: parseBoolean(row.is_locked),
    notes: row.notes.trim(),
  };

  return { payload, errors };
}

function sampleCsv(records: HrAdminAttendanceRecord[], shifts: HrAdminOptionItem[]) {
  const shift = shifts[0]?.name ?? "General Shift";
  const sampleRecords = records.length ? records.slice(0, 2) : [];
  const fallbackRows = [
    ["EMP001", "2026-04-03", "present", "manual", shift, "2026-04-03T09:00:00+05:30", "2026-04-03T18:00:00+05:30", "8.00", "0.00", "0", "0", "false", "false", "Sample present row"],
    ["EMP002", "2026-04-03", "late", "manual", shift, "2026-04-03T10:15:00+05:30", "2026-04-03T18:00:00+05:30", "7.00", "0.00", "75", "0", "true", "false", "Sample late regularized row"],
  ];
  const rows = sampleRecords.length ? sampleRecords.map((record, index) => [
    record.employee_code,
    "2026-04-03",
    index === 0 ? "present" : "late",
    "manual",
    shift,
    index === 0 ? "2026-04-03T09:00:00+05:30" : "2026-04-03T10:15:00+05:30",
    "2026-04-03T18:00:00+05:30",
    index === 0 ? "8.00" : "7.00",
    "0.00",
    index === 0 ? "0" : "75",
    "0",
    index === 0 ? "false" : "true",
    "false",
    index === 0 ? "Sample present row" : "Sample late regularized row",
  ]) : fallbackRows;
  return `${headers.join(",")}\n${rows.map((row) => row.join(",")).join("\n")}`;
}

export function AttendanceRecordImportWorkbench({ records, employees = [], shifts, statusOptions, sourceOptions, canManageRecords = true }: Props) {
  const resolveLatestEmployeesByCode = useLatestEmployeeCodeResolution();
  const [csvText, setCsvText] = useState(templateCsv());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [lookupFailed, setLookupFailed] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const shiftsByName = useMemo(() => new Map(shifts.map((shift) => [normalize(shift.name), shift])), [shifts]);
  const statusValues = useMemo(() => new Set(statusOptions.map((option) => option.value)), [statusOptions]);
  const sourceValues = useMemo(() => new Set(sourceOptions.map((option) => option.value)), [sourceOptions]);
  const existingKeys = useMemo(() => new Set(records.map((record) => `${normalize(record.employee_code)}|${record.attendance_date}`)), [records]);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const createdCount = rows.filter((row) => row.status === "created").length;
  const hasFailedRows = rows.some((row) => row.status === "failed");

  async function preview() {
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      setRows([]);
      setMessage(parsed.error);
      return;
    }
    setIsPreviewing(true);
    setLookupFailed(false);
    setMessage("Resolving employee codes for preview...");
    const employeeCodes = Array.from(new Set(parsed.rows.map((row) => normalize(row.employee_code)).filter(Boolean)));
    const seededEmployeesByCode = new Map(employees.map((employee) => [normalize(employee.employee_code ?? employee.name), employee]));
    const missingEmployeeCodes = employeeCodes.filter((employeeCode) => !seededEmployeesByCode.has(employeeCode));
    let resolvedEmployeesByCode: Map<string, HrAdminOptionItem> | null;
    try {
      resolvedEmployeesByCode = missingEmployeeCodes.length ? await resolveLatestEmployeesByCode(missingEmployeeCodes) : new Map<string, HrAdminOptionItem>();
    } catch {
      setIsPreviewing(false);
      setLookupFailed(true);
      setMessage("Employee lookup failed. Check your connection and preview the CSV again.");
      return;
    }
    if (!resolvedEmployeesByCode) {
      setIsPreviewing(false);
      return;
    }
    const employeesByCode = new Map([...seededEmployeesByCode, ...resolvedEmployeesByCode]);
    const batchKeys = new Set<string>();
    const nextRows = parsed.rows.map((row, index) => {
      const result = buildPayload(row, employeesByCode, shiftsByName, statusValues, sourceValues, existingKeys, batchKeys);
      return {
        index: index + 1,
        source: row,
        payload: result.payload,
        status: result.errors.length ? "blocked" : "ready",
        message: result.errors.join(" "),
      } satisfies ImportRow;
    });
    setRows(nextRows);
    setIsPreviewing(false);
    setMessage("Preview ready. Commit ready attendance rows after checking blocked rows.");
    await recordImportBatchAudit({
      import_type: "attendance_records",
      status: "previewed",
      file_name: "attendance-record-import.csv",
      source_hash: await sha256Hex(csvText),
      row_count: nextRows.length,
      ready_count: nextRows.filter((row) => row.status === "ready").length,
      blocked_count: nextRows.filter((row) => row.status === "blocked").length,
      rollback_supported: false,
      evidence_snapshot: { headers, ui: "attendance-record-import-workbench" },
      row_errors: nextRows.filter((row) => row.status === "blocked").map((row) => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
    });
  }

  async function commitReadyRows() {
    if (isCommitting) return;
    if (!canManageRecords) {
      setMessage("You need attendance record management permission to commit imports.");
      return;
    }
    setIsCommitting(true);
    const nextRows = [...rows];
    const readyIndexes = nextRows.flatMap((row, index) => (row.status === "ready" && row.payload ? [index] : []));
    for (let offset = 0; offset < readyIndexes.length; offset += commitBatchSize) {
      const indexes = readyIndexes.slice(offset, offset + commitBatchSize);
      const results = await Promise.all(indexes.map(async (index) => {
        const row = nextRows[index];
        if (!row.payload) return { index, ok: false, message: "Attendance payload is missing." };
        const response = await submitImportRequest("/api/hr-admin/attendance-records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row.payload),
        });
        const payload = response.payload;
        return {
          index,
          ok: response.ok,
          message: response.ok ? "Attendance row created." : payload.detail || Object.values(payload).flat().join(" ") || "Create failed.",
        };
      }));
      for (const result of results) {
        nextRows[result.index] = {
          ...nextRows[result.index],
          status: result.ok ? "created" : "failed",
          message: result.message,
        };
      }
      setRows([...nextRows]);
    }
    setIsCommitting(false);
    setMessage(nextRows.some((row) => row.status === "failed")
      ? "Some attendance rows failed. Review the row messages, then preview the preserved CSV again."
      : "Commit complete. Open Time to Payroll to verify attendance exceptions.");
    await recordImportBatchAudit({
      import_type: "attendance_records",
      status: nextRows.some((row) => row.status === "failed") ? "partial" : "committed",
      file_name: "attendance-record-import.csv",
      source_hash: await sha256Hex(csvText),
      row_count: nextRows.length,
      ready_count: nextRows.filter((row) => row.status === "ready").length,
      created_count: nextRows.filter((row) => row.status === "created").length,
      blocked_count: nextRows.filter((row) => row.status === "blocked").length,
      failed_count: nextRows.filter((row) => row.status === "failed").length,
      rollback_supported: false,
      evidence_snapshot: { headers, ui: "attendance-record-import-workbench" },
      row_errors: nextRows.filter((row) => row.status === "blocked" || row.status === "failed").map((row) => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
    });
  }

  return (
    <section className="section" data-testid="attendance-record-import-workbench">
      <article className="panel-card-soft organization-import-workbench">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Attendance record import</h2>
            <p className="section-copy section-copy-soft">Load daily attendance evidence by employee code, date, status, source, shift, timing, and regularization flags.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{readyCount}</strong> ready</span>
            <span className="queue-summary-chip"><strong>{createdCount}</strong> created</span>
          </div>
        </div>
        <div className="organization-import-grid">
          <label className="form-field">
            <span className="text-label-premium">Attendance CSV data</span>
            <textarea className="input-control organization-import-textarea" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setCsvText(sampleCsv(records, shifts))}>Load sample template</button>
            <button className="button button--secondary" type="button" onClick={() => navigator.clipboard.writeText(templateCsv())}>Copy template</button>
            <a className="button button--secondary" download="attendance-record-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`}>Download template</a>
            <label className="button button--secondary">
              <span>Upload CSV</span>
              <input
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  file.text().then(setCsvText);
                }}
              />
            </label>
            <AsyncActionButton className="button button--primary" type="button" disabled={isCommitting} pending={isPreviewing} pendingLabel="Resolving employee codes" onClick={preview}>Preview attendance import</AsyncActionButton>
            <AsyncActionButton className="button button--primary" type="button" disabled={!readyCount || isPreviewing} pending={isCommitting} pendingLabel="Committing attendance rows" onClick={commitReadyRows}>Commit ready attendance rows</AsyncActionButton>
          </div>
        </div>
        {message ? <div className={`notice${hasFailedRows || lookupFailed ? " notice--error" : " notice--success"}`} role={hasFailedRows || lookupFailed ? "alert" : "status"}><strong>{hasFailedRows || lookupFailed ? "Attendance import needs attention." : "Attendance import update completed."}</strong><span>{message}</span></div> : null}
        {!canManageRecords ? <div className="notice"><strong>Read-only attendance view.</strong><span>Imports can be previewed, but committing rows requires attendance record management permission.</span></div> : null}
        {rows.length ? (
          <WorkspaceTableScrollRegion label="Attendance records, scroll for more columns" className="table-scroll workspace-table-region">
            <table>
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Employee</th>
                  <th scope="col">Date</th>
                  <th scope="col">Status</th>
                  <th scope="col">Timing</th>
                  <th scope="col">Import state</th>
                  <th scope="col">Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.index}-${row.source.employee_code}-${row.source.attendance_date}`}>
                    <td>{row.index}</td>
                    <td>{row.source.employee_code || "Missing employee"}</td>
                    <td>{row.source.attendance_date || "Missing date"}</td>
                    <td>{row.source.status || "present"}</td>
                    <td>{row.source.check_in_at || "No in"} to {row.source.check_out_at || "No out"}</td>
                    <td><span className="readiness-badge">{row.status}</span></td>
                    <td>{row.message || "Valid for import"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </WorkspaceTableScrollRegion>
        ) : null}
      </article>
    </section>
  );
}
