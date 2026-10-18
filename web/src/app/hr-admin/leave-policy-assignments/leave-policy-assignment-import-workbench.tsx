"use client";

import { useMemo, useState } from "react";
import { AsyncActionButton } from "@/components/patterns/async-action-button";

import { recordImportBatchAudit, sha256Hex } from "@/lib/import-batch-audit";
import { submitImportRequest } from "@/lib/ui/import-request";
import { useLatestEmployeeCodeResolution } from "@/lib/ui/use-latest-employee-code-resolution";
import type { HrAdminLeavePolicyAssignmentWriteInput, HrAdminOptionItem, HrAdminScopedAssignment } from "@/lib/types";

type Props = {
  assignments: HrAdminScopedAssignment[];
  employees: HrAdminOptionItem[];
  leavePolicies: HrAdminOptionItem[];
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type ImportRow = {
  index: number;
  source: Record<string, string>;
  payload: HrAdminLeavePolicyAssignmentWriteInput | null;
  status: ImportStatus;
  message: string;
};

const headers = ["employee_code", "leave_policy_name", "effective_from", "effective_to", "priority", "is_active"];

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
  if (lines.length < 2) return { rows: [], error: "CSV must include a header row and at least one leave assignment row." };
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
  return !["false", "no", "n", "0", "inactive"].includes(normalize(value));
}

function buildPayload(
  row: Record<string, string>,
  employeesByCode: Map<string, HrAdminOptionItem>,
  policiesByName: Map<string, HrAdminOptionItem>,
  existingKeys: Set<string>,
  batchKeys: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const policyName = row.leave_policy_name.trim();
  const employee = employeesByCode.get(normalize(employeeCode)) ?? null;
  const policy = policiesByName.get(normalize(policyName)) ?? null;
  const priority = Number.parseInt(row.priority || "10", 10);
  const effectiveFrom = row.effective_from.trim();
  const effectiveTo = row.effective_to.trim();
  const key = `${normalize(employeeCode)}|${normalize(policyName)}`;

  if (!employeeCode) errors.push("Employee code is required.");
  if (employeeCode && !employee) errors.push("Employee code must match an existing employee.");
  if (!policyName) errors.push("Leave policy name is required.");
  if (policyName && !policy) errors.push("Leave policy name must match an active leave policy.");
  if (!Number.isFinite(priority) || priority < 1) errors.push("Priority must be a positive number.");
  if (!effectiveFrom) errors.push("Effective from is required for imported assignments.");
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) errors.push("Effective to cannot be earlier than effective from.");
  if (existingKeys.has(key) || batchKeys.has(key)) errors.push("Only one leave policy assignment per employee and policy can be committed in one import batch.");
  if (employeeCode && policyName) batchKeys.add(key);

  if (errors.length || !employee || !policy) return { payload: null, errors };

  return {
    payload: {
      leave_policy_id: policy.id,
      legal_entity_id: null,
      branch_id: null,
      department_id: null,
      grade_id: null,
      employment_type_id: null,
      employee_id: employee.id,
      priority,
      is_active: parseBoolean(row.is_active),
      effective_from: effectiveFrom || null,
      effective_to: effectiveTo || null,
    },
    errors,
  };
}

function sampleCsv(employees: HrAdminOptionItem[], leavePolicies: HrAdminOptionItem[]) {
  const policy = leavePolicies[0]?.name ?? "Casual Leave Policy";
  const rows = employees.slice(0, 2).map((employee, index) => [employee.employee_code ?? employee.name, policy, "2026-01-01", "", String(10 + index), "true"]);
  return `${headers.join(",")}\n${rows.map((row) => row.join(",")).join("\n")}`;
}

