"use client";

import { MetricTile } from "@/components/patterns/metric-tile";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { WorkspaceFormControls } from "@/components/patterns/workspace-form-controls";
import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { apiErrorMessage, mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { formatWorkspaceDateTime } from "@/lib/ui/date-time-format";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
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

export function LeaveYearWorkbench({ portal, periods: initialPeriods, runs: initialRuns, classification, options, canManage, canClose, canReopen }: Props) {
  const [periodSnapshot, setPeriodSnapshot] = useState<{base: LeavePolicyPeriod[]; items: LeavePolicyPeriod[]} | null>(null);
  const [runSnapshot, setRunSnapshot] = useState<{base: LeaveYearCloseRun[]; items: LeaveYearCloseRun[]} | null>(null);
  const periods = periodSnapshot?.base === initialPeriods ? periodSnapshot.items : initialPeriods;
  const runs = runSnapshot?.base === initialRuns ? runSnapshot.items : initialRuns;
  const [pollError, setPollError] = useState("");
  const [pollRetry, setPollRetry] = useState(0);
  function updatePeriod(item: LeavePolicyPeriod) {
    setPeriodSnapshot(current => ({base: initialPeriods, items: [...(current?.base === initialPeriods ? current.items : initialPeriods).filter(period => period.id !== item.id), item]}));
  }
  function updateRun(item: LeaveYearCloseRun) {
    setRunSnapshot(current => ({base: initialRuns, items: [item, ...(current?.base === initialRuns ? current.items : initialRuns).filter(run => run.id !== item.id)]}));
  }
  const inFlight = useRef(false);
  const periodTable = useRef<HTMLTableElement>(null);
  const focusPeriod = useRef<string | null>(null);
  const [transitionInput, setTransitionInput] = useState<{period: LeavePolicyPeriod; action: "close" | "reopen" | "lock"} | null>(null);
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (transitionInput || !focusPeriod.current) return;
    const row = periodTable.current?.querySelector<HTMLTableRowElement>(`tr[data-period-id="${focusPeriod.current}"]`);
    (row?.querySelector<HTMLButtonElement>("button") ?? document.getElementById("leave-periods-title"))?.focus();
    focusPeriod.current = null;
  }, [periods, transitionInput]);
  function startOperation(key: string) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setBusy(key);
    return true;
  }
  function finishOperation() { inFlight.current = false; setBusy(null); }

  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [closeInput, setCloseInput] = useState({ source_period_id: "", target_period_id: "", carry_forward_cap: "0.00", expiring_units: "0.00", expiry_date: "", scheduled_for: "", confirmation: "" });
  const activeRuns = useMemo(() => runs.some((item) => item.status === "queued" || item.status === "running"), [runs]);

  useEffect(() => {
    if (!activeRuns) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(`/api/${portal}/leave-year/close-runs`, {cache: "no-store", signal: controller.signal});
        if (!response.ok) throw new Error("Close status could not be refreshed. Last loaded status is shown.");
        const items = await response.json() as LeaveYearCloseRun[];
        if (!Array.isArray(items)) throw new Error("Close status is unavailable. Last loaded status is shown.");
        if (!controller.signal.aborted) { setRunSnapshot({base: initialRuns, items}); setPollError(""); }
      } catch (caught) {
        if (!controller.signal.aborted) setPollError(caught instanceof Error ? caught.message : "Close status could not be refreshed.");
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(poll, 3000);
      }
    }
    const stop = () => { controller.abort(); clearTimeout(timer); };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) setPollRetry(value => value + 1); };
    window.addEventListener("pagehide", stop);
    window.addEventListener("pageshow", restore);
    void poll();
    return () => {
      window.removeEventListener("pagehide", stop);
      window.removeEventListener("pageshow", restore);
      stop();
    };
  }, [activeRuns, portal, initialRuns, pollRetry]);

  async function request(path: string, init: RequestInit) {
    setError("");
    setMessage("");
    const readOnly = path === "preview/";
    let response: Response;
    try {
      response = await fetch(`/api/${portal}/leave-year/${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
    } catch {
      throw new Error(readOnly ? "Unable to load the preview. Check your connection and retry preview; preview does not change records." : networkMutationMessage);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(readOnly
      ? response.status >= 500 ? "The preview service is unavailable. Retry preview; preview does not change records." : apiErrorMessage(payload, "Unable to calculate the preview. Review the selected periods and values.")
      : mutationErrorMessage(payload, response.status, "The leave-year operation could not be completed. Review the period status and authorization guidance."));
    return payload;
  }

  async function createPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startOperation("period")) return;
    const formElement = event.currentTarget;
    try {
      const form = new FormData(formElement);
      const values = Object.fromEntries(form.entries());
      const created = await request("periods/", { method: "POST", body: JSON.stringify({ ...values, legal_entity_id: values.legal_entity_id || null }) });
      updatePeriod(created as LeavePolicyPeriod);
      setMessage("Leave-year period created.");
      formElement.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create the leave-year period.");
    } finally {
      finishOperation();
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
    if (!startOperation("preview")) return;
    setPreview(null);
    try {
      setPreview(await request("preview/", { method: "POST", body: JSON.stringify(closePayload()) }) as Preview);
      setMessage("Preview calculated from current governed balances. No records were changed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to preview leave-year close.");
    } finally {
      finishOperation();
    }
  }

  async function commitClose() {
    if (!preview || closeInput.confirmation !== preview.confirmation_phrase || !startOperation("close")) return;
    try {
      const accepted = await request("close-runs/", { method: "POST", body: JSON.stringify(closePayload()) });
      updateRun(accepted as LeaveYearCloseRun);
      setMessage("Leave-year close accepted. Check Year-close status for completion or failures; acceptance does not mean the close has finished.");
      setPreview(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to queue leave-year close.");
    } finally {
      finishOperation();
    }
  }

  async function transition(period: LeavePolicyPeriod, action: "close" | "reopen" | "lock") {
    if (!reason.trim() || !startOperation(`${action}:${period.id}`)) return;
    try {
      const updated = await request(`periods/${period.id}/transition/`, {
        method: "POST",
        body: JSON.stringify({ action, reason: reason.trim(), idempotency_key: `${action}:${period.id}:${period.reopen_count}` }),
      });
      focusPeriod.current = period.id;
      updatePeriod(updated as LeavePolicyPeriod);
      setTransitionInput(null);
      setReason("");
      setMessage(`${period.code} ${action === "close" ? "closed" : action === "lock" ? "locked" : "reopened"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to ${action} the leave period.`);
    } finally {
      finishOperation();
    }
  }

  return (
    <div aria-busy={Boolean(busy)} className="queue-layout">
      <div aria-live="polite" className="sr-only">{busy ? "Leave-year operation in progress." : message || error}</div>
      {error ? <div className="notice notice--danger" role="alert"><strong>Action required.</strong><span>{error}</span></div> : null}
      {message ? <div className="notice notice--success" role="status"><strong>Updated.</strong><span>{message}</span></div> : null}

      <WorkspaceFormControls><fieldset className="workspace-form-controls" disabled={Boolean(busy)}>
      <section className="section panel-card-soft workspace-operation-card" aria-labelledby="leave-periods-title">
        <div className="section-heading-row"><div><h2 className="section-heading-soft" id="leave-periods-title" tabIndex={-1}>Governed leave-year periods</h2><p className="section-copy-soft">Legal-entity periods take precedence over tenant-wide policy periods. Dates become historical boundaries once ledger records reference them.</p></div></div>
        <WorkspaceTableScrollRegion className="table-scroll workspace-table-region" label="Leave-year periods table scroll"><table ref={periodTable} aria-label="Leave-year periods" className="data-table workspace-data-table"><thead><tr><th scope="col">Period</th><th scope="col">Policy</th><th scope="col">Scope</th><th scope="col">Dates</th><th scope="col">Status</th><th scope="col">Control</th></tr></thead><tbody>
          {periods.map((period) => <tr key={period.id} data-period-id={period.id}><td><strong>{period.code}</strong></td><td>{period.leave_policy_name}</td><td>{period.legal_entity_name || "Tenant default"}</td><td>{period.start_date} to {period.end_date}</td><td><WorkspaceStatusBadge tone={period.status === "open" ? "success" : "neutral"}>{period.status}</WorkspaceStatusBadge></td><td className="table-actions">
            {period.status === "open" && canClose ? <AsyncActionButton className="button button--secondary button--compact" pending={busy === `close:${period.id}`} pendingLabel="Closing" onClick={() => { setReason(""); setError(""); setTransitionInput({period, action: "close"}); }} type="button">Close period</AsyncActionButton> : null}
            {period.status === "closed" && canReopen ? <AsyncActionButton className="button button--secondary button--compact" pending={busy === `reopen:${period.id}`} pendingLabel="Reopening" onClick={() => { setReason(""); setError(""); setTransitionInput({period, action: "reopen"}); }} type="button">Reopen</AsyncActionButton> : null}
            {period.status === "closed" && canClose ? <button className="button button--secondary button--compact" onClick={() => { setReason(""); setError(""); setTransitionInput({period, action: "lock"}); }} type="button">Lock period</button> : null}
            {period.status === "planned" ? <span className="muted">Planned; opening is currently unavailable.</span> : null}
            {period.status === "locked" ? <span className="muted">Locked historical period</span> : null}
          </td></tr>)}
          {!periods.length ? <tr><td colSpan={6}>No governed leave-year periods are configured.</td></tr> : null}
        </tbody></table></WorkspaceTableScrollRegion>
        {canManage ? <form className="form-grid" onSubmit={createPeriod}>
          <label className="form-field"><span>Leave policy</span><select aria-label="Leave policy" className="input-control" name="leave_policy_id" required><option value="">Select policy</option>{options.leave_policies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>Legal entity scope</span><select aria-label="Legal entity scope" className="input-control" name="legal_entity_id"><option value="">Tenant default</option>{options.legal_entities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>Period code</span><input className="input-control" name="code" placeholder="FY-2027" required /></label>
          <label className="form-field"><span>Start date</span><input className="input-control" name="start_date" type="date" required /></label>
          <label className="form-field"><span>End date</span><input className="input-control" name="end_date" type="date" required /></label>
          <label className="form-field"><span>Initial state</span><select aria-label="Initial state" className="input-control" name="status"><option value="planned">Planned</option><option value="open">Open</option></select></label>
          <AsyncActionButton className="button button--primary" pending={busy === "period"} pendingLabel="Creating period" type="submit">Create period</AsyncActionButton>
        </form> : null}
      </section>

      {canClose ? <section className="section panel-card-soft workspace-operation-card" aria-labelledby="close-preview-title">
        <div className="section-heading-row"><div><h2 className="section-heading-soft" id="close-preview-title">Preview and schedule year close</h2><p className="section-copy-soft">Preview is read-only. Commit requires the exact confirmation phrase and creates one idempotent durable job.</p></div></div>
        <div className="form-grid">
          <label className="form-field"><span>Source period</span><select aria-label="Source period" className="input-control" value={closeInput.source_period_id} onChange={(event) => { setCloseInput({ ...closeInput, source_period_id: event.target.value, confirmation: "" }); setPreview(null); }}><option value="">Select source</option>{periods.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.leave_policy_name}</option>)}</select></label>
          <label className="form-field"><span>Target period</span><select aria-label="Target period" className="input-control" value={closeInput.target_period_id} onChange={(event) => { setCloseInput({ ...closeInput, target_period_id: event.target.value }); setPreview(null); }}><option value="">Select target</option>{periods.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.leave_policy_name}</option>)}</select></label>
          <label className="form-field"><span>Carry-forward cap per employee</span><input className="input-control" min="0" step="0.01" type="number" value={closeInput.carry_forward_cap} onChange={(event) => { setCloseInput({ ...closeInput, carry_forward_cap: event.target.value }); setPreview(null); }} /></label>
          <label className="form-field"><span>Expiring units per employee</span><input className="input-control" min="0" step="0.01" type="number" value={closeInput.expiring_units} onChange={(event) => { setCloseInput({ ...closeInput, expiring_units: event.target.value }); setPreview(null); }} /></label>
          <label className="form-field"><span>Expiry date</span><input className="input-control" type="date" value={closeInput.expiry_date} onChange={(event) => { setCloseInput({ ...closeInput, expiry_date: event.target.value }); setPreview(null); }} /></label>
          <label className="form-field"><span>Schedule time (local, optional)</span><input className="input-control" type="datetime-local" value={closeInput.scheduled_for} onChange={(event) => { setCloseInput({ ...closeInput, scheduled_for: event.target.value, confirmation: "" }); setPreview(null); }} /></label>
        </div>
        <div className="button-row"><AsyncActionButton className="button button--secondary" disabled={!closeInput.source_period_id || !closeInput.target_period_id} pending={busy === "preview"} pendingLabel="Calculating preview" onClick={previewClose} type="button">Preview impact</AsyncActionButton></div>
        {preview ? <div className="notice"><strong>{preview.balance_count} balances reviewed.</strong><span>{preview.totals.carried} carried, {preview.totals.forfeited} forfeited, {preview.totals.expiring} marked to expire.</span><label className="form-field"><span>Type {preview.confirmation_phrase}</span><input className="input-control" value={closeInput.confirmation} onChange={(event) => setCloseInput({ ...closeInput, confirmation: event.target.value })} /></label><AsyncActionButton className="button button--primary" disabled={closeInput.confirmation !== preview.confirmation_phrase} pending={busy === "close"} pendingLabel="Accepting close" onClick={commitClose} type="button">Confirm year close</AsyncActionButton></div> : null}
      </section> : null}

      </fieldset></WorkspaceFormControls>

      {pollError ? <div className="notice notice--warning" role="alert"><span>{pollError}</span><button type="button" className="button button--secondary" onClick={() => setPollRetry(value => value + 1)}>Retry status refresh</button></div> : null}
      <section className="section panel-card-soft workspace-operation-card" aria-labelledby="close-runs-title"><div className="section-heading-row"><div><h2 className="section-heading-soft" id="close-runs-title">Year-close status</h2><p className="section-copy-soft">Queued and running job statuses refresh automatically; completed results remain durable after navigation or connection loss.</p></div></div><WorkspaceTableScrollRegion className="table-scroll workspace-table-region" label="Leave-year close runs table scroll"><table aria-label="Leave-year close runs" className="data-table workspace-data-table"><thead><tr><th scope="col">Policy</th><th scope="col">Status</th><th scope="col">Schedule</th><th scope="col">Processed</th><th scope="col">Attempts</th></tr></thead><tbody>{runs.map((run) => <tr key={run.id}><td>{run.leave_policy_name}</td><td><WorkspaceStatusBadge tone={run.status === "failed" ? "danger" : run.status === "succeeded" ? "success" : "neutral"}>{run.status}</WorkspaceStatusBadge></td><td>{run.scheduled_for ? formatWorkspaceDateTime(run.scheduled_for) + " (Asia/Kolkata)" : "Immediate"}</td><td>{run.processed_count} succeeded / {run.failed_count} failed</td><td>{run.attempt_count}</td></tr>)}{!runs.length ? <tr><td colSpan={5}>No leave-year close runs have been requested.</td></tr> : null}</tbody></table></WorkspaceTableScrollRegion></section>

      <section className="section panel-card-soft workspace-operation-card" aria-labelledby="history-title"><div className="section-heading-row"><div><h2 className="section-heading-soft" id="history-title">Historical classification</h2><p className="section-copy-soft">Read-only analysis only. No historical balance or ledger transaction is changed automatically.</p></div></div><div className="workspace-metric-grid" role="group" aria-label="Historical classification summary"><MetricTile label="Unclassified balances" value={classification.balance_counts.unclassified ?? 0} /><MetricTile label="Balance candidates" value={classification.balance_counts.unambiguous_candidate ?? 0} /><MetricTile label="Unclassified transactions" value={classification.transaction_counts.unclassified ?? 0} /><MetricTile label="Ambiguous transactions" value={classification.transaction_counts.ambiguous ?? 0} /></div></section>

      <section className="section panel-card-soft workspace-operation-card" aria-labelledby="policy-decisions-title"><div className="section-heading-row"><div><h2 className="section-heading-soft" id="policy-decisions-title">Lifecycle decisions awaiting approval</h2><p className="section-copy-soft">No implicit rule is applied for these cases.</p></div></div><ul><li>Cross-entity transfer: preserve, convert, encash, or forfeit entitlement.</li><li>Rehire and anniversary-cycle proration.</li><li>Post-expiry cancellation: re-expire, restore, or create a controlled correction.</li></ul></section>
      {transitionInput ? <HrAdminActionModal closeHref={`/${portal}/leave-year`} labelledBy="period-transition-title" title={transitionInput.action === "close" ? "Close leave period" : transitionInput.action === "lock" ? "Lock leave period" : "Reopen leave period"} description={`${transitionInput.period.code}: this changes the governed period state. Enter the actual authorization or correction reason for the audit trail.`} onClose={() => { if (!inFlight.current) setTransitionInput(null); }} explicitTabOrder>
        <form className="form-shell-card" onSubmit={(event) => { event.preventDefault(); void transition(transitionInput.period, transitionInput.action); }}>
          {error ? <div role="alert" className="notice notice--danger">{error}</div> : null}
          <label className="form-field"><span>Reason</span><textarea className="input-control" required minLength={8} value={reason} disabled={Boolean(busy)} onChange={event => setReason(event.target.value)} /></label>
          <div className="button-row"><AsyncActionButton type="submit" className="button button--primary" pending={Boolean(busy)} pendingLabel="Updating period" disabled={reason.trim().length < 8}>Confirm {transitionInput.action}</AsyncActionButton><button type="button" className="button button--secondary" disabled={Boolean(busy)} onClick={() => setTransitionInput(null)}>Cancel</button></div>
        </form>
      </HrAdminActionModal> : null}
    </div>
  );
}
