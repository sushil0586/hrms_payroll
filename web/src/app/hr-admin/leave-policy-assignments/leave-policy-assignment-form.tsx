"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminLeavePolicyAssignmentConflictCheck,
  HrAdminLeavePolicyAssignmentWriteInput,
  HrAdminPolicyOptions,
} from "@/lib/types";

type Props = {
  initialValue: HrAdminLeavePolicyAssignmentWriteInput;
  mode: "create" | "edit";
  options: HrAdminPolicyOptions;
  itemId?: string;
};

function getErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object") return "Unable to save leave policy assignment.";
  const conflictCheck = (payload as { conflict_check?: { summary?: string } }).conflict_check;
  if (conflictCheck?.summary) return conflictCheck.summary;
  for (const [, value] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return String((payload as Record<string, unknown>).detail || "Unable to save leave policy assignment.");
}

function selectOptions(items: Array<{ id: string; name: string }>) {
  return [
    <option key="blank" value="">
      Select an option
    </option>,
    ...items.map((item) => (
      <option key={item.id} value={item.id}>
        {item.name}
      </option>
    )),
  ];
}

export function LeavePolicyAssignmentForm({ initialValue, mode, options, itemId }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflictCheck, setConflictCheck] = useState<HrAdminLeavePolicyAssignmentConflictCheck | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);

  function update<Key extends keyof HrAdminLeavePolicyAssignmentWriteInput>(key: Key, value: HrAdminLeavePolicyAssignmentWriteInput[Key]) {
    setConflictCheck(null);
    setIsCheckingConflicts(false);
    setFormValue((current) => ({ ...current, [key]: value }));
  }

  useEffect(() => {
    if (!formValue.leave_policy_id || !formValue.is_active) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setIsCheckingConflicts(true);
      try {
        const response = await fetch("/api/hr-admin/leave-policy-assignments/conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formValue,
            item_id: itemId ?? null,
          }),
        });
        const payload = (await response.json().catch(() => null)) as HrAdminLeavePolicyAssignmentConflictCheck | null;
        if (!response.ok || !payload) {
          setConflictCheck(null);
          return;
        }
        setConflictCheck(payload);
      } catch {
        setConflictCheck(null);
      } finally {
        setIsCheckingConflicts(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formValue, itemId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (conflictCheck?.has_blocking_conflict) {
      setError(conflictCheck.summary);
      return;
    }
    setIsSubmitting(true);
    setError("");
    const response = await fetch(mode === "create" ? "/api/hr-admin/leave-policy-assignments" : `/api/hr-admin/leave-policy-assignments/${itemId}`, {
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
    router.push("/hr-admin/leave-policy-assignments");
    router.refresh();
  }

  return (
    <form className="section form-layout-modern" onSubmit={handleSubmit}>
      <section className="form-shell-card">
        <div className="form-shell-card__header">
          <div>
            <h2>{mode === "create" ? "Create leave policy assignment" : "Edit leave policy assignment"}</h2>
            <p className="section-copy">Use scope and priority to determine which leave policy governs each organizational slice when multiple rules could apply.</p>
          </div>
          <div className="form-shell-card__meta">
            <span className="queue-summary-chip"><strong>{formValue.priority}</strong> priority</span>
            <span className="queue-summary-chip"><strong>{formValue.is_active ? "active" : "inactive"}</strong> assignment</span>
          </div>
        </div>

        <div className="form-shell-card__grid">
          <FormSection title="Policy and scope" description="Choose the target policy first, then narrow the structure or employee slice it should govern.">
            <div className="form-grid">
              <label className="form-field"><span className="muted">Leave policy</span><select className="input-control" value={formValue.leave_policy_id ?? ""} onChange={(e) => update("leave_policy_id", e.target.value || null)}>{selectOptions(options.leave_policies ?? [])}</select></label>
              <label className="form-field"><span className="muted">Legal entity</span><select className="input-control" value={formValue.legal_entity_id ?? ""} onChange={(e) => update("legal_entity_id", e.target.value || null)}>{selectOptions(options.legal_entities)}</select></label>
              <label className="form-field"><span className="muted">Branch</span><select className="input-control" value={formValue.branch_id ?? ""} onChange={(e) => update("branch_id", e.target.value || null)}>{selectOptions(options.branches)}</select></label>
              <label className="form-field"><span className="muted">Department</span><select className="input-control" value={formValue.department_id ?? ""} onChange={(e) => update("department_id", e.target.value || null)}>{selectOptions(options.departments)}</select></label>
              <label className="form-field"><span className="muted">Grade</span><select className="input-control" value={formValue.grade_id ?? ""} onChange={(e) => update("grade_id", e.target.value || null)}>{selectOptions(options.grades)}</select></label>
              <label className="form-field"><span className="muted">Employment type</span><select className="input-control" value={formValue.employment_type_id ?? ""} onChange={(e) => update("employment_type_id", e.target.value || null)}>{selectOptions(options.employment_types)}</select></label>
              <label className="form-field"><span className="muted">Employee override</span><select className="input-control" value={formValue.employee_id ?? ""} onChange={(e) => update("employee_id", e.target.value || null)}>{selectOptions(options.employees)}</select></label>
              <label className="form-field"><span className="muted">Priority</span><input className="input-control" type="number" value={formValue.priority} onChange={(e) => update("priority", Number(e.target.value))} /></label>
            </div>
            {formValue.is_active ? (
              <div className="notice">
                <strong>{conflictCheck ? (conflictCheck.has_blocking_conflict ? "Blocking overlap detected." : conflictCheck.has_conflicts ? "Active overlap review." : "Assignment governance check.") : "Checking overlap impact..."}</strong>
                <span className="muted">
                  {isCheckingConflicts && !conflictCheck
                    ? "Reviewing active leave assignments for the same leave type."
                    : conflictCheck?.summary ?? "This panel will show whether the current scope overlaps with active assignments for the same leave type."}
                </span>
              </div>
            ) : (
              <div className="notice">
                <strong>Inactive assignments do not influence rollout.</strong>
                <span className="muted">Conflict checks are skipped until this assignment is marked active.</span>
              </div>
            )}
            {conflictCheck?.candidate_scope?.length ? (
              <div className="detail-grid">
                <div className="detail-row">
                  <span className="detail-label">Candidate scope</span>
                  <span className="detail-value">{conflictCheck.candidate_scope.join(" • ")}</span>
                </div>
              </div>
            ) : null}
            {conflictCheck?.conflicts?.length ? (
              <div className="detail-grid">
                {conflictCheck.conflicts.map((conflict) => (
                  <div className="detail-row" key={conflict.assignment_id}>
                    <span className="detail-label">{conflict.policy_name}</span>
                    <span className="detail-value">
                      {`${conflict.scope_labels.join(" • ") || "Global scope"} • Priority ${conflict.priority} • ${
                        conflict.priority_effect === "same_priority"
                          ? "same priority"
                          : conflict.priority_effect === "draft_wins"
                            ? "draft would override"
                            : "existing would override"
                      }`}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </FormSection>

          <FormSection title="Assignment state" description="Inactive assignments remain visible for audit purposes without influencing policy resolution.">
            <div className="toggle-field-list">
              <label className="toggle-field">
                <div>
                  <strong>Active</strong>
                  <p className="section-copy">Only active assignments participate in scope resolution.</p>
                </div>
                <input checked={formValue.is_active} onChange={(e) => update("is_active", e.target.checked)} type="checkbox" />
              </label>
            </div>
          </FormSection>
        </div>

        {error ? <div className="notice"><strong>Save failed.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Assignment changes go back into the leave policy rollout layer immediately.</span>
          <div className="form-actions-bar__buttons">
            <button className="button button--primary" disabled={isSubmitting} type="submit">{isSubmitting ? "Saving..." : mode === "create" ? "Create assignment" : "Save changes"}</button>
            <button className="button button--secondary" onClick={() => router.back()} type="button">Cancel</button>
          </div>
        </div>
      </section>
    </form>
  );
}
