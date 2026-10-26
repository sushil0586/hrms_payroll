"use client";

import { WorkspaceTableScrollRegion } from "@/components/patterns/workspace-table-scroll-region";


import { FormEvent, useCallback, useState } from "react";

import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import type { FinancialCalendarWorkspace } from "@/lib/types";

type Props = {
  initialData: FinancialCalendarWorkspace;
  canManage: boolean;
  canClose: boolean;
  canReopen: boolean;
};

type RequestError = Error & { status?: number };

function messageFromPayload(payload: Record<string, unknown>, fallback: string) {
  const detail = payload.detail;
  if (typeof detail === "string") return detail;
  const first = Object.values(payload)[0];
  if (Array.isArray(first)) return first.map(String).join(" ");
  if (typeof first === "string") return first;
  return fallback;
}

async function requestJson(path: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    const error = new Error("The service response was interrupted, so the outcome is unconfirmed. Refresh the registers before deciding whether to try again.") as RequestError;
    error.status = 0;
    throw error;
  }
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const error = new Error(messageFromPayload(payload, `Request failed with status ${response.status}.`)) as RequestError;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function FinancialCalendarWorkbench({ initialData, canManage, canClose, canReopen }: Props) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<(() => Promise<void>) | null>(null);
  const [transitionInput, setTransitionInput] = useState<{ period: FinancialCalendarWorkspace["accounting_periods"][number]; action: "close" | "reopen" } | null>(null);
  const [calendar, setCalendar] = useState({ code: "", name: "", legal_entity_id: "", start_month: "4", start_day: "1", country_code: "IN", timezone: "Asia/Kolkata", effective_from: "2026-04-01" });
  const [year, setYear] = useState({ calendar_id: "", code: "", start_date: "2026-04-01", end_date: "2027-03-31" });
  const [period, setPeriod] = useState({ fiscal_year_id: "", legal_entity_id: "", code: "", name: "", sequence: "1", start_date: "2026-04-01", end_date: "2026-04-30" });
  const [reason, setReason] = useState("");

  const refresh = useCallback(async () => {
    const next = await requestJson("/api/tenant-admin/financial-calendars") as unknown as FinancialCalendarWorkspace;
    setData(next);
  }, []);

  async function execute(key: string, operation: () => Promise<void>, success: string) {
    if (pending) return;
    setPending(key);
    setError("");
    setNotice("");
    setRetry(null);
    let confirmed = false;
    try {
      await operation();
      confirmed = true;
      setNotice(success);
      try {
        await refresh();
      } catch {
        setError("The change was confirmed, but the full register refresh failed. Refresh the registers; do not repeat the change.");
        setRetry(() => refresh);
      }
    } catch (caught) {
      const requestError = caught as RequestError;
      setError(requestError instanceof Error ? requestError.message : "The operation failed. Review the values and retry.");
      if (requestError.status && requestError.status > 0) setRetry(() => operation);
    } finally {
      setPending(null);
    }
    return confirmed;
  }

  function submitCalendar(event: FormEvent) {
    event.preventDefault();
    const operation = async () => {
      await requestJson("/api/tenant-admin/financial-calendars/calendars", {
        method: "POST",
        body: JSON.stringify({ ...calendar, legal_entity_id: calendar.legal_entity_id || null, start_month: Number(calendar.start_month), start_day: Number(calendar.start_day), version: 1, status: "active", is_default: true }),
      });
    };
    void execute("calendar", operation, "Fiscal calendar saved after backend confirmation.");
  }

  function submitYear(event: FormEvent) {
    event.preventDefault();
    const operation = async () => {
      await requestJson("/api/tenant-admin/financial-calendars/years", {
        method: "POST",
        body: JSON.stringify({ ...year, status: "open", version: 1 }),
      });
    };
    void execute("year", operation, "Financial year saved after backend confirmation.");
  }

  function submitPeriod(event: FormEvent) {
    event.preventDefault();
    const operation = async () => {
      await requestJson("/api/tenant-admin/financial-calendars/periods", {
        method: "POST",
        body: JSON.stringify({ ...period, legal_entity_id: period.legal_entity_id || null, sequence: Number(period.sequence), kind: "standard", status: "open" }),
      });
    };
    void execute("period", operation, "Accounting period saved after backend confirmation.");
  }

  function transition(periodId: string, action: "close" | "reopen", eventCount: number) {
    if (reason.trim().length < 8) return;
    const requestKey = `browser-${action}-${periodId}-${eventCount}`;
    const operation = async () => {
      await requestJson(`/api/tenant-admin/financial-calendars/periods/${periodId}/transition`, {
        method: "POST",
        body: JSON.stringify({ action, reason, request_key: requestKey }),
      });
    };
    void execute(`${action}-${periodId}`, operation, `Accounting period ${action === "close" ? "closed" : "reopened"} with an audit event.`).then((confirmed) => {
      if (confirmed) {
        setTransitionInput(null);
        setReason("");
      }
    });
  }

  return (
    <div className="section-stack" aria-busy={Boolean(pending)}>
      <div className="sr-only" role="status" aria-live="polite">{pending ? "Financial calendar operation in progress." : notice}</div>
      {error ? <div className="notice notice--error" role="alert"><strong>Action not completed.</strong> {error} {retry ? <button className="button button--secondary button--compact" type="button" onClick={() => void execute("retry", retry, "Registers refreshed after backend confirmation.")}>Retry</button> : null}</div> : null}
      {notice ? <div className="notice" role="status"><strong>{notice}</strong></div> : null}

      <div aria-label="Financial calendar summary" className="tenant-access-summary-strip" role="group">
        <article><span>Calendars</span><strong>{data.calendars.length}</strong><small>Tenant and entity scopes</small></article>
        <article><span>Financial years</span><strong>{data.fiscal_years.length}</strong><small>Explicit boundaries</small></article>
        <article><span>Open periods</span><strong>{data.accounting_periods.filter((item) => item.status === "open").length}</strong><small>Posting available</small></article>
        <article><span>Closed / locked</span><strong>{data.accounting_periods.filter((item) => item.status === "closed" || item.status === "locked").length}</strong><small>Controlled history</small></article>
      </div>

      <div className="tenant-plan-command-band tenant-financial-command-band">
        <div><span className="workspace-card__eyebrow">Fiscal setup order</span><h2>Build boundaries before controlling posting.</h2></div>
        <ol aria-label="Fiscal calendar setup workflow"><li><strong>1</strong><span>Create the scoped calendar.</span></li><li><strong>2</strong><span>Define the financial year.</span></li><li><strong>3</strong><span>Add and govern posting periods.</span></li></ol>
      </div>

      {canManage ? <section className="panel-card-soft" aria-labelledby="calendar-create-heading">
        <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Calendar scope</span><h2 id="calendar-create-heading">Create fiscal calendar</h2></div></div>
        <form className="form-grid" onSubmit={submitCalendar}>
          <label className="form-field"><span>Calendar code</span><input className="input-control" required value={calendar.code} onChange={(event) => setCalendar({ ...calendar, code: event.target.value })} /></label>
          <label className="form-field"><span>Calendar name</span><input className="input-control" required value={calendar.name} onChange={(event) => setCalendar({ ...calendar, name: event.target.value })} /></label>
          <label className="form-field"><span>Legal entity override</span><select className="input-control" value={calendar.legal_entity_id} onChange={(event) => setCalendar({ ...calendar, legal_entity_id: event.target.value })}><option value="">Tenant default</option>{data.legal_entities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>Start month</span><input className="input-control" type="number" min="1" max="12" required value={calendar.start_month} onChange={(event) => setCalendar({ ...calendar, start_month: event.target.value })} /></label>
          <label className="form-field"><span>Start day</span><input className="input-control" type="number" min="1" max="31" required value={calendar.start_day} onChange={(event) => setCalendar({ ...calendar, start_day: event.target.value })} /></label>
          <label className="form-field"><span>Effective from</span><input className="input-control" type="date" required value={calendar.effective_from} onChange={(event) => setCalendar({ ...calendar, effective_from: event.target.value })} /></label>
          <label className="form-field"><span>Country code</span><input className="input-control" maxLength={2} value={calendar.country_code} onChange={(event) => setCalendar({ ...calendar, country_code: event.target.value.toUpperCase() })} /></label>
          <label className="form-field"><span>Timezone</span><input className="input-control" required value={calendar.timezone} onChange={(event) => setCalendar({ ...calendar, timezone: event.target.value })} /></label>
          <AsyncActionButton className="button button--primary" pending={pending === "calendar"} pendingLabel="Saving fiscal calendar">Save fiscal calendar</AsyncActionButton>
        </form>
      </section> : null}

      {canManage ? <section className="panel-card-soft" aria-labelledby="year-create-heading">
        <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Explicit boundaries</span><h2 id="year-create-heading">Create financial year</h2></div></div>
        <form className="form-grid" onSubmit={submitYear}>
          <label className="form-field"><span>Fiscal calendar</span><select className="input-control" required value={year.calendar_id} onChange={(event) => setYear({ ...year, calendar_id: event.target.value })}><option value="">Select calendar</option>{data.calendars.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>Financial year code</span><input className="input-control" required value={year.code} onChange={(event) => setYear({ ...year, code: event.target.value })} /></label>
          <label className="form-field"><span>Financial year start</span><input className="input-control" type="date" required value={year.start_date} onChange={(event) => setYear({ ...year, start_date: event.target.value })} /></label>
          <label className="form-field"><span>Financial year end</span><input className="input-control" type="date" required value={year.end_date} onChange={(event) => setYear({ ...year, end_date: event.target.value })} /></label>
          <AsyncActionButton className="button button--primary" pending={pending === "year"} pendingLabel="Saving financial year">Save financial year</AsyncActionButton>
        </form>
      </section> : null}

      {canManage ? <section className="panel-card-soft" aria-labelledby="period-create-heading">
        <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Posting control</span><h2 id="period-create-heading">Create accounting period</h2></div></div>
        <form className="form-grid" onSubmit={submitPeriod}>
          <label className="form-field"><span>Financial year</span><select className="input-control" required value={period.fiscal_year_id} onChange={(event) => setPeriod({ ...period, fiscal_year_id: event.target.value })}><option value="">Select year</option>{data.fiscal_years.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label>
          <label className="form-field"><span>Period legal entity</span><select className="input-control" value={period.legal_entity_id} onChange={(event) => setPeriod({ ...period, legal_entity_id: event.target.value })}><option value="">Calendar scope</option>{data.legal_entities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="form-field"><span>Accounting period code</span><input className="input-control" required value={period.code} onChange={(event) => setPeriod({ ...period, code: event.target.value })} /></label>
          <label className="form-field"><span>Accounting period name</span><input className="input-control" required value={period.name} onChange={(event) => setPeriod({ ...period, name: event.target.value })} /></label>
          <label className="form-field"><span>Sequence</span><input className="input-control" type="number" min="1" required value={period.sequence} onChange={(event) => setPeriod({ ...period, sequence: event.target.value })} /></label>
          <label className="form-field"><span>Accounting period start</span><input className="input-control" type="date" required value={period.start_date} onChange={(event) => setPeriod({ ...period, start_date: event.target.value })} /></label>
          <label className="form-field"><span>Accounting period end</span><input className="input-control" type="date" required value={period.end_date} onChange={(event) => setPeriod({ ...period, end_date: event.target.value })} /></label>
          <AsyncActionButton className="button button--primary" pending={pending === "period"} pendingLabel="Saving accounting period">Save accounting period</AsyncActionButton>
        </form>
      </section> : null}

      <section className="panel-card-soft" aria-labelledby="calendar-register-heading">
        <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Persisted configuration</span><h2 id="calendar-register-heading">Calendar register</h2></div></div>
        <WorkspaceTableScrollRegion label="Fiscal calendars scroll region" className="responsive-table-wrap workspace-table-region"><table className="data-table" aria-label="Fiscal calendars"><thead><tr><th>Calendar</th><th>Scope</th><th>Boundary</th><th>Effective</th><th>Status</th></tr></thead><tbody>{data.calendars.map((item) => <tr key={item.id} data-testid={`fiscal-calendar-${item.id}`}><td><strong>{item.name}</strong><small>{item.code} v{item.version}</small></td><td>{item.legal_entity_name || "Tenant default"}</td><td>{item.start_day}/{item.start_month}</td><td>{item.effective_from}</td><td>{item.status}</td></tr>)}</tbody></table></WorkspaceTableScrollRegion>
      </section>

      <section className="panel-card-soft" aria-labelledby="period-register-heading">
        <div className="tenant-console-panel__header"><div><span className="workspace-card__eyebrow">Audited lifecycle</span><h2 id="period-register-heading">Accounting period register</h2><p className="tenant-console-empty">Close and reopen require a scoped permission, a review dialog, and an audit reason.</p></div></div>
        <WorkspaceTableScrollRegion label="Accounting periods scroll region" className="responsive-table-wrap workspace-table-region"><table className="data-table" aria-label="Accounting periods"><thead><tr><th>Period</th><th>Dates</th><th>Status</th><th>Audit</th><th>Action</th></tr></thead><tbody>{data.accounting_periods.map((item) => <tr key={item.id} data-testid={`accounting-period-${item.id}`}><td><strong>{item.name}</strong><small>{item.code}</small></td><td>{item.start_date} to {item.end_date}</td><td><WorkspaceStatusBadge tone={item.status === "open" ? "success" : "neutral"}>{item.status}</WorkspaceStatusBadge></td><td>{item.status_events.length} event{item.status_events.length === 1 ? "" : "s"}</td><td>{item.status === "open" && canClose ? <button className="button button--secondary button--compact" onClick={() => { setReason(""); setError(""); setTransitionInput({ period: item, action: "close" }); }} type="button">Close</button> : item.status === "closed" && canReopen ? <button className="button button--secondary button--compact" onClick={() => { setReason(""); setError(""); setTransitionInput({ period: item, action: "reopen" }); }} type="button">Reopen</button> : <span>Read only</span>}</td></tr>)}</tbody></table></WorkspaceTableScrollRegion>
      </section>

      {transitionInput ? <HrAdminActionModal busy={Boolean(pending)} closeHref="/tenant-admin/financial-calendars" labelledBy="financial-period-transition-title" title={`${transitionInput.action === "close" ? "Close" : "Reopen"} accounting period`} description={`${transitionInput.period.code}: review the governed state change and record the actual authorization or correction reason.`} onClose={() => { if (!pending) setTransitionInput(null); }}>
        <form className="form-shell-card" onSubmit={(event) => { event.preventDefault(); transition(transitionInput.period.id, transitionInput.action, transitionInput.period.status_events.length); }}>
          {error ? <div role="alert" className="notice notice--danger">{error}</div> : null}
          <div className="tenant-modal__member-summary"><strong>{transitionInput.period.name}</strong><span>{transitionInput.period.start_date} to {transitionInput.period.end_date} · Current state: {transitionInput.period.status}</span></div>
          <label className="form-field"><span>Reason</span><textarea className="input-control" required minLength={8} value={reason} disabled={Boolean(pending)} onChange={(event) => setReason(event.target.value)} /></label>
          <div className="button-row"><AsyncActionButton className="button button--primary" disabled={reason.trim().length < 8} pending={pending === `${transitionInput.action}-${transitionInput.period.id}`} pendingLabel="Updating accounting period" type="submit">Confirm {transitionInput.action}</AsyncActionButton><button className="button button--secondary" disabled={Boolean(pending)} onClick={() => setTransitionInput(null)} type="button">Cancel</button></div>
        </form>
      </HrAdminActionModal> : null}
    </div>
  );
}
