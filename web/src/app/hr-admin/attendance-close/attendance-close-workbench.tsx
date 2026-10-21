"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { HrAdminActionModal } from "@/components/patterns/hr-admin-action-modal";
import { WorkspaceFilterBar, WorkspaceStatusBadge } from "@/components/patterns/workspace-standard";
import { useWorkspaceQueryFilter } from "@/components/patterns/use-workspace-query-filter";
import { attendanceDateError } from "../attendance-records/filter-contract";

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
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useWorkspaceQueryFilter("q", "");
  const [status,setStatus]=useWorkspaceQueryFilter("status", "all");
  const [reopen,setReopen]=useState<Close|null>(null);
  const [reason,setReason]=useState("");
  const submitting=useRef(false);
  const request=useRef(0);
  const load=useCallback(async()=>{
    const sequence=++request.current;
    try {
      const response=await fetch("/api/hr-admin/attendance-closes",{cache:"no-store"});
      const payload=await response.json();
      if(!response.ok) throw new Error(message(payload));
      if(sequence!==request.current)return;
      setError(""); setItems(payload.items||[]); setEntities(payload.legal_entities||[]);
      setEntity(value=>value||payload.legal_entities?.[0]?.id||"");
    } catch(error) { if(sequence===request.current) setError(error instanceof Error ? error.message : "Unable to load attendance close history."); }
    finally { if(sequence===request.current)setLoading(false); }
  },[]);
  useEffect(()=>{
    let active = true;
    void Promise.resolve().then(()=>{if(active)return load();});
    return ()=>{active=false;};
  },[load]);
  async function mutate(key:string,url:string,body:Record<string,string>={}) {
    if(submitting.current)return;
    submitting.current=true; setPending(key); setError("");setNotice("");
    try {
      const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const payload=await response.json();
      if(!response.ok)throw new Error(message(payload));
      setNotice(`${payload.status} confirmed for version ${payload.version}.`);
      setReopen(null);setReason("");setLoading(true);await load();
    }catch(error){setError(error instanceof Error?error.message:"Operation failed. Retry safely.");}
    finally{submitting.current=false;setPending("");}
  }
  const visible=items.filter(item=>(status==="all"||item.status===status)&&[item.legal_entity_name,item.period_start,item.period_end,String(item.version)].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="section" aria-label="Attendance close workspace" aria-busy={Boolean(pending)||loading}>
    <div className="section-heading"><div><h2>Attendance reconciliation</h2><p className="section-copy">Payable and LOP units come from the existing attendance derivation contract.</p></div></div>
    {canManage&&<form aria-label="Reconcile attendance period" className="filter-panel filter-panel--compact" onSubmit={event=>{
      event.preventDefault();const invalid=attendanceDateError(start,end);
      if(invalid){setError(invalid);return;}
      void mutate("reconcile","/api/hr-admin/attendance-closes",{legal_entity_id:entity,period_start:start,period_end:end,idempotency_key:`${entity}:${start}:${end}`});
    }}>
      <label className="form-field"><span>Legal entity</span><select className="input-control" value={entity} onChange={event=>setEntity(event.target.value)} required disabled={loading||Boolean(pending)}>{entities.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="form-field"><span>Period start</span><input className="input-control" type="date" value={start} onChange={event=>setStart(event.target.value)} required /></label>
      <label className="form-field"><span>Period end</span><input className="input-control" type="date" value={end} onChange={event=>setEnd(event.target.value)} required /></label>
      <AsyncActionButton className="button button--primary" disabled={loading||Boolean(pending)||!entities.length} pending={pending==="reconcile"} pendingLabel="Reconciling" type="submit">Reconcile period</AsyncActionButton>
    </form>}
    <WorkspaceFilterBar><label className="form-field"><span>Search close history</span><input className="input-control" value={query} onChange={event=>setQuery(event.target.value)} type="search"/></label><label className="form-field"><span>Close status</span><select className="input-control" value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All statuses</option>{Array.from(new Set(items.map(item=>item.status))).sort().map(value=><option key={value} value={value}>{value}</option>)}</select></label><button className="button button--secondary" type="button" onClick={()=>{setQuery("");setStatus("all");}}>Clear filters</button></WorkspaceFilterBar>
    {loading&&<p role="status">Loading attendance close history…</p>}
    {error&&<div className="notice notice--error" role="alert"><p>{error}</p><button className="button button--secondary" onClick={()=>{setLoading(true);void load();}} disabled={loading||Boolean(pending)} type="button">Retry history</button></div>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    {!loading&&!error&&!visible.length&&<p className="notice">No attendance closes match this view.</p>}
    {!error&&<div className="record-list">{visible.map(item=><article className="record-card" key={item.id}>
      <div className="record-card__header"><div><strong>{item.legal_entity_name}: {item.period_start} to {item.period_end}</strong><p>Version {item.version} · {item.status}</p></div><WorkspaceStatusBadge tone={item.blocker_count?"warning":"neutral"}>{item.blocker_count} blockers</WorkspaceStatusBadge></div>
      <div className="metric-strip"><span><strong>{item.employee_count}</strong> employees</span><span><strong>{item.attendance_record_count}</strong> rows</span><span><strong>{item.reconciliation_snapshot.payroll_impact?.payable_units??"Unavailable"}</strong> payable</span><span><strong>{item.reconciliation_snapshot.payroll_impact?.lop_units??"Unavailable"}</strong> LOP</span></div>
      <div className="form-actions-bar__buttons">
        {canManage&&item.status==="draft"&&<AsyncActionButton className="button button--secondary" disabled={Boolean(pending)||loading} pending={pending===`${item.id}:submit`} pendingLabel="Submitting" onClick={()=>void mutate(`${item.id}:submit`,`/api/hr-admin/attendance-closes/${item.id}/submit/`)}>Submit</AsyncActionButton>}
        {canApprove&&item.status==="submitted"&&<AsyncActionButton className="button button--secondary" disabled={Boolean(pending)||loading} pending={pending===`${item.id}:approve`} pendingLabel="Approving" onClick={()=>void mutate(`${item.id}:approve`,`/api/hr-admin/attendance-closes/${item.id}/approve/`)}>Approve</AsyncActionButton>}
        {canApprove&&item.status==="approved"&&<AsyncActionButton className="button button--primary" disabled={Boolean(pending)||loading} pending={pending===`${item.id}:close`} pendingLabel="Closing" onClick={()=>void mutate(`${item.id}:close`,`/api/hr-admin/attendance-closes/${item.id}/close/`)}>Close period</AsyncActionButton>}
        {canApprove&&item.status==="closed"&&<button className="button button--danger" disabled={Boolean(pending)||loading} onClick={event=>{event.currentTarget.focus();setReason("");setReopen(item);}} type="button">Reopen</button>}
      </div>
      <details><summary>Audit trail</summary>{item.events.map(event=><p key={event.id}>{event.event_type} · {event.actor} · {new Date(event.occurred_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})} IST{event.reason?` · ${event.reason}`:""}</p>)}</details>
    </article>)}</div>}
    {reopen&&<HrAdminActionModal closeHref="/hr-admin/attendance-close" onClose={()=>{if(!submitting.current)setReopen(null);}} labelledBy="attendance-reopen-title" title="Governed attendance reopen" description={`${reopen.period_start} to ${reopen.period_end} · Version ${reopen.version}`}>
      <form onSubmit={event=>{event.preventDefault();if(reason.trim())void mutate(`${reopen.id}:reopen`,`/api/hr-admin/attendance-closes/${reopen.id}/reopen/`,{reason:reason.trim()});}}>
        <label className="form-field"><span>Reason for reopen</span><textarea className="input-control" value={reason} onChange={event=>setReason(event.target.value)} required/></label>
        {error&&<p className="notice notice--error" role="alert">{error}</p>}
        <AsyncActionButton className="button button--danger" disabled={Boolean(pending)||!reason.trim()} pending={pending===`${reopen.id}:reopen`} pendingLabel="Reopening" type="submit">Confirm reopen</AsyncActionButton>
      </form>
    </HrAdminActionModal>}
  </section>;
}
