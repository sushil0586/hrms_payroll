"use client";

import { useEffect, useRef, useState } from "react";
import { LifecycleFormActions, useLifecycleFormState } from "@/app/hr-admin/lifecycle/lifecycle-form-state";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminLifecycleOptions, HrAdminProbationReviewWriteInput } from "@/lib/types";

type Props = {
  initialValue: HrAdminProbationReviewWriteInput;
  mode: "create" | "edit";
  options: HrAdminLifecycleOptions;
  itemId?: string;
  cancelHref?: string;
  successHref?: string;
  compact?: boolean;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save probation review.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save probation review.");
}

function selectOptions(items: Array<{ id: string; name: string; employee_code?: string }>) {
  return [<option key="blank" value="">Select an option</option>, ...items.map((item) => <option key={item.id} value={item.id}>{item.employee_code ? `${item.employee_code} - ${item.name}` : item.name}</option>)];
}

function ownerOptions(items: Array<{ value: string; label: string }>) {
  return [<option key="blank" value="">Select an owner</option>, ...items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)];
}

export function ProbationReviewForm({ initialValue, mode, options, itemId, cancelHref, successHref, compact = false }: Props) {

  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formId=`lifecycle-probation-reviews-${itemId??"create"}`;
  const pending = useRef(false);const errorRef=useRef<HTMLDivElement>(null);const formRef=useRef<HTMLFormElement>(null);const focused=useRef(false);
  const navigation=useLifecycleFormState(formValue,initialValue,isSubmitting,cancelHref??"/hr-admin/probation-reviews");
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  useEffect(()=>{if(navigation.ready&&compact&&!focused.current){focused.current=true;formRef.current?.querySelector<HTMLElement>('select,input,textarea')?.focus();}},[navigation.ready,compact]);

  function update<Key extends keyof HrAdminProbationReviewWriteInput>(key: Key, value: HrAdminProbationReviewWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current=true;
    setIsSubmitting(true);
    setError("");
    try {
    const response = await fetch(mode === "create" ? "/api/hr-admin/probation-reviews" : `/api/hr-admin/probation-reviews/${itemId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValue),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(response.status>=500?"Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.":getErrorMessage(payload));
      setIsSubmitting(false);pending.current=false;
      return;
    }
    if(typeof payload?.id!=="string" || !payload.id || (itemId&&payload.id!==itemId)) {setError("Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.");return;}
    const destination=new URL(successHref??"/hr-admin/probation-reviews",window.location.origin);
    destination.searchParams.set(destination.pathname==='/hr-admin/lifecycle'?'record':'recordLoaded',destination.pathname==='/hr-admin/lifecycle'?`probation:${payload.id}`:payload.id);
    navigation.complete(destination.href);
    } catch {setError("Save outcome could not be confirmed. Check the queue before retrying; your draft is retained.");}
    finally {pending.current=false;setIsSubmitting(false);}
  }

  function handleCancel() {navigation.cancel();}

  return (
    <form id={formId}
      aria-label="Probation review form"
      className={`section form-layout-modern lifecycle-phase3-form lifecycle-child-form${compact ? " lifecycle-child-form--modal" : ""}`}
      data-testid="probation-review-form"
      data-hydrated={navigation.ready}
      ref={formRef}
      onSubmit={handleSubmit}
    >
      <fieldset className="lifecycle-fields" disabled={!navigation.ready||isSubmitting}><section className="form-shell-card">
        <div className="form-shell-card__grid">
          <FormSection
            description="Capture the employee, review date, and main probation timeline."
            title="Review schedule"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">Employee (required)</span><select required aria-label="Employee" className="input-control" value={formValue.employee_id ?? ""} onChange={(e) => update("employee_id", e.target.value || null)}>{selectOptions(options.employees)}</select></label>
              <label className="form-field"><span className="muted">Review date (required)</span><input required aria-label="Review date" className="input-control" type="date" value={formValue.review_date ?? ""} onChange={(e) => update("review_date", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Probation end date</span><input className="input-control" type="date" value={formValue.probation_end_date ?? ""} onChange={(e) => update("probation_end_date", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Decision</span><select aria-label="Decision" className="input-control" value={formValue.decision} onChange={(e) => update("decision", e.target.value)}>{options.probation_decisions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            </div>
          </FormSection>

          <FormSection
            description="Choose the reviewer and rationale. Extension decisions require an extension end date."
            title="Extension and ownership"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">Extension end date (required for Extend)</span><input aria-label="Extension end date" aria-required={formValue.decision==="extend"} className="input-control" type="date" value={formValue.extension_end_date ?? ""} onChange={(e) => update("extension_end_date", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Reviewer</span><select aria-label="Reviewer" className="input-control" value={formValue.owner_value} onChange={(e) => update("owner_value", e.target.value)}>{ownerOptions(options.lifecycle_owners)}</select></label>
              <label className="form-field" style={{ gridColumn: "1 / -1" }}><span className="muted">Workflow reference</span><input className="input-control" value={formValue.workflow_reference} onChange={(e) => update("workflow_reference", e.target.value)} /></label>
            </div>
          </FormSection>

          <FormSection
            description="Summarize the review rationale, blockers, or manager context for future follow-up."
            fullWidth
            title="Remarks"
          >
            <label className="form-field">
              <span className="muted">Remarks</span>
              <textarea className="input-control" rows={5} value={formValue.remarks} onChange={(e) => update("remarks", e.target.value)} />
            </label>
          </FormSection>
        </div>

        {formValue.decision === "extend" && !formValue.extension_end_date ? (
          <div className="notice">
            <strong>Extension is incomplete.</strong>
            <span className="muted">An extension decision should include an extension end date so the probation queue can process it safely.</span>
          </div>
        ) : null}
        {error ? <div className="notice notice--error" role="alert" tabIndex={-1} ref={errorRef}><strong>Review save outcome.</strong><span className="muted">{error}</span></div> : null}
        <LifecycleFormActions><div className="form-actions-bar">
          <span className="muted">Confirmation and extension decisions can update the employee’s probation dates.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={!navigation.ready||isSubmitting} form={formId} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create probation review" : "Save changes"}</button>
            <button className="button button--secondary" disabled={!navigation.ready||isSubmitting} onClick={handleCancel} type="button">Cancel</button>
          </div>
        </div></LifecycleFormActions>
      </section></fieldset>
    </form>
  );
}
