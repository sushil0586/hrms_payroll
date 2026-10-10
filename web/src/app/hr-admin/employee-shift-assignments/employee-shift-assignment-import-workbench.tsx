"use client";

import { useMemo, useState } from "react";

import { recordImportBatchAudit, sha256Hex } from "@/lib/import-batch-audit";
import type { HrAdminEmployeeOptionSearchResponse, HrAdminEmployeeShiftAssignment, HrAdminEmployeeShiftAssignmentWriteInput, HrAdminOptionItem } from "@/lib/types";

type Props = {
  assignments: HrAdminEmployeeShiftAssignment[];
  employees: HrAdminOptionItem[];
  shifts: HrAdminOptionItem[];
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type ImportRow = {
  index: number;
  source: Record<string, string>;
  payload: HrAdminEmployeeShiftAssignmentWriteInput | null;
  status: ImportStatus;
  message: string;
};

const headers = ["employee_code", "shift_name", "assignment_kind", "effective_from", "effective_to", "is_primary", "rotation_anchor_date"];
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
  if (lines.length < 2) {
    return { rows: [], error: "CSV must include a header row and at least one shift assignment row." };
  }

  const parsedHeaders = splitCsvLine(lines[0]).map((header) => header.trim());
  const missingHeaders = headers.filter((header) => !parsedHeaders.includes(header));
  if (missingHeaders.length) {
    return { rows: [], error: `CSV is missing required columns: ${missingHeaders.join(", ")}.` };
  }

  return {
    rows: lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      return Object.fromEntries(parsedHeaders.map((header, index) => [header, values[index] ?? ""]));
    }),
    error: "",
  };
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  return ["", "true", "yes", "y", "1", "primary"].includes(normalized);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function isValidDate(value: string) {
  return Boolean(value.trim()) && !Number.isNaN(Date.parse(value.trim()));
}

function buildPayload(
  row: Record<string, string>,
  employeesByCode: Map<string, HrAdminOptionItem>,
  shiftsByName: Map<string, HrAdminOptionItem>,
  existingKeys: Set<string>,
  batchKeys: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const shiftName = row.shift_name.trim();
  const assignmentKind = (row.assignment_kind.trim() || "fixed") as HrAdminEmployeeShiftAssignmentWriteInput["assignment_kind"];
  const effectiveFrom = row.effective_from.trim();
  const effectiveTo = row.effective_to.trim() || null;
  const employee = employeesByCode.get(normalize(employeeCode)) ?? null;
  const shift = shiftsByName.get(normalize(shiftName)) ?? null;
  const primary = parseBoolean(row.is_primary);
  const key = `${normalize(employeeCode)}|${effectiveFrom}|${effectiveTo ?? ""}|${primary ? "primary" : "secondary"}`;

  if (!employeeCode) errors.push("Employee code is required.");
  if (employeeCode && !employee) errors.push("Employee code must match an existing employee.");
  if (!shiftName) errors.push("Shift name is required.");
  if (shiftName && !shift) errors.push("Shift name must match an active shift.");
  if (!["fixed", "weekly_rotation", "temporary_override"].includes(assignmentKind)) errors.push("Assignment kind must be fixed, weekly_rotation, or temporary_override.");
  if (!isValidDate(effectiveFrom)) errors.push("Effective from must be a valid date.");
  if (effectiveTo && !isValidDate(effectiveTo)) errors.push("Effective to must be a valid date.");
  if (effectiveTo && effectiveFrom && effectiveTo < effectiveFrom) errors.push("Effective to cannot be earlier than effective from.");
  if (existingKeys.has(key) || batchKeys.has(key)) errors.push("Only one shift assignment per employee/window can be committed in one import batch.");
  if (employeeCode && effectiveFrom) batchKeys.add(key);

  if (errors.length || !employee || !shift) {
    return { payload: null, errors };
  }

  const payload: HrAdminEmployeeShiftAssignmentWriteInput = {
    employee_id: employee.id,
    shift_id: shift.id,
    assignment_kind: assignmentKind,
    effective_from: effectiveFrom,
    effective_to: effectiveTo,
    is_primary: primary,
    config_snapshot: {
      rotation: {
        pattern_type: assignmentKind === "weekly_rotation" ? "weekly_rotation" : "fixed_weekly",
        anchor_date: row.rotation_anchor_date.trim() || effectiveFrom,
        entries: [{ position: 0, entry_kind: "work", shift_id: shift.id, span_days: 7 }],
      },
    },
  };

  return { payload, errors };
}

