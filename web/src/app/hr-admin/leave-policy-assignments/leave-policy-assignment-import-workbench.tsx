"use client";

import { apiErrorMessage, mutationErrorMessage } from "@/lib/ui/api-error-message";

import { unambiguousNameIndex } from "@/lib/ui/unambiguous-name-index";
import { useEffect, useMemo, useRef, useState } from "react";
import { existingLeaveAssignmentPairs, previewLeaveAssignmentRows } from "@/lib/ui/leave-import-lookup";
import { validLeaveDate } from "@/lib/ui/leave-history-filters";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { AsyncActionButton } from "@/components/patterns/async-action-button";

import { recordImportBatchAudit, sha256Hex, type ImportBatchAuditInput } from "@/lib/import-batch-audit";
import { submitImportRequest } from "@/lib/ui/import-request";
import { useLatestEmployeeCodeResolution } from "@/lib/ui/use-latest-employee-code-resolution";
import type { HrAdminLeavePolicyAssignmentWriteInput, HrAdminOptionItem, HrAdminScopedAssignment } from "@/lib/types";

type Props = {
  assignments: HrAdminScopedAssignment[];
  onCommitted: () => Promise<void>;
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
  policiesByName: ReturnType<typeof unambiguousNameIndex<HrAdminOptionItem>>,
  batchKeys: Set<string>,
) {
  const errors: string[] = [];
  const employeeCode = row.employee_code.trim();
  const policyName = row.leave_policy_name.trim();
  const employee = employeesByCode.get(normalize(employeeCode)) ?? null;
  const policy = policiesByName.resolve(policyName) ?? null;
  const priority = Number(row.priority.trim() || "10");
  const effectiveFrom = row.effective_from.trim();
  const effectiveTo = row.effective_to.trim();
  const key = `${normalize(employeeCode)}|${normalize(policyName)}`;

  if (!employeeCode) errors.push("Employee code is required.");
  if (employeeCode && !employee) errors.push("Employee code must match an existing employee.");
  if (policiesByName.isAmbiguous(policyName)) errors.push("Policy name is ambiguous. Use a unique policy name before importing; no policy was selected.");
  if (!policyName) errors.push("Leave policy name is required.");
  if (policyName && !policy) errors.push("Leave policy name must match an active leave policy.");
  if (!Number.isSafeInteger(priority) || priority < 1 || priority > 2147483647) errors.push("Priority must be a positive whole number no greater than 2147483647.");
  if (!["", "true", "yes", "y", "1", "active", "false", "no", "n", "0", "inactive"].includes(normalize(row.is_active))) errors.push("Active must be true or false. Correct the CSV value before importing.");
  if (!effectiveFrom) errors.push("Effective from is required for imported assignments.");
  if (effectiveFrom && !validLeaveDate(effectiveFrom)) errors.push("Effective from must be a valid date in YYYY-MM-DD format.");
  if (effectiveTo && !validLeaveDate(effectiveTo)) errors.push("Effective to must be a valid date in YYYY-MM-DD format.");
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) errors.push("Effective to cannot be earlier than effective from.");
  if (batchKeys.has(key)) errors.push("Only one row per employee and policy can be committed in one import batch. Split additional dated assignments into another batch.");
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

