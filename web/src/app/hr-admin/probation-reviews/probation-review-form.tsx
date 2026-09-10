"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminLifecycleOptions, HrAdminProbationReviewWriteInput } from "@/lib/types";

type Props = { initialValue: HrAdminProbationReviewWriteInput; mode: "create" | "edit"; options: HrAdminLifecycleOptions; itemId?: string };

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

export function ProbationReviewForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof HrAdminProbationReviewWriteInput>(key: Key, value: HrAdminProbationReviewWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    const response = await fetch(mode === "create" ? "/api/hr-admin/probation-reviews" : `/api/hr-admin/probation-reviews/${itemId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formValue),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    router.push("/hr-admin/probation-reviews");
    router.refresh();
  }

  return (
    <form aria-label="Probation review form" className="section form-layout-modern" data-testid="probation-review-form" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create probation review" : "Edit probation review"}</h2>
            <p className="section-copy">Capture the decision window, extension details, reviewer ownership, and workflow context in a cleaner review flow.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.decision || "pending"}</strong> current decision</span>
            <span className="queue-summary-chip"><strong>{formValue.extension_end_date || "No extension"}</strong> extension state</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection
            description="Capture the employee, review date, and main probation timeline."
            title="Review schedule"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">Employee</span><select className="input-control" value={formValue.employee_id ?? ""} onChange={(e) => update("employee_id", e.target.value || null)}>{selectOptions(options.employees)}</select></label>
              <label className="form-field"><span className="muted">Review date</span><input className="input-control" type="date" value={formValue.review_date ?? ""} onChange={(e) => update("review_date", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Probation end date</span><input className="input-control" type="date" value={formValue.probation_end_date ?? ""} onChange={(e) => update("probation_end_date", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Decision</span><select className="input-control" value={formValue.decision} onChange={(e) => update("decision", e.target.value)}>{options.probation_decisions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
            </div>
          </FormSection>

          <FormSection
            description="Use the shared owner vocabulary so queue filters and edits stay aligned."
            title="Extension and ownership"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">Extension end date</span><input className="input-control" type="date" value={formValue.extension_end_date ?? ""} onChange={(e) => update("extension_end_date", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Reviewer</span><select className="input-control" value={formValue.owner_value} onChange={(e) => update("owner_value", e.target.value)}>{ownerOptions(options.lifecycle_owners)}</select></label>
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
        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">This review will immediately reflect in the probation queue and lifecycle inbox.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create probation review" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
