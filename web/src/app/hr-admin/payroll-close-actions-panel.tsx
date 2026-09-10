"use client";

import { useMemo, useState } from "react";

type PayrollAction = {
  id: string;
  label: string;
  endpoint: string;
  method?: "POST";
  profileField?: string;
  profileLabel?: string;
  defaultProfileRef?: string;
  disabled?: boolean;
  disabledReason?: string;
};

type ActionResult = {
  detail?: string;
};

type Props = {
  title: string;
  eyebrow: string;
  description: string;
  actions: PayrollAction[];
};

export function PayrollCloseActionsPanel({ title, eyebrow, description, actions }: Props) {
  const initialRefs = useMemo(
    () => Object.fromEntries(actions.map((action) => [action.id, action.defaultProfileRef ?? ""])),
    [actions],
  );
  const [profileRefs, setProfileRefs] = useState<Record<string, string>>(initialRefs);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runAction(action: PayrollAction) {
    setMessage("");
    setError("");
    setBusyAction(action.id);
    const body = action.profileField && profileRefs[action.id]
      ? { [action.profileField]: profileRefs[action.id] }
      : {};

    try {
      const response = await fetch(action.endpoint, {
        method: action.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({})) as ActionResult;
      if (!response.ok) {
        throw new Error(payload.detail || "Payroll action failed.");
      }
      setMessage(payload.detail || `${action.label} completed.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Payroll action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="payroll-setup-assignment-panel payroll-close-actions-panel" aria-label={title}>
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="section-copy section-copy-soft">{description}</p>
        </div>
        <span className="payroll-setup-count">{actions.length} controls</span>
      </div>

      <div className="payroll-close-actions-grid">
        {actions.map((action) => {
          const isDisabled = Boolean(action.disabled || busyAction);
          return (
            <article className="payroll-close-action-card" key={action.id}>
              {action.profileField ? (
                <label className="form-field" htmlFor={`${action.id}-profile-ref`}>
                  <span className="muted">{action.profileLabel ?? "Profile ref"}</span>
                  <input
                    className="input-control"
                    id={`${action.id}-profile-ref`}
                    name={action.profileField}
                    onChange={(event) => setProfileRefs((current) => ({ ...current, [action.id]: event.target.value }))}
                    placeholder="Use tenant default"
                    type="text"
                    value={profileRefs[action.id] ?? ""}
                  />
                </label>
              ) : (
                <p className="section-copy section-copy-soft">{action.disabledReason ?? "Uses the selected payroll record and tenant configuration."}</p>
              )}
              <button
                className="button button--primary"
                disabled={isDisabled}
                onClick={() => runAction(action)}
                type="button"
              >
                {busyAction === action.id ? "Working..." : action.label}
              </button>
              {action.disabled && action.disabledReason ? <span className="muted">{action.disabledReason}</span> : null}
            </article>
          );
        })}
      </div>

      {message ? <p className="form-status form-status--success" role="status">{message}</p> : null}
      {error ? <p className="form-status form-status--error" role="alert">{error}</p> : null}
    </section>
  );
}