export function LeavePolicyAssignmentImportWorkbench({ employees, leavePolicies, onCommitted }: Props) {
  const previewController = useRef<AbortController | null>(null);
  useEffect(() => () => previewController.current?.abort(), []);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const resolveLatestEmployeesByCode = useLatestEmployeeCodeResolution();
  const [csvText, setCsvText] = useState(templateCsv());
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [auditError, setAuditError] = useState("");
  const [lookupFailed, setLookupFailed] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const policiesByName = useMemo(() => unambiguousNameIndex(leavePolicies), [leavePolicies]);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const createdCount = rows.filter((row) => row.status === "created").length;
  const hasFailedRows = rows.some((row) => row.status === "failed" || row.status === "blocked");

  async function recordAudit(input: ImportBatchAuditInput) {
    setAuditError("");
    try {
      const audit = await recordImportBatchAudit(input);
      if (!audit) throw new Error("Audit confirmation unavailable");
    } catch {
      setAuditError("Import results are shown below, but the import-batch audit could not be confirmed. Check the catalog before retrying any saved row and ask HR to review the audit record.");
    }
  }

  async function preview() {
    setAuditError("");
    setParseFailed(false);
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      setParseFailed(true);
      setRows([]);
      setMessage(parsed.error);
      return;
    }
    setIsPreviewing(true);
    setRows([]);
    setLookupFailed(false);
    setMessage("Resolving employee codes for preview...");
    const employeeCodes = Array.from(new Set(parsed.rows.map((row) => normalize(row.employee_code ?? "")).filter(Boolean)));
    let resolvedEmployeesByCode: Map<string, HrAdminOptionItem> | null;
    let existingKeys: Set<string>;
    try {
      resolvedEmployeesByCode = await resolveLatestEmployeesByCode(employeeCodes);
      if (!resolvedEmployeesByCode) { setIsPreviewing(false); return; }
      previewController.current?.abort();
      const controller = new AbortController();
      previewController.current = controller;
      existingKeys = await existingLeaveAssignmentPairs(parsed.rows.flatMap(row => {
        const employee = resolvedEmployeesByCode?.get(normalize(row.employee_code ?? ""));
        const policy = policiesByName.resolve(row.leave_policy_name ?? "");
        return employee && policy ? [{ employeeId: employee.id, policyId: policy.id }] : [];
      }), controller.signal);
    } catch (error) {
      setIsPreviewing(false);
      setLookupFailed(true);
      setMessage(error instanceof Error ? error.message : "Employee lookup failed. Check your connection and preview the CSV again.");
      return;
    }
    if (!resolvedEmployeesByCode) {
      setIsPreviewing(false);
      return;
    }
    const resolvedEmployeeMap = resolvedEmployeesByCode;
    const batchKeys = new Set<string>();
    const nextRows = parsed.rows.map((row, index) => {
      const result = buildPayload(row, resolvedEmployeeMap, policiesByName, batchKeys);
      return { index: index + 1, source: row, payload: result.payload, status: result.errors.length ? "blocked" : "ready", message: result.errors.join(" ") } satisfies ImportRow;
    });
    try {
      const candidates = nextRows.filter(row => row.payload);
      const checks = await previewLeaveAssignmentRows(candidates.map(row => row.payload!), previewController.current!.signal);
      candidates.forEach((row, index) => {
        const result = checks[index];
        const exists = existingKeys.has(`${row.payload?.employee_id}|${row.payload?.leave_policy_id}`);
        if (result.blocked) { row.status = "blocked"; row.payload = null; }
        row.message = `${exists ? "Existing employee/policy assignment found. " : ""}${result.message}`;
      });
    } catch (error) {
      setIsPreviewing(false); setLookupFailed(true);
      setMessage(error instanceof Error ? error.message : "Assignment conflicts could not be checked. Preview again before committing.");
      return;
    }
    setRows(nextRows);
    setIsPreviewing(false);
    setMessage("Preview ready. Commit ready leave policy assignments after checking blocked rows.");
    await recordAudit({
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
    if (isCommitting || isRefreshing) return;
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
      const failedRows = new Map<number, string>((payload.errors ?? []).map((item: { row: number; message: unknown }) => [item.row, apiErrorMessage(item.message, typeof item.message === "string" ? item.message : "This row was rejected. Review its values.")]));
      readyIndexes.forEach((rowIndex, resultIndex) => {
        const failure = failedRows.get(resultIndex + 1);
        nextRows[rowIndex] = { ...nextRows[rowIndex], status: failure ? "failed" : "created", message: failure || "Leave policy assignment created." };
      });
    } else {
      readyIndexes.forEach((rowIndex) => {
        nextRows[rowIndex] = { ...nextRows[rowIndex], status: "failed", message: mutationErrorMessage(payload, response.status, "This row could not be created. Review its values.") };
      });
    }
    setRows([...nextRows]);
    setIsCommitting(false);
    const saved = nextRows.filter(row => row.status === "created").length;
    const failed = nextRows.filter(row => row.status === "failed").length;
    const blocked = nextRows.filter(row => row.status === "blocked").length;
    setMessage(`Import processed: ${saved} saved, ${failed} failed or unconfirmed, ${blocked} blocked. Review row messages and the catalog before retrying any row.`);
    await recordAudit({
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
    if (nextRows.some(row => row.status === "created")) {
      setIsRefreshing(true);
      try { await onCommitted(); } finally { setIsRefreshing(false); }
    }
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
            <textarea className="input-control organization-import-textarea" disabled={isPreviewing || isCommitting || isRefreshing} value={csvText} onChange={(event) => { setCsvText(event.target.value); setRows([]); setMessage(""); setAuditError(""); setLookupFailed(false); setParseFailed(false); }} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" disabled={isPreviewing || isCommitting || isRefreshing} onClick={() => { setCsvText(sampleCsv(employees, leavePolicies)); setRows([]); setMessage(""); }}>Load sample template</button>
            <a className="button button--secondary" download="leave-policy-assignment-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(templateCsv())}`}>Download template</a>
            <label className="button button--secondary"><span>Upload CSV</span><input className="sr-only" type="file" disabled={isPreviewing || isCommitting || isRefreshing} accept=".csv,text/csv" onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then(text => { setCsvText(text); setRows([]); setMessage(""); }).catch(() => { setParseFailed(true); setMessage("CSV upload could not be read. Paste the rows into the import box and preview again."); });
            }} /></label>
            <AsyncActionButton className="button button--primary" type="button" pending={isPreviewing} disabled={isCommitting || isRefreshing} pendingLabel="Resolving employee codes" onClick={preview}>Preview assignment import</AsyncActionButton>
            <AsyncActionButton className="button button--primary" type="button" disabled={!readyCount || isPreviewing} pending={isCommitting || isRefreshing} pendingLabel={isRefreshing ? "Refreshing assignment catalog" : "Committing assignment rows"} onClick={commitReadyRows}>Commit ready assignment rows</AsyncActionButton>
          </div>
        </div>
        {message ? <div className={`notice${hasFailedRows || lookupFailed || parseFailed ? " notice--error" : " notice--success"}`} role={hasFailedRows || lookupFailed || parseFailed ? "alert" : "status"}><strong>{hasFailedRows || lookupFailed || parseFailed ? "Assignment import needs attention." : "Assignment import status."}</strong><span>{message}</span></div> : null}
        {auditError ? <div className="notice notice--warning" role="alert">{auditError}</div> : null}
        {rows.length ? (
          <WorkspaceTableScrollRegion className="employee-directory-table-wrap" label="Leave assignment import table scroll">
            <table aria-label="Leave assignment import results" className="workspace-data-table accerio-data-table workspace-table">
              <thead><tr><th scope="col">Row</th><th scope="col">Employee</th><th scope="col">Policy</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Message</th></tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={`${row.index}-${row.source.employee_code}-${row.source.leave_policy_name}`}>
                  <td>{row.index}</td><td>{row.source.employee_code || "Missing employee"}</td><td>{row.source.leave_policy_name || "Missing policy"}</td><td>{row.source.priority || "10"}</td><td><WorkspaceStatusBadge tone={row.status === "created" ? "success" : row.status === "ready" ? "info" : row.status === "blocked" ? "warning" : "danger"}>{row.status}</WorkspaceStatusBadge></td><td>{row.message || "Valid for import"}</td>
                </tr>
              ))}</tbody>
            </table>
          </WorkspaceTableScrollRegion>
        ) : null}
      </article>
    </section>
  );
}
