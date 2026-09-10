"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import type { HrAdminLifecycleOptions, HrAdminMovementWriteInput } from "@/lib/types";

type Props = { initialValue: HrAdminMovementWriteInput; mode: "create" | "edit"; options: HrAdminLifecycleOptions; itemId?: string };

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save movement.";
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save movement.");
}

function selectOptions(items: Array<{ id: string; name: string; employee_code?: string }>) {
  return [<option key="blank" value="">Select an option</option>, ...items.map((item) => <option key={item.id} value={item.id}>{item.employee_code ? `${item.employee_code} - ${item.name}` : item.name}</option>)];
}

function ownerOptions(items: Array<{ value: string; label: string }>) {
  return [<option key="blank" value="">Select an owner</option>, ...items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)];
}

export function MovementForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<Key extends keyof HrAdminMovementWriteInput>(key: Key, value: HrAdminMovementWriteInput[Key]) {
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    let currentSnapshot: Record<string, unknown> = {};
    try {
      currentSnapshot = formValue.current_snapshot.trim() ? JSON.parse(formValue.current_snapshot) : {};
    } catch {
      setError("Current snapshot must be valid JSON.");
      setIsSubmitting(false);
      return;
    }
    const response = await fetch(mode === "create" ? "/api/hr-admin/movements" : `/api/hr-admin/movements/${itemId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formValue, current_snapshot: currentSnapshot }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(getErrorMessage(payload));
      setIsSubmitting(false);
      return;
    }
    router.push("/hr-admin/movements");
    router.refresh();
  }

  return (
    <form aria-label="Movement event form" className="section form-layout-modern" data-testid="movement-event-form" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create movement event" : "Edit movement event"}</h2>
            <p className="section-copy">Map the change type, effective date, destination structure, and owner contract in a form that matches the movement queue.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.movement_type || "movement"}</strong> change type</span>
            <span className="queue-summary-chip"><strong>{formValue.status || "draft"}</strong> current status</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection
            description="Set the employee, type, timing, and workflow context for this structural change."
            title="Movement context"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">Employee</span><select className="input-control" value={formValue.employee_id ?? ""} onChange={(e) => update("employee_id", e.target.value || null)}>{selectOptions(options.employees)}</select></label>
              <label className="form-field"><span className="muted">Movement type</span><select className="input-control" value={formValue.movement_type} onChange={(e) => update("movement_type", e.target.value)}>{options.movement_types.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label className="form-field"><span className="muted">Status</span><select className="input-control" value={formValue.status} onChange={(e) => update("status", e.target.value)}>{options.lifecycle_event_statuses.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
              <label className="form-field"><span className="muted">Effective date</span><input className="input-control" type="date" value={formValue.effective_date ?? ""} onChange={(e) => update("effective_date", e.target.value || null)} /></label>
              <label className="form-field"><span className="muted">Reason</span><input className="input-control" value={formValue.reason} onChange={(e) => update("reason", e.target.value)} /></label>
              <label className="form-field"><span className="muted">Workflow reference</span><input className="input-control" value={formValue.workflow_reference} onChange={(e) => update("workflow_reference", e.target.value)} /></label>
            </div>
          </FormSection>

          <FormSection
            description="Capture the structural movement endpoints that matter most for queue review."
            title="Department and designation change"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">From department</span><select className="input-control" value={formValue.from_department_id ?? ""} onChange={(e) => update("from_department_id", e.target.value || null)}>{selectOptions(options.departments)}</select></label>
              <label className="form-field"><span className="muted">To department</span><select className="input-control" value={formValue.to_department_id ?? ""} onChange={(e) => update("to_department_id", e.target.value || null)}>{selectOptions(options.departments)}</select></label>
              <label className="form-field"><span className="muted">From designation</span><select className="input-control" value={formValue.from_designation_id ?? ""} onChange={(e) => update("from_designation_id", e.target.value || null)}>{selectOptions(options.designations)}</select></label>
              <label className="form-field"><span className="muted">To designation</span><select className="input-control" value={formValue.to_designation_id ?? ""} onChange={(e) => update("to_designation_id", e.target.value || null)}>{selectOptions(options.designations)}</select></label>
            </div>
          </FormSection>

          <FormSection
            description="The owner vocabulary should stay aligned with the lifecycle queues and bulk assignment tools."
            title="Manager and owner routing"
          >
            <div className="form-grid">
              <label className="form-field"><span className="muted">From manager</span><select className="input-control" value={formValue.from_manager_id ?? ""} onChange={(e) => update("from_manager_id", e.target.value || null)}>{selectOptions(options.managers)}</select></label>
              <label className="form-field"><span className="muted">To manager</span><select className="input-control" value={formValue.owner_value} onChange={(e) => update("owner_value", e.target.value)}>{ownerOptions(options.lifecycle_owners)}</select></label>
            </div>
          </FormSection>

          <FormSection
            description="Keep the source snapshot valid so downstream audits and queue summaries stay reliable."
            fullWidth
            title="Current snapshot"
          >
            <label className="form-field">
              <span className="muted">Current snapshot JSON</span>
              <textarea className="input-control" rows={6} value={formValue.current_snapshot} onChange={(e) => update("current_snapshot", e.target.value)} />
            </label>
          </FormSection>
        </div>

        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">This movement will immediately update the specialist queue and the unified lifecycle inbox.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create movement" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
