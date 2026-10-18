"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AsyncActionButton } from "@/components/patterns/async-action-button";
import type { HrAdminPolicyWorkbenchOptions, LeaveHistoricalClassification, LeavePolicyPeriod, LeaveYearCloseRun } from "@/lib/types";

type Props = {
  portal: "hr-admin" | "tenant-admin";
  periods: LeavePolicyPeriod[];
  runs: LeaveYearCloseRun[];
  classification: LeaveHistoricalClassification;
  options: Pick<HrAdminPolicyWorkbenchOptions, "leave_policies" | "legal_entities">;
  canManage: boolean;
  canClose: boolean;
  canReopen: boolean;
};

type Preview = {
  balance_count: number;
  totals: Record<string, string>;
  confirmation_phrase: string;
};

function errorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as Record<string, unknown>;
  if (typeof value.detail === "string") return value.detail;
  const first = Object.values(value)[0];
  return Array.isArray(first) ? String(first[0]) : fallback;
}

export function LeaveYearWorkbench({ portal, periods, runs, classification, options, canManage, canClose, canReopen }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [closeInput, setCloseInput] = useState({ source_period_id: "", target_period_id: "", carry_forward_cap: "0.00", expiring_units: "0.00", expiry_date: "", scheduled_for: "", confirmation: "" });
  const activeRuns = useMemo(() => runs.some((item) => item.status === "queued" || item.status === "running"), [runs]);

  useEffect(() => {
    if (!activeRuns) return;
    const timer = window.setInterval(() => router.refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [activeRuns, router]);

  async function request(path: string, init: RequestInit) {
    setError("");
    setMessage("");
    const response = await fetch(`/api/${portal}/leave-year/${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(errorMessage(payload, "The leave-year operation could not be completed."));
    return payload;
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("period");
    try {
      const form = new FormData(event.currentTarget);
      const values = Object.fromEntries(form.entries());
      await request("periods/", { method: "POST", body: JSON.stringify({ ...values, legal_entity_id: values.legal_entity_id || null }) });
      setMessage("Leave-year period created.");
      event.currentTarget.reset();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the leave-year period.");
    } finally {
      setBusy(null);
    }
  }

  function closePayload() {
    return {
      ...closeInput,
      expiry_date: closeInput.expiry_date || null,
      scheduled_for: closeInput.scheduled_for ? new Date(closeInput.scheduled_for).toISOString() : null,
      idempotency_key: `leave-close:${closeInput.source_period_id}:${closeInput.target_period_id}`,
    };
  }

  async function previewClose() {
    setBusy("preview");
    try {
      setPreview(await request("preview/", { method: "POST", body: JSON.stringify(closePayload()) }) as Preview);
      setMessage("Preview calculated from current governed balances. No records were changed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to preview leave-year close.");
    } finally {
      setBusy(null);
    }
  }

  async function commitClose() {
    setBusy("close");
    try {
      await request("close-runs/", { method: "POST", body: JSON.stringify(closePayload()) });
      setMessage("Leave-year close accepted. Its durable status will remain visible after refresh.");
      setPreview(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to queue leave-year close.");
    } finally {
      setBusy(null);
    }
  }

  async function transition(period: LeavePolicyPeriod, action: "close" | "reopen") {
    setBusy(`${action}:${period.id}`);
    try {
      await request(`periods/${period.id}/transition/`, {
        method: "POST",
        body: JSON.stringify({ action, reason: `${action === "close" ? "Approved year-end close" : "Authorized correction window"} for ${period.code}.`, idempotency_key: `${action}:${period.id}:${period.reopen_count}` }),
      });
      setMessage(`${period.code} ${action === "close" ? "closed" : "reopened"}.`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to ${action} the leave period.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div aria-busy={Boolean(busy)} className="queue-layout">
      <div aria-live="polite" className="sr-only">{busy ? "Leave-year operation in progress." : message || error}</div>
      {error ? <div className="notice notice--danger" role="alert"><strong>Action required.</strong><span>{error}</span></div> : null}
      {message ? <div className="notice notice--success" role="status"><strong>Updated.</strong><span>{message}</span></div> : null}

      <section className="section panel-card-soft" aria-labelledby="leave-periods-title">
        <div className="section-heading-row"><div><h2 className="section-heading-soft" id="leave-periods-title">Governed leave-year periods</h2><p className="section-copy-soft">Legal-entity periods take precedence over tenant-wide policy periods. Dates become historical boundaries once ledger records reference them.</p></div></div>
        <div className="table-scroll"><table><thead><tr><th>Period</th><th>Policy</th><th>Scope</th><th>Dates</th><th>Status</th><th>Control</th></tr></thead><tbody>
          {periods.map((period) => <tr key={period.id}><td><strong>{period.code}</strong></td><td>{period.leave_policy_name}</td><td>{period.legal_entity_name || "Tenant default"}</td><td>{period.start_date} to {period.end_date}</td><td>{period.status}</td><td className="table-actions">
            {period.status === "open" && canClose ? <AsyncActionButton className="button button--secondary button--compact" pending={busy === `close:${period.id}`} pendingLabel="Closing" onClick={() => transition(period, "close")} type="button">Close period</AsyncActionButton> : null}
            {period.status === "closed" && canReopen ? <AsyncActionButton className="button button--secondary button--compact" pending={busy === `reopen:${period.id}`} pendingLabel="Reopening" onClick={() => transition(period, "reopen")} type="button">Reopen</AsyncActionButton> : null}
          </td></tr>)}
          {!periods.length ? <tr><td colSpan={6}>No governed leave-year periods are configured.</td></tr> : null}
        </tbody></table></div>
        {canManage ? <form className="form-grid" onSubmit={createPeriod}>
          <label className="form-field"><span>Leave policy</span><select className="input-control" name="leave_policy_id" required><option value="">Select policy</option>{options.leave_policies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>Legal entity scope</span><select className="input-control" name="legal_entity_id"><option value="">Tenant default</option>{options.legal_entities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>Period code</span><input className="input-control" name="code" placeholder="FY-2027" required /></label>
          <label className="form-field"><span>Start date</span><input className="input-control" name="start_date" type="date" required /></label>
          <label className="form-field"><span>End date</span><input className="input-control" name="end_date" type="date" required /></label>
          <label className="form-field"><span>Initial state</span><select className="input-control" name="status"><option value="planned">Planned</option><option value="open">Open</option></select></label>
          <AsyncActionButton className="button button--primary" pending={busy === "period"} pendingLabel="Creating period" type="submit">Create period</AsyncActionButton>
        </form> : null}
      </section>

      {canClose ? <section className="section panel-card-soft" aria-labelledby="close-preview-title">
        <div className="section-heading-row"><div><h2 className="section-heading-soft" id="close-preview-title">Preview and schedule year close</h2><p className="section-copy-soft">Preview is read-only. Commit requires the exact confirmation phrase and creates one idempotent durable job.</p></div></div>
        <div className="form-grid">
          <label className="form-field"><span>Source period</span><select className="input-control" value={closeInput.source_period_id} onChange={(event) => { setCloseInput({ ...closeInput, source_period_id: event.target.value, confirmation: "" }); setPreview(null); }}><option value="">Select source</option>{periods.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.leave_policy_name}</option>)}</select></label>
          <label className="form-field"><span>Target period</span><select className="input-control" value={closeInput.target_period_id} onChange={(event) => { setCloseInput({ ...closeInput, target_period_id: event.target.value }); setPreview(null); }}><option value="">Select target</option>{periods.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.leave_policy_name}</option>)}</select></label>
          <label className="form-field"><span>Carry-forward cap per employee</span><input className="input-control" min="0" step="0.01" type="number" value={closeInput.carry_forward_cap} onChange={(event) => { setCloseInput({ ...closeInput, carry_forward_cap: event.target.value }); setPreview(null); }} /></label>
          <label className="form-field"><span>Expiring units per employee</span><input className="input-control" min="0" step="0.01" type="number" value={closeInput.expiring_units} onChange={(event) => { setCloseInput({ ...closeInput, expiring_units: event.target.value }); setPreview(null); }} /></label>
          <label className="form-field"><span>Expiry date</span><input className="input-control" type="date" value={closeInput.expiry_date} onChange={(event) => { setCloseInput({ ...closeInput, expiry_date: event.target.value }); setPreview(null); }} /></label>
          <label className="form-field"><span>Schedule time (optional)</span><input className="input-control" type="datetime-local" value={closeInput.scheduled_for} onChange={(event) => setCloseInput({ ...closeInput, scheduled_for: event.target.value })} /></label>
        </div>
        <div className="button-row"><AsyncActionButton className="button button--secondary" disabled={!closeInput.source_period_id || !closeInput.target_period_id} pending={busy === "preview"} pendingLabel="Calculating preview" onClick={previewClose} type="button">Preview impact</AsyncActionButton></div>
        {preview ? <div className="notice"><strong>{preview.balance_count} balances reviewed.</strong><span>{preview.totals.carried} carried, {preview.totals.forfeited} forfeited, {preview.totals.expiring} marked to expire.</span><label className="form-field"><span>Type {preview.confirmation_phrase}</span><input className="input-control" value={closeInput.confirmation} onChange={(event) => setCloseInput({ ...closeInput, confirmation: event.target.value })} /></label><AsyncActionButton className="button button--primary" disabled={closeInput.confirmation !== preview.confirmation_phrase} pending={busy === "close"} pendingLabel="Accepting close" onClick={commitClose} type="button">Confirm year close</AsyncActionButton></div> : null}
      </section> : null}

      <section className="section panel-card-soft" aria-labelledby="close-runs-title"><div className="section-heading-row"><div><h2 className="section-heading-soft" id="close-runs-title">Year-close status</h2><p className="section-copy-soft">Queued and running jobs refresh automatically; completed results remain durable after navigation or connection loss.</p></div></div><div className="table-scroll"><table><thead><tr><th>Policy</th><th>Status</th><th>Schedule</th><th>Processed</th><th>Attempts</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td>{run.leave_policy_name}</td><td>{run.status}</td><td>{run.scheduled_for || "Immediate"}</td><td>{run.processed_count} succeeded / {run.failed_count} failed</td><td>{run.attempt_count}</td></tr>)}{!runs.length ? <tr><td colSpan={5}>No leave-year close runs have been requested.</td></tr> : null}</tbody></table></div></section>

      <section className="section panel-card-soft" aria-labelledby="history-title"><div className="section-heading-row"><div><h2 className="section-heading-soft" id="history-title">Historical classification</h2><p className="section-copy-soft">Read-only analysis only. No historical balance or ledger transaction is changed automatically.</p></div></div><div className="attendance-summary-strip"><span><strong>{classification.balance_counts.unclassified ?? 0}</strong> unclassified balances</span><span><strong>{classification.balance_counts.unambiguous_candidate ?? 0}</strong> balance candidates</span><span><strong>{classification.transaction_counts.unclassified ?? 0}</strong> unclassified transactions</span><span><strong>{classification.transaction_counts.ambiguous ?? 0}</strong> ambiguous transactions</span></div></section>

      <section className="section panel-card-soft" aria-labelledby="policy-decisions-title"><div className="section-heading-row"><div><h2 className="section-heading-soft" id="policy-decisions-title">Lifecycle decisions awaiting approval</h2><p className="section-copy-soft">No implicit rule is applied for these cases.</p></div></div><ul><li>Cross-entity transfer: preserve, convert, encash, or forfeit entitlement.</li><li>Rehire and anniversary-cycle proration.</li><li>Post-expiry cancellation: re-expire, restore, or create a controlled correction.</li></ul></section>
    </div>
  );
}
