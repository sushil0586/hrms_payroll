import type { HrAdminLifecycleQueueItem, HrAdminLifecycleQueueListResponse } from "@/lib/types";

export function lifecycleAsOf(value?: string) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value) return value;
  return new Date().toISOString().slice(0,10);
}
export function lifecycleDaysSince(value: string | null | undefined, asOf = lifecycleAsOf()) {
  const parsed=value?Date.parse(value):NaN;
  const day=Number.isFinite(parsed)?new Date(parsed).toISOString().slice(0,10):undefined;
  const time = day ? Date.parse(day+"T00:00:00Z") : NaN;
  return Number.isFinite(time) ? Math.max(0,Math.floor((Date.parse(asOf+"T00:00:00Z")-time)/86400000)) : 0;
}
export function lifecyclePriority(item: HrAdminLifecycleQueueItem) {
  if (item.attention_rank >= 80 || item.document_attention_state === "blocked" || item.bulk_status_warning) return "High";
  if (item.attention_rank >= 40 || item.document_attention_state === "warning" || item.document_attention_state === "upcoming") return "Medium";
  return "Low";
}
export function lifecycleAgeBucket(ageDays: number) {
  if (ageDays >= 30) return "30+ days";
  if (ageDays >= 15) return "15-29 days";
  if (ageDays >= 8) return "8-14 days";
  return "0-7 days";
}

export function lifecycleSlaState(item: HrAdminLifecycleQueueItem, asOf = lifecycleAsOf()) {
  const overdue = lifecycleDaysSince(item.next_due_on ?? item.attention_due_on, asOf);
  if (overdue > 0) return "Overdue";
  if (item.next_escalation_on) return "Escalation scheduled";
  if (!item.owner_value) return "Owner missing";
  if (item.document_attention_state === "blocked") return "Document blocked";
  return "On track";
}

export function lifecycleSlaRisk(item: HrAdminLifecycleQueueItem, asOf = lifecycleAsOf()): "High" | "Medium" | "Low" {
  const overdue = lifecycleDaysSince(item.next_due_on ?? item.attention_due_on, asOf);
  if (overdue >= 3 || item.document_attention_state === "blocked" || !item.owner_value) return "High";
  if (overdue > 0 || item.next_escalation_on || item.attention_rank >= 40 || item.document_attention_state === "warning") return "Medium";
  return "Low";
}


/** Bounded live collection. Reject missing/overlapping pages and observable churn; never return partial evidence. */
export async function collectLifecycleReport(load: (page:number)=>Promise<HrAdminLifecycleQueueListResponse>) {
  const items:HrAdminLifecycleQueueItem[]=[];const keys=new Set<string>();let total:number|undefined;
  for(let page=1;page<=100;page++) {
    const data=await load(page);
    if(!data || !Array.isArray(data.items) || !Number.isSafeInteger(data.total_count) || data.total_count<0 || data.total_count>10000 || data.page!==page || data.page_size!==100) throw new Error("Lifecycle report source is unavailable or exceeds the 10,000-record limit.");
    if(total!==undefined && total!==data.total_count) throw new Error("Lifecycle population changed while loading. Reload before using or exporting this report.");
    total=data.total_count;
    const expected=Math.min(100,Math.max(0,total-(page-1)*100));
    if(data.items.length!==expected || data.has_next!==(page*100<total) || data.has_previous!==(page>1)) throw new Error("Lifecycle report pages are incomplete. Reload before using or exporting this report.");
    for(const item of data.items) {
      const key=`${item.item_type}:${item.id}`;
      if(typeof item?.id!=="string" || !item.id || typeof item.item_type!=="string" || !item.item_type || keys.has(key)) throw new Error("Lifecycle report pages overlap. Reload before using or exporting this report.");
      keys.add(key);items.push(item);
    }
    if(!data.has_next) return items;
  }
  throw new Error("Lifecycle report exceeds the interactive collection bound.");
}

export function selectLifecycleReport(items:HrAdminLifecycleQueueItem[], kind:"lifecycle-queue"|"lifecycle-aging", filters:Record<string,string|undefined>, asOf=lifecycleAsOf()) {
 const match=(key:string,value:string|null|undefined)=>!filters[key] || filters[key]==="All" || filters[key]===value;
 const query=(filters.q??"").trim().toLowerCase();
 const rows=items.filter(item=>{
  if(!match("item_type",item.item_type)||!match("status",item.status)||!match("owner",item.owner_value))return false;
  if(kind==="lifecycle-queue") {
   if(!match("attention_state",item.attention_state)||!match("document_attention_state",item.document_attention_state))return false;
  } else {
   if(!match("age_bucket",lifecycleAgeBucket(lifecycleDaysSince(item.created_at,asOf)))||!match("sla_risk",lifecycleSlaRisk(item,asOf)))return false;
   if(filters.escalation==="scheduled"&&!item.next_escalation_on || filters.escalation==="missing"&&item.next_escalation_on)return false;
  }
  const common=[item.item_type,item.item_label,item.employee_code,item.employee_name,item.status,item.status_label,item.owner_value,item.owner_label,item.workflow_reference,item.attention_summary];
  const text=kind==="lifecycle-queue"?[...common,item.summary,item.document_attention_summary,item.bulk_status_warning]:[...common,lifecycleSlaState(item,asOf),lifecycleSlaRisk(item,asOf)];
  return !query||text.join(" ").toLowerCase().includes(query);
 });
 const sort=filters.sort;
 return rows.sort((a,b)=>{
  let order=0;
  if(sort==="employee")order=a.employee_name.localeCompare(b.employee_name);
  else if(sort==="type")order=a.item_type.localeCompare(b.item_type);
  else if(sort==="status")order=a.status.localeCompare(b.status);
  else if(sort==="owner")order=(a.owner_label??"").localeCompare(b.owner_label??"");
  else if(kind==="lifecycle-queue"&&sort==="due_date")order=(a.next_due_on??a.primary_date??"9999-12-31").localeCompare(b.next_due_on??b.primary_date??"9999-12-31");
  else if(kind==="lifecycle-aging"&&sort==="age")order=lifecycleDaysSince(b.created_at,asOf)-lifecycleDaysSince(a.created_at,asOf);
  else if(kind==="lifecycle-aging"&&sort==="escalation")order=(a.next_escalation_on??"9999-12-31").localeCompare(b.next_escalation_on??"9999-12-31");
  else order=(kind==="lifecycle-aging"?lifecycleDaysSince(b.next_due_on??b.attention_due_on,asOf)-lifecycleDaysSince(a.next_due_on??a.attention_due_on,asOf):0)||b.attention_rank-a.attention_rank;
  return order||`${a.item_type}:${a.id}`.localeCompare(`${b.item_type}:${b.id}`);
 });
}
