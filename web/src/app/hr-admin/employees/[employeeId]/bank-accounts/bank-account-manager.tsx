"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminEmployeeBankAccount, HrAdminEmployeeBankAccountWriteInput } from "@/lib/types";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

function emptyForm(employeeName: string): HrAdminEmployeeBankAccountWriteInput {
  return {
    account_holder_name: employeeName,
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    branch_name: "",
    is_primary: true,
  };
}

function toForm(item: HrAdminEmployeeBankAccount): HrAdminEmployeeBankAccountWriteInput {
  return {
    account_holder_name: item.account_holder_name,
    bank_name: item.bank_name,
    account_number: item.account_number,
    ifsc_code: item.ifsc_code,
    branch_name: item.branch_name,
    is_primary: item.is_primary,
  };
}

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "Unable to save bank account.";
  }
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return `${key}: ${String(value[0])}`;
    if (typeof value === "string" && key !== "detail") return `${key}: ${value}`;
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save bank account.");
}

function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export function BankAccountManager({
  employeeId,
  employeeName,
  initialAccounts,
}: {
  employeeId: string;
  employeeName: string;
  initialAccounts: HrAdminEmployeeBankAccount[];
}) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selectedId, setSelectedId] = useState<string | null>(initialAccounts[0]?.id ?? null);
  const selected = useMemo(() => accounts.find((item) => item.id === selectedId) ?? null, [accounts, selectedId]);
  const [formValue, setFormValue] = useState<HrAdminEmployeeBankAccountWriteInput>(() => selected ? toForm(selected) : emptyForm(employeeName));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof HrAdminEmployeeBankAccountWriteInput>(key: Key, value: HrAdminEmployeeBankAccountWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setSelectedId(null);
    setFormValue(emptyForm(employeeName));
    setFeedback(null);
  }

  function selectAccount(item: HrAdminEmployeeBankAccount) {
    setSelectedId(item.id);
    setFormValue(toForm(item));
    setFeedback(null);
  }

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    const response = await fetch(
      selected
        ? `/api/hr-admin/employees/${employeeId}/bank-accounts/${selected.id}`
        : `/api/hr-admin/employees/${employeeId}/bank-accounts`,
      {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      },
    );
    const payload = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    if (!response.ok) {
      setFeedback({ tone: "error", message: getErrorMessage(payload) });
      return;
    }
    const saved = payload as HrAdminEmployeeBankAccount;
    setAccounts((current) => {
      const normalized = saved.is_primary ? current.map((item) => ({ ...item, is_primary: item.id === saved.id })) : current;
      return normalized.some((item) => item.id === saved.id)
        ? normalized.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...normalized];
    });
    setSelectedId(saved.id);
    setFormValue(toForm(saved));
    setFeedback({ tone: "success", message: "Employee bank account saved." });
    router.refresh();
  }

  return (
    <section className="section employee-master-layout">
      <article className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Bank accounts</h2>
            <p className="section-copy section-copy-soft">Primary account coverage used by payroll readiness and bank advice generation.</p>
          </div>
          <button className="button button--secondary" onClick={startNew} type="button">New account</button>
        </div>
        <div className="employee-directory-list" aria-label="Employee bank account records">
          {accounts.length ? accounts.map((item) => (
            <button
              className={`employee-directory-item directory-item-soft${selectedId === item.id ? " employee-directory-item--active" : ""}`}
              key={item.id}
              onClick={() => selectAccount(item)}
              type="button"
            >
              <div className="employee-directory-item__header">
                <div>
                  <strong>{item.bank_name}</strong>
                  <p className="section-copy">{item.account_holder_name}</p>
                </div>
                <span className={`record-chip${item.is_primary ? " record-chip--accent" : ""}`}>{item.is_primary ? "primary" : "secondary"}</span>
              </div>
              <div className="employee-directory-item__meta">
                <span>{maskAccountNumber(item.account_number)}</span>
                <span>{item.ifsc_code || "No IFSC"}</span>
                <span>{item.branch_name || "No branch"}</span>
              </div>
            </button>
          )) : (
            <div className="notice">
              <strong>No bank account configured.</strong>
              <span className="muted">Create a primary account to clear payroll readiness warnings.</span>
            </div>
          )}
        </div>
      </article>

      <form className="section form-layout-modern" onSubmit={saveAccount}>
        <section className="form-shell-card">
          <div className="form-shell-card__header">
            <div>
              <h2>{selected ? "Edit bank account" : "Create bank account"}</h2>
              <p className="section-copy">Capture payroll payout details without changing the employee master identity.</p>
            </div>
            <div className="form-shell-card__meta">
              <span className="queue-summary-chip"><strong>{formValue.is_primary ? "primary" : "secondary"}</strong> payout account</span>
            </div>
          </div>

          <div className="form-grid">
            <label className="form-field">
              <span className="muted">Account holder name</span>
              <input className="input-control" required value={formValue.account_holder_name} onChange={(event) => update("account_holder_name", event.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">Bank name</span>
              <input className="input-control" required value={formValue.bank_name} onChange={(event) => update("bank_name", event.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">Account number</span>
              <input className="input-control" required value={formValue.account_number} onChange={(event) => update("account_number", event.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">IFSC code</span>
              <input className="input-control" value={formValue.ifsc_code} onChange={(event) => update("ifsc_code", event.target.value)} />
            </label>
            <label className="form-field">
              <span className="muted">Branch name</span>
              <input className="input-control" value={formValue.branch_name} onChange={(event) => update("branch_name", event.target.value)} />
            </label>
            <label className="selection-row">
              <span>
                <strong>Primary account</strong>
                <span className="section-copy">Use this account for payroll readiness and payout exports.</span>
              </span>
              <input checked={formValue.is_primary} onChange={(event) => update("is_primary", event.target.checked)} type="checkbox" />
            </label>
          </div>

          {feedback ? (
            <div className={`notice ${feedback.tone === "success" ? "notice--success" : ""}`} role={feedback.tone === "success" ? "status" : "alert"}>
              <strong>{feedback.tone === "success" ? "Saved." : "Save failed."}</strong>
              <span className="muted">{feedback.message}</span>
            </div>
          ) : null}

          <div className="form-actions-bar">
            <span className="muted">Primary account changes are immediately available to payroll readiness.</span>
            <div className="form-actions-bar__buttons">
              <button className="button button--primary" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : selected ? "Save account" : "Create account"}
              </button>
              <button className="button button--secondary" onClick={startNew} type="button">Reset</button>
            </div>
          </div>
        </section>
      </form>
    </section>
  );
}
