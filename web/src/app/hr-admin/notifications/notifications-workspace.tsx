"use client";

import { useCallback, useSyncExternalStore } from "react";
import { NotificationQueue } from "./notification-queue";
import { ScopedResourceError, useScopedWorkspaceResource } from "@/lib/ui/use-scoped-workspace-resource";
import type { HrAdminEnumOption, HrAdminNotificationListResponse } from "@/lib/types";

export type NotificationQuery = { q:string; status:string; channel:string; priority:string; audience_type:string; module:string; subject_type:string; retry_state:string; page:number; page_size:number };
const subscribe=()=>()=>undefined;
function href(q:NotificationQuery){const p=new URLSearchParams();for(const k of ["q","status","channel","priority","audience_type","module","subject_type","retry_state"] as const)if(q[k])p.set(k,q[k]);if(q.page>1)p.set("page",String(q.page));if(q.page_size!==25)p.set("page_size",String(q.page_size));return `/hr-admin/notifications${p.size?`?${p}`:""}`;}
function readQuery():NotificationQuery{const p=new URLSearchParams(window.location.search);const n=Number(p.get("page"));const z=Number(p.get("page_size"));return{q:p.get("q")||"",status:p.get("status")||"",channel:p.get("channel")||"",priority:p.get("priority")||"",audience_type:p.get("audience_type")||"",module:p.get("module")||"",subject_type:p.get("subject_type")||"",retry_state:p.get("retry_state")||"",page:Number.isSafeInteger(n)&&n>0?n:1,page_size:[10,25,50,100].includes(z)?z:25};}

export function NotificationsWorkspace({initialData,initialQuery,notificationStatusOptions,notificationChannelOptions,notificationPriorityOptions,notificationRetryStateOptions,audienceTypeOptions,moduleOptions,subjectTypeOptions}:{initialData:HrAdminNotificationListResponse;initialQuery:NotificationQuery;notificationStatusOptions:HrAdminEnumOption[];notificationChannelOptions:HrAdminEnumOption[];notificationPriorityOptions:HrAdminEnumOption[];notificationRetryStateOptions:HrAdminEnumOption[];audienceTypeOptions:HrAdminEnumOption[];moduleOptions:HrAdminEnumOption[];subjectTypeOptions:HrAdminEnumOption[]}){
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
 const request=useCallback(async(q:NotificationQuery,signal:AbortSignal)=>{const p=new URLSearchParams({...q,page:String(q.page),page_size:String(q.page_size)});const r=await fetch(`/api/hr-admin/notifications/workspace?${p}`,{cache:"no-store",signal});const x=await r.json().catch(()=>({}));if(!r.ok||!Array.isArray(x.items))throw new ScopedResourceError(typeof x.detail==="string"?x.detail:"Notification queue could not be updated.",r.status);return x as HrAdminNotificationListResponse;},[]);
 const resource=useScopedWorkspaceResource({initialData,initialQuery,request,historyHref:href,readHistoryQuery:readQuery,resolveQuery:(q,d)=>({...q,page:d.page,page_size:d.page_size}),fallbackError:"Notification queue could not be updated. The last confirmed queue is still shown."});
 const reconcile=useCallback(async()=>{await resource.load(resource.query,"none");},[resource]);
 return <div data-local-update-hydrated={hydrated?"true":"false"} aria-busy={resource.isPending||undefined}>
  {resource.error?<div className="notice notice--error" role="alert"><strong>Queue update failed.</strong><span>{resource.error}</span><button className="button button--secondary" onClick={()=>void resource.load(resource.query,"none")} type="button">Retry</button></div>:null}
  <NotificationQueue items={resource.data.items} currentFilters={resource.query} pagination={resource.data} notificationStatusOptions={notificationStatusOptions} notificationChannelOptions={notificationChannelOptions} notificationPriorityOptions={notificationPriorityOptions} notificationRetryStateOptions={notificationRetryStateOptions} audienceTypeOptions={audienceTypeOptions} moduleOptions={moduleOptions} subjectTypeOptions={subjectTypeOptions} pending={resource.isPending} onApplyFilters={q=>void resource.load(q)} onCommitted={reconcile}/>
 </div>;
}
