"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminPayrollCalculationLine, HrAdminPayrollRunException } from "@/lib/types";

type Option = {
  value: string;
  label: string;
};

type Props = {
  reviewId: string | null;
  selectedException: HrAdminPayrollRunException | null;
  lines: HrAdminPayrollCalculationLine[];
  severityOptions: Option[];
};

function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) {
      return detail;
    }
    return JSON.stringify(payload);
  }
  return fallback;
}

export function PayrollReviewExceptionActions({ reviewId, selectedException, lines, severityOptions }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [category, setCategory] = useState("manual_review");
  const [severity, setSeverity] = useState(severityOptions[0]?.value ?? "warning");
  const [lineId, setLineId] = useState("");
  const [decision, setDecision] = useState("resolved");
  const [reason, setReason] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function createException() {
    if (!reviewId) {
      return;
    }
    setBusyAction("create");
    setNotice("");
    setError("");
    const response = await fetch(`/api/hr-admin/payroll-reviews/${reviewId}/exceptions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        detail,
        category,
        severity,
        calculation_line_id: lineId || null,
        config_snapshot: {
          source: "browser",
          category,
          severity,
        },
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusyAction(null);
    if (!response.ok) {
      setError(apiErrorMessage(payload, "Exception could not be created."));
      return;
    }
    setNotice("Exception created.");
    setTitle("");
    setDetail("");
    router.refresh();
  }

  async function decideException() {
    if (!selectedException) {
      return;
    }
    setBusyAction("decision");
    setNotice("");
    setError("");
    const response = await fetch(`/api/hr-admin/payroll-review-exceptions/${selectedException.id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reason }),
    });
    const payload = await response.json().catch(() => ({}));
    setBusyAction(null);
    if (!response.ok) {
      setError(apiErrorMessage(payload, "Exception decision could not be saved."));
      return;
    }
    setNotice("Exception decision saved.");
    router.refresh();
  }

  return (
    <section className="payroll-setup-assignment-panel payroll-review-exception-actions" aria-label="Exception actions">
      <div className="payroll-setup-panel__header payroll-setup-panel__header--split">
        <div>
          <span className="workspace-card__eyebrow">Exception controls</span>
          <h2>Exception actions</h2>
        </div>
        <span className="payroll-setup-count">{selectedException ? "1 selected" : "No selection"}</span>
      </div>

      <div className="payroll-close-actions-grid">
        <article className="payroll-close-action-card">
          <label className="form-field" htmlFor="payroll-review-exception-title">
            <span className="muted">Title</span>
            <input id="payroll-review-exception-title" className="input-control" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="form-field" htmlFor="payroll-review-exception-detail">
            <span className="muted">Detail</span>
            <textarea id="payroll-review-exception-detail" className="input-control" rows={3} value={detail} onChange={(event) => setDetail(event.target.value)} />
          </label>
          <label className="form-field" htmlFor="payroll-review-exception-category">
            <span className="muted">Category</span>
            <input id="payroll-review-exception-category" className="input-control" value={category} onChange={(event) => setCategory(event.target.value)} />
          </label>
          <label className="form-field" htmlFor="payroll-review-exception-severity">
            <span className="muted">Severity</span>
            <select id="payroll-review-exception-severity" className="input-control" value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {severityOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="form-field" htmlFor="payroll-review-exception-line">
            <span className="muted">Calculation line</span>
            <select id="payroll-review-exception-line" className="input-control" value={lineId} onChange={(event) => setLineId(event.target.value)}>
              <option value="">Run level</option>
              {lines.slice(0, 25).map((line) => (
                <option key={line.id} value={line.id}>{line.employee_code} / {line.component_code}</option>
              ))}
            </select>
          </label>
          <button className="button button--primary" type="button" disabled={!reviewId || !title || Boolean(busyAction)} onClick={createException}>
            {busyAction === "create" ? "Working..." : "Create exception"}
          </button>
        </article>

        <article className="payroll-close-action-card">
          <label className="form-field" htmlFor="payroll-review-exception-decision">
            <span className="muted">Decision</span>
            <select id="payroll-review-exception-decision" className="input-control" value={decision} onChange={(event) => setDecision(event.target.value)}>
              <option value="resolved">Resolved</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="form-field" htmlFor="payroll-review-exception-reason">
            <span className="muted">Decision reason</span>
            <textarea id="payroll-review-exception-reason" className="input-control" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <button className="button button--primary" type="button" disabled={!selectedException || Boolean(busyAction)} onClick={decideException}>
            {busyAction === "decision" ? "Working..." : "Save decision"}
          </button>
        </article>
      </div>

      {notice ? <p className="form-status form-status--success" role="status">{notice}</p> : null}
      {error ? <p className="form-status form-status--error" role="alert">{error}</p> : null}
    </section>
  );
}
