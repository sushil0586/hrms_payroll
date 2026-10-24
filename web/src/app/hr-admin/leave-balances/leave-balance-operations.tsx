"use client";

import { mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";

import { unambiguousNameIndex } from "@/lib/ui/unambiguous-name-index";
import { useLatestEmployeeCodeResolution } from "@/lib/ui/use-latest-employee-code-resolution";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { EmployeeSearchSelect } from "@/components/patterns/employee-search-select";
import { PaginationBar } from "@/components/patterns/pagination-bar";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type {
  HrAdminLeaveBalance,
  HrAdminLeaveBalanceActionInput,
  HrAdminLeaveBalanceActionResult,
  HrAdminLeaveBalanceListResponse,
  HrAdminLeaveBalanceTransaction,
  HrAdminLeaveBalanceTransactionListResponse,
  HrAdminPolicyWorkbenchOptions,
} from "@/lib/types";

import { WorkspaceFilterForm } from "@/components/patterns/workspace-filter-form";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { WorkspaceFormControls } from "@/components/patterns/workspace-form-controls";

type Props = {
  balancesPage: HrAdminLeaveBalanceListResponse;
  transactionsPage: HrAdminLeaveBalanceTransactionListResponse;
  options: Pick<HrAdminPolicyWorkbenchOptions, "leave_policies">;
  canManageBalances?: boolean;
  initialFilters?: {
    selectedBalanceId?: string;
    selectedTransactionId?: string;
    balancePage?: number;
    employeeId?: string;
    pageSize?: number;
    policyId?: string;
    query?: string;
    transactionPage?: number;
    transactionStatus?: string;
  };
};

type ImportStatus = "ready" | "blocked" | "created" | "failed";

type LeaveBalanceImportRow = {
  index: number;
  source: Record<string, string>;
  payload: HrAdminLeaveBalanceActionInput | null;
  status: ImportStatus;
  message: string;
};

const BALANCE_PAGE_SIZE = 12;
const TRANSACTION_PAGE_SIZE = 8;

const leaveBalanceImportHeaders = [
  "employee_code",
  "leave_policy_name",
  "action",
  "units",
  "effective_date",
  "reason",
];

function getErrorMessage(payload: unknown, status: number) {
  return mutationErrorMessage(payload, status, 'Unable to complete the leave balance action. Review the ledger and policy guidance.');
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

function buildLeaveBalanceHref(updates: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(updates).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return `/hr-admin/leave-balances${query ? `?${query}` : ""}`;
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
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(value.trim());
  if (!match || !(match[1] || match[2])) return "";
  return `${(match[1] || "0").replace(/^0+(?=\d)/, "")}.${(match[2] ?? "").padEnd(2, "0")}`;
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
  policies,
  onResult,
  canManageBalances,
}: {
  balances: HrAdminLeaveBalance[];
  policies: Array<{id:string;name:string}>;
  onResult: (result: HrAdminLeaveBalanceActionResult) => void;
  canManageBalances: boolean;
}) {
  const [csvText, setCsvText] = useState(leaveBalanceTemplateCsv());
  const [rows, setRows] = useState<LeaveBalanceImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [parseFailed, setParseFailed] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const resolveEmployees = useLatestEmployeeCodeResolution();
  const [isCommitting, setIsCommitting] = useState(false);
  const isCommittingRef = useRef(false);
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const createdCount = rows.filter((row) => row.status === "created").length;
  const policiesByName = useMemo(() => unambiguousNameIndex(policies), [policies]);
  const hasBlockedRows = parseFailed || rows.some(row => row.status === "blocked" || row.status === "failed");

  async function preview() {
    setParseFailed(false);
    setRows([]);
    const parsed = parseCsv(csvText);
    if (parsed.error) {
      setParseFailed(true);
      setRows([]);
      setMessage(parsed.error);
      return;
    }
    setIsPreviewing(true);
    setMessage("Resolving exact employee codes for preview...");
    let employeesByCode;
    try {
      employeesByCode = await resolveEmployees(parsed.rows.map(row => row.employee_code));
    } catch (error) {
      setIsPreviewing(false);
      setParseFailed(true);
      setMessage(error instanceof Error ? error.message : "Employee lookup failed. Preview again before committing.");
      return;
    }
    setIsPreviewing(false);
    if (!employeesByCode) return;

    const batchKeys = new Set<string>();
    const nextRows = parsed.rows.map((row, index) => {
      const errors: string[] = [];
      const employeeCode = row.employee_code.trim();
      const policyName = row.leave_policy_name.trim();
      const employee = employeesByCode.get(employeeCode.toLowerCase()) ?? null;
      const policy = policiesByName.resolve(policyName) ?? null;
      const action = row.action.trim() as HrAdminLeaveBalanceActionInput["action"];
      const units = normalizeDecimal(row.units);
      const batchKey = `${employeeCode.toLowerCase()}::${policyName.toLowerCase()}::${row.effective_date.trim()}::${action}`;

      if (!employeeCode) errors.push("Employee code is required.");
      if (employeeCode && !employee) errors.push("Employee code must exactly match an authorized employee.");
      if (policiesByName.isAmbiguous(policyName)) errors.push("Policy name is ambiguous. Use a unique policy name before importing; no policy was selected.");
      if (!policyName) errors.push("Leave policy name is required.");
      if (policyName && !policy) errors.push("Leave policy name must match an existing leave balance policy.");
      if (!["credit_adjustment", "debit_adjustment", "encashment"].includes(action)) errors.push("Action must be credit_adjustment, debit_adjustment, or encashment.");
      if (!units || !Number.isFinite(Number(units)) || Number(units) <= 0) errors.push("Units must be greater than zero with at most two decimal places; amounts are not rounded during import.");
      if (!row.effective_date.trim()) errors.push("Effective date is required.");
      if (row.effective_date.trim() && Number.isNaN(Date.parse(row.effective_date.trim()))) errors.push("Effective date must be a valid date.");
      if (!row.reason.trim()) errors.push("Reason is required for leave balance import.");
      if (employeeCode && policyName && batchKeys.has(batchKey)) errors.push("Only one leave balance action per employee, policy, date, and action can be committed in one import batch.");
      batchKeys.add(batchKey);

      const payload: HrAdminLeaveBalanceActionInput | null =
        errors.length || !employee || !policy
          ? null
          : {
              employee_id: employee.id,
              leave_policy_id: policy.id,
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
    if (isCommittingRef.current) {
      return;
    }
    if (!canManageBalances) {
      setMessage("You need leave balance management permission to commit imports.");
      return;
    }
    isCommittingRef.current = true;
    setIsCommitting(true);
    const nextRows = [...rows];

    for (let index = 0; index < nextRows.length; index += 1) {
      const row = nextRows[index];
      if (row.status !== "ready" || !row.payload) continue;
      let response: Response;
      try {
        response = await fetch("/api/hr-admin/leave-balances/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row.payload),
        });
      } catch {
        nextRows[index] = {
          ...row,
          status: "failed",
          message: networkMutationMessage,
        };
        setRows([...nextRows]);
        continue;
      }
      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        onResult(payload as HrAdminLeaveBalanceActionResult);
      }
      nextRows[index] = {
        ...row,
        status: response.ok ? "created" : "failed",
        message: response.ok ? "Leave balance action recorded." : getErrorMessage(payload, response.status),
      };
      setRows([...nextRows]);
    }

    setIsCommitting(false);
    isCommittingRef.current = false;
    const saved = nextRows.filter(row => row.status === "created").length;
    const failed = nextRows.filter(row => row.status === "failed").length;
    const blocked = nextRows.filter(row => row.status === "blocked").length;
    setMessage(`Import processed: ${saved} saved, ${failed} failed or unconfirmed, ${blocked} blocked. Review row messages and the ledger before retrying any row.`);
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
            <textarea className="input-control organization-import-textarea" disabled={isPreviewing || isCommitting} value={csvText} onChange={(event) => { setCsvText(event.target.value); setRows([]); setMessage(""); setParseFailed(false); }} />
          </label>
          <div className="organization-import-actions">
            <button className="button button--secondary" disabled={isPreviewing || isCommitting} type="button" onClick={() => { setCsvText(leaveBalanceSampleCsv(balances, String(Date.now()).slice(-5))); setRows([]); setMessage(""); }}>
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
                disabled={isPreviewing || isCommitting}
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
                    .catch(() => { setParseFailed(true); setMessage("CSV upload could not be read. Paste the rows into the import box and preview again."); });
                }}
              />
            </label>
            <AsyncActionButton className="button button--primary" type="button" pending={isPreviewing} disabled={isCommitting} pendingLabel="Resolving employee codes" onClick={preview}>
              Preview leave import
            </AsyncActionButton>
            <button className="button button--primary" type="button" disabled={!readyCount || isPreviewing || isCommitting || !canManageBalances} onClick={commitReadyRows}>
              {isCommitting ? "Committing..." : "Commit ready leave rows"}
            </button>
          </div>
        </div>
        {!canManageBalances ? (
          <div className="notice"><strong>Read-only leave balance view.</strong><span className="muted">Imports can be previewed, but committing changes requires leave balance management permission.</span></div>
        ) : null}
        {message ? <div className={`notice${hasBlockedRows ? " notice--error" : ""}`} role={hasBlockedRows ? "alert" : "status"}><strong>{hasBlockedRows ? "Import needs attention." : "Leave import status."}</strong><span>{message}</span></div> : null}
        {rows.length ? (
          <WorkspaceTableScrollRegion className="employee-directory-table-wrap workspace-table-region" label="Leave balance import table scroll">
            <table aria-label="Leave balance import results" className="workspace-data-table accerio-data-table workspace-table">
              <thead>
                <tr>
                  <th scope="col">Row</th>
                  <th scope="col">Employee</th>
                  <th scope="col">Policy</th>
                  <th scope="col">Action</th>
                  <th scope="col">Units</th>
                  <th scope="col">Date</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Status</th>
                  <th scope="col">Message</th>
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
                    <td><WorkspaceStatusBadge tone={row.status === "created" ? "success" : row.status === "ready" ? "info" : row.status === "blocked" ? "warning" : "danger"}>{row.status}</WorkspaceStatusBadge></td>
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

function BalanceEmployeeFilter({ initialValue, employees }: { initialValue: string; employees: Array<{id:string;name:string;employee_code:string}> }) {
  const [value, setValue] = useState(initialValue);
  return <><input type="hidden" name="employee_id" value={value}/><EmployeeSearchSelect label="Employee filter" hint="Search authorized employees; blank includes all employees." initialOptions={employees} selectedLabel="Selected employee" value={value} onChange={setValue}/></>;
}

function LeaveBalanceFilters({ filters, policies, employees }: { filters: Props["initialFilters"]; policies: Array<{id:string;name:string}>; employees: Array<{id:string;name:string;employee_code:string}> }) {
  return <WorkspaceFilterForm action="/hr-admin/leave-balances" label="Leave balance filters" className="workspace-filter-form--three workspace-filter-form--employee">
    <input type="hidden" name="page_size" value={filters?.pageSize ?? 12}/>
    <label className="form-field"><span>Search</span><input className="input-control" name="q" defaultValue={filters?.query ?? ""} placeholder="Employee, code or policy; transaction reason"/></label>
    <BalanceEmployeeFilter initialValue={filters?.employeeId ?? ""} employees={employees}/>
    <label className="form-field"><span>Policy filter</span><select className="input-control" name="leave_policy_id" defaultValue={filters?.policyId ?? ""}>{selectOptions(policies,"All leave policies")}</select></label>
    <label className="form-field"><span>Transaction status</span><select className="input-control" name="transaction_status" defaultValue={filters?.transactionStatus ?? ""}><option value="">All statuses</option><option value="pending">Pending review</option><option value="applied">Applied</option><option value="rejected">Rejected</option></select></label>
    <div className="workspace-filter-actions"><button className="button button--primary" type="submit">Apply filters</button><a className="button button--secondary" data-navigation-mode="document" href="/hr-admin/leave-balances">Clear filters</a></div>
  </WorkspaceFilterForm>;
}

export function LeaveBalanceOperations({
  balancesPage: serverBalancesPage,
  transactionsPage: serverTransactionsPage,
  options,
  canManageBalances = false,
  initialFilters,
}: Props) {
  const searchParams = useSearchParams();
  const [refreshed, setRefreshed] = useState<{
    sourceBalances: HrAdminLeaveBalanceListResponse;
    sourceTransactions: HrAdminLeaveBalanceTransactionListResponse;
    balances: HrAdminLeaveBalanceListResponse;
    transactions: HrAdminLeaveBalanceTransactionListResponse;
  } | null>(null);
  const currentRefresh = refreshed?.sourceBalances === serverBalancesPage && refreshed.sourceTransactions === serverTransactionsPage ? refreshed : null;
  const balancesPage = currentRefresh?.balances ?? serverBalancesPage;
  const transactionsPage = currentRefresh?.transactions ?? serverTransactionsPage;
  const [refreshError, setRefreshError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshSequence = useRef(0);
  const refreshAbort = useRef<AbortController | null>(null);
  useEffect(() => () => { refreshSequence.current++; refreshAbort.current?.abort(); }, []);
  const balances = balancesPage.items;
  const transactions = transactionsPage.items;
  const [formValue, setFormValue] = useState<HrAdminLeaveBalanceActionInput>(defaultActionValue);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [feedbackContext, setFeedbackContext] = useState<"action" | "review" | "import">("action");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [reviewReasonById, setReviewReasonById] = useState<Record<string, string>>({});
  const [reviewingTransactionId, setReviewingTransactionId] = useState<string | null>(null);
  const reviewingTransactionRef = useRef<string | null>(null);
  const selectedBalanceId = searchParams.get("selectedBalance") ?? "";
  const selectedTransactionId = searchParams.get("selectedTransaction") ?? "";
  const pageSize = initialFilters?.pageSize ?? balancesPage.page_size;
  const safeBalancePage = Math.min(balancesPage.page, balancesPage.total_pages ?? Math.max(1, Math.ceil(balancesPage.total_count / balancesPage.page_size)));
  const safeTransactionPage = Math.min(transactionsPage.page, transactionsPage.total_pages ?? Math.max(1, Math.ceil(transactionsPage.total_count / transactionsPage.page_size)));
  const balanceEmployeeOptions = Array.from(new Map(balances.map((item) => [item.employee_id, ({
    id: item.employee_id,
    name: item.employee_name,
    employee_code: item.employee_code,
  })])).values());
  const selectedBalance = balances.find((item) => item.id === selectedBalanceId) ?? null;
  const selectedTransaction = transactions.find((item) => item.id === selectedTransactionId) ?? null;

  async function refreshLedger() {
    const sourceUrl = window.location.href;
    const sequence = ++refreshSequence.current;
    refreshAbort.current?.abort();
    const controller = new AbortController();
    refreshAbort.current = controller;
    setRefreshError("");
    setIsRefreshing(true);
    const filters = new URLSearchParams();
    if (initialFilters?.query) filters.set("q", initialFilters.query);
    if (initialFilters?.employeeId) filters.set("employee_id", initialFilters.employeeId);
    if (initialFilters?.policyId) filters.set("leave_policy_id", initialFilters.policyId);
    filters.set("page_size", String(pageSize));
    async function readPage<T extends { total_count: number; total_pages?: number; page_size: number }>(path: string, page: number, status?: string): Promise<T> {
      const query = new URLSearchParams(filters);
      query.set("page", String(page));
      if (status) query.set("status", status);
      const read = async () => {
        const response = await fetch(`${path}?${query}`, { cache: "no-store", signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error(getErrorMessage(payload, response.status));
        return payload as T;
      };
      const first = await read();
      const last = Math.max(1, first.total_pages ?? Math.ceil(first.total_count / first.page_size));
      if (page <= last) return first;
      query.set("page", String(last));
      return read();
    }
    try {
      const [nextBalances, nextTransactions] = await Promise.all([
        readPage<HrAdminLeaveBalanceListResponse>("/api/hr-admin/leave-balances", safeBalancePage),
        readPage<HrAdminLeaveBalanceTransactionListResponse>("/api/hr-admin/leave-balances/transactions", safeTransactionPage, initialFilters?.transactionStatus),
      ]);
      if (sequence !== refreshSequence.current || window.location.href !== sourceUrl) return;
      setRefreshed({ sourceBalances: serverBalancesPage, sourceTransactions: serverTransactionsPage, balances: nextBalances, transactions: nextTransactions });
      if (nextBalances.page !== safeBalancePage || nextTransactions.page !== safeTransactionPage) {
        const canonical = new URL(sourceUrl);
        canonical.searchParams.set("balance_page", String(nextBalances.page));
        canonical.searchParams.set("transaction_page", String(nextTransactions.page));
        window.history.replaceState(null, "", canonical);
      }
    } catch {
      if (sequence === refreshSequence.current) setRefreshError("The action was recorded, but the latest ledger could not be loaded. Retry the view refresh; do not resubmit the action.");
    } finally {
      if (sequence === refreshSequence.current) setIsRefreshing(false);
    }
  }

  function pageHref(updates: Record<string, string | undefined>) {
    return buildLeaveBalanceHref({
      q: initialFilters?.query || undefined,
      employee_id: initialFilters?.employeeId || undefined,
      leave_policy_id: initialFilters?.policyId || undefined,
      transaction_status: initialFilters?.transactionStatus || undefined,
      page_size: String(pageSize),
      balance_page: String(balancesPage.page),
      transaction_page: String(transactionsPage.page),
      ...updates,
    });
  }

  function update<Key extends keyof HrAdminLeaveBalanceActionInput>(key: Key, value: HrAdminLeaveBalanceActionInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackContext("action");
    if (isSubmittingRef.current) {
      return;
    }
    setError("");
    setSuccessMessage("");
    if (!canManageBalances) {
      setError("You need leave balance management permission to apply balance actions.");
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    let response: Response;
    try {
      response = await fetch("/api/hr-admin/leave-balances/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      });
    } catch {
      setError("Unable to confirm the outcome. Check the transaction ledger before retrying to avoid recording the action twice.");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload, response.status));
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    const result = payload as HrAdminLeaveBalanceActionResult;
    setFormValue(defaultActionValue);
    setSuccessMessage(result.message);
    setIsSubmitting(false);
    isSubmittingRef.current = false;
    await refreshLedger();
  }

  function applyActionResult(result: HrAdminLeaveBalanceActionResult) {
    setFeedbackContext("import");
    setError("");
    setSuccessMessage(result.message);
    void refreshLedger();
  }

  async function handleReview(transactionId: string, decision: "approve" | "reject") {
    setFeedbackContext("review");
    if (reviewingTransactionRef.current) {
      return;
    }
    setError("");
    setSuccessMessage("");
    if (!canManageBalances) {
      setError("You need leave balance management permission to review balance transactions.");
      return;
    }
    reviewingTransactionRef.current = transactionId;
    setReviewingTransactionId(transactionId);
    let response: Response;
    try {
      response = await fetch(`/api/hr-admin/leave-balances/transactions/${transactionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          rejection_reason: reviewReasonById[transactionId] ?? "",
        }),
      });
    } catch {
      setError("Unable to confirm the outcome. Check the transaction ledger before retrying to avoid recording the action twice.");
      setReviewingTransactionId(null);
      reviewingTransactionRef.current = null;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload, response.status));
      setReviewingTransactionId(null);
      reviewingTransactionRef.current = null;
      return;
    }
    const result = payload as HrAdminLeaveBalanceActionResult;
    setReviewReasonById((current) => ({ ...current, [transactionId]: "" }));
    setSuccessMessage(result.message);
    setReviewingTransactionId(null);
    reviewingTransactionRef.current = null;
    await refreshLedger();
  }

  const feedback = <>{error ? <div role="alert" className="notice notice--error">{error}</div> : null}{successMessage ? <div role="status" className="notice notice--success">{successMessage}</div> : null}{isRefreshing ? <div role="status" className="notice">Refreshing the ledger…</div> : null}{refreshError ? <div role="alert" className="notice notice--error">{refreshError} <button className="button button--secondary" disabled={isRefreshing} onClick={() => void refreshLedger()} type="button">Retry ledger refresh</button></div> : null}</>;
  return (
    <>
      {feedbackContext === "review" && !selectedTransaction ? feedback : null}
      <div className="attendance-summary-strip" role="group" aria-label="Leave balance summary">
        <span><strong>{balancesPage.total_count}</strong> matching balances</span>
        <span><strong>{transactionsPage.total_count}</strong> matching transactions</span>
        <span><strong>{transactions.filter(item=>item.status==="pending").length}</strong> pending reviews on this transaction page</span>
      </div>
      <LeaveBalanceFilters key={JSON.stringify(initialFilters)} filters={initialFilters} policies={options.leave_policies} employees={balanceEmployeeOptions} />

      <section className="section queue-layout">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Balance ledger</h2>
            <p className="section-copy section-copy-soft">Current employee-policy balances matching the selected filters.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip">
              <strong>{balancesPage.total_count}</strong>
              balances
            </span>
            <span className="queue-summary-chip">
              <strong>{balancesPage.page_size}</strong>
              rows per page
            </span>
          </div>
        </div>
        <div className={`attendance-review-workbench${selectedBalance ? " attendance-review-workbench--with-detail" : ""}`}>
          <section className="panel-card-soft attendance-directory-panel">
            <WorkspaceTableScrollRegion label="Balance ledger table scroll" className="attendance-directory-table-wrap workspace-table-region">
              <table aria-label="Balance ledger" className="workspace-table attendance-directory-table accerio-data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Policy</th>
                    <th scope="col">Closing</th>
                    <th scope="col">Consumed</th>
                    <th scope="col">Reserved</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((item) => {
                    const isSelected = selectedBalance?.id === item.id;
                    return (
                      <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id}>
                        <td><strong>{item.employee_name}</strong><span>{item.employee_code}</span></td>
                        <td><strong>{item.leave_policy_name}</strong><span>{item.leave_type_name} · Year {item.period_year}</span></td>
                        <td><strong>{item.closing_balance}</strong><span>{item.opening_balance} opening</span></td>
                        <td><strong>{item.consumed_amount}</strong><span>{item.accrued_amount} accrued</span></td>
                        <td><strong>{item.reserved_amount}</strong><span>{item.encashed_amount} encashed</span></td>
                        <td><a data-navigation-mode="document" className="button button--secondary button--compact" aria-label={`Inspect balance for ${item.employee_name}`} href={`${pageHref({selectedBalance: item.id})}#balance-detail`}>Inspect</a></td>
                      </tr>
                    );
                  })}
                  {balances.length === 0 ? (
                    <tr><td colSpan={6}><strong>No leave balances match these filters.</strong><span>Clear filters or search by employee, code, policy, or leave type.</span></td></tr>
                  ) : null}
                </tbody>
              </table>
            </WorkspaceTableScrollRegion>
            <div className="panel-card-soft attendance-pagination-panel">
              <PaginationBar navigationMode="document"
                firstHref={pageHref({ balance_page: "1", transaction_page: String(safeTransactionPage), page_size: String(pageSize) })}
                hasNext={balancesPage.has_next}
                hasPrevious={balancesPage.has_previous}
                lastHref={pageHref({ balance_page: String(balancesPage.total_pages ?? 1), transaction_page: String(safeTransactionPage), page_size: String(pageSize) })}
                nextHref={pageHref({ balance_page: String(safeBalancePage + 1), transaction_page: String(safeTransactionPage), page_size: String(pageSize) })}
                page={safeBalancePage}
                pageSize={balancesPage.page_size}
                previousHref={pageHref({ balance_page: String(safeBalancePage - 1), transaction_page: String(safeTransactionPage), page_size: String(pageSize) })}
                totalCount={balancesPage.total_count}
              />
              <WorkspaceFilterForm action="/hr-admin/leave-balances" label="Ledger page size" className="workspace-filter-form--inline">
                {Object.entries({q:initialFilters?.query,employee_id:initialFilters?.employeeId,leave_policy_id:initialFilters?.policyId,transaction_status:initialFilters?.transactionStatus}).map(([name,value])=><input key={name} type="hidden" name={name} value={value ?? ""}/>)}
                <label className="form-field"><span>Rows</span><select className="input-control" name="page_size" defaultValue={pageSize}>{Array.from(new Set([12,25,50,pageSize])).sort((a,b)=>a-b).map(size=><option key={size} value={size}>{size}</option>)}</select></label><button className="button button--secondary" type="submit">Apply page size</button>
              </WorkspaceFilterForm>
            </div>
          </section>
          {selectedBalance ? (
            <aside id="balance-detail" tabIndex={-1} className="panel-card-soft attendance-detail-drawer" aria-label="Leave balance detail">
              <div className="queue-toolbar__header">
                <div>
                  <h2 className="section-heading-soft">Balance detail</h2>
                  <p className="section-copy section-copy-soft">Focused employee-policy ledger context.</p>
                </div>
                <a className="button button--secondary button--compact" href={pageHref({})} data-navigation-mode="document">Close</a>
              </div>
              <article className="record-card record-card--compact">
                <div className="record-card__header">
                  <div>
                    <h3>{selectedBalance.employee_name}</h3>
                    <p className="section-copy section-copy-soft">{selectedBalance.employee_code} · {selectedBalance.leave_type_name}</p>
                  </div>
                  <WorkspaceStatusBadge tone="info">Year {selectedBalance.period_year}</WorkspaceStatusBadge>
                </div>
              </article>
              <details className="record-card" open>
                <summary>Ledger</summary>
                <div className="detail-grid">
                  <div className="detail-row"><span className="detail-label">Policy</span><span className="detail-value">{selectedBalance.leave_policy_name}</span></div>
                  <div className="detail-row"><span className="detail-label">Opening balance</span><span className="detail-value">{selectedBalance.opening_balance}</span></div>
                  <div className="detail-row"><span className="detail-label">Accrued</span><span className="detail-value">{selectedBalance.accrued_amount}</span></div>
                  <div className="detail-row"><span className="detail-label">Carry forward</span><span className="detail-value">{selectedBalance.carry_forward_amount}</span></div>
                  <div className="detail-row"><span className="detail-label">Consumed</span><span className="detail-value">{selectedBalance.consumed_amount}</span></div>
                  <div className="detail-row"><span className="detail-label">Reserved</span><span className="detail-value">{selectedBalance.reserved_amount}</span></div>
                  <div className="detail-row"><span className="detail-label">Encashed</span><span className="detail-value">{selectedBalance.encashed_amount}</span></div>
                  <div className="detail-row"><span className="detail-label">Adjustment</span><span className="detail-value">{selectedBalance.adjustment_amount}</span></div>
                  <div className="detail-row"><span className="detail-label">Closing balance</span><span className="detail-value">{selectedBalance.closing_balance}</span></div>
                </div>
              </details>
            </aside>
          ) : null}
        </div>
      </section>

      <section className="section queue-layout">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Transaction review</h2>
            <p className="section-copy section-copy-soft">Adjustment, encashment, and maker-checker activity for the same filter set.</p>
          </div>
          <div className="queue-toolbar__meta">
            <span className="queue-summary-chip">
              <strong>{transactionsPage.total_count}</strong>
              transactions
            </span>
            <span className="queue-summary-chip">
              <strong>{transactionsPage.page_size}</strong>
              rows per page
            </span>
          </div>
        </div>
        <div className={`attendance-review-workbench${selectedTransaction ? " attendance-review-workbench--with-detail" : ""}`}>
          <section className="panel-card-soft attendance-directory-panel">
            <WorkspaceTableScrollRegion label="Balance transactions table scroll" className="attendance-directory-table-wrap workspace-table-region">
              <table aria-label="Balance transactions" className="workspace-table attendance-directory-table accerio-data-table">
                <thead>
                  <tr>
                    <th scope="col">Employee</th>
                    <th scope="col">Action</th>
                    <th scope="col">Units</th>
                    <th scope="col">Status</th>
                    <th scope="col">Impact</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((item) => {
                    const isSelected = selectedTransaction?.id === item.id;
                    const tone = item.status === "applied" ? "success" : item.status === "pending" ? "warning" : item.status === "rejected" ? "danger" : "neutral";
                    return (
                      <tr aria-selected={isSelected} className={isSelected ? "is-selected" : ""} key={item.id}>
                        <td><strong>{item.employee_name}</strong><span>{item.employee_code}</span></td>
                        <td><strong>{item.action.replaceAll("_", " ")}</strong><span>{item.effective_date}</span></td>
                        <td><strong>{item.units}</strong><span>{item.leave_policy_name}</span></td>
                        <td><WorkspaceStatusBadge tone={tone}>{item.status.replaceAll("_", " ")}</WorkspaceStatusBadge><span>{item.can_current_actor_review ? "Reviewable" : "Not reviewable by you"}</span></td>
                        <td><strong>{item.closing_balance_before} to {item.closing_balance_after}</strong><span>{item.reason || "No reason"}</span></td>
                        <td><a data-navigation-mode="document" className="button button--secondary button--compact" aria-label={`Inspect transaction for ${item.employee_name}`} href={`${pageHref({selectedTransaction: item.id})}#transaction-detail`}>Inspect</a></td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 ? (
                    <tr><td colSpan={6}><strong>No leave balance transactions match these filters.</strong><span>Clear filters or search by employee, policy or reason.</span></td></tr>
                  ) : null}
                </tbody>
              </table>
            </WorkspaceTableScrollRegion>
            <div className="panel-card-soft attendance-pagination-panel">
              <PaginationBar navigationMode="document"
                firstHref={pageHref({ balance_page: String(safeBalancePage), transaction_page: "1", page_size: String(pageSize) })}
                hasNext={transactionsPage.has_next}
                hasPrevious={transactionsPage.has_previous}
                lastHref={pageHref({ balance_page: String(safeBalancePage), transaction_page: String(transactionsPage.total_pages ?? 1), page_size: String(pageSize) })}
                nextHref={pageHref({ balance_page: String(safeBalancePage), transaction_page: String(safeTransactionPage + 1), page_size: String(pageSize) })}
                page={safeTransactionPage}
                pageSize={transactionsPage.page_size}
                previousHref={pageHref({ balance_page: String(safeBalancePage), transaction_page: String(safeTransactionPage - 1), page_size: String(pageSize) })}
                totalCount={transactionsPage.total_count}
              />
            </div>
          </section>
          {selectedTransaction ? (
            <aside id="transaction-detail" tabIndex={-1} className="panel-card-soft attendance-detail-drawer" aria-label="Leave balance transaction detail">
              <div className="queue-toolbar__header">
                <div>
                  <h2 className="section-heading-soft">Transaction detail</h2>
                  <p className="section-copy section-copy-soft">Review evidence and maker-checker state.</p>
                </div>
                <a className="button button--secondary button--compact" href={pageHref({})} data-navigation-mode="document">Close</a>
              </div>
              <article className="record-card record-card--compact">
                <div className="record-card__header">
                  <div>
                    <h3>{selectedTransaction.employee_name}</h3>
                    <p className="section-copy section-copy-soft">{selectedTransaction.action.replaceAll("_", " ")} · {selectedTransaction.units} units</p>
                  </div>
                  <WorkspaceStatusBadge tone={selectedTransaction.status === "applied" ? "success" : selectedTransaction.status === "pending" ? "warning" : selectedTransaction.status === "rejected" ? "danger" : "neutral"}>{selectedTransaction.status.replaceAll("_", " ")}</WorkspaceStatusBadge>
                </div>
              </article>
              <details className="record-card" open>
                <summary>Review context</summary>
                <div className="detail-grid">
                  <div className="detail-row"><span className="detail-label">Policy</span><span className="detail-value">{selectedTransaction.leave_policy_name}</span></div>
                  <div className="detail-row"><span className="detail-label">Effective date</span><span className="detail-value">{selectedTransaction.effective_date}</span></div>
                  <div className="detail-row"><span className="detail-label">Before</span><span className="detail-value">{selectedTransaction.closing_balance_before}</span></div>
                  <div className="detail-row"><span className="detail-label">After</span><span className="detail-value">{selectedTransaction.closing_balance_after}</span></div>
                  <div className="detail-row"><span className="detail-label">Performed by</span><span className="detail-value">{selectedTransaction.performed_by_name || "Not recorded"}</span></div>
                  <div className="detail-row"><span className="detail-label">Reviewer</span><span className="detail-value">{selectedTransaction.reviewed_by_name || selectedTransaction.reviewer_employee_name || "Not assigned"}</span></div>
                  <div className="detail-row detail-row--full"><span className="detail-label">Reason</span><span className="detail-value">{selectedTransaction.reason || "No reason captured."}</span></div>
                  {selectedTransaction.approval_reason ? <div className="detail-row detail-row--full"><span className="detail-label">Approval rule</span><span className="detail-value">{selectedTransaction.approval_reason}</span></div> : null}
                  {selectedTransaction.rejection_reason ? <div className="detail-row detail-row--full"><span className="detail-label">Rejection reason</span><span className="detail-value">{selectedTransaction.rejection_reason}</span></div> : null}
                </div>
              </details>
              {feedbackContext === "review" ? feedback : null}
              {selectedTransaction.status === "pending" ? (
                <div className="record-card__actions">
                  {canManageBalances && selectedTransaction.can_current_actor_review ? (
                    <WorkspaceFormControls>
                      <input
                        className="input-control"
                        aria-label="Rejection reason" placeholder="Reason if rejecting"
                        value={reviewReasonById[selectedTransaction.id] ?? ""}
                        onChange={(event) =>
                          setReviewReasonById((current) => ({
                            ...current,
                            [selectedTransaction.id]: event.target.value,
                          }))
                        }
                      />
                      <button className="button button--secondary" disabled={reviewingTransactionId === selectedTransaction.id} onClick={() => handleReview(selectedTransaction.id, "reject")} type="button">
                        {reviewingTransactionId === selectedTransaction.id ? "Saving..." : "Reject"}
                      </button>
                      <button className="button button--primary" disabled={reviewingTransactionId === selectedTransaction.id} onClick={() => handleReview(selectedTransaction.id, "approve")} type="button">
                        {reviewingTransactionId === selectedTransaction.id ? "Saving..." : "Approve"}
                      </button>
                    </WorkspaceFormControls>
                  ) : (
                    <span className="muted">Pending review. A different authorized reviewer must approve this action before balances change.</span>
                  )}
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      </section>
      <section className="section">
        <details className="workspace-context-disclosure" data-testid="leave-balance-import-workbench">
          <summary>Import balance actions</summary>
          {feedbackContext === "import" ? feedback : null}
          <p className="muted">Import preview checks exact employee codes across the authorized tenant, independently of this page. Policy names are checked against the authorized catalog; ambiguous names are blocked. The backend validates eligibility, balance and period restrictions on every submission.</p><WorkspaceFormControls><LeaveBalanceImportWorkbench balances={balances} policies={options.leave_policies} canManageBalances={canManageBalances} onResult={applyActionResult} /></WorkspaceFormControls>
        </details>
      </section>

      <details className="workspace-context-disclosure"><summary>Balance actions</summary>
        <div className="workspace-card workspace-card--compact">
          <div className="workspace-card__header">
            <div>
              <h2 className="section-heading-soft">Balance operations</h2>
              <p className="section-copy section-copy-soft">Credit, debit, or encash balances with policy-aware validation.</p>
            </div>
          </div>
          <form aria-label="Balance action" className="queue-toolbar panel-card-soft" onSubmit={handleSubmit}>
            <WorkspaceFormControls>
            <div className="queue-toolbar__grid two-column-grid">
              <EmployeeSearchSelect initialOptions={balanceEmployeeOptions} value={formValue.employee_id ?? ""} onChange={(value) => update("employee_id", value || null)} />
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
            {feedbackContext === "action" ? feedback : null}
            <div className="queue-toolbar__actions">
              <button className="button button--primary" disabled={isSubmitting || !canManageBalances} type="submit">
                {isSubmitting ? "Applying..." : "Apply balance action"}
              </button>
            </div>
            {!canManageBalances ? (
              <div className="notice"><strong>Read-only leave balance view.</strong><span className="muted">Balance actions and reviews require leave balance management permission.</span></div>
            ) : null}
            </WorkspaceFormControls>
          </form>
        </div>
      </details>

    </>
  );
}
