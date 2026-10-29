"use client";

import { useEffect, useRef, useState } from "react";

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
  const regionRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (regionRef.current) regionRef.current.dataset.localUpdateHydrated = "true"; }, []);
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
    try {
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
      if (!response.ok) {
        setNotice(apiErrorMessage(result, "Commercial state could not be updated."));
        return;
      }
      const authoritative = result as Partial<HrAdminSaasCommercialControl> & {
        subscription_plan?: string;
        status?: string;
        billing_provider_ref?: string;
        billing_account_ref?: string;
        current_period_end?: string;
      };
      const subscription = authoritative.subscription;
      setSubscriptionPlan(authoritative.tenant?.subscription_plan ?? authoritative.subscription_plan ?? subscriptionPlan);
      setSubscriptionStatus(subscription?.status ?? authoritative.status ?? subscriptionStatus);
      setBillingProviderRef(subscription?.billing_provider_ref ?? authoritative.billing_provider_ref ?? billingProviderRef);
      setBillingAccountRef(subscription?.billing_account_ref ?? authoritative.billing_account_ref ?? billingAccountRef);
      setCurrentPeriodEnd(subscription?.current_period_end ?? authoritative.current_period_end ?? currentPeriodEnd);
      setNotice("Commercial state updated.");
    } catch {
      setNotice("The commercial update could not be confirmed. Your entered values are still available; verify the current state before retrying.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="saas-lifecycle-actions" data-local-update-hydrated="false" ref={regionRef}>
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
