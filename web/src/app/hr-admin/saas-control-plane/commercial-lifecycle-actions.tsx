"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { HrAdminSaasCommercialControl } from "@/lib/types";

function apiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const detail = (payload as { detail?: unknown }).detail;
    if (typeof detail === "string" && detail) {
      return detail;
    }
    return JSON.stringify(payload);
  }
  return fallback;
}

type Props = {
  control: HrAdminSaasCommercialControl;
};

export function CommercialLifecycleActions({ control }: Props) {
  const router = useRouter();
  const [subscriptionPlan, setSubscriptionPlan] = useState(control.tenant.subscription_plan);
  const [subscriptionStatus, setSubscriptionStatus] = useState(control.subscription.status);
  const [billingProviderRef, setBillingProviderRef] = useState(control.subscription.billing_provider_ref);
  const [billingAccountRef, setBillingAccountRef] = useState(control.subscription.billing_account_ref);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState(control.subscription.current_period_end);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  async function saveCommercialState() {
    setIsSaving(true);
    setNotice("");
    const response = await fetch("/api/hr-admin/saas-control-plane", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription_plan: subscriptionPlan,
        status: subscriptionStatus,
        billing_provider_ref: billingProviderRef,
        billing_account_ref: billingAccountRef,
        current_period_end: currentPeriodEnd,
      }),
    });
    const result = await response.json().catch(() => ({}));
    setIsSaving(false);
    if (!response.ok) {
      setNotice(apiErrorMessage(result, "Commercial state could not be updated."));
      return;
    }
    setNotice("Commercial state updated.");
    router.refresh();
  }

  return (
    <div className="saas-lifecycle-actions">
      <label>
        <span>Plan</span>
        <select value={subscriptionPlan} onChange={(event) => setSubscriptionPlan(event.target.value)}>
          {control.available_plans.map((plan) => (
            <option key={plan.plan_ref} value={plan.plan_ref}>
              {plan.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Status</span>
        <select value={subscriptionStatus} onChange={(event) => setSubscriptionStatus(event.target.value)}>
          {control.subscription.status_options.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Billing provider</span>
        <input value={billingProviderRef} onChange={(event) => setBillingProviderRef(event.target.value)} />
      </label>
      <label>
        <span>Billing account</span>
        <input value={billingAccountRef} onChange={(event) => setBillingAccountRef(event.target.value)} />
      </label>
      <label>
        <span>Period end</span>
        <input value={currentPeriodEnd} onChange={(event) => setCurrentPeriodEnd(event.target.value)} />
      </label>
      <div className="saas-lifecycle-actions__footer">
        <button className="button button--primary" type="button" onClick={saveCommercialState} disabled={isSaving}>
          Save state
        </button>
        {notice ? <span role="status">{notice}</span> : null}
      </div>
    </div>
  );
}
