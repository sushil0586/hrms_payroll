"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFieldErrors, mutationErrorMessage, networkMutationMessage } from "@/lib/ui/api-error-message";
import { WorkspaceFormControls } from "@/components/patterns/workspace-form-controls";

import { rememberActionSuccess } from "@/components/patterns/action-feedback-receipt";
import { useFeedbackFocus } from "@/lib/ui/use-feedback-focus";
import { useValidationFocus } from "@/lib/ui/use-validation-focus";
import { ActionToast } from "@/components/patterns/action-toast";
import { AsyncActionButton } from "@/components/patterns/async-action-button";
import { EmployeeSearchSelect } from "@/components/patterns/employee-search-select";
import { FormSection } from "@/components/patterns/form-section";
import type {
  HrAdminLeavePolicyAssignmentConflictCheck,
  HrAdminLeavePolicyAssignmentWriteInput,
  HrAdminOptionItem,
  HrAdminPolicyWorkbenchOptions,
} from "@/lib/types";
import { type FieldErrors, hasFieldErrors, requireValue } from "@/lib/ui/validation";

type Props = {
  initialValue: HrAdminLeavePolicyAssignmentWriteInput;
  mode: "create" | "edit";
  options: Pick<HrAdminPolicyWorkbenchOptions, "leave_policies" | "legal_entities" | "branches" | "departments" | "grades" | "employment_types">;
  itemId?: string;
  initialEmployeeLabel?: string | null;
  returnPath?: string;
};

type LeavePolicyAssignmentField = "leave_policy_id" | "priority";

