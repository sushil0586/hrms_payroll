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
};

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

const defaultActionValue: HrAdminLeaveBalanceActionInput = {
  employee_id: null,
  leave_policy_id: null,
  action: "credit_adjustment",
  units: "0.00",
  effective_date: null,
  reason: "",
};

export function LeaveBalanceOperations({ initialBalances, initialTransactions, options }: Props) {
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

  async function handleReview(transactionId: string, decision: "approve" | "reject") {
    setError("");
    setSuccessMessage("");
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
              <button className="button button--primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Applying..." : "Apply balance action"}
              </button>
            </div>
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
                  {item.can_current_actor_review ? (
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
