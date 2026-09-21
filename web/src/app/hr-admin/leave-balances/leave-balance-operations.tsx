"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  HrAdminLeaveBalance,
  HrAdminLeaveBalanceActionInput,
  HrAdminLeaveBalanceActionResult,
  HrAdminLeaveBalanceTransaction,
  HrAdminPolicyOptions,
} from "@/lib/types";

type Props = {
  initialBalances: HrAdminLeaveBalance[];
  initialTransactions: HrAdminLeaveBalanceTransaction[];
  options: HrAdminPolicyOptions;
  canManageBalances?: boolean;
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type LeaveBalanceImportRow = {
  index: number;
  source: Record<string, string>;
  payload: HrAdminLeaveBalanceActionInput | null;
  status: ImportStatus;
  message: string;
};

const leaveBalanceImportHeaders = [
  "employee_code",
  "leave_policy_name",
  "action",
  "units",
  "effective_date",
  "reason",
];

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to complete leave balance action.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to complete leave balance action.");
}

function selectOptions(items: Array<{ id: string; name: string }>, emptyLabel = "Select an option") {
  return [
    <option key="blank" value="">
      {emptyLabel}
    </option>,
    ...items.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    )),
  ];
}

function leaveBalanceTemplateCsv() {
  return `${leaveBalanceImportHeaders.join(",")}\n`;
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
    return { rows: [], error: "CSV must include a header row and at least one leave balance action row." };
  }

  const parsedHeaders = splitCsvLine(lines[0]).map((header) => header.trim());
  const missingHeaders = leaveBalanceImportHeaders.filter((header) => !parsedHeaders.includes(header));
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

function normalizeDecimal(value: string) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed)) return "";
  return parsed.toFixed(2);
}

function csvCell(value: string) {
  return value.includes(",") ? `"${value.replaceAll("\"", "\"\"")}"` : value;
}

function leaveBalanceSampleCsv(balances: HrAdminLeaveBalance[], suffix: string) {
  const first = balances[0];
  const second = balances[1] ?? balances[0];
  if (!first) {
    return leaveBalanceTemplateCsv();
  }

  const rows = [
    [first.employee_code, first.leave_policy_name, "credit_adjustment", "1.00", "2026-04-01", `Opening balance correction ${suffix}`],
    [second.employee_code, second.leave_policy_name, "debit_adjustment", "0.50", "2026-04-02", `Manual debit correction ${suffix}`],
  ];

  return `${leaveBalanceImportHeaders.join(",")}\n${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`;
}

function readCsvUpload(file: File) {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read CSV file."));
    reader.readAsText(file);
  });
}

const defaultActionValue: HrAdminLeaveBalanceActionInput = {
  employee_id: null,
  leave_policy_id: null,
  action: "credit_adjustment",
  units: "0.00",
  effective_date: null,
  reason: "",
};