export function LeavePolicyAssignmentImportWorkbench({ assignments, employees, leavePolicies }: Props) {
  const resolveLatestEmployeesByCode = useLatestEmployeeCodeResolution();
  const [csvText, setCsvText] = useState(templateCsv());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [lookupFailed, setLookupFailed] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const policiesByName = useMemo(() => new Map(leavePolicies.map((policy) => [normalize(policy.name), policy])), [leavePolicies]);
  const existingKeys = useMemo(() => new Set(assignments.filter((assignment) => assignment.employee && assignment.policy_name).map((assignment) => `${normalize(assignment.employee ?? "")}|${normalize(assignment.policy_name)}`)), [assignments]);
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
    const employeeCodes = Array.from(new Set(parsed.rows.map((row) => normalize(row.employee_code ?? "")).filter(Boolean)));
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
    const resolvedEmployeeMap = new Map([...seededEmployeesByCode, ...resolvedEmployeesByCode]);
    const batchKeys = new Set<string>();
    const nextRows = parsed.rows.map((row, index) => {
      const result = buildPayload(row, resolvedEmployeeMap, policiesByName, existingKeys, batchKeys);
      return { index: index + 1, source: row, payload: result.payload, status: result.errors.length ? "blocked" : "ready", message: result.errors.join(" ") } satisfies ImportRow;
    });
    setRows(nextRows);
    setIsPreviewing(false);
    setMessage("Preview ready. Commit ready leave policy assignments after checking blocked rows.");
    await recordImportBatchAudit({
      import_type: "leave_policy_assignments",
      status: "previewed",
      file_name: "leave-policy-assignment-import.csv",
      source_hash: await sha256Hex(csvText),
      row_count: nextRows.length,
      ready_count: nextRows.filter((row) => row.status === "ready").length,
      blocked_count: nextRows.filter((row) => row.status === "blocked").length,
      rollback_supported: false,
      evidence_snapshot: { headers, ui: "leave-policy-assignment-import-workbench" },
      row_errors: nextRows.filter((row) => row.status === "blocked").map((row) => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
    });
  }

  async function commitReadyRows() {
    if (isCommitting) return;
    setIsCommitting(true);
    const nextRows = [...rows];
    const readyIndexes = nextRows.map((row, index) => ({ row, index })).filter(({ row }) => row.status === "ready" && row.payload).map(({ index }) => index);
    const response = await submitImportRequest("/api/hr-admin/leave-policy-assignments/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: readyIndexes.map((index) => nextRows[index].payload) }),
    });
    const payload = response.payload;
    if (response.ok || response.status === 207) {
      const failedRows = new Map<number, string>((payload.errors ?? []).map((item: { row: number; message: unknown }) => [item.row, JSON.stringify(item.message)]));
      readyIndexes.forEach((rowIndex, resultIndex) => {
        const failure = failedRows.get(resultIndex + 1);
        nextRows[rowIndex] = { ...nextRows[rowIndex], status: failure ? "failed" : "created", message: failure || "Leave policy assignment created." };
      });
    } else {
      readyIndexes.forEach((rowIndex) => {
        nextRows[rowIndex] = { ...nextRows[rowIndex], status: "failed", message: payload.detail || Object.values(payload).flat().join(" ") || "Create failed." };
      });
    }
    setRows([...nextRows]);
    setIsCommitting(false);
    setMessage(nextRows.some((row) => row.status === "failed")
      ? "Some assignment rows failed. Review the row messages, then preview the preserved CSV again."
      : "Commit complete. Import leave requests to verify policy coverage.");
    await recordImportBatchAudit({
      import_type: "leave_policy_assignments",
      status: nextRows.some((row) => row.status === "failed") ? "partial" : "committed",
      file_name: "leave-policy-assignment-import.csv",
      source_hash: await sha256Hex(csvText),
      row_count: nextRows.length,
      ready_count: nextRows.filter((row) => row.status === "ready").length,
      created_count: nextRows.filter((row) => row.status === "created").length,
      blocked_count: nextRows.filter((row) => row.status === "blocked").length,
      failed_count: nextRows.filter((row) => row.status === "failed").length,
      rollback_supported: false,
      evidence_snapshot: { headers, ui: "leave-policy-assignment-import-workbench" },
      row_errors: nextRows.filter((row) => row.status === "blocked" || row.status === "failed").map((row) => ({ row: row.index, employee_code: row.source.employee_code, message: row.message })),
    });
  }

  return (
    <section className="section" data-testid="leave-policy-assignment-import-workbench">
      <article className="panel-card-soft organization-import-workbench">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave policy assignment import</h2>
            <p className="section-copy section-copy-soft">Assign leave policies to employees by employee code before importing leave requests.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{readyCount}</strong> ready</span>
            <span className="queue-summary-chip"><strong>{createdCount}</strong> created</span>
          </div>
        </div>
        <div className="organization-import-grid">
          <label className="form-field">
            <span className="text-label-premium">Leave policy assignment CSV data</span>
            <textarea className="input-control organization-import-textarea" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setCsvText(sampleCsv(employees, leavePolicies))}>Load sample template</button>
            <a className="button button--secondary" download="leave-policy-assignment-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`}>Download template</a>
            <label className="button button--secondary"><span>Upload CSV</span><input className="sr-only" type="file" accept=".csv,text/csv" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then(setCsvText);
            }} /></label>
            <AsyncActionButton className="button button--primary" type="button" pending={isPreviewing} pendingLabel="Resolving employee codes" onClick={preview}>Preview assignment import</AsyncActionButton>
            <AsyncActionButton className="button button--primary" type="button" disabled={!readyCount || isPreviewing} pending={isCommitting} pendingLabel="Committing assignment rows" onClick={commitReadyRows}>Commit ready assignment rows</AsyncActionButton>
          </div>
        </div>
        {message ? <div className={`notice${hasFailedRows || lookupFailed ? " notice--error" : " notice--success"}`} role={hasFailedRows || lookupFailed ? "alert" : "status"}><strong>{hasFailedRows || lookupFailed ? "Assignment import needs attention." : "Assignment import update completed."}</strong><span>{message}</span></div> : null}
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Row</th><th>Employee</th><th>Policy</th><th>Priority</th><th>Status</th><th>Message</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={`${row.index}-${row.source.employee_code}-${row.source.leave_policy_name}`}>
                  <td>{row.index}</td><td>{row.source.employee_code || "Missing employee"}</td><td>{row.source.leave_policy_name || "Missing policy"}</td><td>{row.source.priority || "10"}</td><td><span className="readiness-badge">{row.status}</span></td><td>{row.message || "Valid for import"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
