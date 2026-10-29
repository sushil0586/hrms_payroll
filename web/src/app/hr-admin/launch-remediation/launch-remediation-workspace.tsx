"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState, useSyncExternalStore } from "react";
import { LaunchRemediationActions } from "./launch-remediation-actions";
import type { HrAdminLaunchRemediationAssignment, HrAdminLaunchRemediationListResponse } from "@/lib/types";

type Query={q:string;status:string;severity:string;owner_role_ref:string;module_ref:string;due_state:string};
const subscribe=()=>()=>undefined;
const titleCase=(v:string)=>v.replaceAll("_"," ").replaceAll("-"," ").replace(/\b\w/g,m=>m.toUpperCase());
const formatDate=(v:string|null)=>v?new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(v)):"Pending";
function href(q:Query){const p=new URLSearchParams();Object.entries(q).forEach(([k,v])=>{if(v&&!(k==="status"&&v==="open"))p.set(k,v)});return `/hr-admin/launch-remediation${p.size?`?${p}`:""}`;}

export function LaunchRemediationWorkspace({initialData,initialQuery}:{initialData:HrAdminLaunchRemediationListResponse;initialQuery:Query}){
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false); const [items,setItems]=useState(initialData.items); const [query,setQuery]=useState(initialQuery); const [draft,setDraft]=useState(initialQuery);
 const shown=useMemo(()=>items.filter(a=>{const q=draft.q.trim().toLowerCase();if(q&&!`${a.gate_ref} ${a.label} ${a.owner_role_ref} ${a.module_label} ${a.assigned_to_identifier}`.toLowerCase().includes(q))return false;if(draft.status!=="all"&&a.status!==draft.status)return false;if(draft.severity&&a.severity!==draft.severity)return false;if(draft.owner_role_ref&&a.owner_role_ref!==draft.owner_role_ref)return false;if(draft.module_ref&&a.module_ref!==draft.module_ref)return false;return !draft.due_state||a.due_state===draft.due_state}),[draft,items]);
 function apply(e:FormEvent){e.preventDefault();setQuery(draft);window.history.pushState(window.history.state,"",href(draft));}
 function clear(){const q={q:"",status:"open",severity:"",owner_role_ref:"",module_ref:"",due_state:""};setDraft(q);setQuery(q);window.history.pushState(window.history.state,"","/hr-admin/launch-remediation");}
 function committed(next:HrAdminLaunchRemediationAssignment){setItems(current=>current.map(a=>a.id===next.id?next:a));}
 const owners=Array.from(new Set(items.map(a=>a.owner_role_ref))).sort(); const modules=Array.from(new Map(items.map(a=>[a.module_ref,a.module_label])).entries());
 return <div data-local-update-hydrated={hydrated?"true":"false"} data-committed-query={JSON.stringify(query)}>
  <section className="section"><form className="queue-toolbar panel-card-soft launch-remediation-toolbar" onSubmit={apply}><div className="queue-toolbar__header"><div><h2>Filters</h2><p>{shown.length} launch remediation rows in the current view.</p></div><div className="queue-toolbar__actions"><button className="button button--secondary" onClick={clear} type="button">Reset</button><button className="button button--primary" type="submit">Apply</button></div></div><div className="queue-toolbar__grid">
   <label className="queue-toolbar__search"><span>Search</span><input value={draft.q} onChange={e=>setDraft({...draft,q:e.target.value})} placeholder="gate, owner, module"/></label>
   <label><span>Status</span><select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="open">Open</option><option value="ignored">Ignored</option><option value="closed">Closed</option><option value="all">All</option></select></label>
   <label><span>Severity</span><select value={draft.severity} onChange={e=>setDraft({...draft,severity:e.target.value})}><option value="">All severities</option><option value="blocker">Blocker</option><option value="warning">Warning</option></select></label>
   <label><span>Owner</span><select value={draft.owner_role_ref} onChange={e=>setDraft({...draft,owner_role_ref:e.target.value})}><option value="">All owners</option>{owners.map(v=><option key={v}>{v}</option>)}</select></label>
   <label><span>Module</span><select value={draft.module_ref} onChange={e=>setDraft({...draft,module_ref:e.target.value})}><option value="">All modules</option>{modules.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
   <label><span>Due state</span><select value={draft.due_state} onChange={e=>setDraft({...draft,due_state:e.target.value})}><option value="">All due states</option>{["overdue","due_soon","scheduled","unscheduled","open","closed","ignored"].map(v=><option value={v} key={v}>{titleCase(v)}</option>)}</select></label>
  </div></form></section>
  <section className="section launch-remediation-list">{shown.map(a=><article className="record-card launch-remediation-card" key={a.id}><div className="record-card__header"><div className="record-card__title-wrap"><span className="record-card__eyebrow">{a.gate_ref}</span><div className="record-card__title"><h2>{a.label}</h2></div></div><div className="record-card__actions"><span className={`readiness-badge readiness-badge--${a.severity==="blocker"?"blocked":"warning"}`}>{titleCase(a.severity)}</span><span className={`readiness-badge readiness-badge--${a.status}`}>{titleCase(a.status)}</span><Link className="button button--secondary" href={a.action_href}>{a.action_label}</Link></div></div>
   <div className="launch-remediation-card__grid">{[["Module",a.module_label],["Owner role",a.owner_role_ref],["Assignee",a.assigned_to_identifier||"Unassigned"],["Current value",a.current_value||"Missing"],["Acknowledged",a.acknowledged_by_identifier||formatDate(a.acknowledged_at)],["Last seen",formatDate(a.last_seen_at)],["Due",formatDate(a.due_at)],["Due state",titleCase(a.due_state)],["Reminders",String(a.reminder_count)],["Escalation",a.escalation_owner_role_ref||a.escalated_by_identifier||"None"]].map(([l,v])=><div className="detail-row" key={l}><span>{l}</span><strong>{v}</strong></div>)}</div>
   {a.resolution_note?<p className="record-card__notes">{a.resolution_note}</p>:null}{a.evidence_ref?<code className="launch-remediation-card__evidence">{a.evidence_ref}</code>:null}{a.status==="open"?<LaunchRemediationActions assignmentId={a.id} defaultOwnerRoleRef={a.owner_role_ref} defaultAssignee={a.assigned_to_identifier} defaultDueAt={a.due_at} defaultEscalationOwnerRoleRef={a.escalation_owner_role_ref} onCommitted={committed}/>:null}
  </article>)}{shown.length===0?<div className="panel-card-soft launch-remediation-empty"><h2>No launch remediation rows</h2><p>Current filters have no matching assignments.</p></div>:null}</section>
 </div>;
}