function LeaveBalanceImportWorkbench({
  balances,
  onResult,
  canManageBalances,
}: {
  balances: HrAdminLeaveBalance[];
  onResult: (result: HrAdminLeaveBalanceActionResult) => void;
  canManageBalances: boolean;
}) {
  const [csvText, setCsvText] = useState(leaveBalanceTemplateCsv());
  const [rows, setRows] = useState<LeaveBalanceImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [isCommitting, setIsCommitting] = useState(false);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const createdCount = rows.filter((row) => row.status === "created").length;
  const employeesByCode = useMemo(() => new Map(balances.map((item) => [item.employee_code.toLowerCase(), item])), [balances]);
  const policiesByName = useMemo(() => new Map(balances.map((item) => [item.leave_policy_name.toLowerCase(), item])), [balances]);

  function preview() {
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      setRows([]);
      setMessage(parsed.error);
      return;
    }

    const batchKeys = new Set<string>();
    const nextRows = parsed.rows.map((row, index) => {
      const errors: string[] = [];
      const employeeCode = row.employee_code.trim();
      const policyName = row.leave_policy_name.trim();
      const employee = employeesByCode.get(employeeCode.toLowerCase()) ?? null;
      const policy = policiesByName.get(policyName.toLowerCase()) ?? null;
      const action = row.action.trim() as HrAdminLeaveBalanceActionInput["action"];
      const units = normalizeDecimal(row.units);
      const batchKey = `${employeeCode.toLowerCase()}::${policyName.toLowerCase()}::${row.effective_date.trim()}::${action}`;

      if (!employeeCode) errors.push("Employee code is required.");
      if (employeeCode && !employee) errors.push("Employee code must match an employee with an existing leave balance.");
      if (!policyName) errors.push("Leave policy name is required.");
      if (policyName && !policy) errors.push("Leave policy name must match an existing leave balance policy.");
      if (!["credit_adjustment", "debit_adjustment", "encashment"].includes(action)) errors.push("Action must be credit_adjustment, debit_adjustment, or encashment.");
      if (!units || Number(units) <= 0) errors.push("Units must be greater than zero.");
      if (!row.effective_date.trim()) errors.push("Effective date is required.");
      if (row.effective_date.trim() && Number.isNaN(Date.parse(row.effective_date.trim()))) errors.push("Effective date must be a valid date.");
      if (!row.reason.trim()) errors.push("Reason is required for leave balance import.");
      if (employeeCode && policyName && batchKeys.has(batchKey)) errors.push("Only one leave balance action per employee, policy, date, and action can be committed in one import batch.");
      batchKeys.add(batchKey);

      const payload: HrAdminLeaveBalanceActionInput | null =
        errors.length || !employee || !policy
          ? null
          : {
              employee_id: employee.employee_id,
              leave_policy_id: policy.leave_policy_id,
              action,
              units,
              effective_date: row.effective_date.trim(),
              reason: row.reason.trim(),
            };

      return {
        index: index + 1,
        source: row,
        payload,
        status: errors.length ? "blocked" : "ready",
        message: errors.join(" "),
      } satisfies LeaveBalanceImportRow;
    });

    setRows(nextRows);
    setMessage("Preview ready. Commit ready leave balance actions after checking blocked rows.");
  }

  async function commitReadyRows() {
    if (!canManageBalances) {
      setMessage("You need leave balance management permission to commit imports.");
      return;
    }
    setIsCommitting(true);
    const nextRows = [...rows];

    for (let index = 0; index < nextRows.length; index += 1) {
      const row = nextRows[index];
      if (row.status !== "ready" || !row.payload) continue;
      const response = await fetch("/api/hr-admin/leave-balances/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row.payload),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        onResult(payload as HrAdminLeaveBalanceActionResult);
      }
      nextRows[index] = {
        ...row,
        status: response.ok ? "created" : "failed",
        message: response.ok ? "Leave balance action recorded." : getErrorMessage(payload),
      };
      setRows([...nextRows]);
    }

    setIsCommitting(false);
    setMessage("Commit complete. Created rows are saved as leave balance transactions.");
  }

  return (
    <section className="section" data-testid="leave-balance-import-workbench">
      <article className="panel-card-soft organization-import-workbench">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Leave balance import</h2>
            <p className="section-copy section-copy-soft">Load opening corrections, carry-forward adjustments, encashments, and debit/credit actions by employee code.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip"><strong>{readyCount}</strong> ready</span>
            <span className="queue-summary-chip"><strong>{createdCount}</strong> created</span>
          </div>
        </div>
        <div className="organization-import-grid">
          <label className="form-field">
            <span className="text-label-premium">Leave balance CSV data</span>
            <textarea className="input-control organization-import-textarea" value={csvText} onChange={(event) => setCsvText(event.target.value)} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" type="button" onClick={() => setCsvText(leaveBalanceSampleCsv(balances, String(Date.now()).slice(-5)))}>
              Load sample template
            </button>
            <button className="button button--secondary" type="button" onClick={() => navigator.clipboard.writeText(leaveBalanceTemplateCsv())}>
              Copy template
            </button>
            <a className="button button--secondary" download="leave-balance-import-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(leaveBalanceTemplateCsv())}`}>
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
                  readCsvUpload(file)
                    .then((text) => {
                      setCsvText(text);
                      setMessage("");
                      setRows([]);
                      event.target.value = "";
                    })
                    .catch(() => setMessage("CSV upload could not be read. Paste the rows into the import box and preview again."));
                }}
              />
            </label>
            <button className="button button--primary" type="button" onClick={preview}>
              Preview leave import
            </button>
            <button className="button button--primary" type="button" disabled={!readyCount || isCommitting || !canManageBalances} onClick={commitReadyRows}>
              {isCommitting ? "Committing..." : "Commit ready leave rows"}
            </button>
          </div>
        </div>
        {!canManageBalances ? (
          <div className="notice"><strong>Read-only leave balance view.</strong><span className="muted">Imports can be previewed, but committing changes requires leave balance management permission.</span></div>
        ) : null}
        {message ? <div className="notice">{message}</div> : null}
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Employee</th>
                  <th>Policy</th>
                  <th>Action</th>
                  <th>Units</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={`${row.index}-${row.source.employee_code}-${row.source.leave_policy_name}`}>
                    <td>{row.index}</td>
                    <td>{row.source.employee_code || "Missing code"}</td>
                    <td>{row.source.leave_policy_name || "Missing policy"}</td>
                    <td>{row.source.action || "Missing action"}</td>
                    <td>{row.source.units || "0.00"}</td>
                    <td>{row.source.effective_date || "Missing date"}</td>
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

