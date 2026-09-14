"use client";

import { useMemo, useState } from "react";

import type { HrAdminEmployeeBankAccountWriteInput, HrAdminEmployeeListItem } from "@/lib/types";

type EmployeeBankImportWorkbenchProps = {
  employees: HrAdminEmployeeListItem[];
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type ImportRow = {
  index: number;
  source: Record<string, string>;
  employeeId: string | null;
  payload: HrAdminEmployeeBankAccountWriteInput | null;
  status: ImportStatus;
  message: string;
};

const headers = [
  "employee_code",
  "account_holder_name",
  "bank_name",
  "account_number",
  "ifsc_code",
  "branch_name",
  "is_primary",
];

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
    return { rows: [], error: "CSV must include a header row and at least one bank account row." };
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
  return ["true", "yes", "y", "1", "primary"].includes(normalized);
}

function normalizeIfsc(value: string) {
  return value.trim().toUpperCase();
}

function validateIfsc(value: string) {
  return !value || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);
}

function buildPayload(
  row: Record<string, string>,
  employeesByCode: Map<string, HrAdminEmployeeListItem>,
  batchPrimaryEmployees: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const employee = employeesByCode.get(employeeCode.toLowerCase()) ?? null;
  const isPrimary = parseBoolean(row.is_primary || "true");
  const ifscCode = normalizeIfsc(row.ifsc_code);

  if (!employeeCode) {
    errors.push("Employee code is required.");
  }
  if (employeeCode && !employee) {
    errors.push("Employee code must match an existing employee.");
  }
  if (!row.account_holder_name.trim()) {
    errors.push("Account holder name is required.");
  }
  if (!row.bank_name.trim()) {
    errors.push("Bank name is required.");
  }
  if (!row.account_number.trim()) {
    errors.push("Account number is required.");
  }
  if (row.account_number.trim() && !/^[0-9A-Za-z-]{6,64}$/.test(row.account_number.trim())) {
    errors.push("Account number must be 6-64 letters, digits, or hyphens.");
  }
  if (!validateIfsc(ifscCode)) {
    errors.push("IFSC code must use the 11-character bank format.");
  }
  if (employeeCode && isPrimary && batchPrimaryEmployees.has(employeeCode.toLowerCase())) {
    errors.push("Only one primary account per employee can be committed in one import batch.");
  }

  if (employeeCode && isPrimary) {
    batchPrimaryEmployees.add(employeeCode.toLowerCase());
  }

  if (errors.length || !employee) {
    return { employeeId: employee?.id ?? null, payload: null, errors };
  }

  const payload: HrAdminEmployeeBankAccountWriteInput = {
    account_holder_name: row.account_holder_name.trim(),
    bank_name: row.bank_name.trim(),
    account_number: row.account_number.trim(),
    ifsc_code: ifscCode,
    branch_name: row.branch_name.trim(),
    is_primary: isPrimary,
  };

  return { employeeId: employee.id, payload, errors };
}

function sampleCsv(employees: HrAdminEmployeeListItem[], suffix: string) {
  const first = employees[0];
  const second = employees[1] ?? employees[0];
  if (!first) {
    return templateCsv();
  }

  const rows = [
    [first.employee_code, first.full_name, `Primary Bank ${suffix}`, `910000${suffix.padStart(6, "0")}`, "HDFC0001234", "Main Payroll Branch", "true"],
    [second.employee_code, second.full_name, `Secondary Bank ${suffix}`, `920000${suffix.padStart(6, "0")}`, "ICIC0001234", "Backup Payroll Branch", "false"],
  ];

  return `${headers.join(",")}\n${rows.map((row) => row.map((value) => (value.includes(",") ? `"${value}"` : value)).join(",")).join("\n")}`;
}

export function EmployeeBankImportWorkbench({ employees }: EmployeeBankImportWorkbenchProps) {
  const [csvText, setCsvText] = useState(templateCsv());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const employeesByCode = useMemo(
    () => new Map(employees.map((employee) => [employee.employee_code.toLowerCase(), employee])),
    [employees],
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

    const batchPrimaryEmployees = new Set<string>();
    const nextRows = parsed.rows.map((row, index) => {
      const result = buildPayload(row, employeesByCode, batchPrimaryEmployees);
      return {
        index: index + 1,
        source: row,
        employeeId: result.employeeId,
        payload: result.payload,
        status: result.errors.length ? "blocked" : "ready",
        message: result.errors.join(" "),
      } satisfies ImportRow;
    });

    setRows(nextRows);
    setMessage("Preview ready. Commit ready bank accounts after checking blocked rows.");
  }

  async function commitReadyRows() {
    setIsCommitting(true);
    const nextRows = [...rows];

    for (let index = 0; index < nextRows.length; index += 1) {
      const row = nextRows[index];
      if (row.status !== "ready" || !row.payload || !row.employeeId) {
        continue;
      }

      const response = await fetch(`/api/hr-admin/employees/${row.employeeId}/bank-accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row.payload),
      });
      const payload = await response.json().catch(() => ({}));
      nextRows[index] = {
        ...row,
        status: response.ok ? "created" : "failed",
        message: response.ok ? "Bank account created." : payload.detail || Object.values(payload).flat().join(" ") || "Create failed.",
      };
      setRows([...nextRows]);
    }

    setIsCommitting(false);
    setMessage("Commit complete. Open the employee bank account page or payroll readiness to verify coverage.");
  }

  return (
    <section className="section" data-testid="employee-bank-import-workbench">
      <article className="panel-card-soft organization-import-workbench">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Employee bank import</h2>
            <p className="section-copy section-copy-soft">Load payout accounts by employee code and commit ready rows through the bank account workflow.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip">
              <strong>{readyCount}</strong> ready
            </span>
            <span className="queue-summary-chip">
              <strong>{createdCount}</strong> created
            </span>
          </div>
        </div>

        <div className="organization-import-grid">
          <label className="form-field">
            <span className="text-label-premium">Bank CSV data</span>
            <textarea className="input-control organization-import-textarea" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setCsvText(sampleCsv(employees, String(Date.now()).slice(-5)))}>
              Load sample template
            </button>
            <button className="button button--secondary" type="button" onClick={() => navigator.clipboard.writeText(templateCsv())}>
              Copy template
            </button>
            <a className="button button--secondary" download="employee-bank-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`}>
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
              Preview bank import
            </button>
            <button className="button button--primary" type="button" disabled={!readyCount || isCommitting} onClick={commitReadyRows}>
              {isCommitting ? "Committing..." : "Commit ready bank rows"}
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
                  <th>Bank</th>
                  <th>Primary</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.index}-${row.source.employee_code}-${row.source.account_number}`}>
                    <td>{row.index}</td>
                    <td>{row.source.employee_code || "Missing code"}</td>
                    <td>{row.source.bank_name || "Missing bank"}</td>
                    <td>{parseBoolean(row.source.is_primary || "true") ? "Yes" : "No"}</td>
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