function getErrorMessage(payload: unknown, status: number) {
  return mutationErrorMessage(payload, status, "Unable to save leave policy assignment.");
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

function FieldHint({ children, tone = "default" }: { children: string; tone?: "default" | "warning" }) {
  return <span className={`field-help-text${tone === "warning" ? " field-help-text--warning" : ""}`}>{children}</span>;
}

function filteredByLegalEntity(items: HrAdminOptionItem[], legalEntityId: string | null) {
  return items.filter((item) => !legalEntityId || item.legal_entity_id === legalEntityId);
}

export function LeavePolicyAssignmentForm({ initialValue, mode, options, itemId, initialEmployeeLabel, returnPath = "/hr-admin/leave-policy-assignments" }: Props) {
  const router = useRouter();
  const [formValue, setFormValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; title: string; tone: "success" | "error" } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LeavePolicyAssignmentField>>({});
  const formRef = useValidationFocus(fieldErrors);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const feedbackRef = useFeedbackFocus(error, isSubmitting, hasFieldErrors(fieldErrors));
  const isSubmittingRef = useRef(false);
  const cancelConflictCheck = useRef<(() => void) | null>(null);
  const [conflictCheck, setConflictCheck] = useState<HrAdminLeavePolicyAssignmentConflictCheck | null>(null);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictError, setConflictError] = useState("");
  const [conflictRetry, setConflictRetry] = useState(0);
  const hasEmployeeOverride = Boolean(formValue.employee_id);
  const filteredBranches = filteredByLegalEntity(options.branches, formValue.legal_entity_id);
  const branchWarning =
    formValue.legal_entity_id && filteredBranches.length === 0
      ? "No active branches are mapped to this legal entity."
      : null;

  function update<Key extends keyof HrAdminLeavePolicyAssignmentWriteInput>(key: Key, value: HrAdminLeavePolicyAssignmentWriteInput[Key]) {
    setConflictCheck(null);
    setConflictError("");
    setIsCheckingConflicts(false);
    setFieldErrors((current) => ({ ...current, [key as LeavePolicyAssignmentField]: undefined }));
    setError("");
    setToast(null);
    setFormValue((current) => {
      const nextValue = { ...current, [key]: value };
      if (key === "employee_id" && value) {
        nextValue.legal_entity_id = null;
        nextValue.branch_id = null;
        nextValue.department_id = null;
        nextValue.grade_id = null;
        nextValue.employment_type_id = null;
      }
      if (
        key === "legal_entity_id" &&
        nextValue.branch_id &&
        !filteredByLegalEntity(options.branches, nextValue.legal_entity_id).some((item) => item.id === nextValue.branch_id)
      ) {
        nextValue.branch_id = null;
      }
      if (key === "branch_id") {
        const nextBranch = options.branches.find((item) => item.id === nextValue.branch_id);
        if (nextBranch?.legal_entity_id && !nextValue.legal_entity_id) {
          nextValue.legal_entity_id = nextBranch.legal_entity_id;
        }
      }
      return nextValue;
    });
  }

  useEffect(() => {
    if (!formValue.leave_policy_id || !formValue.is_active || isSubmitting) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsCheckingConflicts(true);
      setConflictError("");
      try {
        const response = await fetch("/api/hr-admin/leave-policy-assignments/conflicts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formValue,
            item_id: itemId ?? null,
          }),
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as HrAdminLeavePolicyAssignmentConflictCheck | null;
        if (controller.signal.aborted) return;
        if (!response.ok || !payload) {
          setConflictCheck(null);
          setConflictError("Unable to check overlapping leave assignments.");
          return;
        }
        setConflictCheck(payload);
      } catch (requestError) {
        if (controller.signal.aborted || (requestError instanceof DOMException && requestError.name === "AbortError")) return;
        setConflictCheck(null);
        setConflictError("Unable to check overlapping leave assignments.");
      } finally {
        if (!controller.signal.aborted) setIsCheckingConflicts(false);
      }
    }, 250);

    const stop = () => { window.clearTimeout(timeoutId); controller.abort(); };
    cancelConflictCheck.current = stop;
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
      if (cancelConflictCheck.current === stop) cancelConflictCheck.current = null;
    };
  }, [conflictRetry, formValue, itemId, isSubmitting]);

  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setConflictRetry(value => value + 1);
    };
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }
    if (conflictCheck?.has_blocking_conflict) {
      setError(conflictCheck.summary);
      setToast({ title: "Save needs attention.", message: conflictCheck.summary, tone: "error" });
      return;
    }
    cancelConflictCheck.current?.();
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    setFieldErrors({});
    const nextErrors: FieldErrors<LeavePolicyAssignmentField> = {
      leave_policy_id: requireValue(formValue.leave_policy_id, "Select the leave policy for this assignment."),
      priority: !Number.isInteger(formValue.priority) || formValue.priority < 0 ? "Enter priority as a whole number of zero or more." : undefined,
    };
    if (hasFieldErrors(nextErrors)) {
      setFieldErrors(nextErrors);
      const message = "Review the highlighted leave policy assignment fields and try again.";
      setError(message);
      setToast({ title: "Review the highlighted fields.", message, tone: "error" });
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    let response: Response;
    try {
      response = await fetch(mode === "create" ? "/api/hr-admin/leave-policy-assignments" : `/api/hr-admin/leave-policy-assignments/${itemId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formValue),
      });
    } catch {
      const message = networkMutationMessage;
      setError(message);
      setToast({ title: "Save not confirmed.", message, tone: "error" });
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || typeof payload?.id !== "string" || !payload.id) {
      setFieldErrors(apiFieldErrors(payload, Object.keys(nextErrors) as LeavePolicyAssignmentField[]));
      const message = response.ok ? "The server returned an incomplete confirmation. Check the latest list before retrying; your entries are still here." : getErrorMessage(payload, response.status);
      setError(message);
      setToast({ title: response.ok || response.status >= 500 ? "Save not confirmed." : "Unable to save.", message, tone: "error" });
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      return;
    }
    setToast({
      title: "Save complete.",
      message: mode === "create" ? "Leave assignment created. Returning to the assignment list." : "Leave assignment saved. Returning to the assignment list.",
      tone: "success",
    });
    // Keep checks suspended until the destination owns the document.
    rememberActionSuccess(returnPath, typeof payload.id === "string" ? payload.id : itemId ?? "", "Leave assignment saved.", mode === "create" ? "Leave assignment created and available in this list." : "Your changes to this leave assignment were saved.");
    window.location.assign(returnPath);
  }

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), toast.tone === "error" ? 8000 : 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <>
      {toast ? <ActionToast message={toast.message} title={toast.title} tone={toast.tone} /> : null}
      <form ref={formRef} className="section form-layout-modern" noValidate onSubmit={handleSubmit}>
      <WorkspaceFormControls>
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
              <label className="form-field"><span className="muted">Leave policy</span><select aria-label="Leave policy" aria-invalid={Boolean(fieldErrors.leave_policy_id)} aria-describedby={fieldErrors.leave_policy_id ? "leave-assignment-leave_policy_id-error" : undefined} className="input-control" value={formValue.leave_policy_id ?? ""} onChange={(e) => update("leave_policy_id", e.target.value || null)}>{selectOptions(options.leave_policies ?? [])}</select>{fieldErrors.leave_policy_id ? <span className="field-error-text" id="leave-assignment-leave_policy_id-error">{fieldErrors.leave_policy_id}</span> : null}</label>
              <label className="form-field"><span className="muted">Legal entity</span><select aria-label="Legal entity" className="input-control" disabled={hasEmployeeOverride} value={hasEmployeeOverride ? "" : formValue.legal_entity_id ?? ""} onChange={(e) => update("legal_entity_id", e.target.value || null)}>{selectOptions(options.legal_entities)}</select><FieldHint>{hasEmployeeOverride ? "Employee override ignores organization filters." : "Branch options narrow to the selected legal entity."}</FieldHint></label>
              <label className="form-field"><span className="muted">Branch</span><select aria-label="Branch" className="input-control" disabled={hasEmployeeOverride || Boolean(branchWarning)} value={hasEmployeeOverride ? "" : formValue.branch_id ?? ""} onChange={(e) => update("branch_id", e.target.value || null)}>{selectOptions(filteredBranches)}</select><FieldHint tone={branchWarning ? "warning" : "default"}>{hasEmployeeOverride ? "Employee override ignores branch scope." : branchWarning ?? "Branch scope is optional unless the leave policy should apply only to a branch."}</FieldHint></label>
              <label className="form-field"><span className="muted">Department</span><select aria-label="Department" className="input-control" disabled={hasEmployeeOverride} value={hasEmployeeOverride ? "" : formValue.department_id ?? ""} onChange={(e) => update("department_id", e.target.value || null)}>{selectOptions(options.departments)}</select></label>
              <label className="form-field"><span className="muted">Grade</span><select aria-label="Grade" className="input-control" disabled={hasEmployeeOverride} value={hasEmployeeOverride ? "" : formValue.grade_id ?? ""} onChange={(e) => update("grade_id", e.target.value || null)}>{selectOptions(options.grades)}</select></label>
              <label className="form-field"><span className="muted">Employment type</span><select aria-label="Employment type" className="input-control" disabled={hasEmployeeOverride} value={hasEmployeeOverride ? "" : formValue.employment_type_id ?? ""} onChange={(e) => update("employment_type_id", e.target.value || null)}>{selectOptions(options.employment_types)}</select></label>
              <EmployeeSearchSelect
                hint={hasEmployeeOverride ? "Employee override clears organization filters." : "Optional. Search only when this policy should target one employee."}
                label="Employee override"
                selectedLabel={initialEmployeeLabel}
                value={formValue.employee_id ?? ""}
                onChange={(value) => update("employee_id", value || null)}
              />
              <label className="form-field"><span className="muted">Priority</span><input aria-label="Priority" aria-invalid={Boolean(fieldErrors.priority)} aria-describedby={fieldErrors.priority ? "leave-assignment-priority-error" : undefined} className="input-control" type="number" value={formValue.priority} onChange={(e) => update("priority", Number(e.target.value))} />{fieldErrors.priority ? <span className="field-error-text" id="leave-assignment-priority-error">{fieldErrors.priority}</span> : null}</label>
              <label className="form-field"><span className="muted">Effective from</span><input aria-label="Effective from" className="input-control" type="date" value={formValue.effective_from ?? ""} onChange={(e) => update("effective_from", e.target.value || null)} /><FieldHint>Leave blank only for an explicitly classified legacy assignment.</FieldHint></label>
              <label className="form-field"><span className="muted">Effective to</span><input aria-label="Effective to" className="input-control" min={formValue.effective_from ?? undefined} type="date" value={formValue.effective_to ?? ""} onChange={(e) => update("effective_to", e.target.value || null)} /></label>
            </div>
            {formValue.is_active ? (
              <div aria-busy={isCheckingConflicts} aria-live="polite" className="notice" role="status">
                <strong>{!formValue.leave_policy_id ? "Select a leave policy." : conflictError ? "Overlap check unavailable." : conflictCheck ? (conflictCheck.has_blocking_conflict ? "Blocking overlap detected." : conflictCheck.has_conflicts ? "Active overlap review." : "Assignment governance check.") : "Checking overlap impact..."}</strong>
                <span className="muted">
                  {!formValue.leave_policy_id ? "Choose a leave policy to check assignment overlap." : conflictError || (isCheckingConflicts && !conflictCheck
                    ? "Reviewing active leave assignments for the same leave type."
                    : conflictCheck?.summary ?? "This panel will show whether the current scope overlaps with active assignments for the same leave type.")}
                </span>
                {conflictError ? <button className="button button--secondary button--compact" onClick={() => setConflictRetry((value) => value + 1)} type="button">Retry overlap check</button> : null}
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

        {error ? <div ref={feedbackRef} tabIndex={-1} className="notice notice--error" role="alert"><strong>Save needs attention.</strong><span className="muted">{error}</span></div> : null}
        <div className="form-actions-bar">
          <span className="muted">Assignment changes go back into the leave policy rollout layer immediately.</span>
          <div className="form-actions-bar__buttons">
            <AsyncActionButton className="button button--primary" pending={isSubmitting} pendingLabel="Saving leave policy assignment" type="submit">{mode === "create" ? "Create assignment" : "Save changes"}</AsyncActionButton>
            <button className="button button--secondary" onClick={() => router.push(returnPath)} type="button">Cancel</button>
          </div>
        </div>
      </section>
      </WorkspaceFormControls>
      </form>
    </>
  );
}