export function LeaveBalanceOperations({ initialBalances, initialTransactions, options, canManageBalances = true }: Props) {
  const router = useRouter();
  const [balances, setBalances] = useState(initialBalances);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [query, setQuery] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [policyFilter, setPolicyFilter] = useState("");
  const [transactionStatusFilter, setTransactionStatusFilter] = useState("");
  const [formValue, setFormValue] = useState<HrAdminLeaveBalanceActionInput>(defaultActionValue);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewReasonById, setReviewReasonById] = useState<Record<string, string>>({});
  const [reviewingTransactionId, setReviewingTransactionId] = useState<string | null>(null);

  const filteredBalances = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return balances.filter((item) => {
      if (employeeFilter && item.employee_id !== employeeFilter) return false;
      if (policyFilter && item.leave_policy_id !== policyFilter) return false;
      if (!normalizedQuery) return true;
      return [
        item.employee_name,
        item.employee_code,
        item.leave_policy_name,
        item.leave_type_name,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [balances, employeeFilter, policyFilter, query]);

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return transactions.filter((item) => {
      if (employeeFilter && item.employee_id !== employeeFilter) return false;
      if (policyFilter && item.leave_policy_id !== policyFilter) return false;
      if (transactionStatusFilter && item.status !== transactionStatusFilter) return false;
      if (!normalizedQuery) return true;
      return [
        item.employee_name,
        item.employee_code,
        item.leave_policy_name,
        item.reason,
        item.action,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [employeeFilter, policyFilter, query, transactionStatusFilter, transactions]);

  function update<Key extends keyof HrAdminLeaveBalanceActionInput>(key: Key, value: HrAdminLeaveBalanceActionInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!canManageBalances) {
      setError("You need leave balance management permission to apply balance actions.");
      return;
    }
    setIsSubmitting(true);
    const response = await fetch("/api/hr-admin/leave-balances/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValue),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    const result = payload as HrAdminLeaveBalanceActionResult;
    const updatedBalance = result.balance;
    setBalances((current) => {
      const existingIndex = current.findIndex((item) => item.id === updatedBalance.id);
      if (existingIndex >= 0) {
        return current.map((item) => (item.id === updatedBalance.id ? updatedBalance : item));
      }
      return [updatedBalance, ...current];
    });
    setTransactions((current) => [result.transaction, ...current]);
    setFormValue(defaultActionValue);
    setSuccessMessage(result.message);
    setIsSubmitting(false);
    router.refresh();
  }

  function applyActionResult(result: HrAdminLeaveBalanceActionResult) {
    const updatedBalance = result.balance;
    setBalances((current) => {
      const existingIndex = current.findIndex((item) => item.id === updatedBalance.id);
      if (existingIndex >= 0) {
        return current.map((item) => (item.id === updatedBalance.id ? updatedBalance : item));
      }
      return [updatedBalance, ...current];
    });
    setTransactions((current) => [result.transaction, ...current.filter((item) => item.id !== result.transaction.id)]);
  }

  async function handleReview(transactionId: string, decision: "approve" | "reject") {
    setError("");
    setSuccessMessage("");
    if (!canManageBalances) {
      setError("You need leave balance management permission to review balance transactions.");
      return;
    }
    setReviewingTransactionId(transactionId);
    const response = await fetch(`/api/hr-admin/leave-balances/transactions/${transactionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        rejection_reason: reviewReasonById[transactionId] ?? "",
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setReviewingTransactionId(null);
      return;
    }
    const result = payload as HrAdminLeaveBalanceActionResult;
    setBalances((current) => current.map((item) => (item.id === result.balance.id ? result.balance : item)));
    setTransactions((current) => current.map((item) => (item.id === result.transaction.id ? result.transaction : item)));
    setReviewReasonById((current) => ({ ...current, [transactionId]: "" }));
    setSuccessMessage(result.message);
    setReviewingTransactionId(null);
    router.refresh();
  }

  return (
    <>
      <LeaveBalanceImportWorkbench balances={balances} canManageBalances={canManageBalances} onResult={applyActionResult} />

      <section className="section">
        <div className="workspace-card workspace-card--compact">
          <div className="workspace-card__header">
            <div>
              <h2 className="section-heading-soft">Balance operations</h2>
              <p className="section-copy section-copy-soft">Credit, debit, or encash balances with policy-aware validation.</p>
            </div>
          </div>
          <form className="queue-toolbar panel-card-soft" onSubmit={handleSubmit}>
            <div className="queue-toolbar__grid two-column-grid">
              <label className="queue-toolbar__search">
                <span className="muted">Employee</span>
                <select className="input-control" value={formValue.employee_id ?? ""} onChange={(event) => update("employee_id", event.target.value || null)}>
                  {selectOptions(options.employees)}
                </select>
              </label>
              <label className="queue-toolbar__search">
                <span className="muted">Leave policy</span>
                <select className="input-control" value={formValue.leave_policy_id ?? ""} onChange={(event) => update("leave_policy_id", event.target.value || null)}>
                  {selectOptions(options.leave_policies)}
                </select>
              </label>
              <label className="queue-toolbar__search">
                <span className="muted">Action</span>
                <select className="input-control" value={formValue.action} onChange={(event) => update("action", event.target.value as HrAdminLeaveBalanceActionInput["action"])}>
                  <option value="credit_adjustment">Credit adjustment</option>
                  <option value="debit_adjustment">Debit adjustment</option>
                  <option value="encashment">Encashment</option>
                </select>
              </label>
              <label className="queue-toolbar__search">
                <span className="muted">Units</span>
                <input className="input-control" value={formValue.units} onChange={(event) => update("units", event.target.value)} />
              </label>
              <label className="queue-toolbar__search">
                <span className="muted">Effective date</span>
                <input className="input-control" type="date" value={formValue.effective_date ?? ""} onChange={(event) => update("effective_date", event.target.value || null)} />
              </label>
              <label className="queue-toolbar__search">
                <span className="muted">Reason</span>
                <input className="input-control" value={formValue.reason} onChange={(event) => update("reason", event.target.value)} />
              </label>
            </div>
            {error ? (
              <div className="notice">
                <strong>Action failed.</strong>
                <span className="muted">{error}</span>
              </div>
            ) : null}
            {successMessage ? (
              <div className="notice">
                <strong>Update recorded.</strong>
                <span className="muted">{successMessage}</span>
              </div>
            ) : null}
            <div className="queue-toolbar__actions">
              <button className="button button--primary" disabled={isSubmitting || !canManageBalances} type="submit">
                {isSubmitting ? "Applying..." : "Apply balance action"}
              </button>
            </div>
            {!canManageBalances ? (
              <div className="notice"><strong>Read-only leave balance view.</strong><span className="muted">Balance actions and reviews require leave balance management permission.</span></div>
            ) : null}
          </form>
        </div>
      </section>

      <section className="section">
        <div className="queue-toolbar panel-card-soft">
          <div className="queue-toolbar__grid">
            <label className="queue-toolbar__search">
              <span className="muted">Search</span>
              <input className="input-control" placeholder="Employee, code, policy, leave type" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <label className="queue-toolbar__search">
              <span className="muted">Employee filter</span>
              <select className="input-control" value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}>
                {selectOptions(options.employees, "All employees")}
              </select>
            </label>
            <label className="queue-toolbar__search">
              <span className="muted">Policy filter</span>
              <select className="input-control" value={policyFilter} onChange={(event) => setPolicyFilter(event.target.value)}>
                {selectOptions(options.leave_policies, "All leave policies")}
              </select>
            </label>
            <label className="queue-toolbar__search">
              <span className="muted">Transaction status</span>
              <select className="input-control" value={transactionStatusFilter} onChange={(event) => setTransactionStatusFilter(event.target.value)}>
                <option value="">All statuses</option>
                <option value="pending">Pending review</option>
                <option value="applied">Applied</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          {filteredBalances.map((item) => (
            <article className="record-card panel-card-soft" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.employee_name}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip">{item.employee_code}</span>
                    <span className="record-chip">{item.leave_type_name}</span>
                    <span className="record-chip">FY {item.period_year}</span>
                  </div>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Policy</span>
                  <span className="detail-value">{item.leave_policy_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Closing balance</span>
                  <span className="detail-value">{item.closing_balance}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Accrued</span>
                  <span className="detail-value">{item.accrued_amount}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Carry forward</span>
                  <span className="detail-value">{item.carry_forward_amount}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Consumed</span>
                  <span className="detail-value">{item.consumed_amount}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reserved</span>
                  <span className="detail-value">{item.reserved_amount}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Encashed</span>
                  <span className="detail-value">{item.encashed_amount}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Adjustment</span>
                  <span className="detail-value">{item.adjustment_amount}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-list">
          {filteredTransactions.map((item) => (
            <article className="record-card panel-card-soft" key={item.id}>
              <div className="record-card__header">
                <div className="record-card__title-wrap">
                  <div className="record-card__title">
                    <h2>{item.employee_name}</h2>
                  </div>
                  <div className="record-card__eyebrow">
                    <span className="record-chip">{item.status}</span>
                    <span className="record-chip">{item.action.replaceAll("_", " ")}</span>
                    <span className="record-chip">{item.units} units</span>
                    <span className="record-chip">{item.effective_date}</span>
                  </div>
                </div>
              </div>
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Policy</span>
                  <span className="detail-value">{item.leave_policy_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Before</span>
                  <span className="detail-value">{item.closing_balance_before}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">After</span>
                  <span className="detail-value">{item.closing_balance_after}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Performed by</span>
                  <span className="detail-value">{item.performed_by_name || "System"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reviewer</span>
                  <span className="detail-value">{item.reviewed_by_name || item.reviewer_employee_name || "Not assigned"}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Projected impact</span>
                  <span className="detail-value">
                    {item.closing_balance_before} to {item.closing_balance_after}
                  </span>
                </div>
                <div className="detail-row detail-row--full">
                  <span className="detail-label">Reason</span>
                  <span className="detail-value">{item.reason || "No reason captured."}</span>
                </div>
                {item.approval_reason ? (
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Approval rule</span>
                    <span className="detail-value">{item.approval_reason}</span>
                  </div>
                ) : null}
                {item.rejection_reason ? (
                  <div className="detail-row detail-row--full">
                    <span className="detail-label">Rejection reason</span>
                    <span className="detail-value">{item.rejection_reason}</span>
                  </div>
                ) : null}
              </div>
              {item.status === "pending" ? (
                <div className="queue-toolbar__actions">
                  {canManageBalances && item.can_current_actor_review ? (
                    <>
                      <input
                        className="input-control"
                        placeholder="Reason if rejecting"
                        value={reviewReasonById[item.id] ?? ""}
                        onChange={(event) =>
                          setReviewReasonById((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                      />
                      <button
                        className="button button--secondary"
                        disabled={reviewingTransactionId === item.id}
                        onClick={() => handleReview(item.id, "reject")}
                        type="button"
                      >
                        {reviewingTransactionId === item.id ? "Saving..." : "Reject"}
                      </button>
                      <button
                        className="button button--primary"
                        disabled={reviewingTransactionId === item.id}
                        onClick={() => handleReview(item.id, "approve")}
                        type="button"
                      >
                        {reviewingTransactionId === item.id ? "Saving..." : "Approve"}
                      </button>
                    </>
                  ) : (
                    <span className="muted">Pending review. A different authorized reviewer must approve this action before balances change.</span>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
