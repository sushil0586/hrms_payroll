"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { useWorkspaceQueryFilter } from "@/components/patterns/use-workspace-query-filter";
import { attendanceDateError } from "../attendance-records/filter-contract";
import { focusActionTrigger } from "@/lib/ui/focus-action-trigger";

type Close = { id:string; legal_entity_name:string; period_start:string; period_end:string; version:number; status:string; employee_count:number; attendance_record_count:number; blocker_count:number; reconciliation_snapshot:{ blockers?:Record<string,number>; payroll_impact?:{payable_units:string;lop_units:string}; status_counts?:Record<string,number>}; reopen_reason:string; events:Array<{id:string;event_type:string;actor:string;reason:string;occurred_at:string}> };
type Entity = { id:string; name:string; code:string };
function message(payload: Record<string, unknown>) {
  for (const value of Object.values(payload)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
    if (typeof value === "string") return value;
  }
  return "Operation failed. Retry safely.";
}
export function AttendanceCloseWorkbench({ canManage, canApprove }: { canManage:boolean; canApprove:boolean }) {
  const [items,setItems]=useState<Close[]>([]);
  const [entities,setEntities]=useState<Entity[]>([]);
  const [entity,setEntity]=useState(""); const [start,setStart]=useState(""); const [end,setEnd]=useState("");
  const [pending,setPending]=useState(""); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
  const [historyError,setHistoryError]=useState(false);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useWorkspaceQueryFilter("q", "");
  const [status,setStatus]=useWorkspaceQueryFilter("status", "all");
  const [reopen,setReopen]=useState<Close|null>(null);
  const [closing,setClosing]=useState<Close|null>(null);
  const [reason,setReason]=useState("");
  const errorRef=useRef<HTMLDivElement|null>(null);
  const modalErrorRef=useRef<HTMLParagraphElement|null>(null);
  const submitting=useRef(false);
  const request=useRef(0);
  const load=useCallback(async()=>{
    const sequence=++request.current;
    try {
      const response=await fetch("/api/hr-admin/attendance-closes",{cache:"no-store"});
      const payload=await response.json();
      if(!response.ok) throw new Error(message(payload));
      if(sequence!==request.current)return;
      setError("");setHistoryError(false);setItems(payload.items||[]); setEntities(payload.legal_entities||[]);
      setEntity(value=>value||payload.legal_entities?.[0]?.id||"");
    } catch(error) { if(sequence===request.current){setHistoryError(true);setError(error instanceof Error ? error.message : "Unable to load attendance close history.");} }
    finally { if(sequence===request.current)setLoading(false); }
  },[]);
  useEffect(()=>{
    let active = true;
    void Promise.resolve().then(()=>{if(active)return load();});
    return ()=>{active=false;};
  },[load]);
  useEffect(()=>{
    if(!error)return;
    (reopen||closing?modalErrorRef.current:errorRef.current)?.focus({preventScroll:true});
  },[closing,error,reopen]);
  async function mutate(key:string,url:string,body:Record<string,string>={}) {
    if(submitting.current)return;
    submitting.current=true; setPending(key); setError("");setHistoryError(false);setNotice("");
    try {
      const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const payload=await response.json();
      if(!response.ok)throw new Error(message(payload));
      setNotice(`${payload.status} confirmed for version ${payload.version}.`);
      setReopen(null);setClosing(null);setReason("");setLoading(true);await load();
    }catch(error){setError(error instanceof Error?error.message:"Operation failed. Retry safely.");}
    finally{submitting.current=false;setPending("");}
  }
  const visible=items.filter(item=>(status==="all"||item.status===status)&&[item.legal_entity_name,item.period_start,item.period_end,String(item.version)].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const closedCount=items.filter(item=>item.status==="closed").length;
  const blockerCount=items.reduce((total,item)=>total+item.blocker_count,0);
  return <section className="section" aria-label="Attendance close workspace" aria-busy={Boolean(pending)||loading}>
    <div className="attendance-summary-strip" role="group" aria-label="Attendance close summary">
      <span><strong>{items.length}</strong> close versions</span>
      <span><strong>{closedCount}</strong> closed</span>
      <span><strong>{blockerCount}</strong> blockers</span>
      <span><strong>{entities.length}</strong> legal entities</span>
    </div>
    <section className="panel-card-soft attendance-queue-toolbar" aria-label="Attendance reconciliation controls">
      <div className="queue-toolbar__header"><div><h2 className="section-heading-soft">Attendance reconciliation</h2><p className="section-copy section-copy-soft">Reconcile payable and LOP units, review blockers, and govern each monthly lock.</p></div><div className="queue-toolbar__meta"><span className="queue-summary-chip"><strong>{visible.length}</strong> in this view</span></div></div>
    {canManage&&<form aria-label="Reconcile attendance period" className="workspace-filter-bar attendance-record-filter-bar" onSubmit={event=>{
      event.preventDefault();const invalid=attendanceDateError(start,end);
      if(invalid){setHistoryError(false);setError(invalid);return;}
      void mutate("reconcile","/api/hr-admin/attendance-closes",{legal_entity_id:entity,period_start:start,period_end:end,idempotency_key:`${entity}:${start}:${end}`});
    }}>
      <label className="form-field"><span>Legal entity</span><select className="input-control" value={entity} onChange={event=>setEntity(event.target.value)} required disabled={loading||Boolean(pending)}>{entities.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="form-field"><span>Period start</span><input className="input-control" type="date" value={start} onChange={event=>setStart(event.target.value)} required /></label>
      <label className="form-field"><span>Period end</span><input className="input-control" type="date" value={end} onChange={event=>setEnd(event.target.value)} required /></label>
      <AsyncActionButton className="button button--primary" disabled={loading||Boolean(pending)||!entities.length} pending={pending==="reconcile"} pendingLabel="Reconciling" type="submit">Reconcile period</AsyncActionButton>
    </form>}
    <WorkspaceFilterBar><label className="form-field"><span>Search close history</span><input className="input-control" value={query} onChange={event=>setQuery(event.target.value)} type="search"/></label><label className="form-field"><span>Close status</span><select className="input-control" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All statuses</option>{Array.from(new Set(items.map(item=>item.status))).sort().map(value=><option key={value} value={value}>{value}</option>)}</select></label><button className="button button--secondary" type="button" onClick={()=>{setQuery("");setStatus("all");}}>Clear filters</button></WorkspaceFilterBar>
    </section>
    {loading&&<p role="status">Loading attendance close history…</p>}
    {error&&!reopen&&!closing&&<div className="notice notice--error" ref={errorRef} role="alert" tabIndex={-1}><p>{error}</p>{historyError?<button className="button button--secondary" onClick={()=>{setLoading(true);void load();}} disabled={loading||Boolean(pending)} type="button">Retry history</button>:null}</div>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    {!loading&&!error&&!visible.length&&<p className="notice">No attendance closes match this view.</p>}
    {!error&&<div className="record-list">{visible.map(item=><article className="record-card" key={item.id}>
      <div className="record-card__header"><div><strong>{item.legal_entity_name}: {item.period_start} to {item.period_end}</strong><p>Version {item.version} · {item.status}</p></div><WorkspaceStatusBadge tone={item.blocker_count?"warning":"neutral"}>{item.blocker_count} blockers</WorkspaceStatusBadge></div>
      <div className="metric-strip"><span><strong>{item.employee_count}</strong> employees</span><span><strong>{item.attendance_record_count}</strong> rows</span><span><strong>{item.reconciliation_snapshot.payroll_impact?.payable_units??"Unavailable"}</strong> payable</span><span><strong>{item.reconciliation_snapshot.payroll_impact?.lop_units??"Unavailable"}</strong> LOP</span></div>
      <div className="form-actions-bar__buttons">
        {canManage&&item.status==="draft"&&<AsyncActionButton className="button button--secondary" disabled={Boolean(pending)||loading} pending={pending===`${item.id}:submit`} pendingLabel="Submitting" onClick={()=>void mutate(`${item.id}:submit`,`/api/hr-admin/attendance-closes/${item.id}/submit/`)}>Submit</AsyncActionButton>}
        {canApprove&&item.status==="submitted"&&<AsyncActionButton className="button button--secondary" disabled={Boolean(pending)||loading} pending={pending===`${item.id}:approve`} pendingLabel="Approving" onClick={()=>void mutate(`${item.id}:approve`,`/api/hr-admin/attendance-closes/${item.id}/approve/`)}>Approve</AsyncActionButton>}
        {canApprove&&item.status==="approved"&&<button className="button button--primary" disabled={Boolean(pending)||loading} onClick={event=>{focusActionTrigger(event);setError("");setClosing(item);}} type="button">Close period</button>}
        {canApprove&&item.status==="closed"&&<button className="button button--danger" disabled={Boolean(pending)||loading} onClick={event=>{event.currentTarget.focus();setReason("");setReopen(item);}} type="button">Reopen</button>}
      </div>
      <details><summary>Audit trail</summary>{item.events.map(event=><p key={event.id}>{event.event_type} · {event.actor} · {new Date(event.occurred_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST{event.reason?` · ${event.reason}`:""}</p>)}</details>
    </article>)}</div>}
    {closing&&<HrAdminActionModal busy={pending===`${closing.id}:close`} closeHref="/hr-admin/attendance-close" onClose={()=>{if(!submitting.current)setClosing(null);}} labelledBy="attendance-close-confirm-title" title="Confirm attendance close" description={`${closing.period_start} to ${closing.period_end} · Version ${closing.version}`}>
      <div className="section form-layout-modern">
        <div className="notice notice--warning"><strong>This locks attendance history.</strong><span>Confirm only after the reconciled employee count, blockers, payable units, and LOP units are correct.</span></div>
        {error&&<p className="notice notice--error" ref={modalErrorRef} role="alert" tabIndex={-1}>{error}</p>}
        <div className="form-actions-bar"><span className="muted">This action is retained in the immutable close audit trail.</span><div className="form-actions-bar__buttons"><AsyncActionButton className="button button--primary" disabled={Boolean(pending)} pending={pending===`${closing.id}:close`} pendingLabel="Closing" onClick={()=>void mutate(`${closing.id}:close`,`/api/hr-admin/attendance-closes/${closing.id}/close/`)} type="button">Confirm close</AsyncActionButton><button className="button button--secondary" disabled={Boolean(pending)} onClick={()=>setClosing(null)} type="button">Cancel</button></div></div>
      </div>
    </HrAdminActionModal>}
    {reopen&&<HrAdminActionModal busy={pending===`${reopen.id}:reopen`} closeHref="/hr-admin/attendance-close" onClose={()=>{if(!submitting.current)setReopen(null);}} labelledBy="attendance-reopen-title" title="Governed attendance reopen" description={`${reopen.period_start} to ${reopen.period_end} · Version ${reopen.version}`}>
      <form onSubmit={event=>{event.preventDefault();if(reason.trim())void mutate(`${reopen.id}:reopen`,`/api/hr-admin/attendance-closes/${reopen.id}/reopen/`,{reason:reason.trim()});}}>
        <label className="form-field"><span>Reason for reopen</span><textarea className="input-control" value={reason} onChange={event=>setReason(event.target.value)} required/></label>
        {error&&<p className="notice notice--error" ref={modalErrorRef} role="alert" tabIndex={-1}>{error}</p>}
        <div className="form-actions-bar"><span className="muted">A reason is required and retained with the correction version.</span><div className="form-actions-bar__buttons"><AsyncActionButton className="button button--danger" disabled={Boolean(pending)||!reason.trim()} pending={pending===`${reopen.id}:reopen`} pendingLabel="Reopening" type="submit">Confirm reopen</AsyncActionButton><button className="button button--secondary" disabled={Boolean(pending)} onClick={()=>setReopen(null)} type="button">Cancel</button></div></div>
      </form>
    </HrAdminActionModal>}
  </section>;
}
