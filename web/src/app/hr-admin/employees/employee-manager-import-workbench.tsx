"use client";

import { useMemo, useState } from "react";

import type { HrAdminEmployeeFormOptions, HrAdminEmployeeListItem } from "@/lib/types";

type EmployeeManagerImportWorkbenchProps = {
  employees: HrAdminEmployeeListItem[];
  options: HrAdminEmployeeFormOptions;
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type ImportRow = {
  index: number;
  source: Record<string, string>;
  employeeId: string | null;
  reportingManagerId: string | null;
  status: ImportStatus;
  message: string;
};

const headers = ["employee_code", "reporting_manager_code", "effective_date", "reason"];

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
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], error: "CSV must include a header row and at least one manager mapping row." };
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

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

function isValidDate(value: string) {
  return !value.trim() || !Number.isNaN(Date.parse(value.trim()));
}

function csvCell(value: string) {
  return value.includes(",") ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function sampleCsv(employees: HrAdminEmployeeListItem[], suffix: string) {
  const employee = employees.find((item) => item.direct_reports_count === 0) ?? employees[0];
  const manager = employees.find((item) => item.id !== employee?.id && item.direct_reports_count > 0) ?? employees.find((item) => item.id !== employee?.id);
  if (!employee || !manager) {
    return templateCsv();
  }

  const rows = [
    [employee.employee_code, manager.employee_code, "2026-04-01", `Reporting line load ${suffix}`],
  ];

  return `${headers.join(",")}\n${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
}

function buildImportRow(
  row: Record<string, string>,
  index: number,
  employeesByCode: Map<string, HrAdminEmployeeListItem>,
  managersByCode: Map<string, { id: string; employee_code: string; name: string }>,
  managersByName: Map<string, { id: string; employee_code: string; name: string }>,
  batchEmployees: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const managerCode = row.reporting_manager_code.trim();
  const employee = employeesByCode.get(normalizeCode(employeeCode)) ?? null;
  const manager = managersByCode.get(normalizeCode(managerCode)) ?? managersByName.get(normalizeCode(managerCode)) ?? null;

  if (!employeeCode) {
    errors.push("Employee code is required.");
  }
  if (employeeCode && !employee) {
    errors.push("Employee code must match an existing employee.");
  }
  if (!managerCode) {
    errors.push("Reporting manager code is required.");
  }
  if (managerCode && !manager) {
    errors.push("Reporting manager must match an active manager option.");
  }
  if (employee && manager && employee.id === manager.id) {
    errors.push("Employee cannot report to self.");
  }
  if (employeeCode && batchEmployees.has(normalizeCode(employeeCode))) {
    errors.push("Only one manager mapping per employee can be committed in one import batch.");
  }
  if (!isValidDate(row.effective_date)) {
    errors.push("Effective date must be a valid date.");
  }
  if (!row.reason.trim()) {
    errors.push("Reason is required for reporting-line audit context.");
  }

  if (employeeCode) {
    batchEmployees.add(normalizeCode(employeeCode));
  }

  return {
    index,
    source: row,
    employeeId: employee?.id ?? null,
    reportingManagerId: manager?.id ?? null,
    status: errors.length ? "blocked" : "ready",
    message: errors.join(" "),
  } satisfies ImportRow;
}

export function EmployeeManagerImportWorkbench({ employees, options }: EmployeeManagerImportWorkbenchProps) {
  const [csvText, setCsvText] = useState(templateCsv());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const employeesByCode = useMemo(
    () => new Map(employees.map((employee) => [normalizeCode(employee.employee_code), employee])),
    [employees],
  );
  const managersByCode = useMemo(
    () => new Map(options.managers.map((manager) => [normalizeCode(manager.employee_code), manager])),
    [options.managers],
  );
  const managersByName = useMemo(
    () => new Map(options.managers.map((manager) => [normalizeCode(manager.name), manager])),
    [options.managers],
  );
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const createdCount = rows.filter((row) => row.status === "created").length;

  function preview() {
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      setRows([]);
      setMessage(parsed.error);
      return;
    }

    const batchEmployees = new Set<string>();
    setRows(parsed.rows.map((row, index) => buildImportRow(row, index + 1, employeesByCode, managersByCode, managersByName, batchEmployees)));
    setMessage("Preview ready. Commit ready manager mappings after checking blocked rows.");
  }

  async function commitReadyRows() {
    setIsCommitting(true);
    const nextRows = [...rows];

    for (let index = 0; index < nextRows.length; index += 1) {
      const row = nextRows[index];
      if (row.status !== "ready" || !row.employeeId) {
        continue;
      }

      const response = await fetch(`/api/hr-admin/employees/${row.employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporting_manager_id: row.reportingManagerId }),
      });
      const payload = await response.json().catch(() => ({}));
      nextRows[index] = {
        ...row,
        status: response.ok ? "created" : "failed",
        message: response.ok ? "Manager mapping updated." : payload.detail || Object.values(payload).flat().join(" ") || "Update failed.",
      };
      setRows([...nextRows]);
    }

    setIsCommitting(false);
    setMessage("Commit complete. Refresh the directory or workforce report to verify manager coverage.");
  }

  return (
    <section className="section" data-testid="employee-manager-import-workbench">
      <article className="panel-card-soft organization-import-workbench">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Reporting manager import</h2>
            <p className="section-copy section-copy-soft">Map reporting lines by employee code and manager code, then commit only validated rows.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{readyCount}</strong> ready</span>
            <span className="queue-summary-chip"><strong>{createdCount}</strong> updated</span>
          </div>
        </div>

        <div className="organization-import-grid">
          <label className="form-field">
            <span className="text-label-premium">Manager CSV data</span>
            <textarea className="input-control organization-import-textarea" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setCsvText(sampleCsv(employees, String(Date.now()).slice(-5)))}>
              Load sample template
            </button>
            <button className="button button--secondary" type="button" onClick={() => navigator.clipboard.writeText(templateCsv())}>
              Copy template
            </button>
            <a className="button button--secondary" download="employee-manager-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`}>
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
                  if (!file) {
                    return;
                  }
                  file.text().then(setCsvText);
                }}
              />
            </label>
            <button className="button button--primary" type="button" onClick={preview}>
              Preview manager import
            </button>
            <button className="button button--primary" type="button" disabled={!readyCount || isCommitting} onClick={commitReadyRows}>
              {isCommitting ? "Committing..." : "Commit ready manager rows"}
            </button>
          </div>
        </div>

        {message ? <div className="notice">{message}</div> : null}

        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee</th>
                  <th>Manager</th>
                  <th>Effective Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.index}-${row.source.employee_code}-${row.source.reporting_manager_code}`}>
                    <td>{row.index}</td>
                    <td>{row.source.employee_code || "Missing employee"}</td>
                    <td>{row.source.reporting_manager_code || "Missing manager"}</td>
                    <td>{row.source.effective_date || "Not supplied"}</td>
                    <td>{row.source.reason || "Missing reason"}</td>
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
