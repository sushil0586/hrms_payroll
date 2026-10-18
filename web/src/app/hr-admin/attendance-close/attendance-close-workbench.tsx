"use client";

import { useCallback, useEffect, useState } from "react";
import { AsyncActionButton } from "@/components/patterns/async-action-button";

type Close = { id:string; legal_entity_name:string; period_start:string; period_end:string; version:number; status:string; employee_count:number; attendance_record_count:number; blocker_count:number; reconciliation_snapshot:{ blockers?:Record<string,number>; payroll_impact?:{payable_units:string;lop_units:string}; status_counts?:Record<string,number>}; reopen_reason:string; events:Array<{id:string;event_type:string;actor:string;reason:string;occurred_at:string}> };
type Entity = { id:string; name:string; code:string };

export function AttendanceCloseWorkbench({ canManage, canApprove }: { canManage:boolean; canApprove:boolean }) {
  const [items,setItems]=useState<Close[]>([]); const [entities,setEntities]=useState<Entity[]>([]);
  const [entity,setEntity]=useState(""); const [start,setStart]=useState(""); const [end,setEnd]=useState("");
  const [pending,setPending]=useState(""); const [error,setError]=useState(""); const [notice,setNotice]=useState("");
  const load=useCallback(async()=>{const r=await fetch("/api/hr-admin/attendance-closes",{cache:"no-store"}); const p=await r.json(); if(!r.ok){setError(p.detail||"Unable to load attendance close history.");return;} setError("");setItems(p.items||[]);setEntities(p.legal_entities||[]);setEntity(v=>v||p.legal_entities?.[0]?.id||"");},[]);
  useEffect(()=>{const timer=window.setTimeout(()=>void load(),0);return()=>window.clearTimeout(timer);},[load]);
  async function mutate(key:string,url:string,body:Record<string,string>={}){if(pending)return;setPending(key);setError("");setNotice("");try{const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const p=await r.json();if(!r.ok)throw new Error(p.detail?.[0]||p.detail||Object.values(p)[0]||"Operation failed.");setNotice(`${p.status} confirmed for version ${p.version}.`);await load();}catch(e){setError(e instanceof Error?e.message:"Operation failed. Retry safely.");}finally{setPending("");}}
  return <section className="section" aria-busy={Boolean(pending)}>
    <div className="section-heading"><div><h2>Attendance reconciliation</h2><p className="section-copy">Payable and LOP units come from the existing attendance derivation contract.</p></div></div>
    {canManage&&<form className="filter-panel filter-panel--compact" onSubmit={e=>{e.preventDefault();void mutate("reconcile","/api/hr-admin/attendance-closes",{legal_entity_id:entity,period_start:start,period_end:end,idempotency_key:`${entity}:${start}:${end}`});}}>
      <label className="form-field"><span>Legal entity</span><select className="input-control" value={entity} onChange={e=>setEntity(e.target.value)} required>{entities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="form-field"><span>Period start</span><input className="input-control" type="date" value={start} onChange={e=>setStart(e.target.value)} required /></label>
      <label className="form-field"><span>Period end</span><input className="input-control" type="date" value={end} onChange={e=>setEnd(e.target.value)} required /></label>
      <AsyncActionButton className="button button--primary" pending={pending==="reconcile"} pendingLabel="Reconciling" type="submit">Reconcile period</AsyncActionButton>
    </form>}
    {error&&<div className="notice notice--error" role="alert"><p>{error}</p><button className="button button--secondary" onClick={()=>void load()} type="button">Retry</button></div>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    <div className="record-list">{items.map(item=><article className="record-card" key={item.id}>
      <div className="record-card__header"><div><strong>{item.legal_entity_name}: {item.period_start} to {item.period_end}</strong><p>Version {item.version} · {item.status}</p></div><span className="status-pill">{item.blocker_count} blockers</span></div>
      <div className="metric-strip"><span><strong>{item.employee_count}</strong> employees</span><span><strong>{item.attendance_record_count}</strong> rows</span><span><strong>{item.reconciliation_snapshot.payroll_impact?.payable_units||"0.00"}</strong> payable</span><span><strong>{item.reconciliation_snapshot.payroll_impact?.lop_units||"0.00"}</strong> LOP</span></div>
      <div className="form-actions-bar__buttons">
        {canManage&&item.status==="draft"&&<AsyncActionButton className="button button--secondary" disabled={Boolean(pending)} pending={pending===`${item.id}:submit`} pendingLabel="Submitting" onClick={()=>void mutate(`${item.id}:submit`,`/api/hr-admin/attendance-closes/${item.id}/submit/`)}>Submit</AsyncActionButton>}
        {canApprove&&item.status==="submitted"&&<AsyncActionButton className="button button--secondary" disabled={Boolean(pending)} pending={pending===`${item.id}:approve`} pendingLabel="Approving" onClick={()=>void mutate(`${item.id}:approve`,`/api/hr-admin/attendance-closes/${item.id}/approve/`)}>Approve</AsyncActionButton>}
        {canApprove&&item.status==="approved"&&<AsyncActionButton className="button button--primary" disabled={Boolean(pending)} pending={pending===`${item.id}:close`} pendingLabel="Closing" onClick={()=>void mutate(`${item.id}:close`,`/api/hr-admin/attendance-closes/${item.id}/close/`)}>Close period</AsyncActionButton>}
        {canApprove&&item.status==="closed"&&<button className="button button--danger" disabled={Boolean(pending)} onClick={()=>{const reason=window.prompt("Reason for governed reopen");if(reason)void mutate(`${item.id}:reopen`,`/api/hr-admin/attendance-closes/${item.id}/reopen/`,{reason});}} type="button">Reopen</button>}
      </div>
      <details><summary>Audit trail</summary>{item.events.map(event=><p key={event.id}>{event.event_type} · {event.actor} · {new Date(event.occurred_at).toLocaleString()}{event.reason?` · ${event.reason}`:""}</p>)}</details>
    </article>)}</div>
  </section>;
}