function sampleCsv(employees: HrAdminOptionItem[], shifts: HrAdminOptionItem[], suffix: string) {
  const shift = shifts[0]?.name ?? "General Shift";
  const rows = employees.slice(0, 2).map((employee, index) => [
    employee.employee_code ?? employee.name,
    shift,
    index === 0 ? "fixed" : "weekly_rotation",
    "2026-04-01",
    "",
    "true",
    "2026-04-01",
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

export function EmployeeShiftAssignmentImportWorkbench({ assignments, employees, shifts }: Props) {
  const [csvText, setCsvText] = useState(templateCsv());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const shiftsByName = useMemo(() => new Map(shifts.map((shift) => [normalize(shift.name), shift])), [shifts]);
  const existingKeys = useMemo(
    () => new Set(assignments.map((assignment) => `${normalize(assignment.employee_code)}|${assignment.effective_from}|${assignment.effective_to ?? ""}|${assignment.is_primary ? "primary" : "secondary"}`)),
    [assignments],
  );
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
    const batchKeys = new Set<string>();
    const nextRows = parsed.rows.map((row, index) => {
      const result = buildPayload(row, resolvedEmployeeMap, shiftsByName, existingKeys, batchKeys);
      return {
        index: index + 1,
        source: row,
        payload: result.payload,
        status: result.errors.length ? "blocked" : "ready",
        message: result.errors.join(" "),
      } satisfies ImportRow;
    });

    setRows(nextRows);
    setMessage("Preview ready. Commit ready shift assignments after checking blocked rows.");
    await recordImportBatchAudit({
      import_type: "employee_shift_assignments",
      status: "previewed",
      file_name: "employee-shift-assignment-import.csv",
      source_hash: await sha256Hex(csvText),
      row_count: nextRows.length,
      ready_count: nextRows.filter((row) => row.status === "ready").length,
      blocked_count: nextRows.filter((row) => row.status === "blocked").length,
      rollback_supported: false,
      evidence_snapshot: { headers, ui: "employee-shift-assignment-import-workbench" },
      row_errors: nextRows.filter((row) => row.status === "blocked").map((row) => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
    });
  }

  async function commitReadyRows() {
    setIsCommitting(true);
    const nextRows = [...rows];
    const readyIndexes = nextRows.flatMap((row, index) => (row.status === "ready" && row.payload ? [index] : []));
    for (let offset = 0; offset < readyIndexes.length; offset += commitBatchSize) {
      const indexes = readyIndexes.slice(offset, offset + commitBatchSize);
      const results = await Promise.all(indexes.map(async (index) => {
        const row = nextRows[index];
        if (!row.payload) return { index, ok: false, message: "Shift assignment payload is missing." };
        const response = await fetch("/api/hr-admin/employee-shift-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row.payload),
        });
        const payload = await response.json().catch(() => ({}));
        return {
          index,
          ok: response.ok,
          message: response.ok ? "Shift assignment created." : payload.detail || payload.conflict_check?.summary || Object.values(payload).flat().join(" ") || "Create failed.",
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
    setMessage("Commit complete. Refresh shift assignments or Time to Payroll to verify roster coverage.");
    await recordImportBatchAudit({
      import_type: "employee_shift_assignments",
      status: nextRows.some((row) => row.status === "failed") ? "partial" : "committed",
      file_name: "employee-shift-assignment-import.csv",
      source_hash: await sha256Hex(csvText),
      row_count: nextRows.length,
      ready_count: nextRows.filter((row) => row.status === "ready").length,
      created_count: nextRows.filter((row) => row.status === "created").length,
      blocked_count: nextRows.filter((row) => row.status === "blocked").length,
      failed_count: nextRows.filter((row) => row.status === "failed").length,
      rollback_supported: false,
      evidence_snapshot: { headers, ui: "employee-shift-assignment-import-workbench" },
      row_errors: nextRows.filter((row) => row.status === "blocked" || row.status === "failed").map((row) => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
    });
  }

  return (
    <section className="section" data-testid="employee-shift-assignment-import-workbench">
      <article className="panel-card-soft organization-import-workbench">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Shift assignment import</h2>
            <p className="section-copy section-copy-soft">Load roster coverage by employee code, shift name, assignment mode, and effective window.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{readyCount}</strong> ready</span>
            <span className="queue-summary-chip"><strong>{createdCount}</strong> created</span>
          </div>
        </div>

        <div className="organization-import-grid">
          <label className="form-field">
            <span className="text-label-premium">Shift assignment CSV data</span>
            <textarea className="input-control organization-import-textarea" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setCsvText(sampleCsv(employees, shifts, String(Date.now()).slice(-5)))}>
              Load sample template
            </button>
            <button className="button button--secondary" type="button" onClick={() => navigator.clipboard.writeText(templateCsv())}>
              Copy template
            </button>
            <a className="button button--secondary" download="employee-shift-assignment-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`}>
              Download template
            </a>
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
            <button className="button button--primary" type="button" onClick={preview}>
              Preview shift import
            </button>
            <button className="button button--primary" type="button" disabled={!readyCount || isCommitting} onClick={commitReadyRows}>
              {isCommitting ? "Committing..." : "Commit ready shift rows"}
            </button>
          </div>
        </div>

        {message ? <div className="notice notice--success" role="status"><strong>Shift import update completed.</strong><span>{message}</span></div> : null}

        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee</th>
                  <th>Shift</th>
                  <th>Mode</th>
                  <th>Window</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.index}-${row.source.employee_code}-${row.source.effective_from}`}>
                    <td>{row.index}</td>
                    <td>{row.source.employee_code || "Missing employee"}</td>
                    <td>{row.source.shift_name || "Missing shift"}</td>
                    <td>{row.source.assignment_kind || "fixed"}</td>
                    <td>{row.source.effective_from || "Missing date"} to {row.source.effective_to || "open ended"}</td>
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
