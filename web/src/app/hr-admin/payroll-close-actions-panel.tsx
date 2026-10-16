"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PayrollAction = {
  id: string;
  label: string;
  endpoint: string;
  method?: "POST";
  profileField?: string;
  profileLabel?: string;
  defaultProfileRef?: string;
  commentField?: string;
  commentLabel?: string;
  defaultComment?: string;
  disabled?: boolean;
  disabledReason?: string;
  background?: boolean;
};

type ActionResult = {
  detail?: string;
  job?: PayrollJob;
};

type PayrollJob = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  stage: string;
  total_items: number;
  completed_items: number;
  retryable: boolean;
  error?: { code: string; message: string } | null;
};

type Props = {
  title: string;
  eyebrow: string;
  description: string;
  actions: PayrollAction[];
};

export function PayrollCloseActionsPanel({ title, eyebrow, description, actions }: Props) {
  const router = useRouter();
  const initialRefs = useMemo(
    () => Object.fromEntries(actions.map((action) => [action.id, action.defaultProfileRef ?? ""])),
    [actions],
  );
  const initialComments = useMemo(
    () => Object.fromEntries(actions.map((action) => [action.id, action.defaultComment ?? ""])),
    [actions],
  );
  const [profileRefs, setProfileRefs] = useState<Record<string, string>>(initialRefs);
  const [comments, setComments] = useState<Record<string, string>>(initialComments);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Record<string, PayrollJob>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    const restored: Record<string, PayrollJob> = {};
    for (const action of actions.filter((item) => item.background)) {
      const raw = window.localStorage.getItem(`payroll-job:${action.endpoint}`);
      if (!raw) continue;
      try {
        restored[action.id] = JSON.parse(raw) as PayrollJob;
      } catch {
        window.localStorage.removeItem(`payroll-job:${action.endpoint}`);
      }
    }
    if (Object.keys(restored).length) {
      queueMicrotask(() => {
        if (!disposed) setJobs(restored);
      });
    }
    return () => {
      disposed = true;
    };
  }, [actions]);

  useEffect(() => {
    const active = actions.filter((action) => ["queued", "running"].includes(jobs[action.id]?.status ?? ""));
    if (!active.length) return;
    let disposed = false;
    const poll = async () => {
      await Promise.all(active.map(async (action) => {
        const current = jobs[action.id];
        if (!current) return;
        const response = await fetch(`/api/hr-admin/payroll-jobs/${current.id}`, { cache: "no-store" }).catch(() => null);
        if (!response?.ok) return;
        const payload = await response.json() as { job?: PayrollJob };
        if (!payload.job || disposed) return;
        window.localStorage.setItem(`payroll-job:${action.endpoint}`, JSON.stringify(payload.job));
        setJobs((value) => ({ ...value, [action.id]: payload.job! }));
        if (payload.job.status === "succeeded") {
          setError("");
          setMessage(`${action.label} completed.`);
          router.refresh();
        } else if (payload.job.status === "failed") {
          setMessage("");
          setError(payload.job.error?.message || `${action.label} failed.`);
        }
      }));
    };
    const timer = window.setInterval(() => void poll(), 1500);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [actions, jobs, router]);

  async function retryJob(action: PayrollAction, job: PayrollJob) {
    setBusyAction(action.id);
    setError("");
    try {
      const response = await fetch(`/api/hr-admin/payroll-jobs/${job.id}/retry`, { method: "POST" });
      const payload = await response.json().catch(() => ({})) as ActionResult;
      if (!response.ok || !payload.job) throw new Error(payload.detail || "Payroll retry could not be queued.");
      window.localStorage.setItem(`payroll-job:${action.endpoint}`, JSON.stringify(payload.job));
      setJobs((value) => ({ ...value, [action.id]: payload.job! }));
      setMessage(payload.detail || "Payroll retry queued.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Payroll retry could not be queued.");
    } finally {
      setBusyAction(null);
    }
  }

  async function runAction(action: PayrollAction) {
    if (action.disabled || !action.endpoint) {
      setMessage("");
      setError(action.disabledReason || "This action is not available for your current role.");
      return;
    }
    const nextFieldErrors: Record<string, string> = {};
    if (action.profileField && !profileRefs[action.id]?.trim()) {
      nextFieldErrors[`${action.id}:profile`] = `${action.profileLabel ?? "Profile ref"} is required before running ${action.label}.`;
    }
    if (action.commentField && !comments[action.id]?.trim()) {
      nextFieldErrors[`${action.id}:comment`] = `${action.commentLabel ?? "Comment"} is required before running ${action.label}.`;
    }
    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors);
      setMessage("");
      setError("Fix the highlighted payroll action fields before continuing.");
      return;
    }
    setMessage("");
    setError("");
    setFieldErrors({});
    setBusyAction(action.id);
    const body = {
      ...(action.background ? { execution_mode: "async" } : {}),
      ...(action.profileField && profileRefs[action.id] ? { [action.profileField]: profileRefs[action.id] } : {}),
      ...(action.commentField && comments[action.id] ? { [action.commentField]: comments[action.id] } : {}),
    };

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
      if (action.background && payload.job) {
        window.localStorage.setItem(`payroll-job:${action.endpoint}`, JSON.stringify(payload.job));
        setJobs((value) => ({ ...value, [action.id]: payload.job! }));
      }
      setMessage(payload.detail || `${action.label} completed.`);
      if (!payload.job || payload.job.status === "succeeded") router.refresh();
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
          const job = jobs[action.id];
          const isJobActive = job?.status === "queued" || job?.status === "running";
          const isDisabled = Boolean(action.disabled || busyAction || isJobActive);
          return (
            <article className={`payroll-close-action-card ${action.disabled ? "payroll-close-action-card--disabled" : ""}`} key={action.id}>
              <div className="payroll-close-action-card__header">
                <strong>{action.label}</strong>
                <span>{action.disabled ? "Not ready" : "Ready"}</span>
              </div>
              {action.profileField ? (
                <label className="form-field" htmlFor={`${action.id}-profile-ref`}>
                  <span className="muted">{action.profileLabel ?? "Profile ref"}</span>
                  <input
                    aria-invalid={Boolean(fieldErrors[`${action.id}:profile`])}
                    className="input-control"
                    disabled={Boolean(action.disabled)}
                    id={`${action.id}-profile-ref`}
                    name={action.profileField}
                    onChange={(event) => setProfileRefs((current) => ({ ...current, [action.id]: event.target.value }))}
                    placeholder="Use tenant default"
                    type="text"
                    value={profileRefs[action.id] ?? ""}
                  />
                  {fieldErrors[`${action.id}:profile`] ? <span className="field-error-text" role="alert">{fieldErrors[`${action.id}:profile`]}</span> : null}
                </label>
              ) : (
                <p className="section-copy section-copy-soft">{action.disabledReason ?? "Uses the selected payroll record and tenant configuration."}</p>
              )}
              {action.commentField ? (
                <label className="form-field" htmlFor={`${action.id}-comment`}>
                  <span className="muted">{action.commentLabel ?? "Comment"}</span>
                  <textarea
                    aria-invalid={Boolean(fieldErrors[`${action.id}:comment`])}
                    className="input-control"
                    disabled={Boolean(action.disabled)}
                    id={`${action.id}-comment`}
                    name={action.commentField}
                    onChange={(event) => setComments((current) => ({ ...current, [action.id]: event.target.value }))}
                    placeholder="Capture reviewer note"
                    rows={3}
                    value={comments[action.id] ?? ""}
                  />
                  {fieldErrors[`${action.id}:comment`] ? <span className="field-error-text" role="alert">{fieldErrors[`${action.id}:comment`]}</span> : null}
                </label>
              ) : null}
              <button
                className="button button--primary"
                disabled={isDisabled}
                onClick={() => runAction(action)}
                type="button"
              >
                {busyAction === action.id || isJobActive ? "Working..." : action.label}
              </button>
              {job ? (
                <div className="form-status" role={job.status === "failed" ? "alert" : "status"} aria-live="polite">
                  <strong>{job.status === "queued" ? "Queued" : job.status === "running" ? "Processing" : job.status === "succeeded" ? "Completed" : "Failed"}</strong>
                  <span>{job.stage.replaceAll("_", " ")}</span>
                  {job.total_items > 0 ? <span>{job.completed_items} of {job.total_items} items completed</span> : null}
                  {job.status === "failed" && job.retryable ? (
                    <button className="button button--secondary" disabled={Boolean(busyAction)} onClick={() => retryJob(action, job)} type="button">
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}
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
