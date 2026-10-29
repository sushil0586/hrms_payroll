"use client";

import { useState } from "react";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import type { HrAdminPayrollProviderDelivery } from "@/lib/types";

export function ProviderDeliveryRetryActions({ initialDelivery }: { initialDelivery: HrAdminPayrollProviderDelivery }) {
  const [delivery, setDelivery] = useState(initialDelivery);
  const [busy, setBusy] = useState<"schedule-retry" | "requeue" | "">("");
  const [notice, setNotice] = useState<{ tone:"success"|"error"; message:string }|null>(null);
  async function run(action:"schedule-retry"|"requeue") {
    if (busy) return; setBusy(action); setNotice(null);
    try {
      const response=await fetch(`/api/hr-admin/payroll-provider-deliveries/${delivery.id}/${action}`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      const payload=await response.json().catch(()=>null) as HrAdminPayrollProviderDelivery|{detail?:string}|null;
      if(!response.ok||!payload){setNotice({tone:"error",message:payload&&"detail" in payload&&payload.detail?payload.detail:"Delivery action failed. The current delivery is retained."});return;}
      if(!("id" in payload)){setNotice({tone:"error",message:"The delivery outcome was not confirmed. Verify its status before retrying."});return;}
      setDelivery(payload); setNotice({tone:"success",message:action==="requeue"?"Delivery requeued.":"Retry scheduled."});
    } catch { setNotice({tone:"error",message:"The delivery outcome is uncertain. Verify its status before retrying."}); }
    finally { setBusy(""); }
  }
  return <div className="payroll-handoff-retry-command-strip" data-delivery-status={delivery.status}>
    <AsyncActionButton className="button" pending={busy==="schedule-retry"} pendingLabel="Scheduling" disabled={Boolean(busy)} onClick={()=>run("schedule-retry")} type="button">Schedule retry</AsyncActionButton>
    <AsyncActionButton className="button button--secondary" pending={busy==="requeue"} pendingLabel="Requeuing" disabled={Boolean(busy)} onClick={()=>run("requeue")} type="button">Requeue delivery</AsyncActionButton>
    {notice?<span role={notice.tone==="error"?"alert":"status"}>{notice.message}</span>:null}
  </div>;
}
