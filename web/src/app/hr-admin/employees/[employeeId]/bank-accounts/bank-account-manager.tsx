"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { WorkspaceFormFooter } from "@/components/patterns/workspace-standard";
import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { apiFieldErrors, mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { useMaintenanceDraft, type MaintenanceCallbacks } from "../../use-maintenance-draft";
import type { HrAdminEmployeeBankAccount, HrAdminEmployeeBankAccountWriteInput } from "@/lib/types";
import { type FieldErrors, hasFieldErrors, requireText } from "@/lib/ui/validation";

type Feedback = {
  tone: "success" | "error";
  message: string;
} | null;

type BankAccountField = keyof HrAdminEmployeeBankAccountWriteInput;

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

function maskAccountNumber(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export function BankAccountManager({
  employeeId,
  employeeName,
  initialAccounts,
  cancelHref,
  ...callbacks
}: MaintenanceCallbacks & {
  employeeId: string;
  employeeName: string;
  initialAccounts: HrAdminEmployeeBankAccount[];
  cancelHref?: string;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selectedId, setSelectedId] = useState<string | null>(initialAccounts[0]?.id ?? null);
  const selected = useMemo(() => accounts.find((item) => item.id === selectedId) ?? null, [accounts, selectedId]);
  const [formValue, setFormValue] = useState<HrAdminEmployeeBankAccountWriteInput>(() => selected ? toForm(selected) : emptyForm(employeeName));
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<BankAccountField>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const savingRef = useRef(false);
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  const draft = useMaintenanceDraft(formValue, isSubmitting, employeeId, cancelHref, callbacks);
  const formRef = useValidationFocus(fieldErrors);
  const feedbackRef = useFeedbackFocus(feedback?.tone === "error" ? feedback.message : "", isSubmitting, hasFieldErrors(fieldErrors));
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (feedback?.tone === "success" && !isSubmitting) successRef.current?.focus(); }, [feedback, isSubmitting]);

  function update<Key extends keyof HrAdminEmployeeBankAccountWriteInput>(key: Key, value: HrAdminEmployeeBankAccountWriteInput[Key]) {
    setFeedback(current => current?.tone === "success" ? null : current);
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    if (savingRef.current || !draft.confirmDiscard()) return;
    setFieldErrors({});
    setShowAccountNumber(false);
    draft.markSaved(emptyForm(employeeName));
    setSelectedId(null);
    setFormValue(emptyForm(employeeName));
    setFeedback(null);
    window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[name="account_holder_name"]')?.focus());
  }

  function selectAccount(item: HrAdminEmployeeBankAccount) {
    if (savingRef.current || !draft.confirmDiscard()) return;
    setFieldErrors({});
    setShowAccountNumber(false);
    draft.markSaved(toForm(item));
    setSelectedId(item.id);
    setFormValue(toForm(item));
    setFeedback(null);
    window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[name="account_holder_name"]')?.focus());
  }

  async function saveAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.ready || savingRef.current) return;
    setFeedback(null);
    setFieldErrors({});
    const normalizedIfsc = formValue.ifsc_code.trim().toUpperCase();
    const nextErrors: FieldErrors<BankAccountField> = {
      account_holder_name: requireText(formValue.account_holder_name, "Enter the account holder name."),
      bank_name: requireText(formValue.bank_name, "Enter the bank name."),
      account_number: requireText(formValue.account_number, "Enter the account number."),
      ifsc_code: normalizedIfsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(normalizedIfsc) ? "Enter a valid IFSC code." : undefined,
    };
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      setFeedback({ tone: "error", message: "Review the highlighted bank account fields and try again." });
      return;
    }
    if (formValue.is_primary && !selected?.is_primary && accounts.some(item => item.is_primary && item.id !== selected?.id)
      && !window.confirm("Use this as the primary payout account? The current primary account will become secondary.")) return;
    savingRef.current = true;
    setIsSubmitting(true);
    let response: Response;
    try {
      response = await fetch(
      selected
        ? `/api/hr-admin/employees/${employeeId}/bank-accounts/${selected.id}`
        : `/api/hr-admin/employees/${employeeId}/bank-accounts`,
      {
        method: selected ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formValue, ifsc_code: normalizedIfsc }),
      },
    );
    } catch {
      setFeedback({ tone: "error", message: networkMutationMessage });
      setIsSubmitting(false);
      savingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    setIsSubmitting(false);
    savingRef.current = false;
    if (!response.ok) {
      setFieldErrors(apiFieldErrors(payload, Object.keys(formValue) as BankAccountField[]));
      setFeedback({ tone: "error", message: mutationErrorMessage(payload, response.status, "Unable to save bank account.") });
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
    draft.markSaved(toForm(saved));
    setShowAccountNumber(false);
    setFeedback({ tone: "success", message: "Employee bank account saved." });
  }

  return (
    <section className="section employee-master-layout employee-bank-workspace employee-maintenance-phase4">
      <article className="queue-toolbar panel-card-soft">
        <div className="queue-toolbar__header">
          <div>
            <h2 className="section-heading-soft">Bank accounts</h2>
            <p className="section-copy section-copy-soft">Primary account coverage used by payroll readiness and bank advice generation.</p>
          </div>
          <button className="button button--secondary" disabled={!draft.ready || isSubmitting} onClick={startNew} type="button">New account</button>
        </div>
        <div className="employee-directory-list" role="group" aria-label="Employee bank account records">
          {accounts.length ? accounts.map((item) => (
            <button
              className={`employee-directory-item directory-item-soft${selectedId === item.id ? " employee-directory-item--active" : ""}`}
              aria-pressed={selectedId === item.id}
              disabled={!draft.ready || isSubmitting}
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
              <span className="muted">Add the bank account used for employee payouts.</span>
            </div>
          )}
        </div>
      </article>

      <form ref={formRef} aria-busy={isSubmitting} className="form-layout-modern employee-child-form employee-bank-account-form employee-maintenance-form" noValidate onSubmit={saveAccount}>
        <section className="form-shell-card">
          <div className="form-shell-card__header">
            <div>
              <h2>{selected ? "Edit bank account" : "Create bank account"}</h2>
              <p className="section-copy">Capture payout details without changing the employee master.</p>
            </div>
            <div className="form-shell-card__meta">
              <span className="queue-summary-chip"><strong>{formValue.is_primary ? "primary" : "secondary"}</strong> payout account</span>
            </div>
          </div>

          <fieldset disabled={!draft.ready || isSubmitting} className="employee-maintenance-fields">
          <legend className="sr-only">Payout account details</legend>
          <p className="employee-maintenance-help">Required: account holder, bank name and account number.</p>
          <div className="form-grid">
            <label className="form-field">
              <span className="muted">Account holder name</span>
              <input name="account_holder_name" aria-invalid={Boolean(fieldErrors.account_holder_name)} aria-describedby={fieldErrors.account_holder_name ? "bank-error-account_holder_name" : undefined} className="input-control" required value={formValue.account_holder_name} onChange={(event) => update("account_holder_name", event.target.value)} />
              {fieldErrors.account_holder_name ? <span id="bank-error-account_holder_name" className="field-error-text">{fieldErrors.account_holder_name}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">Bank name</span>
              <input name="bank_name" aria-invalid={Boolean(fieldErrors.bank_name)} aria-describedby={fieldErrors.bank_name ? "bank-error-bank_name" : undefined} className="input-control" required value={formValue.bank_name} onChange={(event) => update("bank_name", event.target.value)} />
              {fieldErrors.bank_name ? <span id="bank-error-bank_name" className="field-error-text">{fieldErrors.bank_name}</span> : null}
            </label>
            <div className="employee-sensitive-field"><label className="form-field">
              <span className="muted">Account number</span>
              <input name="account_number" aria-invalid={Boolean(fieldErrors.account_number)} aria-describedby={fieldErrors.account_number ? "bank-error-account_number" : undefined} className="input-control" type={showAccountNumber ? "text" : "password"} autoComplete="off" required value={formValue.account_number} onChange={(event) => update("account_number", event.target.value)} />
              {fieldErrors.account_number ? <span id="bank-error-account_number" className="field-error-text">{fieldErrors.account_number}</span> : null}
            </label><button className="button button--secondary" disabled={!draft.ready || isSubmitting} type="button" aria-pressed={showAccountNumber} onClick={() => setShowAccountNumber(current => !current)}>{showAccountNumber ? "Hide account number" : "Show account number"}</button></div>
            <label className="form-field">
              <span className="muted">IFSC code</span>
              <input name="ifsc_code" aria-invalid={Boolean(fieldErrors.ifsc_code)} aria-describedby={fieldErrors.ifsc_code ? "bank-error-ifsc_code" : undefined} className="input-control" value={formValue.ifsc_code} onChange={(event) => update("ifsc_code", event.target.value)} />
              {fieldErrors.ifsc_code ? <span id="bank-error-ifsc_code" className="field-error-text">{fieldErrors.ifsc_code}</span> : null}
            </label>
            <label className="form-field">
              <span className="muted">Branch name</span>
              <input name="branch_name" aria-invalid={Boolean(fieldErrors.branch_name)} aria-describedby={fieldErrors.branch_name ? "bank-error-branch_name" : undefined} className="input-control" value={formValue.branch_name} onChange={(event) => update("branch_name", event.target.value)} />
            {fieldErrors.branch_name ? <span id="bank-error-branch_name" className="field-error-text">{fieldErrors.branch_name}</span> : null}</label>
            <label className="selection-row">
              <span>
                <strong>Primary account</strong>
                <span className="section-copy">Use this account for payroll readiness and payout exports.</span>
              </span>
              <input name="is_primary" aria-invalid={Boolean(fieldErrors.is_primary)} aria-describedby={fieldErrors.is_primary ? "bank-error-is_primary" : undefined} checked={formValue.is_primary} onChange={(event) => update("is_primary", event.target.checked)} type="checkbox" />
            {fieldErrors.is_primary ? <span id="bank-error-is_primary" className="field-error-text">{fieldErrors.is_primary}</span> : null}</label>
          </div>

          </fieldset>

          {feedback ? (
            <div ref={feedback.tone === "success" ? successRef : feedbackRef} tabIndex={-1} className={`notice ${feedback.tone === "success" ? "notice--success" : "notice--error"}`} role={feedback.tone === "success" ? "status" : "alert"}>
              <strong>{feedback.tone === "success" ? "Saved successfully." : "Save needs attention."}</strong>
              <span className="muted">{feedback.message}</span>
            </div>
          ) : null}

          <WorkspaceFormFooter className="form-actions-bar" fixed note="Primary account changes apply immediately.">
            <button className="button button--secondary" disabled={!draft.ready || isSubmitting} onClick={draft.cancel} type="button">Cancel</button>
            <button aria-label="Reset changes" title="Reset unsaved changes" className="button button--secondary" disabled={!draft.ready || isSubmitting || !draft.dirty} onClick={() => {
              if (!draft.confirmDiscard()) return;
              const next = selected ? toForm(selected) : emptyForm(employeeName);
              setFormValue(next); draft.markSaved(next); setFieldErrors({}); setFeedback(null); setShowAccountNumber(false);
              window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[name="account_holder_name"]')?.focus());
            }} type="button">Reset</button>
            <AsyncActionButton className="button button--primary" disabled={!draft.ready || isSubmitting} pending={isSubmitting} pendingLabel="Saving account" type="submit">{selected ? "Save account" : "Create account"}</AsyncActionButton>
          </WorkspaceFormFooter>
        </section>
      </form>
    </section>
  );
}
